import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

// ── Tenta Gemini, recorre a Groq em falha (503/429/timeout) — mesmo princípio
// de resiliência do resto da app. ────────────────────────────────────────────
async function callAI(prompt: string, geminiKey: string, groqKey?: string, maxTokens = 600): Promise<string> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: AbortSignal.timeout(15_000),
      }
    )
    if (!res.ok) throw new Error(`Gemini falhou: HTTP ${res.status}`)
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
    if (!text) throw new Error('Gemini sem texto')
    return text
  } catch (geminiErr) {
    if (!groqKey) throw geminiErr
    console.warn('[TABLE] Gemini falhou, a tentar Groq:', geminiErr instanceof Error ? geminiErr.message : geminiErr)
    const Groq = (await import('groq-sdk')).default
    const groq = new Groq({ apiKey: groqKey })
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: maxTokens,
    })
    const text = completion.choices[0]?.message?.content
    if (!text) throw new Error('Groq sem texto')
    return text
  }
}

// ── Passo 1: avalia se o pedido é específico o suficiente para gerar dados
// factualmente correctos. Se for vago, devolve perguntas em vez de adivinhar —
// é a forma de nunca inventar dados quando o âmbito não está claro. ─────────────
async function assessVagueness(
  description: string, subject: string, yearLevel: number, topic: string, geminiKey: string, groqKey?: string
): Promise<{ vague: boolean; questions?: string[] }> {
  const prompt = `És um professor de ${subject} do ${yearLevel}.º ano em Portugal, tema "${topic}". Um colega pediu para gerar uma tabela de dados para uma questão de avaliação:

"${description}"

Avalia: este pedido tem informação suficiente para gerares uma tabela com dados CONCRETOS e factualmente correctos (sabes exactamente quantas linhas, que exemplos específicos, que critério de classificação)? Ou é vago demais (ex: não diz quantos exemplos, nem que critério de classificação usar, e há várias formas razoáveis de interpretar o pedido)?

Responde APENAS com JSON:
- Se for específico o suficiente: {"vague": false}
- Se for vago: {"vague": true, "questions": ["pergunta 1 curta e concreta", "pergunta 2 se necessário"]}
Máximo 2 perguntas, directas, que um professor responda em poucas palavras.`

  const raw = await callAI(prompt, geminiKey, groqKey, 300)
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return { vague: false }
  try {
    const parsed = JSON.parse(match[0]) as { vague: boolean; questions?: string[] }
    // Nem todos os modelos respeitam "máximo 2 perguntas" à risca — limite
    // defensivo para a UI nunca mostrar uma lista longa.
    if (parsed.questions) parsed.questions = parsed.questions.slice(0, 3)
    return parsed
  } catch {
    return { vague: false }
  }
}

// ── Passo 2: gera a tabela com dados reais e correctos ───────────────────────
async function generateTable(
  description: string, subject: string, yearLevel: number, topic: string,
  clarification: string | undefined, geminiKey: string, groqKey?: string
): Promise<{ headers: string[]; rows: string[][] }> {
  const clarificationNote = clarification ? `\nESCLARECIMENTO DO PROFESSOR: ${clarification}` : ''
  const prompt = `És um professor especialista de ${subject} do ${yearLevel}.º ano em Portugal, tema "${topic}". Cria uma tabela de dados para uma questão de avaliação:

"${description}"${clarificationNote}

REGRAS OBRIGATÓRIAS:
1. Todos os dados têm de ser FACTUALMENTE CORRECTOS e verificáveis — nunca inventes classificações, valores ou factos errados. Se tiveres dúvida genuína sobre um dado específico, usa um exemplo mais conhecido/inequívoco em vez de arriscar.
2. Português de Portugal estrito.
3. Linhas e colunas adequadas ao ${yearLevel}.º ano — nem trivial demais, nem excessivamente técnico.
4. Entre 4 e 8 linhas de dados (sem contar o cabeçalho), salvo indicação contrária explícita do professor.

Responde APENAS com este JSON válido (sem texto extra, sem markdown):
{"headers": ["Coluna 1", "Coluna 2"], "rows": [["valor", "valor"], ["valor", "valor"]]}`

  const raw = await callAI(prompt, geminiKey, groqKey, 800)
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta da IA inválida')
  const parsed = JSON.parse(match[0]) as { headers: string[]; rows: string[][] }
  if (!parsed.headers?.length || !parsed.rows?.length) throw new Error('Tabela incompleta')
  return parsed
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { description, subject, yearLevel, topic, clarification } = await request.json()
  if (!description || !subject || !yearLevel) {
    return NextResponse.json({ error: 'Parâmetros incompletos' }, { status: 400 })
  }

  const geminiKey = process.env.GEMINI_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  if (!geminiKey) return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 })

  try {
    // Só avalia vacuidade na primeira chamada (sem esclarecimento ainda) —
    // depois de o professor responder, avança directamente para gerar.
    if (!clarification) {
      const assessment = await assessVagueness(String(description), String(subject), Number(yearLevel), String(topic ?? ''), geminiKey, groqKey)
      if (assessment.vague && assessment.questions?.length) {
        return NextResponse.json({ needsClarification: true, questions: assessment.questions })
      }
    }

    const table = await generateTable(
      String(description), String(subject), Number(yearLevel), String(topic ?? ''),
      clarification ? String(clarification) : undefined, geminiKey, groqKey
    )
    return NextResponse.json({ table: { type: 'table', ...table } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[TABLE] Falha:', msg)
    return NextResponse.json({ error: 'Não foi possível gerar a tabela. Tenta novamente.' }, { status: 503 })
  }
}
