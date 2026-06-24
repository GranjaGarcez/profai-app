import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

// ── Detecta pedidos que precisam de conteúdo estruturado/preciso — a IA de
// imagem não serve para nenhum destes, é sempre texto ou o sistema de figuras
// SVG (MathFigure) que resolve bem. Aqui só geramos ilustração decorativa. ──────
const TECHNICAL_HINTS = [
  'gráfico', 'circuito', 'esquema eléctrico', 'diagrama legendado', 'mapa com dados',
  'fórmula', 'equação', 'valores exactos', 'eixo', 'escala',
  'tabela', 'classificar', 'classificação', 'corresponder', 'associar', 'legendar',
]

function looksTechnical(description: string): boolean {
  const s = description.toLowerCase()
  return TECHNICAL_HINTS.some(h => s.includes(h))
}

interface CraftedImage {
  prompt: string
  aspectRatio: '1:1' | '16:9' | '9:16'
}

// ── Biblioteca de estilos — cada um com direcção artística concreta (luz,
// composição, textura, paleta), nunca só um adjectivo genérico como "colorido,
// vibrante". A IA escolhe o estilo mais adequado ao conteúdo, não um por defeito. ──
const STYLE_GUIDE = `Escolhe UM destes estilos visuais — o que melhor servir este conteúdo específico, nunca sempre o mesmo. À frente de cada um está a FRASE INGLESA EXACTA que deves usar para o invocar no prompt (o modelo de imagem só entende terminologia em inglês — nunca escrevas o nome do estilo em português no prompt final):

- REALISTA → comece o prompt com "Photorealistic photograph," — iluminação natural ou de estúdio bem descrita, profundidade de campo, textura e materiais autênticos, composição editorial/documental. Usa para temas contemporâneos, desportivos, geográficos, ou fenómenos científicos concretos com registo fotográfico real. NÃO uses para épocas sem fotografia (seria anacrónico) — prefere PICTÓRICO nesses casos.
- PICTÓRICO → comece o prompt com "Painterly illustration," — pincelada visível, paleta cuidadosamente escolhida, atmosfera evocativa, qualidade de ilustração de livro premiado. Usa para temas literários, históricos anteriores à fotografia, ou conceitos com carga emocional/narrativa.
- VECTOR PLANO → comece o prompt com "Flat vector illustration," — formas geométricas limpas, paleta harmoniosa e limitada, clareza absoluta, sem textura ruidosa. Usa para conceitos simples, públicos mais jovens, ou quando a clareza deve dominar sobre o detalhe.
- RENDER 3D → comece o prompt com "Clean 3D render," — iluminação de estúdio suave e direccional, enquadramento tipo still-life ou isométrico, sombras suaves. Usa para um objecto ou conceito isolado, sem necessidade de cena ou narrativa.

Em qualquer estilo escolhido, EXIGÊNCIA PLÁSTICA elevada sempre: composição deliberada (não centrada por defeito — considera a regra dos terços, espaço negativo), iluminação explicitamente descrita em inglês, paleta de cores intencional e coerente, sensação de obra profissional. Nunca um resultado genérico, plano ou "clip-art" — a precisão e relevância pedagógica importam tanto como a qualidade plástica.`

const FORMAT_GUIDE = `Escolhe o formato (aspectRatio) mais adequado à cena que vais descrever:
- "1:1" (quadrado) — um objecto ou sujeito central isolado, sem necessidade de mostrar ambiente em redor.
- "16:9" (paisagem larga) — cenas amplas, ambientes, paisagens, vários elementos a interagir, contexto espacial importante.
- "9:16" (retrato vertical) — um sujeito único alto/vertical: figura humana de corpo inteiro, árvore, edifício, objecto longilíneo.`

