// ── Análise dedicada ao USO DA LÍNGUA (aditiva, pós-correcção) ─────────────────
// Diagnóstico pedagógico e QUANTIFICADO da escrita do aluno a partir das respostas
// abertas já corrigidas. NÃO altera a cotação. Conta erros por categoria, aponta
// virtudes, dá recomendações coerentes com o desempenho, e sinaliza escrita pouco
// fidedigna (cópia/IA) — porque não se pode avaliar a língua de um texto que o aluno
// não escreveu. Normaliza por 100 palavras para comparar com justiça.
import type { TestSnapshot } from './types'
import { getAllQuestions } from './types'
import { callJsonCascade } from '@/lib/ai/singleCall'
import { parseIntegrity } from './integrity'

export const LANG_CATEGORIES = [
  { key: 'ortografia',   label: 'Ortografia' },
  { key: 'acentuacao',   label: 'Acentuação' },
  { key: 'pontuacao',    label: 'Pontuação' },
  { key: 'gramatica',    label: 'Gramática / concordância' },
  { key: 'sintaxe',      label: 'Construção frásica' },
  { key: 'vocabulario',  label: 'Vocabulário / propriedade' },
  { key: 'interpretacao', label: 'Interpretação do enunciado' },
  { key: 'coerencia',    label: 'Coerência / coesão' },
] as const
export type LangCategory = typeof LANG_CATEGORIES[number]['key']
const CAT_KEYS = LANG_CATEGORIES.map(c => c.key) as string[]
export const catLabel = (k: string) => LANG_CATEGORIES.find(c => c.key === k)?.label ?? k

export interface LangIssue { category: LangCategory; wrong: string; correct: string; qKey?: string }
export interface LanguageAnalysis {
  v: 1
  counts: Record<string, number>   // erros por categoria
  total: number
  wordCount: number                // nº de palavras analisadas (normalização)
  per100: number                   // erros por 100 palavras
  issues: LangIssue[]              // exemplos (limitados)
  virtues: string[]
  diagnostic: string
  recommendations: string[]
  reliability: 'ok' | 'suspeita'
  reliabilityReason?: string
}

const OPEN = new Set(['short_answer', 'long_answer', 'fill_blank'])
const countWords = (s: string) => (s.trim().match(/\S+/g) ?? []).length

// Cor por densidade de erros (por 100 palavras) — verde/âmbar/vermelho.
export function langColor(per100: number): { bg: string; fg: string; label: string } {
  if (per100 <= 1) return { bg: '#dcfce7', fg: '#166534', label: 'bom' }
  if (per100 <= 3) return { bg: '#fef9c3', fg: '#854d0e', label: 'a melhorar' }
  return { bg: '#fee2e2', fg: '#991b1b', label: 'frágil' }
}

/** Analisa a língua de UMA submissão (respostas abertas). Usa o % do aluno para
 *  tornar as recomendações coerentes com o desempenho. Devolve null se a cascata falhar. */
