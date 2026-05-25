import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import type { Question, GradingDetail, TestSnapshot } from './types'
import { getAllQuestions } from './types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

// ── Correcção automática MCQ / V-F ────────────────────────────────────────────
function gradeObjective(q: Question, rawAnswer: string): GradingDetail {
  const answer = rawAnswer.trim().toUpperCase()
  const correct = q.correctAnswer.trim().toUpperCase()

  // Normaliza opções: aceita "A", "A)", "A. texto", "Verdadeiro", "V", "True"
  let isCorrect = answer === correct

  // Verdadeiro / Falso — variantes aceites
  if (q.type === 'true_false') {
    const truthy = ['V', 'VERDADEIRO', 'TRUE', 'T']
    const falsy  = ['F', 'FALSO', 'FALSE']
    const normAnswer  = truthy.includes(answer) ? 'V' : falsy.includes(answer)  ? 'F' : answer
    const normCorrect = truthy.includes(correct) ? 'V' : falsy.includes(correct) ? 'F' : correct
    isCorrect = normAnswer === normCorrect
  }

  return {
    score:  isCorrect ? q.points : 0,
    max:    q.points,
    feedback: isCorrect ? 'Correcto.' : `Resposta correcta: ${q.correctAnswer}`,
    auto:   true,
  }
}

// ── Correcção por IA (resposta aberta) ────────────────────────────────────────
async function gradeOpenWithAI(
  q: Question,
  rawAnswer: string,
  subject: string,
): Promise<GradingDetail> {
  const trimmed = rawAnswer.trim()
  if (!trimmed) {
    return { score: 0, max: q.points, feedback: 'Sem resposta.', auto: true, ai_confidence: 1 }
  }

  const prompt = `És um professor experiente de ${subject} a corrigir a resposta de um aluno.

QUESTÃO: ${q.text}
TIPO: ${q.type}
COTAÇÃO MÁXIMA: ${q.points} pontos
CRITÉRIOS DE CORRECÇÃO: ${q.markScheme ?? q.correctAnswer}

RESPOSTA DO ALUNO: ${trimmed}

Avalia a resposta com rigor mas justiça. Aplica cotação parcial quando os critérios o permitem.
Responde APENAS com JSON válido (sem texto extra, sem markdown):
{"score": <número de 0 a ${q.points}>, "feedback": "<frase curta de justificação em Português de Portugal>", "confidence": <0.0 a 1.0>}`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const match = text.match(/\{[\s\S]*?\}/)
    if (!match) throw new Error('no json')
    const parsed = JSON.parse(match[0]) as { score: number; feedback: string; confidence: number }
    const score = Math.min(Math.max(0, Number(parsed.score) || 0), q.points)
    return {
      score,
      max: q.points,
      feedback: parsed.feedback ?? '',
      auto: true,
      ai_confidence: parsed.confidence ?? 0.8,
    }
  } catch {
    // Fallback Groq
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Responde APENAS com JSON válido. Nunca adiciones texto extra.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 256,
      })
      const text = completion.choices[0]?.message?.content ?? ''
      const match = text.match(/\{[\s\S]*?\}/)
      if (!match) throw new Error('no json')
      const parsed = JSON.parse(match[0]) as { score: number; feedback: string; confidence: number }
      const score = Math.min(Math.max(0, Number(parsed.score) || 0), q.points)
      return { score, max: q.points, feedback: parsed.feedback ?? '', auto: true, ai_confidence: 0.7 }
    } catch {
      // Falha total — marcar para revisão manual
      return {
        score: 0,
        max: q.points,
        feedback: '⚠️ Não foi possível avaliar automaticamente. Revê manualmente.',
        auto: false,
        ai_confidence: 0,
      }
    }
  }
}

// ── Correcção completa de uma submissão ───────────────────────────────────────
export async function gradeSubmission(
  snapshot: TestSnapshot,
  answers: Record<string, string>,
): Promise<{
  details: Record<string, GradingDetail>
  totalScore: number
  maxScore: number
}> {
  const questions = getAllQuestions(snapshot)
  const details: Record<string, GradingDetail> = {}

  const tasks = questions.map(async q => {
    const key = String(q.index)
    const raw = answers[key] ?? ''

    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      details[key] = gradeObjective(q, raw)
    } else {
      details[key] = await gradeOpenWithAI(q, raw, snapshot.subject)
    }
  })

  await Promise.all(tasks)

  const totalScore = Object.values(details).reduce((s, d) => s + d.score, 0)
  const maxScore   = questions.reduce((s, q) => s + q.points, 0)

  return { details, totalScore, maxScore }
}