// ── Passo 1: a IA escreve o prompt de imagem optimizado a partir do contexto ─────
function buildImagePrompt(description: string, subject: string, yearLevel: number, correctAnswer?: string): string {
  const avoidAnswerNote = correctAnswer
    ? `\n7. PROIBIDO ABSOLUTO — NUNCA REVELAR A RESPOSTA: a resposta correcta desta questão é "${correctAnswer}". Se a questão pede para contar, medir ou calcular algo, a imagem NÃO pode mostrar essa quantidade/valor exacto de forma visualmente contável ou óbvia (ex: se a resposta é "5", não desenhes exactamente 5 objectos bem separados e fáceis de contar — usa uma cena mais ambígua, parcialmente sobreposta, ou simplesmente não relacionada com a contagem em si). A imagem dá CONTEXTO, nunca a SOLUÇÃO.`
    : ''

  return `Cria um prompt de imagem em inglês, optimizado para um modelo de text-to-image, a partir deste pedido de um professor de ${subject} do ${yearLevel}.º ano em Portugal:

"${description}"

NOTA: o texto acima pode ser uma descrição limpa do que ilustrar, OU o enunciado literal de uma questão (com instruções, números, perguntas) — neste segundo caso, ignora a estrutura de pergunta e identifica primeiro qual é o TEMA VISUAL central que a ilustração deve mostrar, sem tentar representar a pergunta em si.

${STYLE_GUIDE}

${FORMAT_GUIDE}

REGRAS OBRIGATÓRIAS DO PROMPT QUE VAIS ESCREVER:
1. Adequado a alunos de ${yearLevel <= 6 ? '10–12 anos' : yearLevel <= 9 ? '12–15 anos' : '15–18 anos'} — nunca infantilizado de mais nem assustador.
2. PROIBIDO ABSOLUTO no prompt: pedir texto, números, legendas, eixos, escalas ou qualquer rótulo escrito dentro da imagem — modelos de imagem escrevem texto errado com frequência.
3. PROIBIDO ABSOLUTO: pedir precisão técnica/factual (proporções científicas exactas, mapas geograficamente correctos, circuitos funcionais) — isto é só ilustração de contexto, nunca um diagrama que o aluno tenha de ler com precisão.
4. Composição clara, sem elementos sobrepostos confusos — mas nunca simplista ou pouco trabalhada.
5. Em inglês, terminologia de prompt de imagem profissional (estilo, iluminação, composição, paleta), até 50 palavras.
6. O prompt TEM de começar pela frase inglesa exacta do estilo escolhido (indicada acima com "→") — nunca o nome do estilo em português, nunca sem essa frase.${avoidAnswerNote}

Responde APENAS com este JSON válido, sem texto extra, sem markdown:
{"prompt": "<prompt em inglês>", "aspectRatio": "1:1" | "16:9" | "9:16"}`
}

function parseCraftedImage(raw: string): CraftedImage {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) {
    // Resposta sem JSON (modelo respondeu só com o prompt em texto, formato antigo)
    // — usa o texto inteiro como prompt, formato quadrado por defeito.
    return { prompt: raw.trim().replace(/^["']|["']$/g, ''), aspectRatio: '1:1' }
  }
  try {
    const parsed = JSON.parse(match[0]) as { prompt?: string; aspectRatio?: string }
    const validRatios = new Set(['1:1', '16:9', '9:16'])
    return {
      prompt: parsed.prompt?.trim() || raw.trim(),
      aspectRatio: validRatios.has(parsed.aspectRatio ?? '') ? (parsed.aspectRatio as CraftedImage['aspectRatio']) : '1:1',
    }
  } catch {
    return { prompt: raw.trim().replace(/^["']|["']$/g, ''), aspectRatio: '1:1' }
  }
}

// Tenta Gemini primeiro; se falhar (503 sobrecarregado, 429 quota esgotada, timeout),
// recorre ao Groq — mesmo princípio de resiliência usado no resto da app. Sem isto,
// uma única falha temporária do Gemini derrubava esta funcionalidade por completo.
async function craftPrompt(description: string, subject: string, yearLevel: number, geminiKey: string, correctAnswer?: string): Promise<CraftedImage> {
  const promptText = buildImagePrompt(description, subject, yearLevel, correctAnswer)

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
        signal: AbortSignal.timeout(15_000),
      }
    )
    if (!res.ok) throw new Error(`Gemini craft falhou: HTTP ${res.status}`)
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
    if (!text) throw new Error('Gemini craft sem texto')
    return parseCraftedImage(text)
  } catch (geminiErr) {
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) throw geminiErr
    console.warn('[IMAGE] Gemini craft falhou, a tentar Groq:', geminiErr instanceof Error ? geminiErr.message : geminiErr)
    const Groq = (await import('groq-sdk')).default
    const groq = new Groq({ apiKey: groqKey })
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: promptText }],
      temperature: 0.6,
      max_tokens: 250,
    })
    const text = completion.choices[0]?.message?.content
    if (!text) throw new Error('Groq craft sem texto')
    return parseCraftedImage(text)
  }
}