export async function analyzeLanguage(
  snapshot: TestSnapshot,
  answers: Record<string, string>,
  ctx: { pct?: number } = {},
): Promise<LanguageAnalysis | null> {
  const open = getAllQuestions(snapshot).filter(q => OPEN.has(q.type))
  const items = open
    .map(q => ({ qKey: String(q.index), question: q.text, answer: String(answers[String(q.index)] ?? '').trim() }))
    .filter(s => s.answer.length >= 4 && !/\[\?\]/.test(s.answer))
  const wordCount = items.reduce((n, s) => n + countWords(s.answer), 0)
  if (items.length === 0 || wordCount < 8) {
    return { v: 1, counts: {}, total: 0, wordCount, per100: 0, issues: [], virtues: [],
      diagnostic: 'Texto escrito insuficiente para uma análise de língua fiável.', recommendations: [], reliability: 'ok' }
  }

  const pctLine = typeof ctx.pct === 'number' ? `O aluno teve ${ctx.pct}% no teste — ajusta o tom e as recomendações a este desempenho.` : ''
  const prompt = `És um professor de Português (norma do português europeu, ensino básico, 10-12 anos) a fazer um DIAGNÓSTICO DE ESCRITA, não a pontuar. Analisa SÓ o uso da língua nas respostas do aluno.
${pctLine}

Para cada resposta tens a PERGUNTA (para julgares a interpretação) e o TEXTO do aluno:
${items.map((s, i) => `#${i + 1} [q${s.qKey}]\nPergunta: ${s.question}\nResposta: ${s.answer}`).join('\n\n')}

CATEGORIAS (conta só problemas CLAROS, com exemplo): ortografia, acentuacao, pontuacao, gramatica (concordância, tempos verbais), sintaxe (construção frásica), vocabulario (propriedade/registo), interpretacao (respondeu ao que a pergunta pede?), coerencia (organização, conectores).

REGRAS:
- Conta cada problema UMA vez, na categoria certa; dá exemplos "wrong"→"correct" (em interpretacao/coerencia, "correct" pode ser uma indicação curta do que faltou).
- NÃO assinales notação matemática, símbolos, abreviaturas legítimas, nem escolhas de estilo aceitáveis. Não inventes erros.
- "virtues": 1 a 3 pontos fortes REAIS (ex.: frases claras, vocabulário rico, boa organização). Se não houver, lista vazia.
- "diagnostic": 2-3 frases construtivas em PT-PT, coerentes com o desempenho.
- "recommendations": 2 a 4 medidas concretas e accionáveis, dirigidas aos problemas dominantes.
- "reliability": "suspeita" se a escrita for implausivelmente polida para a idade/ano ou tiver cara de copiada/IA (e explica em "reliabilityReason"); senão "ok". Escrita boa e própria da idade é "ok".

Responde APENAS com JSON válido (sem markdown):
{"counts":{"ortografia":0,"acentuacao":0,"pontuacao":0,"gramatica":0,"sintaxe":0,"vocabulario":0,"interpretacao":0,"coerencia":0},
"issues":[{"category":"ortografia","wrong":"","correct":"","q":"<qKey>"}],
"virtues":["..."],"diagnostic":"...","recommendations":["..."],"reliability":"ok","reliabilityReason":""}`

  const out = await callJsonCascade(prompt, { maxTokens: 2_500 })
  if (!out) return null

  const counts: Record<string, number> = {}
  let total = 0
  const rawCounts = (out.counts ?? {}) as Record<string, unknown>
  for (const k of CAT_KEYS) {
    const n = Math.max(0, Math.round(Number(rawCounts[k]) || 0))
    if (n > 0) { counts[k] = n; total += n }
  }
  const issues: LangIssue[] = (Array.isArray(out.issues) ? out.issues : [])
    .map((x: Record<string, unknown>) => ({
      category: (CAT_KEYS.includes(String(x.category)) ? String(x.category) : 'ortografia') as LangCategory,
      wrong: String(x.wrong ?? '').slice(0, 120),
      correct: String(x.correct ?? '').slice(0, 120),
      qKey: x.q != null ? String(x.q) : undefined,
    }))
    .filter((x: LangIssue) => x.wrong || x.correct)
    .slice(0, 20)
  const reliability = out.reliability === 'suspeita' ? 'suspeita' : 'ok'

  return {
    v: 1, counts, total, wordCount,
    per100: wordCount > 0 ? Math.round((total / wordCount) * 100 * 10) / 10 : 0,
    issues,
    virtues: (Array.isArray(out.virtues) ? out.virtues : []).map(String).slice(0, 4),
    diagnostic: String(out.diagnostic ?? '').slice(0, 600),
    recommendations: (Array.isArray(out.recommendations) ? out.recommendations : []).map(String).slice(0, 5),
    reliability,
    reliabilityReason: reliability === 'suspeita' ? String(out.reliabilityReason ?? '').slice(0, 200) : undefined,
  }
}

/** Lê a análise de língua guardada numa submissão (em answers.__integrity.language). */
export function readLanguage(answers: Record<string, string> | null | undefined): LanguageAnalysis | null {
  const rec = parseIntegrity(answers) as { language?: LanguageAnalysis } | null
  return rec?.language ?? null
}

// ── Agregado por turma ─────────────────────────────────────────────────────────
export interface LanguageAggregate {
  nStudents: number
  nSuspeita: number
  totalWords: number
  byCategory: { key: string; label: string; errors: number; per100: number }[]  // ordenado do mais frágil
  recommendations: string[]
}

export function aggregateLanguage(list: LanguageAnalysis[]): LanguageAggregate {
  const usable = list.filter(a => a.wordCount >= 8)
  const totalWords = usable.reduce((n, a) => n + a.wordCount, 0)
  const byCategory = LANG_CATEGORIES.map(c => {
    const errors = usable.reduce((n, a) => n + (a.counts[c.key] ?? 0), 0)
    return { key: c.key, label: c.label, errors, per100: totalWords > 0 ? Math.round((errors / totalWords) * 100 * 10) / 10 : 0 }
  }).sort((a, b) => b.per100 - a.per100)

  const nSuspeita = list.filter(a => a.reliability === 'suspeita').length
  const weak = byCategory.filter(c => c.per100 > 1).slice(0, 3)
  const recommendations: string[] = []
  if (usable.length === 0) recommendations.push('Ainda sem texto suficiente para uma análise de língua da turma.')
  else {
    if (weak.length) recommendations.push(`Focos da turma: ${weak.map(w => `${w.label} (${w.per100}/100 palavras)`).join(', ')} — trabalhar com exercícios dirigidos.`)
    else recommendations.push('A turma escreve, no conjunto, com poucos erros — manter e subir a exigência (coesão, vocabulário).')
    if (nSuspeita > 0) recommendations.push(`${nSuspeita} texto(s) com escrita pouco fidedigna (possível cópia/IA) — não servem para avaliar a escrita; confirmar presencialmente.`)
  }
  return { nStudents: usable.length, nSuspeita, totalWords, byCategory, recommendations }
}
