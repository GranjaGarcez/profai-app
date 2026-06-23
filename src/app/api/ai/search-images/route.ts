import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { findBankImages } from '@/lib/images/imageBank'

export const maxDuration = 30

// ── Pedidos de conteúdo estruturado (tabela, classificação, correspondência) ou
// diagrama técnico não fazem sentido como pesquisa de imagem — orienta para a
// ferramenta certa em vez de devolver resultados irrelevantes.
const STRUCTURED_HINTS = [
  'tabela', 'classificar', 'classificação', 'corresponder', 'associar', 'legendar',
  'gráfico de dados', 'esquema eléctrico',
]

function looksStructured(description: string): boolean {
  const s = description.toLowerCase()
  return STRUCTURED_HINTS.some(h => s.includes(h))
}

interface ImageResult {
  title: string
  url: string
  thumbUrl: string
  source: 'banco' | 'commons' | 'unsplash' | 'openverse'
  license: string
  artist: string
  descriptionUrl: string
}

// ── Passo 1: traduz a descrição do professor em termos de pesquisa eficazes ──────
// A Wikimedia Commons e o Unsplash são predominantemente indexados em inglês —
// pesquisar em português directamente devolve muito menos resultados.
// Tenta Gemini primeiro; se falhar (503 sobrecarregado, 429 quota esgotada,
// timeout), recorre ao Groq — mesmo princípio de resiliência do resto da app.
async function craftSearchQuery(
  description: string, geminiKey: string, subject?: string, yearLevel?: number, topic?: string
): Promise<string> {
  const context = subject ? `Contexto: disciplina de ${subject}${yearLevel ? ` (${yearLevel}.º ano)` : ''}${topic ? `, tema "${topic}"` : ''}.\n` : ''
  const prompt = `${context}O texto abaixo pode ser uma descrição limpa do que ilustrar, OU o enunciado literal de uma questão (com instruções, números, perguntas) — neste segundo caso, IGNORA a estrutura de pergunta e identifica primeiro qual é o TEMA VISUAL central que uma imagem ilustrativa devia mostrar (ex: se o enunciado é "Observa o camaleão na imagem. Quantas patas tens?", o tema visual é só "chameleon", não a pergunta sobre patas).

TEXTO: "${description}"

Depois de identificares o tema visual, traduz para um termo de pesquisa em inglês, optimizado para encontrar uma imagem real e livre de direitos (mapas, diagramas anatómicos, moléculas, quadros, fotografias).

Responde APENAS com 2-4 palavras-chave em inglês, sem explicações, sem aspas. Ex: "human digestive system diagram" ou "world war 2 map europe" ou "chameleon photo".`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: AbortSignal.timeout(12_000),
      }
    )
    if (!res.ok) throw new Error(`Gemini craft falhou: HTTP ${res.status}`)
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
    if (!text) throw new Error('Gemini craft sem texto')
    return text.trim().replace(/^["']|["']$/g, '')
  } catch (geminiErr) {
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) throw geminiErr
    console.warn('[SEARCH-IMAGES] Gemini craft falhou, a tentar Groq:', geminiErr instanceof Error ? geminiErr.message : geminiErr)
    const Groq = (await import('groq-sdk')).default
    const groq = new Groq({ apiKey: groqKey })
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 50,
    })
    const text = completion.choices[0]?.message?.content
    if (!text) throw new Error('Groq craft sem texto')
    return text.trim().replace(/^["']|["']$/g, '')
  }
}

// ── Wikimedia Commons (API pública, sem autenticação) — mapas, anatomia,
//    moléculas, quadros: o que pede precisão factual/histórica ─────────────────
async function searchCommons(query: string): Promise<ImageResult[]> {
  try {
    const params = new URLSearchParams({
      action: 'query', format: 'json', generator: 'search',
      gsrnamespace: '6', gsrsearch: query, gsrlimit: '12',
      prop: 'imageinfo', iiprop: 'url|size|extmetadata|mime', iiurlwidth: '320',
      origin: '*',
    })
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'PROF.IA/1.0 (https://profai-app.onrender.com)' },
    })
    if (!res.ok) throw new Error(`Commons falhou: HTTP ${res.status}`)
    const data = await res.json()
    const pages = data?.query?.pages
    if (!pages) return []

    const results: ImageResult[] = []
    for (const page of Object.values(pages) as Array<Record<string, unknown>>) {
      const info = (page.imageinfo as Array<Record<string, unknown>> | undefined)?.[0]
      if (!info) continue
      const mime = String(info.mime ?? '')
      if (!mime.startsWith('image/')) continue
      const meta = (info.extmetadata as Record<string, { value?: string }> | undefined) ?? {}
      results.push({
        title: String(page.title ?? '').replace(/^File:/, ''),
        url: String(info.url ?? ''),
        thumbUrl: String(info.thumburl ?? info.url ?? ''),
        source: 'commons',
        license: meta.LicenseShortName?.value ?? 'Wikimedia Commons',
        artist: (meta.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim() || 'Autor desconhecido',
        descriptionUrl: String(info.descriptionurl ?? info.url ?? ''),
      })
    }
    return results
  } catch (err) {
    console.warn('[SEARCH-IMAGES] Commons falhou:', err instanceof Error ? err.message : err)
    return []
  }
}