// ── Passo 2a: Gemini "Nano Banana" (gemini-2.5-flash-image) — 500 pedidos/dia grátis ──
// Tenta primeiro com o formato (aspectRatio) pedido; se a API rejeitar esse campo
// (parâmetro não suportado nesta versão/conta), tenta de novo sem ele em vez de
// desistir logo para o Pollinations — só um pedido extra, e só no caminho de erro.
async function tryGeminiImage(imagePrompt: string, aspectRatio: string, geminiKey: string): Promise<string | null> {
  const call = async (withAspectRatio: boolean) => {
    const generationConfig: Record<string, unknown> = { responseModalities: ['IMAGE'] }
    if (withAspectRatio) generationConfig.imageConfig = { aspectRatio }
    return fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: imagePrompt }] }], generationConfig }),
        signal: AbortSignal.timeout(30_000),
      }
    )
  }

  try {
    let res = await call(true)
    if (!res.ok && aspectRatio !== '1:1') {
      console.warn('[IMAGE] Gemini com aspectRatio falhou, a tentar sem formato:', res.status)
      res = await call(false)
    }
    if (!res.ok) {
      console.warn('[IMAGE] Gemini Nano Banana falhou:', res.status, await res.text().catch(() => ''))
      return null
    }
    const data = await res.json()
    const parts = data?.candidates?.[0]?.content?.parts as Array<{ inlineData?: { mimeType: string; data: string } }> | undefined
    const inline = parts?.find(p => p.inlineData)?.inlineData
    if (!inline) return null
    return `data:${inline.mimeType};base64,${inline.data}`
  } catch (err) {
    console.warn('[IMAGE] Gemini Nano Banana erro:', err instanceof Error ? err.message : err)
    return null
  }
}

// ── Passo 2b: Pollinations.ai (Flux) — gratuito, sem autenticação, fallback ──────
const ASPECT_DIMENSIONS: Record<string, [number, number]> = {
  '1:1': [768, 768],
  '16:9': [1024, 576],
  '9:16': [576, 1024],
}

async function tryPollinations(imagePrompt: string, aspectRatio: string): Promise<string | null> {
  try {
    const [width, height] = ASPECT_DIMENSIONS[aspectRatio] ?? ASPECT_DIMENSIONS['1:1']
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=${width}&height=${height}&nologo=true`
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const base64 = Buffer.from(buf).toString('base64')
    const mimeType = res.headers.get('content-type') ?? 'image/jpeg'
    return `data:${mimeType};base64,${base64}`
  } catch (err) {
    console.warn('[IMAGE] Pollinations erro:', err instanceof Error ? err.message : err)
    return null
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { description, subject, yearLevel, correctAnswer } = await request.json()
  if (!description || !subject || !yearLevel) {
    return NextResponse.json({ error: 'Parâmetros incompletos' }, { status: 400 })
  }

  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    return NextResponse.json({ error: 'Serviço de imagem indisponível.' }, { status: 503 })
  }

  // Recusa ANTES de gastar uma chamada à IA — gerar uma ilustração genérica
  // para um pedido de tabela/classificação/correspondência não serve a questão
  // nenhuma, só desperdiça tempo. Orienta para a ferramenta certa em vez disso.
  if (looksTechnical(String(description))) {
    return NextResponse.json({
      guidance: 'Isto pede conteúdo estruturado (tabela, classificação, correspondência) ou um diagrama técnico — não é uma ilustração. Usa o separador "📊 Tabela" aqui ao lado para gerar uma tabela com dados reais, ou edita o enunciado directamente se for um gráfico (bar_chart/pie_chart).',
    }, { status: 422 })
  }

  try {
    const { prompt: imagePrompt, aspectRatio } = await craftPrompt(
      String(description), String(subject), Number(yearLevel), geminiKey,
      correctAnswer ? String(correctAnswer) : undefined
    )

    const image = await tryGeminiImage(imagePrompt, aspectRatio, geminiKey) ?? await tryPollinations(imagePrompt, aspectRatio)
    if (!image) {
      return NextResponse.json({ error: 'Não foi possível gerar a imagem. Tenta novamente.' }, { status: 503 })
    }

    return NextResponse.json({ image, promptUsed: imagePrompt })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[IMAGE] Falha geral:', msg)
    return NextResponse.json({ error: 'Não foi possível gerar a imagem. Tenta novamente.' }, { status: 503 })
  }
}
