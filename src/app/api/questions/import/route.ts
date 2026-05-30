import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

interface StructuredQuestion {
  text: string
  type: string
  points: number
  bloomLevel: string
  subtopic: string
  options?: string[] | null
  correctAnswer?: string | null
  difficulty: string
  markScheme: {
    totalPoints: number
    criteria: { description: string; points: number }[]
    modelAnswer: string
  }
}

function buildPrompt(rawText: string, subject: string, yearLevel: number): string {
  return `És um professor português experiente em ${subject}. Analisa o texto e extrai todas as questões pedagógicas que encontrares.

Para cada questão retorna JSON com:
- text: enunciado completo em Português de Portugal ESTRITO ("fracção", "rectângulo", "actividade", "recta numérica" — nunca formas brasileiras)
- type: "multiple-choice" | "short-answer" | "essay" | "true-false"
- points: pontuação (retira do texto ou 10 por defeito)
- bloomLevel: "Recordar" | "Compreender" | "Aplicar" | "Analisar" | "Avaliar" | "Criar"
- subtopic: subtema específico
- options: array ["A) ...", "B) ...", "C) ...", "D) ..."] se multiple-choice, senão null
- correctAnswer: letra (ex: "B") se multiple-choice, resposta curta se short-answer, null se essay
- difficulty: "easy" | "medium" | "hard"
- markScheme: { totalPoints, criteria: [{description, points}], modelAnswer }

TEXTO (${subject} — ${yearLevel}.º ano):
${rawText}

Responde APENAS com JSON válido:
{"questions": [...]}`
}

function parseQuestions(raw: string): StructuredQuestion[] {
  const clean = raw
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed.questions) ? parsed.questions : []
  } catch {
    return []
  }
}

async function structureWithAI(prompt: string): Promise<StructuredQuestion[]> {
  // 1.ª via: Gemini 2.5 Flash
  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
      })
      const result = await model.generateContent(prompt)
      const questions = parseQuestions(result.response.text())
      if (questions.length > 0) return questions
    } catch { /* fallback */ }
  }

  // 2.ª via: Groq llama-3.3-70b
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 4000,
        }),
        signal: AbortSignal.timeout(25_000),
      })
      if (res.ok) {
        const data = await res.json() as { choices: Array<{ message: { content: string } }> }
        const questions = parseQuestions(data.choices[0]?.message?.content ?? '')
        if (questions.length > 0) return questions
      }
    } catch { /* fallback */ }
  }

  // 3.ª via: SambaNova DeepSeek-V3.1
  const sambaKey = process.env.SAMBANOVA_API_KEY
  if (sambaKey) {
    try {
      const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sambaKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'DeepSeek-V3.1',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 4000,
        }),
        signal: AbortSignal.timeout(25_000),
      })
      if (res.ok) {
        const data = await res.json() as { choices: Array<{ message: { content: string } }> }
        const questions = parseQuestions(data.choices[0]?.message?.content ?? '')
        if (questions.length > 0) return questions
      }
    } catch { /* fallback */ }
  }

  throw new Error('Não foi possível estruturar o texto. Verifica se contém questões legíveis.')
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json() as {
    rawText: string
    subject: string
    yearLevel: number
    citation?: string
    sourceUrl?: string
    save: boolean
  }
  const { rawText, subject, yearLevel, citation, sourceUrl, save } = body

  if (!rawText?.trim()) {
    return NextResponse.json({ error: 'Texto em falta' }, { status: 400 })
  }

  let questions: StructuredQuestion[]
  try {
    questions = await structureWithAI(buildPrompt(rawText.trim(), subject, yearLevel))
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao estruturar' }, { status: 422 })
  }

  if (questions.length === 0) {
    return NextResponse.json({ error: 'Não foram encontradas questões no texto fornecido.' }, { status: 422 })
  }

  if (!save) return NextResponse.json({ questions })

  const admin = createAdminClient()
  const rows = questions.map(q => ({
    subject,
    year_level: yearLevel,
    text: q.text,
    type: q.type ?? 'short-answer',
    difficulty: q.difficulty ?? 'medium',
    topic: q.subtopic ?? '',
    bloom_level: q.bloomLevel ?? 'Aplicar',
    options: q.options ?? null,
    correct_answer: q.correctAnswer ?? null,
    mark_scheme: q.markScheme ?? null,
    points: q.points ?? 10,
    quality_score: 0.95,
    citation: citation ?? null,
    source_url: sourceUrl ?? null,
    is_active: true,
  }))

  const { data: inserted, error } = await admin
    .from('question_bank')
    .insert(rows)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ questions, savedIds: (inserted ?? []).map((r: { id: string }) => r.id) })
}