// ── Unsplash (precisa de UNSPLASH_ACCESS_KEY, gratuito) — fotografia realista
//    contemporânea: gestos desportivos, cenas do quotidiano. Sem chave → ignora
//    silenciosamente, fica só com Commons + banco próprio. ─────────────────────
async function searchUnsplash(query: string): Promise<ImageResult[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return []
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12`,
      { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(12_000) }
    )
    if (!res.ok) throw new Error(`Unsplash falhou: HTTP ${res.status}`)
    const data = await res.json()
    const items = (data?.results as Array<Record<string, unknown>>) ?? []
    return items.map(item => {
      const urls = item.urls as Record<string, string>
      const user = item.user as Record<string, unknown>
      const links = item.links as Record<string, string>
      return {
        title: String(item.alt_description ?? item.description ?? 'Fotografia Unsplash'),
        url: urls?.regular ?? urls?.full ?? '',
        thumbUrl: urls?.small ?? urls?.thumb ?? '',
        source: 'unsplash' as const,
        license: 'Licença Unsplash (uso livre, com atribuição)',
        artist: String((user?.name as string) ?? 'Autor desconhecido'),
        descriptionUrl: String(links?.html ?? 'https://unsplash.com'),
      }
    })
  } catch (err) {
    console.warn('[SEARCH-IMAGES] Unsplash falhou:', err instanceof Error ? err.message : err)
    return []
  }
}

// ── Openverse (openverse.org, Creative Commons/WordPress) — sem chave API,
//    meta-pesquisa sobre 50+ fontes abertas (Flickr Commons, museus, bibliotecas).
//    Complementa Commons/Unsplash com fotografia de arquivo e acervos de museu. ──
async function searchOpenverse(query: string): Promise<ImageResult[]> {
  try {
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=12`,
      { signal: AbortSignal.timeout(12_000), headers: { 'User-Agent': 'PROF.IA/1.0 (https://profai-app.onrender.com)' } }
    )
    if (!res.ok) throw new Error(`Openverse falhou: HTTP ${res.status}`)
    const data = await res.json()
    const items = (data?.results as Array<Record<string, unknown>>) ?? []
    return items.map(item => ({
      title: String(item.title ?? 'Imagem Openverse'),
      url: String(item.url ?? ''),
      thumbUrl: String(item.thumbnail ?? item.url ?? ''),
      source: 'openverse' as const,
      license: `CC ${String(item.license ?? '').toUpperCase()} ${item.license_version ?? ''}`.trim(),
      artist: String(item.creator ?? 'Autor desconhecido'),
      descriptionUrl: String(item.foreign_landing_url ?? item.url ?? ''),
    })).filter(r => r.url)
  } catch (err) {
    console.warn('[SEARCH-IMAGES] Openverse falhou:', err instanceof Error ? err.message : err)
    return []
  }
}

