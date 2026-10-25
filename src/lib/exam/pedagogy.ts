// ── Estudo pedagógico: estatística de nível superior + recomendações ───────────
// Motor PURO e determinístico (sem React, sem rede): serve o ecrã, o Excel e o PDF.
// Não deixa de fora as variáveis que contam numa análise de teste:
//   • por item: dificuldade (p = acerto médio), DISCRIMINAÇÃO (separa quem sabe de
//     quem não sabe), taxa de erro;
//   • global: média/mediana/DP/mín/máx, distribuição por níveis (1-5), fiabilidade
//     (alfa de Cronbach);
//   • por nível de Bloom e por tipo de pergunta;
//   • perfil por aluno (forças/fraquezas por Bloom e por tipo);
//   • recomendações por REGRAS (baseline grátis) — a IA aprofunda a pedido.
import type { Question, GradingDetail, TestSnapshot } from './types'
import { getAllQuestions } from './types'
import { turmaLabel as turmaLabelOf } from './turma'

export interface SubLite {
  id: string
  student_name: string
  student_number: string | null
  student_class: string | null
  student_year?: number | null
  total_score: number | null
  max_score: number | null
  status: string
  grading_details: Record<string, GradingDetail> | null
}

// ── Helpers estatísticos ───────────────────────────────────────────────────────
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0)
function median(a: number[]) { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
function variance(a: number[]) { if (a.length < 2) return 0; const m = mean(a); return sum(a.map(v => (v - m) ** 2)) / (a.length - 1) }
function stdev(a: number[]) { return Math.sqrt(variance(a)) }

// Nível português 1-5 a partir da percentagem.
export function nivel(pct: number): 1 | 2 | 3 | 4 | 5 {
  if (pct < 20) return 1
  if (pct < 50) return 2
  if (pct < 70) return 3
  if (pct < 90) return 4
  return 5
}

export interface ItemStat {
  index: number; n: number; type: string; bloom: string; points: number
  avgScore: number; difficulty: number    // % acerto médio (↑ = mais fácil)
  errorRate: number                         // % de alunos < 50% no item
  discrimination: number | null             // D (27% sup − 27% inf), null se poucos alunos
  discLabel: 'boa' | 'razoável' | 'fraca' | 'revê' | 'n/d'
}

export interface StudentProfile {
  id: string; name: string; number: string | null; turma: string
  total: number; max: number; pct: number; nivel: number
  byBloom: Record<string, number>; byType: Record<string, number>
  weakBloom: string | null; weakType: string | null; strongBloom: string | null
}

export interface TurmaStat {
  turma: string; n: number; avg: number; max: number; avgPct: number
  passPct: number; min: number; max_: number; sd: number
}

export interface PedagogyReport {
  title: string; subject: string; yearLevel: number; topic: string
  nGraded: number; maxScore: number
  avg: number; median: number; sd: number; min: number; max: number
  passPct: number
  dist: { nivel: number; count: number; pct: number }[]   // distribuição por nível 1-5
  alpha: number | null                                     // fiabilidade (Cronbach)
  items: ItemStat[]
  bloom: { bloom: string; avgPct: number; count: number }[]
  types: { type: string; avgPct: number; count: number }[]
  turmas: TurmaStat[]
  students: StudentProfile[]
  recClass: string[]        // recomendações por regras — turma/global
  recStudents: { id: string; name: string; turma: string; notes: string[] }[]
}

const GRADED = (s: SubLite) => s.status === 'graded' || s.status === 'reviewed'

export function buildPedagogyReport(snapshot: TestSnapshot, subsAll: SubLite[]): PedagogyReport {
  const questions = getAllQuestions(snapshot)
  const fallbackYear = snapshot.yearLevel ?? null
  const graded = subsAll.filter(GRADED)
  const maxScore = graded.find(s => typeof s.max_score === 'number')?.max_score
    ?? questions.reduce((a, q) => a + q.points, 0)

  const totals = graded.map(s => s.total_score ?? 0)
  const avg = mean(totals), md = median(totals), sd = stdev(totals)
  const min = totals.length ? Math.min(...totals) : 0
  const max = totals.length ? Math.max(...totals) : 0
  const passPct = totals.length ? Math.round(100 * totals.filter(t => maxScore > 0 && t / maxScore >= 0.5).length / totals.length) : 0

  // Distribuição por nível (1-5)
  const dist = [1, 2, 3, 4, 5].map(nv => {
    const count = graded.filter(s => nivel(maxScore > 0 ? 100 * (s.total_score ?? 0) / maxScore : 0) === nv).length
    return { nivel: nv, count, pct: graded.length ? Math.round(100 * count / graded.length) : 0 }
  })

  // Pontuação por item e por aluno (matriz), em percentagem do item.
  const itemPctByStudent: Record<string, number[]> = {}   // index -> [pct por aluno]
  for (const q of questions) itemPctByStudent[String(q.index)] = []
  const studentItemScore: Record<string, Record<string, number>> = {}  // subId -> index -> score bruto
  for (const s of graded) {
    const d = s.grading_details ?? {}
    studentItemScore[s.id] = {}
    for (const q of questions) {
      const sc = d[String(q.index)]?.score
      const v = typeof sc === 'number' ? sc : 0
      studentItemScore[s.id][String(q.index)] = v
      itemPctByStudent[String(q.index)].push(q.points > 0 ? 100 * v / q.points : 0)
    }
  }

  // Discriminação: grupos 27% superior / inferior por total.
  const byTotal = [...graded].sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
  const gSize = Math.max(1, Math.floor(byTotal.length * 0.27))
  const enoughForD = byTotal.length >= 10
  const upper = byTotal.slice(0, gSize), lower = byTotal.slice(-gSize)

  const items: ItemStat[] = questions.map(q => {
    const key = String(q.index)
    const pcts = itemPctByStudent[key]
    const n = pcts.length
    const difficulty = Math.round(mean(pcts))
    const avgScore = q.points > 0 ? difficulty / 100 * q.points : 0
    const errorRate = n ? Math.round(100 * pcts.filter(p => p < 50).length / n) : 0
    let discrimination: number | null = null
    let discLabel: ItemStat['discLabel'] = 'n/d'
    if (enoughForD) {
      const up = mean(upper.map(s => q.points > 0 ? 100 * (studentItemScore[s.id][key] ?? 0) / q.points : 0))
      const lo = mean(lower.map(s => q.points > 0 ? 100 * (studentItemScore[s.id][key] ?? 0) / q.points : 0))
      discrimination = Math.round((up - lo)) / 100   // 0–1 (fracção)
      discLabel = discrimination >= 0.4 ? 'boa' : discrimination >= 0.2 ? 'razoável' : discrimination >= 0.1 ? 'fraca' : 'revê'
    }
    return { index: q.index, n, type: q.type, bloom: q.bloomLevel ?? 'Não definido', points: q.points, avgScore, difficulty, errorRate, discrimination, discLabel }
  })

  // Alfa de Cronbach (fiabilidade) — precisa de variância entre alunos.
  let alpha: number | null = null
  if (graded.length >= 3 && questions.length >= 2) {
    const k = questions.length
    const itemVars = questions.map(q => variance(graded.map(s => studentItemScore[s.id][String(q.index)] ?? 0)))
    const totalVar = variance(totals)
    alpha = totalVar > 0 ? (k / (k - 1)) * (1 - sum(itemVars) / totalVar) : null
    if (alpha !== null) alpha = Math.round(alpha * 100) / 100
  }

  // Agregados por Bloom e por tipo (média das % de acerto dos itens).
  const aggBy = (pick: (q: Question) => string) => {
    const m: Record<string, { sum: number; count: number }> = {}
    for (const it of items) {
      const q = questions.find(qq => qq.index === it.index)!
      const kk = pick(q)
      ;(m[kk] ??= { sum: 0, count: 0 })
      m[kk].sum += it.difficulty; m[kk].count++
    }
    return Object.entries(m).map(([k, v]) => ({ key: k, avgPct: Math.round(v.sum / v.count), count: v.count })).sort((a, b) => a.avgPct - b.avgPct)
  }
  const bloom = aggBy(q => q.bloomLevel ?? 'Não definido').map(x => ({ bloom: x.key, avgPct: x.avgPct, count: x.count }))
  const types = aggBy(q => q.type).map(x => ({ type: x.key, avgPct: x.avgPct, count: x.count }))

  // Perfil por aluno.
  const bloomKeys = Array.from(new Set(questions.map(q => q.bloomLevel ?? 'Não definido')))
  const typeKeys = Array.from(new Set(questions.map(q => q.type)))
  const students: StudentProfile[] = graded.map(s => {
    const pctFor = (filter: (q: Question) => boolean) => {
      const qs = questions.filter(filter)
      const got = sum(qs.map(q => studentItemScore[s.id][String(q.index)] ?? 0))
      const mx = sum(qs.map(q => q.points))
      return mx > 0 ? Math.round(100 * got / mx) : -1
    }
    const byBloom: Record<string, number> = {}; for (const b of bloomKeys) { const p = pctFor(q => (q.bloomLevel ?? 'Não definido') === b); if (p >= 0) byBloom[b] = p }
    const byType: Record<string, number> = {}; for (const t of typeKeys) { const p = pctFor(q => q.type === t); if (p >= 0) byType[t] = p }
    const pct = maxScore > 0 ? Math.round(100 * (s.total_score ?? 0) / maxScore) : 0
    const weakBloom = Object.entries(byBloom).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null
    const strongBloom = Object.entries(byBloom).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    const weakType = Object.entries(byType).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null
    return {
      id: s.id, name: s.student_name, number: s.student_number,
      turma: turmaLabelOf(s.student_year, s.student_class, fallbackYear),
      total: s.total_score ?? 0, max: maxScore, pct, nivel: nivel(pct),
      byBloom, byType, weakBloom, weakType, strongBloom,
    }
  }).sort((a, b) => a.pct - b.pct)

  // Por turma.
  const tgroups: Record<string, number[]> = {}
  for (const s of graded) { const l = turmaLabelOf(s.student_year, s.student_class, fallbackYear); if (l === '—') continue; (tgroups[l] ??= []).push(s.total_score ?? 0) }
  const turmas: TurmaStat[] = Object.entries(tgroups).map(([turma, arr]) => ({
    turma, n: arr.length, avg: Math.round(mean(arr) * 10) / 10, max: maxScore,
    avgPct: maxScore > 0 ? Math.round(100 * mean(arr) / maxScore) : 0,
    passPct: Math.round(100 * arr.filter(v => maxScore > 0 && v / maxScore >= 0.5).length / arr.length),
    min: Math.min(...arr), max_: Math.max(...arr), sd: Math.round(stdev(arr) * 10) / 10,
  })).sort((a, b) => a.turma.localeCompare(b.turma, 'pt'))

  const typePt: Record<string, string> = { multiple_choice: 'escolha múltipla', true_false: 'verdadeiro/falso', short_answer: 'resposta curta', long_answer: 'resposta longa', fill_blank: 'completar espaços' }

  // ── Recomendações por REGRAS (baseline) ──
  const recClass: string[] = []
  if (graded.length === 0) recClass.push('Ainda sem correcções completas — a análise fica disponível quando houver notas.')
  else {
    if (passPct < 50) recClass.push(`Só ${passPct}% atingiu os 50%. Convém rever os conteúdos centrais com toda a turma antes de avançar.`)
    const hard = items.filter(it => it.difficulty < 50).sort((a, b) => a.difficulty - b.difficulty).slice(0, 5)
    if (hard.length) recClass.push(`Perguntas com mais dificuldade (reensinar): ${hard.map(h => `Q${h.index} (${h.difficulty}%)`).join(', ')}.`)
    const weakBloom = bloom.filter(b => b.avgPct < 50 && b.bloom !== 'Não definido')
    if (weakBloom.length) recClass.push(`Níveis cognitivos (Bloom) frágeis: ${weakBloom.map(b => `${b.bloom} (${b.avgPct}%)`).join(', ')} — propor tarefas que treinem estas competências.`)
    const weakType = types.filter(t => t.avgPct < 50)
    if (weakType.length) recClass.push(`Tipos de pergunta com baixo desempenho: ${weakType.map(t => `${typePt[t.type] ?? t.type} (${t.avgPct}%)`).join(', ')}.`)
    const badDisc = items.filter(it => it.discLabel === 'revê')
    if (badDisc.length) recClass.push(`Perguntas que não discriminam (rever enunciado/critério, podem estar ambíguas ou mal cotadas): ${badDisc.map(b => `Q${b.index}`).join(', ')}.`)
    if (alpha !== null) recClass.push(`Fiabilidade do teste (alfa de Cronbach): ${alpha.toFixed(2)} — ${alpha >= 0.8 ? 'muito boa' : alpha >= 0.7 ? 'aceitável' : alpha >= 0.5 ? 'baixa (interpretar notas com prudência)' : 'muito baixa (poucas perguntas/alunos ou itens incoerentes)'}.`)
    if (turmas.length > 1) {
      const best = turmas.reduce((a, b) => a.avgPct >= b.avgPct ? a : b)
      const worst = turmas.reduce((a, b) => a.avgPct <= b.avgPct ? a : b)
      if (best.turma !== worst.turma) recClass.push(`Diferença entre turmas: ${best.turma} (${best.avgPct}%) vs ${worst.turma} (${worst.avgPct}%) — ver o que resultou numa e reforçar na outra.`)
    }
  }

  const recStudents = students.map(st => {
    const notes: string[] = []
    if (st.pct < 50) {
      notes.push(`Abaixo de 50% (${st.pct}%, nível ${st.nivel}) — prever apoio/plano individual.`)
      if (st.weakBloom) notes.push(`Mais frágil em "${st.weakBloom}".`)
      if (st.weakType) notes.push(`Dificuldade em ${typePt[st.weakType] ?? st.weakType}.`)
    } else if (st.weakBloom && (st.byBloom[st.weakBloom] ?? 100) < 50) {
      notes.push(`Globalmente ok (${st.pct}%), mas fraco em "${st.weakBloom}" (${st.byBloom[st.weakBloom]}%) — reforço dirigido.`)
    } else if (st.pct >= 90) {
      notes.push(`Desempenho muito bom (${st.pct}%)${st.strongBloom ? `, forte em "${st.strongBloom}"` : ''} — propor desafios de maior exigência.`)
    }
    return { id: st.id, name: st.name, turma: st.turma, notes }
  }).filter(r => r.notes.length > 0)

  return {
    title: snapshot.title, subject: snapshot.subject, yearLevel: snapshot.yearLevel, topic: snapshot.topic,
    nGraded: graded.length, maxScore,
    avg: Math.round(avg * 10) / 10, median: Math.round(md * 10) / 10, sd: Math.round(sd * 10) / 10, min, max, passPct,
    dist, alpha, items, bloom, types, turmas, students, recClass, recStudents,
  }
}
