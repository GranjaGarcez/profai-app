// Deteta incoerências de cotação numa submissão, para o professor não as deixar
// passar: (a) pergunta com nota ACIMA do seu máximo; (b) resposta EM BRANCO com
// pontos atribuídos. Puro, sem efeitos — usado no painel e na correção horizontal.
import type { Question } from './types'

export interface Incoherence {
  qKey: string
  n: number                              // número da pergunta (posição)
  type: 'over_max' | 'blank_scored'
  score: number
  max: number
}

export function questionIncoherence(
  q: Question, index: number,
  answers: Record<string, string> | null | undefined,
  details: Record<string, { score?: number; max?: number } > | null | undefined,
): Incoherence | null {
  const key = String(q.index)
  const det = details?.[key]
  if (!det) return null
  const score = Number(det.score) || 0
  const max = q.points
  if (score > max + 0.001) return { qKey: key, n: index + 1, type: 'over_max', score, max }
  const blank = String(answers?.[key] ?? '').trim() === ''
  if (blank && score > 0) return { qKey: key, n: index + 1, type: 'blank_scored', score, max }
  return null
}

export function findIncoherences(
  questions: Question[],
  answers: Record<string, string> | null | undefined,
  details: Record<string, { score?: number; max?: number }> | null | undefined,
): Incoherence[] {
  const out: Incoherence[] = []
  questions.forEach((q, i) => {
    const inc = questionIncoherence(q, i, answers, details)
    if (inc) out.push(inc)
  })
  return out
}

/** Valor são para uma incoerência: cortar ao máximo, ou 0 se estava em branco. */
export function saneScore(inc: Incoherence): number {
  return inc.type === 'blank_scored' ? 0 : inc.max
}