// ── Passo 3: refinamento visual — o Gemini VÊ as miniaturas e ordena pela
//    relevância real, não pelo texto/título devolvido pelo motor de busca.
//    Isto é o que distingue "encontrei algo com esta palavra no título" de
//    "esta imagem mostra mesmo o que o professor precisa". Falha graciosa:
//    se o passo de visão falhar, devolve os resultados na ordem original em
//    vez de bloquear a pesquisa toda. ─────────────────────────────────────────
async function rerankByVisualRelevance(
  results: ImageResult[], description: string, subject: string, topic: string, geminiKey: string
): Promise<ImageResult[]> {
  if (results.length <= 1) return results
  const pool = results.slice(0, 20)   // limite razoável de candidatos a avaliar visualmente

  const fetched = await Promise.all(pool.map(async (r, i) => {
    try {
      const res = await fetch(r.thumbUrl, { signal: AbortSignal.timeout(6_000) })
      if (!res.ok) return null
      const buf = await res.arrayBuffer()
      const mimeType = res.headers.get('content-type') ?? 'image/jpeg'
      if (!mimeType.startsWith('image/')) return null
      return { resultIndex: i, base64: Buffer.from(buf).toString('base64'), mimeType }
    } catch { return null }
  }))
  const valid = fetched.filter((x): x is NonNullable<typeof x> => x !== null)
  if (valid.length === 0) return results   // nenhuma miniatura acessível — sem reordenar

  const instruction = `Estas são ${valid.length} imagens candidatas (numeradas pela ordem em que aparecem) para ilustrar um conteúdo de ${subject}, tema "${topic}": "${description}".

Avalia CADA imagem pela relevância visual genuína ao tema — pela imagem em si, não pelo nome do ficheiro. Exclui imagens claramente erradas, ambíguas, de baixa qualidade ou que não mostram o tema pedido.

Responde APENAS com um array JSON dos números das imagens (0 a ${valid.length - 1}), ordenados do mais relevante para o menos relevante, sem as excluídas. Ex: [3,0,7,1]`

  const parts: Array<Record<string, unknown>> = [{ text: instruction }]
  for (const img of valid) parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } })

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] }),
        signal: AbortSignal.timeout(20_000),
      }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
    const match = text?.match(/\[[\d,\s]*\]/)
    if (!match) throw new Error('sem array na resposta')
    const order = JSON.parse(match[0]) as number[]

    const reranked = order
      .filter(i => Number.isInteger(i) && i >= 0 && i < valid.length)
      .map(i => results[valid[i].resultIndex])
    if (reranked.length === 0) return results

    // Acrescenta no fim os candidatos que o passo de visão não avaliou
    // (fora do pool, ou miniatura inacessível) — nunca perde resultados.
    const seen = new Set(reranked.map(r => r.url))
    const rest = results.filter(r => !seen.has(r.url))
    return [...reranked, ...rest]
  } catch (err) {
    console.warn('[SEARCH-IMAGES] Refinamento visual falhou, a usar ordem original:', err instanceof Error ? err.message : err)
    return results
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { description, subject, yearLevel, topic } = await request.json()
  if (!description) return NextResponse.json({ error: 'Parâmetros incompletos' }, { status: 400 })

  if (looksStructured(String(description))) {
    return NextResponse.json({
      guidance: 'Isto pede conteúdo estruturado (tabela, classificação, correspondência) — uma fotografia não serve. Usa o separador "📊 Tabela" aqui ao lado para gerar uma tabela com dados reais, ou edita o enunciado directamente se for um gráfico (bar_chart/pie_chart).',
    }, { status: 422 })
  }

  const geminiKey = process.env.GEMINI_API_KEY

  try {
    const query = geminiKey
      ? await craftSearchQuery(
          String(description), geminiKey,
          subject ? String(subject) : undefined,
          yearLevel ? Number(yearLevel) : undefined,
          topic ? String(topic) : undefined,
        )
      : String(description)

    // Banco próprio primeiro (imagens já usadas antes para disciplina/ano/tópico
    // semelhantes) — não bloqueia se faltar contexto ou se a pesquisa falhar.
    const bankResults: ImageResult[] = (subject && yearLevel && topic)
      ? (await findBankImages(String(subject), Number(yearLevel), String(topic))).map(b => ({
          title: b.query, url: b.url, thumbUrl: b.thumbUrl ?? b.url,
          source: 'banco' as const, license: b.credit ?? 'Já usada antes', artist: '', descriptionUrl: b.url,
        }))
      : []

    const [commonsResults, unsplashResults, openverseResults] = await Promise.all([
      searchCommons(query),
      searchUnsplash(query),
      searchOpenverse(query),
    ])

    // O banco próprio já foi validado por um professor antes — fica fixo no
    // topo, sem precisar de ser reavaliado. Só os candidatos novos passam
    // pelo refinamento visual.
    const freshResults = [...commonsResults, ...unsplashResults, ...openverseResults]
    const rankedFresh = geminiKey && subject && topic
      ? await rerankByVisualRelevance(freshResults, String(description), String(subject), String(topic), geminiKey)
      : freshResults

    const results = [...bankResults, ...rankedFresh]
    return NextResponse.json({ query, results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[SEARCH-IMAGES] Falha:', msg)
    return NextResponse.json({ error: 'Não foi possível pesquisar imagens. Tenta novamente.' }, { status: 503 })
  }
}
