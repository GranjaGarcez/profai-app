import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import type { Question, GradingDetail, RubricCriterion, TestSnapshot } from './types'
import { getAllQuestions } from './types'

// Inicialização lazy — evita falha de build quando as env vars não estão disponíveis em build time
function getGenAI() { return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!) }
function getGroq()  { return new Groq({ apiKey: process.env.GROQ_API_KEY! }) }

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
  calcHistory?: string,   // formatted calc log, e.g. "1. sin(30) = 0.5 | 2. 3 × 4 = 12"
): Promise<GradingDetail> {
  const trimmed = rawAnswer.trim()
  if (!trimmed && !calcHistory) {
    return { score: 0, max: q.points, feedback: 'Sem resposta.', auto: true, ai_confidence: 1 }
  }

  const calcSection = calcHistory
    ? `\nCÁLCULOS EFECTUADOS NA CALCULADORA (registo cronológico bruto):
${calcHistory}

COMO INTERPRETAR ESTE REGISTO:
- O registo é bruto: pode conter teclas erradas, tentativas canceladas ou cálculos mentais verificados.
- Procura a sequência coerente que conduz ao resultado — ignora entradas isoladas ou sem relação com a questão.
- Se um passo intermédio não aparece (ex: o aluno escreve "16" sem mostrar "4×4"), trata-o como cálculo mental legítimo.
- Só penalizes cálculos da calculadora se forem claramente contraditórios com a resolução apresentada.`
    : ''

  const isLong = q.type === 'long_answer'

  const rubricInstruction = isLong ? `
RUBRICA OBRIGATÓRIA: O markScheme contém critérios com pontuação máxima (ex: "Tese (7pt) + Argumentação (16pt)...").
Identifica cada critério e avalia-o individualmente. Devolve o array "rubric" com todos os critérios encontrados.
A soma dos "score" da rubrica DEVE ser igual ao "score" total.` : ''

  const responseFormat = isLong
    ? `{"score": <total 0–${q.points}>, "rubric": [{"criterion": "<nome>", "score": <pontos>, "max": <máximo>}], "feedback": "<frase curta PT-PT>", "confidence": <0.0–1.0>}`
    : `{"score": <0–${q.points}>, "feedback": "<frase curta PT-PT>", "confidence": <0.0–1.0>}`

  const prompt = `És um professor experiente de ${subject} a corrigir a resposta de um aluno.

QUESTÃO: ${q.text}
TIPO: ${q.type}
COTAÇÃO MÁXIMA: ${q.points} pontos
CRITÉRIOS DE CORRECÇÃO: ${q.markScheme ?? q.correctAnswer}

RESPOSTA DO ALUNO: ${trimmed || '(sem texto)'}
${calcSection}
REGRAS DE CORRECÇÃO — aplica todas sem excepção:
1. Avalia o TRABALHO RELEVANTE, não a apresentação: o que conta é a estratégia correcta e o resultado, não a formatação ou a existência de todos os passos escritos.
2. Passos intermédios omitidos (ex: escrever "16" sem mostrar "4×4") são cálculo mental legítimo — não penalizes.
3. Aceita qualquer notação matematicamente equivalente: 3/4 = 0,75 = ¾ = 75% são todas correctas.
4. Não penalizes a ausência de fórmula explícita se o desenvolvimento evidencia o processo.
5. Penaliza APENAS o que a questão pede explicitamente — não inventes requisitos.
6. Erro de cálculo menor com raciocínio correcto → cotação parcial (≥ 50%).
7. Resultado correcto com método diferente do esperado → cotação máxima.
8. IN DUBIO PRO DISCIPULUM: em caso de dúvida genuína sobre se a resposta é correcta ou parcialmente correcta, decide sempre a favor do aluno. A confiança deve reflectir essa dúvida (valor baixo).
9. O histórico da calculadora mostra a estratégia usada, não um rascunho limpo — procura a linha coerente e ignora ruído.
10. O feedback deve ser uma frase curta, construtiva e em Português de Portugal.
${rubricInstruction}

Responde APENAS com JSON válido (sem texto extra, sem markdown):
${responseFormat}`

  try {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const match = text.match(/\{[\s\S]*?\}/)
    if (!match) throw new Error('no json')
    const parsed = JSON.parse(match[0]) as { score: number; feedback: string; confidence: number; rubric?: RubricCriterion[] }
    const score = Math.min(Math.max(0, Number(parsed.score) || 0), q.points)
    return {
      score,
      max: q.points,
      feedback: parsed.feedback ?? '',
      rubric: parsed.rubric?.length ? parsed.rubric : undefined,
      auto: true,
      ai_confidence: parsed.confidence ?? 0.8,
    }
  } catch (geminiErr) {
    console.warn('Gemini grading falhou, a usar Groq:', geminiErr instanceof Error ? geminiErr.message : geminiErr)
    // Fallback Groq
    try {
      const completion = await getGroq().chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Responde APENAS com JSON válido. Nunca adiciones texto extra.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 512,
      })
      const text = completion.choices[0]?.message?.content ?? ''
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('no json')
      const parsed = JSON.parse(match[0]) as { score: number; feedback: string; confidence: number; rubric?: RubricCriterion[] }
      const score = Math.min(Math.max(0, Number(parsed.score) || 0), q.points)
      return { score, max: q.points, feedback: parsed.feedback ?? '', rubric: parsed.rubric?.length ? parsed.rubric : undefined, auto: true, ai_confidence: 0.7 }
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
    const calcKey = `calc_${key}`
    const calcHistory = answers[calcKey] ?? undefined

    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      details[key] = gradeObjective(q, raw)
    } else {
      details[key] = await gradeOpenWithAI(q, raw, snapshot.subject, calcHistory)
    }
  })

  await Promise.all(tasks)

  const totalScore = Object.values(details).reduce((s, d) => s + d.score, 0)
  const maxScore   = questions.reduce((s, q) => s + q.points, 0)

  return { details, totalScore, maxScore }
}
