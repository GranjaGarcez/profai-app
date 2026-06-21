import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

// ── Detecta pedidos que precisam de precisão técnica — a IA de imagem não serve ──
// Diagramas legendados, gráficos com valores exactos, circuitos, mapas com dados
// reais: continuam a ser tarefa do sistema de figuras SVG (MathFigure), nunca desta
// rota. Aqui só geramos ilustração decorativa/contextual.
const TECHNICAL_HINTS = [
  'gráfico', 'circuito', 'esquema eléctrico', 'diagrama legendado', 'mapa com dados',
  'fórmula', 'equação', 'valores exactos', 'tabela de dados', 'eixo', 'escala',
]

function looksTechnical(description: string): boolean {
  const s = description.toLowerCase()
  return TECHNICAL_HINTS.some(h => s.includes(h))
}

// ── Passo 1: a IA escreve o prompt de imagem optimizado a partir do contexto ─────
function buildImagePrompt(description: string, subject: string, yearLevel: number, correctAnswer?: string): string {
  const avoidAnswerNote = correctAnswer
    ? `\n6. PROIBIDO ABSOLUTO — NUNCA REVELAR A RESPOSTA: a resposta correcta desta questão é "${correctAnswer}". Se a questão pede para contar, medir ou calcular algo, a imagem NÃO pode mostrar essa quantidade/valor exacto de forma visualmente contável ou óbvia (ex: se a resposta é "5", não desenhes exactamente 5 objectos bem separados e fáceis de contar — usa uma cena mais ambígua, parcialmente sobreposta, ou simplesmente não relacionada com a contagem em si). A imagem dá CONTEXTO, nunca a SOLUÇÃO.`
    : ''

  return `Cria um prompt de imagem em inglês, optimizado para um modelo de text-to-image, a partir deste pedido de um professor de ${subject} do ${yearLevel}.º ano em Portugal:

"${description}"

REGRAS OBRIGATÓRIAS DO PROMPT QUE VAIS ESCREVER:
1. Estilo: ilustração educativa colorida, vibrante, adequada a alunos de ${yearLevel <= 6 ? '10–12 anos' : yearLevel <= 9 ? '12–15 anos' : '15–18 anos'} — nunca infantilizado de mais nem assustador.
2. PROIBIDO ABSOLUTO no prompt: pedir texto, números, legendas, eixos, escalas ou qualquer rótulo escrito dentro da imagem — modelos de imagem escrevem texto errado com frequência.
3. PROIBIDO ABSOLUTO: pedir precisão técnica/factual (proporções científicas exactas, mapas geograficamente correctos, circuitos funcionais) — isto é só ilustração de contexto, nunca um diagrama que o aluno tenha de ler com precisão.
4. Composição simples e clara, sem elementos sobrepostos confusos.
5. Em inglês, conciso (máximo 40 palavras), terminologia de prompt de imagem (estilo, iluminação, composição).${avoidAnswerNote}

Responde APENAS com o prompt em inglês, sem explicações, sem aspas, sem markdown.`
}

async function craftPrompt(description: string, subject: string, yearLevel: number, geminiKey: string, correctAnswer?: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildImagePrompt(description, subject, yearLevel, correctAnswer) }] }],
      }),
      signal: AbortSignal.timeout(15_000),
    }
  )
  if (!res.ok) throw new Error(`Gemini craft falhou: HTTP ${res.status}`)
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
  if (!text) throw new Error('Gemini craft sem texto')
  return text.trim().replace(/^["']|["']$/g, '')
}

// ── Passo 2a: Gemini "Nano Banana" (gemini-2.5-flash-image) — 500 pedidos/dia grátis ──
async function tryGeminiImage(imagePrompt: string, geminiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: imagePrompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
        signal: AbortSignal.timeout(30_000),
      }
    )
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
async function tryPollinations(imagePrompt: string): Promise<string | null> {
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=768&height=768&nologo=true`
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

  const technicalWarning = looksTechnical(String(description))
    ? 'Este pedido parece pedir precisão técnica (gráfico, circuito, valores exactos). A imagem gerada é só ilustrativa — para diagramas que o aluno tenha de ler com precisão, usa o sistema de figuras do teste em vez desta imagem.'
    : null

  try {
    const imagePrompt = await craftPrompt(
      String(description), String(subject), Number(yearLevel), geminiKey,
      correctAnswer ? String(correctAnswer) : undefined
    )

    const image = await tryGeminiImage(imagePrompt, geminiKey) ?? await tryPollinations(imagePrompt)
    if (!image) {
      return NextResponse.json({ error: 'Não foi possível gerar a imagem. Tenta novamente.' }, { status: 503 })
    }

    return NextResponse.json({ image, promptUsed: imagePrompt, technicalWarning })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[IMAGE] Falha geral:', msg)
    return NextResponse.json({ error: 'Não foi possível gerar a imagem. Tenta novamente.' }, { status: 503 })
  }
}
