// Data da última melhoria RELEVANTE do motor de correcção.
// As submissões corrigidas automaticamente ANTES desta data foram-no com critérios
// mais antigos → podem ser re-corrigidas ("Re-corrigir com os critérios novos").
// Actualizar sempre que a lógica/prompt de correcção mudar de forma que altere notas.
//
// Histórico:
//   2026-10-24 — "completar espaços" corrigido por significado (aceita sinónimos).
//
// Módulo próprio e sem dependências (ao contrário de grading.ts, que é de servidor):
// pode ser importado tanto no cliente (painel) como no servidor (endpoint).
export const GRADER_IMPROVED_AT = '2026-10-24T12:30:00Z'

// Tipos de pergunta afectados pela última melhoria do motor — a re-correcção só
// toca NESTES, preservando as outras perguntas (poupa tokens e não arrisca mexer
// no que já estava bem). Actualizar junto com GRADER_IMPROVED_AT.
//   2026-10-24 — "completar espaços" (fill_blank) corrigido por significado.
export const GRADER_AFFECTS: string[] = ['fill_blank']
