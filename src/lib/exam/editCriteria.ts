// ── Editar a CORRIGENDA de uma pergunta num exame já lançado ───────────────────
// O snapshot do exame (exam_sessions.test_snapshot) está congelado no lançamento.
// Esta função altera APENAS a corrigenda (correctAnswer + markScheme + bloomLevel)
// de UMA pergunta, de forma imutável (devolve um snapshot NOVO), preservando:
//   • o enunciado, as opções, a cotação, o tipo, o índice e a figura da pergunta;
//   • todas as OUTRAS perguntas, byte a byte;
//   • a corrigenda ANTERIOR, empilhada em `_criteriaHistory` (nunca se perde o
//     original — permite repor à mão se for preciso).
// Não escreve na base de dados — isso é da responsabilidade do endpoint.
import type { TestSnapshot, Question } from './types'
import { fixMarkSchemeSum } from './markScheme'

export interface CriteriaEdit {
  correctAnswer: string
  markScheme: string
  bloomLevel?: string
}

export function applyCriteriaEdit(
  snapshot: TestSnapshot,
  questionKey: string,
  edit: CriteriaEdit,
): { snapshot: TestSnapshot; found: boolean; points?: number; previous?: CriteriaEdit } {
  let found = false
  let points: number | undefined
  let previous: CriteriaEdit | undefined

  const patch = (q: Question): Question => {
    if (String(q.index) !== String(questionKey)) return q   // intocável
    found = true
    points = q.points
    previous = { correctAnswer: q.correctAnswer, markScheme: q.markScheme ?? '', bloomLevel: q.bloomLevel }
    // Mantém a soma dos critérios = cotação (comportamento igual ao resto da app).
    const markScheme = fixMarkSchemeSum(edit.markScheme, q.points) ?? edit.markScheme
    return {
      ...q,                                   // enunciado, opções, figura, pontos, tipo, índice: intactos
      correctAnswer: edit.correctAnswer.trim(),
      markScheme,
      bloomLevel: edit.bloomLevel?.trim() || q.bloomLevel,
      _criteriaHistory: [...(q._criteriaHistory ?? []), { at: new Date().toISOString(), ...previous }],
    }
  }

  const next: TestSnapshot = (snapshot.groups && snapshot.groups.length > 0)
    ? { ...snapshot, groups: snapshot.groups.map(g => ({ ...g, questions: g.questions.map(patch) })) }
    : { ...snapshot, questions: (snapshot.questions ?? []).map(patch) }

  return { snapshot: next, found, points, previous }
}
