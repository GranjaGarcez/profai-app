'use client'

import { useState, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { getAllQuestions } from '@/lib/exam/types'
import type { TestSnapshot, Question, GradingDetail, RubricCriterion } from '@/lib/exam/types'
import { turmaLabel as turmaLabelOf, canonicalTurma } from '@/lib/exam/turma'
import HorizontalGrading from '@/components/exam/HorizontalGrading'
import { GRADER_IMPROVED_AT, GRADER_AFFECTS } from '@/lib/exam/graderVersion'
import { findIncoherences } from '@/lib/exam/incoherence'
import { parseIntegrity, summarizeIntegrity } from '@/lib/exam/integrity'

// ── Tipos locais ────────────────────────────────────────────────────────────────
interface Submission {
  id: string
  student_name: string
  student_number: string | null
  student_class: string | null
  student_year?: number | null
  student_email?: string | null
  answers: Record<string, string>
  total_score: number | null
  max_score: number | null
  status: string
  grading_details: Record<string, GradingDetail> | null
  teacher_notes: string | null
  submitted_at: string
  graded_at: string | null
  // ── Correção de papel (aditivo) ──
  source?: string
  writing_analysis?: {
    errors: Array<{ questionIndex: number; wrong: string; correct: string; type: string }>
    counts: Record<string, number>
    total: number
    summary: string
  } | null
}

// ── Perfil de erros de escrita (não-pontuável) — só provas de papel ────────────
function WritingProfile({ analysis }: { analysis: NonNullable<Submission['writing_analysis']> }) {
  const types: Record<string, string> = {
    ortografia: 'Ortografia', 'acentuação': 'Acentuação', 'pontuação': 'Pontuação',
    'concordância': 'Concordância', sintaxe: 'Sintaxe', 'vocabulário': 'Vocabulário', outro: 'Outro',
  }
  return (
    <div className="rounded-xl border p-4 mt-4" style={{ borderColor: '#c8a84b40', background: '#fffdf5' }}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h4 className="font-semibold text-sm" style={{ color: '#0D1B2A' }}>
          ✍️ Perfil de escrita <span className="font-normal" style={{ color: '#9CA3AF' }}>(não afeta a cotação)</span>
        </h4>
        <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: '#0D1B2A', color: 'white' }}>
          {analysis.total} {analysis.total === 1 ? 'erro' : 'erros'}
        </span>
      </div>
      {analysis.summary && <p className="text-xs mb-3" style={{ color: '#6B7280' }}>{analysis.summary}</p>}
      {analysis.total > 0 && (
        <>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {Object.entries(analysis.counts).map(([t, n]) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f3e9c6', color: '#7c5e10' }}>
                {types[t] ?? t}: {n}
              </span>
            ))}
          </div>
          <ul className="space-y-1">
            {analysis.errors.map((e, i) => (
              <li key={i} className="text-xs flex items-center gap-2 flex-wrap" style={{ color: '#374151' }}>
                <span className="font-mono px-1 rounded" style={{ background: '#fee2e2', color: '#b91c1c', textDecoration: 'line-through' }}>{e.wrong}</span>
                <span style={{ color: '#9CA3AF' }}>→</span>
                <span className="font-mono px-1 rounded" style={{ background: '#dcfce7', color: '#166534' }}>{e.correct}</span>
                <span style={{ color: '#9CA3AF' }}>· {types[e.type] ?? e.type} · Q{e.questionIndex}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  submitted: { label: 'Submetido',   color: '#92400e', bg: '#fffbeb' },
  grading:   { label: 'A corrigir',  color: '#1e40af', bg: '#eff6ff' },
  graded:    { label: 'Corrigido',   color: '#166534', bg: '#f0fdf4' },
  reviewed:  { label: 'Revisto',     color: '#6b21a8', bg: '#faf5ff' },
  por_corrigir: { label: 'Por corrigir', color: '#b45309', bg: '#fffbeb' },
}

// ── Tabela de rubrica por critério (long_answer) ───────────────────────────────
function RubricTable({ rubric, confidence }: { rubric: RubricCriterion[]; confidence?: number }) {
  const total    = rubric.reduce((s, r) => s + r.score, 0)
  const totalMax = rubric.reduce((s, r) => s + r.max, 0)

  function criterionColor(score: number, max: number) {
    const pct = max > 0 ? score / max : 0
    if (pct >= 0.75) return { bar: '#22c55e', text: '#166534', bg: '#f0fdf4' }
    if (pct >= 0.5)  return { bar: '#f59e0b', text: '#92400e', bg: '#fffbeb' }
    return                  { bar: '#ef4444', text: '#991b1b', bg: '#fef2f2' }
  }

  return (
    <div className="pl-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Rubrica de correcção</p>
        {confidence !== undefined && (
          <span className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: confidence >= 0.8 ? '#f0f9ff' : '#fef3c7', color: confidence >= 0.8 ? '#0369a1' : '#92400e' }}>
            IA {Math.round(confidence * 100)}%
          </span>
        )}
      </div>

      <div className="rounded-lg overflow-hidden border" style={{ borderColor: '#0D1B2A12' }}>
        {rubric.map((r, i) => {
          const c   = criterionColor(r.score, r.max)
          const pct = r.max > 0 ? Math.round((r.score / r.max) * 100) : 0
          return (
            <div key={i}
              className="grid items-center px-3 py-2 gap-2 text-xs"
              style={{
                gridTemplateColumns: '1fr auto auto',
                borderBottom: i < rubric.length - 1 ? '1px solid #0D1B2A08' : 'none',
                background: i % 2 === 0 ? '#fafafa' : 'white',
              }}>
              <div className="flex items-center gap-2 min-w-0">
                {/* barra de progresso */}
                <div className="w-16 h-1.5 rounded-full flex-shrink-0" style={{ background: '#e5e7eb' }}>
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: c.bar }} />
                </div>
                <span className="truncate font-medium" style={{ color: '#374151' }}>{r.criterion}</span>
              </div>
              <span className="font-mono font-bold flex-shrink-0" style={{ color: c.text }}>
                {r.score}
              </span>
              <span className="font-mono flex-shrink-0" style={{ color: '#9CA3AF' }}>
                / {r.max}
              </span>
            </div>
          )
        })}

        {/* Linha de total */}
        <div className="grid items-center px-3 py-2.5 gap-2 text-xs font-semibold"
          style={{ gridTemplateColumns: '1fr auto auto', borderTop: '2px solid #0D1B2A10', background: '#f1f5f9' }}>
          <span style={{ color: '#0D1B2A' }}>Total</span>
          <span className="font-mono font-bold" style={{ color: '#0D1B2A' }}>{total}</span>
          <span className="font-mono" style={{ color: '#6B7280' }}>/ {totalMax}</span>
        </div>
      </div>

      <p className="text-xs mt-1.5 px-1" style={{ color: '#9CA3AF' }}>
        ⚑ Rubrica orientadora — cotação a validar pelo professor
      </p>
    </div>
  )
}

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'EM',
  true_false:      'VF',
  short_answer:    'RC',
  long_answer:     'RL',
  fill_blank:      'CE',
}

// ── Analytics ──────────────────────────────────────────────────────────────────

function pctColor(pct: number): { bar: string; text: string; bg: string } {
  if (pct >= 70) return { bar: '#22c55e', text: '#166534', bg: '#f0fdf4' }
  if (pct >= 50) return { bar: '#f59e0b', text: '#92400e', bg: '#fffbeb' }
  return              { bar: '#ef4444', text: '#991b1b', bg: '#fef2f2' }
}

function median(vals: number[]): number {
  if (!vals.length) return 0
  const s = [...vals].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function stdev(vals: number[]): number {
  if (vals.length < 2) return 0
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.sqrt(vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length)
}

interface QuestionStat {
  q: Question
  avgScore: number
  avgPct: number
  errorRate: number   // % alunos com < 50% desta questão
  n: number
}

function AnalyticsDashboard({
  submissions,
  questions,
  fallbackYear,
  turmaView,
  allSubmissions,
}: {
  submissions: Submission[]
  questions: Question[]
  fallbackYear: number | null
  turmaView: 'all' | string
  allSubmissions: Submission[]
}) {
  const graded = useMemo(
    () => submissions.filter(s => s.status === 'graded' || s.status === 'reviewed'),
    [submissions],
  )

  // Comparação por turma (só na vista "Todas") — média, aprovados, dispersão.
  const perTurma = useMemo(() => {
    if (turmaView !== 'all') return []
    const groups: Record<string, number[]> = {}
    const maxByGroup: Record<string, number> = {}
    for (const s of allSubmissions) {
      if (s.status !== 'graded' && s.status !== 'reviewed') continue
      const lbl = turmaLabelOf(s.student_year, s.student_class, fallbackYear)
      if (lbl === '—') continue
      ;(groups[lbl] ??= []).push(s.total_score ?? 0)
      maxByGroup[lbl] = s.max_score ?? maxByGroup[lbl] ?? 100
    }
    return Object.entries(groups).map(([turma, arr]) => {
      const mx = maxByGroup[turma] || 100
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length
      const pass = arr.filter(v => v / mx >= 0.5).length
      return { turma, n: arr.length, avg: mean, max: mx, avgPct: Math.round((mean / mx) * 100),
        passPct: Math.round((pass / arr.length) * 100), min: Math.min(...arr), maxV: Math.max(...arr), sd: stdev(arr) }
    }).sort((a, b) => a.turma.localeCompare(b.turma, 'pt'))
  }, [turmaView, allSubmissions, fallbackYear])

  const scores = useMemo(
    () => graded.map(s => s.total_score ?? 0),
    [graded],
  )

  const maxScore = graded[0]?.max_score ?? 100

  const avg    = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const med    = median(scores)
  const sd     = stdev(scores)
  const minS   = scores.length ? Math.min(...scores) : 0
  const maxS   = scores.length ? Math.max(...scores) : 0
  const passN  = scores.filter(s => (s / maxScore) >= 0.5).length
  const passPct = scores.length ? Math.round((passN / scores.length) * 100) : 0

  // Por questão
  const qStats: QuestionStat[] = useMemo(() => questions.map(q => {
    const key = String(q.index)
    const qScores = graded
      .map(s => s.grading_details?.[key]?.score)
      .filter((v): v is number => v !== undefined)
    const n = qScores.length
    const avgScore = n ? qScores.reduce((a, b) => a + b, 0) / n : 0
    const avgPct   = q.points > 0 ? Math.round((avgScore / q.points) * 100) : 0
    const errorRate = n ? Math.round((qScores.filter(s => (s / q.points) < 0.5).length / n) * 100) : 0
    return { q, avgScore, avgPct, errorRate, n }
  }), [graded, questions])

  // Por nível Bloom
  const bloomStats = useMemo(() => {
    const map: Record<string, { total: number; sum: number }> = {}
    qStats.forEach(({ q, avgPct }) => {
      const b = q.bloomLevel ?? 'Não definido'
      if (!map[b]) map[b] = { total: 0, sum: 0 }
      map[b].total++
      map[b].sum += avgPct
    })
    return Object.entries(map).map(([bloom, { total, sum }]) => ({
      bloom,
      avgPct: Math.round(sum / total),
      count: total,
    })).sort((a, b) => a.avgPct - b.avgPct)
  }, [qStats])

  // Alunos abaixo do limiar (< 50%)
  const belowThreshold = useMemo(
    () => graded
      .filter(s => s.total_score !== null && (s.total_score! / maxScore) < 0.5)
      .sort((a, b) => (a.total_score ?? 0) - (b.total_score ?? 0)),
    [graded, maxScore],
  )

  if (graded.length === 0) {
    return (
      <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: '#0D1B2A10' }}>
        <p className="text-4xl mb-3">📊</p>
        <p className="font-semibold" style={{ color: '#0D1B2A' }}>Sem correcções completas ainda</p>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          A análise fica disponível assim que houver pelo menos uma submissão corrigida.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Estatísticas gerais ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Média', value: avg.toFixed(1), sub: `/ ${maxScore}` },
          { label: 'Mediana', value: med.toFixed(1), sub: `DP ± ${sd.toFixed(1)}` },
          { label: 'Mín / Máx', value: `${minS.toFixed(0)} / ${maxS.toFixed(0)}`, sub: 'valores' },
          {
            label: 'Aprovados ≥ 50%',
            value: `${passPct}%`,
            sub: `${passN} de ${scores.length}`,
            highlight: passPct < 50,
          },
        ].map(({ label, value, sub, highlight }) => (
          <div
            key={label}
            className="bg-white rounded-xl border p-4 text-center"
            style={{
              borderColor: highlight ? '#fca5a5' : '#0D1B2A10',
              background: highlight ? '#fef2f2' : 'white',
            }}
          >
            <p className="text-2xl font-bold font-mono" style={{ color: highlight ? '#dc2626' : '#0D1B2A' }}>
              {value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{label}</p>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Comparação por turma (só na vista "Todas") ── */}
      {perTurma.length > 1 && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#0D1B2A10' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: '#0D1B2A08' }}>
            <h3 className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>Resultados por turma</h3>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Escolhe uma turma em cima para ver a análise detalhada só dessa turma.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #0D1B2A08' }}>
                  {['Turma', 'Alunos', 'Média', 'Acerto', 'Aprovados ≥50%', 'Mín / Máx', 'DP'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold" style={{ color: '#6B7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perTurma.map((t, i) => {
                  const c = pctColor(t.avgPct)
                  return (
                    <tr key={t.turma} style={{ borderBottom: i < perTurma.length - 1 ? '1px solid #0D1B2A05' : 'none' }}>
                      <td className="px-3 py-2.5 font-bold" style={{ color: '#0D1B2A' }}>{t.turma}</td>
                      <td className="px-3 py-2.5" style={{ color: '#6B7280' }}>{t.n}</td>
                      <td className="px-3 py-2.5 font-mono" style={{ color: '#0D1B2A' }}>{t.avg.toFixed(1)} <span style={{ color: '#9CA3AF' }}>/ {t.max}</span></td>
                      <td className="px-3 py-2.5 font-mono font-semibold" style={{ color: c.text }}>{t.avgPct}%</td>
                      <td className="px-3 py-2.5 font-mono" style={{ color: t.passPct < 50 ? '#dc2626' : '#166534' }}>{t.passPct}%</td>
                      <td className="px-3 py-2.5 font-mono" style={{ color: '#6B7280' }}>{t.min.toFixed(0)} / {t.maxV.toFixed(0)}</td>
                      <td className="px-3 py-2.5 font-mono" style={{ color: '#6B7280' }}>± {t.sd.toFixed(1)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Performance por questão ── */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#0D1B2A10' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: '#0D1B2A08' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>Performance por questão{turmaView !== 'all' ? ` · ${turmaView}` : ''}</h3>
          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
            Média de acerto (%) · Taxa de erro = alunos com &lt; 50% nessa questão
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #0D1B2A08' }}>
                {['Q', 'Tipo', 'Bloom', 'Cotação', 'Média', 'Acerto', 'Taxa de erro'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold" style={{ color: '#6B7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {qStats.map(({ q, avgScore, avgPct, errorRate }, i) => {
                const c = pctColor(avgPct)
                return (
                  <tr
                    key={q.index}
                    style={{ borderBottom: i < qStats.length - 1 ? '1px solid #0D1B2A05' : 'none' }}
                  >
                    <td className="px-3 py-2.5 font-mono font-bold" style={{ color: '#0D1B2A' }}>
                      {q.index}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-1.5 py-0.5 rounded font-medium" style={{ background: '#0D1B2A10', color: '#6B7280' }}>
                        {TYPE_LABEL[q.type] ?? q.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" style={{ color: '#6B7280' }}>
                      {q.bloomLevel ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: '#6B7280' }}>
                      {q.points} pt
                    </td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: '#0D1B2A' }}>
                      {avgScore.toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {/* barra */}
                        <div className="w-20 h-2 rounded-full flex-shrink-0" style={{ background: '#e5e7eb' }}>
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${avgPct}%`, background: c.bar }}
                          />
                        </div>
                        <span className="font-mono font-semibold" style={{ color: c.text }}>
                          {avgPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="px-2 py-0.5 rounded font-mono font-semibold"
                        style={errorRate >= 50
                          ? { background: '#fef2f2', color: '#dc2626' }
                          : errorRate >= 25
                            ? { background: '#fffbeb', color: '#92400e' }
                            : { background: '#f0fdf4', color: '#166534' }}
                      >
                        {errorRate}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bloom + alunos abaixo do limiar ── */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* Bloom */}
        {bloomStats.length > 0 && (
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#0D1B2A10' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#0D1B2A' }}>
              Por nível de Bloom
            </h3>
            <div className="space-y-2">
              {bloomStats.map(({ bloom, avgPct, count }) => {
                const c = pctColor(avgPct)
                return (
                  <div key={bloom} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="truncate font-medium" style={{ color: '#374151' }}>{bloom}</span>
                        <span style={{ color: '#9CA3AF' }}>{count} quest.</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: '#e5e7eb' }}>
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${avgPct}%`, background: c.bar }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold flex-shrink-0 w-10 text-right" style={{ color: c.text }}>
                      {avgPct}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Alunos abaixo do limiar */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#0D1B2A10' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#0D1B2A' }}>
            Alunos abaixo de 50%
          </h3>
          {belowThreshold.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-1">🎉</p>
              <p className="text-sm font-medium" style={{ color: '#166534' }}>
                Todos aprovados!
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                Nenhum aluno ficou abaixo do limiar de 50%.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {belowThreshold.map(s => {
                const pct = s.total_score !== null && maxScore
                  ? Math.round((s.total_score / maxScore) * 100)
                  : 0
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                    style={{ background: '#fef2f2', border: '1px solid #fca5a530' }}
                  >
                    <div>
                      <span className="font-medium" style={{ color: '#0D1B2A' }}>{s.student_name}</span>
                      {s.student_class && (
                        <span className="ml-2" style={{ color: '#9CA3AF' }}>{s.student_class}</span>
                      )}
                    </div>
                    <span className="font-mono font-bold" style={{ color: '#dc2626' }}>
                      {s.total_score?.toFixed(1)} / {maxScore} ({pct}%)
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Componente de detalhe de submissão ─────────────────────────────────────────
function SubmissionDetail({
  submission,
  questions,
  onClose,
  allSubmissions,
  fallbackYear,
  onReassigned,
}: {
  submission: Submission
  questions: Question[]
  onClose: () => void
  allSubmissions: Submission[]
  fallbackYear: number | null
  onReassigned: () => void
}) {
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState(submission.teacher_notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [localDetails, setLocalDetails] = useState(submission.grading_details ?? {})
  const [localTotal, setLocalTotal] = useState(submission.total_score)
  const [linkCopied, setLinkCopied] = useState(false)

  // ── Integridade: indícios + anulação (decisão humana) ──
  const integ = parseIntegrity(submission.answers)
  const integSummary = summarizeIntegrity(integ)
  const [annulOpen, setAnnulOpen] = useState(false)
  const [annulReason, setAnnulReason] = useState('')
  const [annulling, setAnnulling] = useState(false)

  async function setAnnul(annul: boolean) {
    setAnnulling(true)
    try {
      const res = await fetch(`/api/exam/submissions/${submission.id}/annul`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annul, reason: annul ? annulReason.trim() : '' }),
      })
      if (res.ok) onReassigned()   // fecha + refresca
      else setAnnulling(false)
    } catch { setAnnulling(false) }
  }

  const fmtEvent = (kind: string) => kind === 'exit' ? 'Saiu do ecrã do teste'
    : kind === 'paste' ? 'Colou texto' : kind === 'copy' ? 'Copiou texto'
    : kind === 'fullscreen_exit' ? 'Saiu do ecrã inteiro' : kind === 'blur' ? 'Janela perdeu o foco' : kind

  async function copyResultLink() {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/exam/resultado/${submission.id}`
    try { await navigator.clipboard.writeText(url); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) } catch { /* noop */ }
  }

  // ── Reatribuição de turma (associação manual) ──
  const current = canonicalTurma(submission.student_year, submission.student_class, fallbackYear)
  const [turmaInput, setTurmaInput] = useState(`${current.ano ?? ''}${current.turma}`)
  const [savingTurma, setSavingTurma] = useState(false)
  const [turmaMsg, setTurmaMsg] = useState<string | null>(null)

  // Sugestão pela HORA de submissão: a turma dominante entre quem submeteu numa
  // janela de ~75 min à volta desta submissão (os da mesma turma fazem juntos).
  const timeSuggestion = (() => {
    const t0 = new Date(submission.submitted_at).getTime()
    const WINDOW = 75 * 60 * 1000
    const counts: Record<string, number> = {}
    for (const s of allSubmissions) {
      if (s.id === submission.id) continue
      if (Math.abs(new Date(s.submitted_at).getTime() - t0) > WINDOW) continue
      const lbl = turmaLabelOf(s.student_year, s.student_class, fallbackYear)
      if (lbl === '—') continue
      counts[lbl] = (counts[lbl] ?? 0) + 1
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    const currentLbl = turmaLabelOf(submission.student_year, submission.student_class, fallbackYear)
    return top && top[0] !== currentLbl ? top[0] : null
  })()

  async function saveTurma(raw?: string) {
    const value = (raw ?? turmaInput).trim()
    if (!value) return
    setSavingTurma(true); setTurmaMsg(null)
    try {
      // "6A"/"A"/"6º A" → canonicaliza no servidor; passamos o texto como ano+turma.
      const res = await fetch(`/api/exam/submissions/${submission.id}/turma`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano: value, turma: value }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Falha.')
      onReassigned()
    } catch (e) { setTurmaMsg(e instanceof Error ? e.message : 'Erro.'); setSavingTurma(false) }
  }

  async function handleSaveScore(qKey: string, max: number) {
    const newScore = overrides[qKey]
    if (newScore === undefined || newScore < 0 || newScore > max) return
    setSaving(s => ({ ...s, [qKey]: true }))
    try {
      const res = await fetch(`/api/exam/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionKey: qKey, score: newScore, teacherNotes: notes }),
      })
      const data = await res.json()
      if (res.ok) {
        setLocalDetails(prev => ({
          ...prev,
          [qKey]: { ...prev[qKey], score: newScore, auto: false },
        }))
        setLocalTotal(data.newTotal)
        setOverrides(prev => { const n = { ...prev }; delete n[qKey]; return n })
      }
    } finally {
      setSaving(s => { const n = { ...s }; delete n[qKey]; return n })
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true)
    // Save notes via any question key (or a special endpoint — we use Q0 as dummy)
    const firstKey = questions[0] ? String(questions[0].index) : '0'
    const existing = localDetails[firstKey]
    if (existing) {
      await fetch(`/api/exam/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionKey: firstKey,
          score: existing.score,
          feedback: existing.feedback,
          teacherNotes: notes,
        }),
      })
    }
    setSavingNotes(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-4 overflow-y-auto"
      style={{ background: '#00000050' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mt-4 mb-4 overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10"
          style={{ borderColor: '#0D1B2A10' }}>
          <div>
            <h3 className="font-bold" style={{ color: '#0D1B2A' }}>{submission.student_name}</h3>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
              {[submission.student_class, submission.student_number && `N.º ${submission.student_number}`]
                .filter(Boolean).join(' · ')}
            </p>
            <button onClick={copyResultLink}
              className="mt-1 text-xs font-semibold px-2 py-0.5 rounded-md"
              title="Copiar o link da correcção deste aluno (só abre depois de divulgares)"
              style={{ background: '#e0f7fc', color: '#0369a1' }}>
              {linkCopied ? '✓ Link copiado' : '🔗 Link da correcção'}
            </button>
            {/* Associação manual de turma */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-xs" style={{ color: '#9CA3AF' }}>Turma:</span>
              <input value={turmaInput} onChange={e => setTurmaInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveTurma() }}
                placeholder="ex.: 6A"
                className="w-20 px-2 py-0.5 rounded-md border text-xs"
                style={{ borderColor: '#e2e8f0', outline: 'none', color: '#0D1B2A' }} />
              <button onClick={() => saveTurma()} disabled={savingTurma}
                className="text-xs font-semibold px-2 py-0.5 rounded-md text-white disabled:opacity-50"
                style={{ background: '#0D1B2A' }}>
                {savingTurma ? '…' : 'Guardar turma'}
              </button>
              {timeSuggestion && (
                <button onClick={() => saveTurma(timeSuggestion)} disabled={savingTurma}
                  title="Sugestão pela hora de submissão (colegas que submeteram por perto)"
                  className="text-xs font-semibold px-2 py-0.5 rounded-md"
                  style={{ background: '#fef9c3', color: '#854d0e' }}>
                  🕐 Pôr em {timeSuggestion}?
                </button>
              )}
            </div>
            {turmaMsg && <p className="text-xs mt-1" style={{ color: '#dc2626' }}>{turmaMsg}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-lg" style={{ color: '#0D1B2A' }}>
              {localTotal?.toFixed(1) ?? '—'} / {submission.max_score ?? '—'}
            </span>
            <button onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* Corpo */}
        <div className="overflow-y-auto p-6 space-y-4" style={{ maxHeight: 'calc(100vh - 10rem)' }}>

          {/* ── Integridade: indícios + anulação ── */}
          {(integSummary.hasAny || integ?.annulled) && (
            <div className="rounded-xl border-2 p-3"
              style={{ borderColor: integ?.annulled ? '#991b1b' : integSummary.level === 'high' ? '#dc2626' : '#f59e0b',
                       background: integ?.annulled ? '#fef2f2' : '#fffbeb' }}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-bold" style={{ color: integ?.annulled ? '#991b1b' : '#92400e' }}>
                  {integ?.annulled ? '⛔ Exame ANULADO' : '🛡️ Indícios de integridade'}
                </p>
                {!integ?.annulled && (
                  <button onClick={() => setAnnulOpen(o => !o)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-md border"
                    style={{ borderColor: '#dc2626', color: '#dc2626' }}>
                    Anular exame…
                  </button>
                )}
              </div>

              {/* Resumo dos sinais */}
              <div className="flex gap-3 flex-wrap mt-1.5 text-xs" style={{ color: '#374151' }}>
                {integSummary.exits > 0 && <span>↩️ {integSummary.exits} saída(s) do ecrã{integSummary.awayMs > 1000 ? ` (${Math.round(integSummary.awayMs / 1000)}s fora)` : ''}</span>}
                {integSummary.blurs > 0 && <span>🪟 {integSummary.blurs} perda(s) de foco</span>}
                {integSummary.pastes > 0 && <span>📋 {integSummary.pastes} colagem(ns)</span>}
                {integSummary.contentAbove > 0 && <span>🧠 {integSummary.contentAbove} resposta(s) com conteúdo acima do ano / fora do tema</span>}
                {!integSummary.hasAny && <span>Sem sinais ao vivo.</span>}
              </div>

              {/* Linha temporal dos eventos ao vivo (prova) */}
              {(integ?.events?.length ?? 0) > 0 && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer" style={{ color: '#0369a1' }}>Ver registo ({integ!.events!.length} eventos)</summary>
                  <ul className="mt-1 space-y-0.5">
                    {integ!.events!.map((e, i) => (
                      <li key={i} className="text-xs" style={{ color: '#6B7280' }}>
                        {new Date(e.t).toLocaleTimeString('pt-PT')} — {fmtEvent(e.kind)}
                        {e.durMs ? ` (${Math.round(e.durMs / 1000)}s)` : ''}
                        {e.qKey ? ` · Q${e.qKey}` : ''}
                        {e.info ? ` · «${e.info}»` : ''}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Anulação já feita */}
              {integ?.annulled && (
                <div className="mt-2 text-xs" style={{ color: '#991b1b' }}>
                  <p>Anulado em {new Date(integ.annulled.at).toLocaleString('pt-PT')}.</p>
                  {integ.annulled.reason && <p className="mt-0.5"><strong>Motivo:</strong> {integ.annulled.reason}</p>}
                  <button onClick={() => setAnnul(false)} disabled={annulling}
                    className="mt-1 text-xs font-semibold px-2.5 py-1 rounded-md border disabled:opacity-50"
                    style={{ borderColor: '#0D1B2A20', color: '#6B7280' }}>
                    {annulling ? '…' : 'Reverter anulação'}
                  </button>
                </div>
              )}

              {/* Caixa de anulação */}
              {annulOpen && !integ?.annulled && (
                <div className="mt-2 rounded-lg border p-2.5 space-y-2" style={{ borderColor: '#dc2626', background: '#fff' }}>
                  <p className="text-xs" style={{ color: '#991b1b' }}>
                    Anular regista a decisão e o motivo neste exame, com o registo acima como prova (para mostrares ao aluno/EE). Não apaga nada; podes reverter.
                  </p>
                  <textarea value={annulReason} onChange={e => setAnnulReason(e.target.value)} rows={2}
                    placeholder="Motivo (ex.: saiu do ecrã 5× e colou texto na Q4; termos de secundário não dados na aula)"
                    className="w-full px-2.5 py-1.5 rounded-lg border text-xs"
                    style={{ borderColor: '#0D1B2A20', outline: 'none', color: '#0D1B2A' }} />
                  <div className="flex gap-2">
                    <button onClick={() => setAnnul(true)} disabled={annulling || !annulReason.trim()}
                      className="text-xs font-bold px-3 py-1.5 rounded-md text-white disabled:opacity-50" style={{ background: '#dc2626' }}>
                      {annulling ? 'A anular…' : 'Confirmar anulação'}
                    </button>
                    <button onClick={() => setAnnulOpen(false)} disabled={annulling}
                      className="text-xs font-semibold px-3 py-1.5 rounded-md border" style={{ borderColor: '#0D1B2A20', color: '#6B7280' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {questions.map(q => {
            const qKey = String(q.index)
            const detail = localDetails[qKey]
            const answer = submission.answers[qKey] ?? ''
            const isOpen = q.type === 'short_answer' || q.type === 'long_answer' || q.type === 'fill_blank'
            const overrideVal = overrides[qKey]

            return (
              <div key={qKey} className="border rounded-xl p-4 space-y-2"
                style={{
                  borderColor: detail?.auto === false ? '#c4b5fd' : '#0D1B2A10',
                  background: detail?.auto === false ? '#faf5ff' : 'white',
                }}>

                {/* Topo */}
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{ background: '#0D1B2A10', color: '#6B7280' }}>
                    {TYPE_LABEL[q.type] ?? q.type}
                  </span>
                  <span className="text-xs font-medium flex-1 line-clamp-1" style={{ color: '#374151' }}>
                    Q{q.index}. {q.text.length > 80 ? q.text.slice(0, 80) + '…' : q.text}
                  </span>
                  {detail?.auto === false && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
                      revisto
                    </span>
                  )}
                </div>

                {/* Resposta do aluno */}
                <div className="pl-1">
                  <p className="text-xs font-medium mb-1" style={{ color: '#9CA3AF' }}>Resposta</p>
                  <p className="text-sm px-3 py-2 rounded-lg"
                    style={{ background: '#f8fafc', color: '#0D1B2A', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
                    {answer || <span style={{ color: '#d1d5db' }}>Sem resposta</span>}
                  </p>
                  {!isOpen && q.correctAnswer && (
                    <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                      Resposta correcta: <strong style={{ color: '#059669' }}>{q.correctAnswer}</strong>
                    </p>
                  )}
                </div>

                {/* Histórico da calculadora */}
                {(() => {
                  const calcLog = submission.answers[`calc_${qKey}`]
                  if (!calcLog) return null
                  const steps = calcLog.split(' | ')
                  return (
                    <div className="pl-1">
                      <p className="text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                        🧮 Cálculos na calculadora
                      </p>
                      <div className="px-3 py-2 rounded-lg space-y-1"
                        style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
                        {steps.map((step, si) => {
                          const [expr, result] = step.replace(/^\d+\.\s*/, '').split(' = ')
                          return (
                            <p key={si} className="text-xs font-mono" style={{ color: '#94a3b8' }}>
                              <span style={{ color: '#64748b' }}>{si + 1}.</span>{' '}
                              <span style={{ color: '#e2e8f0' }}>{expr}</span>
                              <span style={{ color: '#475569' }}> = </span>
                              <span style={{ color: '#38bdf8', fontWeight: 600 }}>{result}</span>
                            </p>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Rubrica por critério (long_answer) ou Feedback simples */}
                {detail?.rubric?.length ? (
                  <RubricTable rubric={detail.rubric} confidence={detail.ai_confidence} />
                ) : detail?.feedback ? (
                  <div className="pl-1">
                    <p className="text-xs font-medium mb-1" style={{ color: '#9CA3AF' }}>Feedback da IA</p>
                    <p className="text-xs px-3 py-2 rounded-lg"
                      style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d50' }}>
                      {detail.feedback}
                    </p>
                  </div>
                ) : null}

                {/* Feedback textual abaixo da rubrica */}
                {detail?.rubric?.length && detail.feedback && (
                  <div className="pl-1">
                    <p className="text-xs px-3 py-2 rounded-lg"
                      style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d50' }}>
                      {detail.feedback}
                    </p>
                  </div>
                )}

                {/* Pontuação + override */}
                {(() => {
                  const conf = detail?.ai_confidence
                  const score = detail?.score
                  const isExtreme = score === 0 || score === q.points
                  const needsReview = conf !== undefined && conf < 0.8 && isExtreme && detail?.auto !== false
                  return needsReview ? (
                    <div className="pl-1">
                      <p className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d80' }}>
                        ⚠️ Confiança baixa ({Math.round(conf! * 100)}%) com pontuação extrema
                        — recomenda-se revisão manual.
                      </p>
                    </div>
                  ) : null
                })()}

                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-bold text-base" style={{ color: '#0D1B2A' }}>
                      {detail?.score ?? '?'}
                    </span>
                    <span style={{ color: '#9CA3AF' }}>/ {q.points} pt</span>
                    {/* Badge de confiança só quando não há rubrica (a rubrica já mostra o badge) */}
                    {detail?.ai_confidence !== undefined && !detail.rubric?.length && (
                      <span className="text-xs px-1.5 py-0.5 rounded ml-1"
                        style={{
                          background: detail.ai_confidence >= 0.8 ? '#f0f9ff' : '#fef3c7',
                          color:      detail.ai_confidence >= 0.8 ? '#0369a1' : '#92400e',
                        }}>
                        IA {Math.round(detail.ai_confidence * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Override manual */}
                  <div className="flex items-center gap-2 ml-auto">
                    <input
                      type="number" min={0} max={q.points} step={0.5}
                      value={overrideVal ?? ''}
                      onChange={e => setOverrides(prev => ({ ...prev, [qKey]: Number(e.target.value) }))}
                      placeholder={String(detail?.score ?? 0)}
                      className="w-16 text-center text-sm px-2 py-1 rounded-lg border font-mono"
                      style={{ borderColor: overrideVal !== undefined ? '#a78bfa' : '#0D1B2A20', outline: 'none' }}
                    />
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>/ {q.points}</span>
                    <button
                      disabled={overrideVal === undefined || saving[qKey]}
                      onClick={() => handleSaveScore(qKey, q.points)}
                      className="px-3 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-opacity"
                      style={{ background: '#7c3aed' }}
                    >
                      {saving[qKey] ? '...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Perfil de escrita (provas de papel) */}
          {submission.writing_analysis && <WritingProfile analysis={submission.writing_analysis} />}

          {/* Notas do professor */}
          <div className="border rounded-xl p-4 space-y-2" style={{ borderColor: '#0D1B2A10' }}>
            <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>Notas do professor</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Observações internas sobre esta submissão..."
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
              style={{ borderColor: '#0D1B2A20', outline: 'none' }}
            />
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: '#0D1B2A' }}
            >
              {savingNotes ? 'A guardar...' : '💾 Guardar notas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────────
export default function GradingDashboard({
  sessionId,
  submissions,
  testSnapshot,
  isActive,
  resultsReleased,
}: {
  sessionId: string
  submissions: Submission[]
  testSnapshot: unknown
  isActive: boolean
  resultsReleased?: boolean
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Submission | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'graded'>('all')
  const [turmaView, setTurmaView] = useState<'all' | string>('all')   // filtro por turma (Submissões + Análise)
  const [tab, setTab] = useState<'submissions' | 'horizontal' | 'analytics'>('submissions')
  const [regrading, setRegrading] = useState(false)
  const [regradeMsg, setRegradeMsg] = useState<string | null>(null)
  const [released, setReleased] = useState(!!resultsReleased)
  const [releasing, setReleasing] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const withEmail = submissions.filter(s => typeof s.student_email === 'string' && s.student_email.includes('@')).length

  async function toggleRelease() {
    setReleasing(true); setResultMsg(null)
    try {
      const res = await fetch(`/api/exam/sessions/${sessionId}/release`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ released: !released }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Falha.')
      setReleased(!!d.released)
      setResultMsg(d.released ? 'Resultados divulgados — os alunos já podem ver a sua correcção.' : 'Resultados ocultados dos alunos.')
    } catch (e) { setResultMsg(e instanceof Error ? e.message : 'Erro.') }
    finally { setReleasing(false) }
  }

  async function sendEmails() {
    setEmailing(true); setResultMsg(null)
    try {
      const res = await fetch(`/api/exam/sessions/${sessionId}/email-results`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Falha ao enviar.')
      setResultMsg(d.sent != null ? `${d.sent} email(s) enviado(s)${d.failed ? `, ${d.failed} falhou(aram)` : ''}.` : (d.message ?? 'Concluído.'))
    } catch (e) { setResultMsg(e instanceof Error ? e.message : 'Erro.') }
    finally { setEmailing(false) }
  }

  const questions = getAllQuestions(testSnapshot as TestSnapshot)
  const gradedCount = submissions.filter(s => s.status === 'graded' || s.status === 'reviewed').length
  // Submissões que a IA não conseguiu corrigir (quota/falha) ou que ficaram presas.
  const toRegrade = submissions.filter(s => s.status === 'por_corrigir' || s.status === 'grading')
  // Corrigidas automaticamente ANTES da última melhoria do motor (podem ser re-corrigidas).
  // "reviewed" (ajuste manual do professor) fica de fora de propósito.
  // Só faz sentido se o teste TIVER perguntas do tipo afectado pela melhoria.
  const testHasAffected = questions.some(q => GRADER_AFFECTS.includes(q.type))
  const outdated = !testHasAffected ? [] : submissions.filter(s =>
    s.status === 'graded' && s.graded_at && new Date(s.graded_at) < new Date(GRADER_IMPROVED_AT))
  const [regradingOld, setRegradingOld] = useState(false)
  // Incoerências de cotação (nota acima do máximo, ou branco com pontos) — para o
  // professor não as deixar passar; corrigem-se na Correção horizontal (a vermelho).
  const incoherenceCount = submissions.reduce(
    (acc, s) => acc + findIncoherences(questions, s.answers, s.grading_details).length, 0)
  const incoherentSubs = submissions.filter(s => findIncoherences(questions, s.answers, s.grading_details).length > 0).length

  // ── Integridade: submissões com indícios (sinais ao vivo + análise de conteúdo) ──
  const integritySubs = submissions.filter(s => summarizeIntegrity(parseIntegrity(s.answers)).hasAny).length
  const anyContentFlags = submissions.some(s => (parseIntegrity(s.answers)?.contentFlags ?? []).length > 0)
  const [contentChecking, setContentChecking] = useState(false)
  const [contentMsg, setContentMsg] = useState<string | null>(null)

  async function runContentCheck() {
    setContentChecking(true); setContentMsg(null)
    try {
      const res = await fetch(`/api/exam/sessions/${sessionId}/content-check`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Falha na análise.')
      setContentMsg(d.analysed != null
        ? `Analisadas ${d.analysed} submissão(ões): ${d.flagged || 0} com indícios de conteúdo acima do ano / fora do tema${d.flaggedAnswers ? ` (${d.flaggedAnswers} resposta(s))` : ''}. Vê as marcas na Correção horizontal.`
        : (d.message ?? 'Concluído.'))
      router.refresh()
    } catch (e) { setContentMsg(e instanceof Error ? e.message : 'Erro.') }
    finally { setContentChecking(false) }
  }

  async function regradePending() {
    setRegrading(true); setRegradeMsg(null)
    try {
      const res = await fetch(`/api/exam/sessions/${sessionId}/regrade`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Falha ao corrigir.')
      setRegradeMsg(d.regraded != null ? `${d.regraded} corrigida(s)${d.stillPending ? `, ${d.stillPending} ainda por corrigir (tenta mais tarde)` : ''}.` : 'Concluído.')
      router.refresh()
    } catch (e) { setRegradeMsg(e instanceof Error ? e.message : 'Erro.') }
    finally { setRegrading(false) }
  }

  async function regradeOutdated() {
    setRegradingOld(true); setRegradeMsg(null)
    try {
      const res = await fetch(`/api/exam/sessions/${sessionId}/regrade-outdated`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Falha.')
      setRegradeMsg(d.regraded != null ? `${d.regraded} re-corrigida(s) com os critérios novos${d.stillPending ? `, ${d.stillPending} ficaram por corrigir` : ''}.` : (d.message ?? 'Concluído.'))
      router.refresh()
    } catch (e) { setRegradeMsg(e instanceof Error ? e.message : 'Erro.') }
    finally { setRegradingOld(false) }
  }

  // Agrupamento por turma: etiqueta "6ºA", ordenado por (ano, turma, nome).
  // Agrupa pela turma CANÓNICA (corrige também as submissões já guardadas com
  // grafias inconsistentes — "6g"/"G", "6º G", etc.), não pelo texto em bruto.
  const fallbackYear = (testSnapshot as TestSnapshot)?.yearLevel ?? null
  const turmaLabel = (s: Submission) => turmaLabelOf(s.student_year, s.student_class, fallbackYear)
  const turmaOptions = Array.from(new Set(submissions.map(turmaLabel)))
    .filter(t => t !== '—').sort((a, b) => a.localeCompare(b, 'pt'))

  const filtered = submissions.filter(s => {
    if (turmaView !== 'all' && turmaLabel(s) !== turmaView) return false
    if (filter === 'pending') return s.status === 'submitted' || s.status === 'grading' || s.status === 'por_corrigir'
    if (filter === 'graded') return s.status === 'graded' || s.status === 'reviewed'
    return true
  })
  // Submissões da turma escolhida (sem o filtro de estado) — para a Análise.
  const turmaScopedSubs = turmaView === 'all' ? submissions : submissions.filter(s => turmaLabel(s) === turmaView)

  const sorted = [...filtered].sort((a, b) => {
    const ka = turmaLabel(a).toLowerCase(), kb = turmaLabel(b).toLowerCase()
    if (ka !== kb) return ka < kb ? -1 : 1
    return (a.student_name ?? '').localeCompare(b.student_name ?? '', 'pt')
  })
  const turmaCounts = sorted.reduce<Record<string, number>>((m, s) => { const k = turmaLabel(s); m[k] = (m[k] ?? 0) + 1; return m }, {})

  if (submissions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: '#0D1B2A10' }}>
        <p className="text-4xl mb-3">📭</p>
        <p className="font-semibold" style={{ color: '#0D1B2A' }}>
          {isActive ? 'Ainda não há submissões' : 'Nenhuma submissão recebida'}
        </p>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          {isActive
            ? 'Partilha o código de acesso com os alunos para começar.'
            : 'A sessão foi encerrada sem submissões.'}
        </p>
      </div>
    )
  }

  return (
    <>
      {selected && (
        <SubmissionDetail
          submission={selected}
          questions={questions}
          allSubmissions={submissions}
          fallbackYear={fallbackYear}
          onReassigned={() => { setSelected(null); router.refresh() }}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Incoerências de cotação — bem visível, para não passarem */}
      {incoherenceCount > 0 && (
        <div className="rounded-xl border-2 px-4 py-3 mb-3" style={{ borderColor: '#dc2626', background: '#fef2f2' }}>
          <p className="text-sm font-bold" style={{ color: '#991b1b' }}>
            ⚠ {incoherenceCount} incoerência(s) de cotação em {incoherentSubs} submissão(ões)
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#b91c1c' }}>
            Notas acima do máximo da pergunta, ou respostas em branco com pontos. Abre a <strong>Correção horizontal</strong>: ficam marcadas a vermelho, com o botão <strong>“corrigir”</strong> para pôr o valor correcto (0 ou o máximo).
          </p>
        </div>
      )}

      {/* Aviso + re-correção de pendentes (quota de IA esgotada no momento) */}
      {toRegrade.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border px-4 py-3 mb-3"
          style={{ borderColor: '#f59e0b', background: '#fffbeb' }}>
          <span className="text-sm" style={{ color: '#92400e' }}>
            ⚠️ {toRegrade.length} submissão(ões) por corrigir (a IA não as conseguiu avaliar — normalmente quota). As respostas estão guardadas; podes corrigir agora ou quando o crédito voltar.
          </span>
          <button onClick={regradePending} disabled={regrading}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 shrink-0"
            style={{ background: '#b45309' }}>
            {regrading ? 'A corrigir…' : `Corrigir pendentes (${toRegrade.length})`}
          </button>
        </div>
      )}

      {/* Re-correção com critérios novos — só quando há notas de um motor mais antigo */}
      {outdated.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border px-4 py-3 mb-3"
          style={{ borderColor: '#0EA5E9', background: '#f0f9ff' }}>
          <span className="text-sm" style={{ color: '#075985' }}>
            ✨ {outdated.length} submissão(ões) com perguntas corrigidas antes de uma melhoria da correcção. Re-corrige só essas perguntas (as restantes e as revistas à mão ficam intactas).
          </span>
          <button onClick={regradeOutdated} disabled={regradingOld}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 shrink-0"
            style={{ background: '#0369a1' }}>
            {regradingOld ? 'A re-corrigir…' : `Re-corrigir com os critérios novos (${outdated.length})`}
          </button>
        </div>
      )}
      {regradeMsg && <p className="text-xs mb-2" style={{ color: '#6B7280' }}>{regradeMsg}</p>}

      {/* ── Integridade: análise de conteúdo (IA) + resumo de indícios ── */}
      <div className="rounded-xl border px-4 py-3 mb-3" style={{ borderColor: integritySubs ? '#f59e0b' : '#e2e8f0', background: integritySubs ? '#fffbeb' : '#f8fafc' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
              🛡️ Integridade {integritySubs > 0 && <span style={{ color: '#b45309' }}>· {integritySubs} submissão(ões) com indícios</span>}
            </p>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              A análise de conteúdo sinaliza respostas com vocabulário/conceitos acima do ano ou fora do tema — indício de ajuda externa (web/IA). São <strong>indícios para reveres</strong>, não notas. Vês as marcas na Correção horizontal.
            </p>
          </div>
          <button onClick={runContentCheck} disabled={contentChecking}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 shrink-0"
            style={{ background: '#b45309' }}>
            {contentChecking ? 'A analisar…' : anyContentFlags ? 'Reanalisar conteúdo (IA)' : 'Analisar conteúdo (IA)'}
          </button>
        </div>
        {contentMsg && <p className="text-xs mt-2" style={{ color: '#92400e' }}>{contentMsg}</p>}
      </div>

      {/* ── Divulgação de resultados aos alunos ── */}
      <div className="rounded-xl border px-4 py-3 mb-3"
        style={{ borderColor: released ? '#86efac' : '#e2e8f0', background: released ? '#f0fdf4' : '#f8fafc' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
              {released ? '✓ Resultados divulgados' : 'Resultados ocultos dos alunos'}
            </p>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              {released
                ? 'Cada aluno vê a sua correcção pelo link/QR que recebeu ao submeter.'
                : 'Revê as notas (sobretudo as “por corrigir”) e depois divulga para os alunos verem a correcção.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <a href={`/dashboard/exams/${sessionId}/folha`}
              className="px-4 py-2 rounded-lg text-sm font-semibold border"
              style={{ borderColor: '#0D1B2A20', color: '#0D1B2A' }}
              title="Imprimir um talão com QR por aluno, para distribuir">
              🖨️ Folha de QR
            </a>
            <button onClick={toggleRelease} disabled={releasing}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: released ? 'transparent' : '#0D1B2A', color: released ? '#0D1B2A' : '#F7F3EE', border: released ? '1px solid #0D1B2A30' : 'none' }}>
              {releasing ? '…' : released ? 'Ocultar' : 'Divulgar resultados'}
            </button>
            {released && withEmail > 0 && (
              <button onClick={sendEmails} disabled={emailing}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#00B4D8' }}>
                {emailing ? 'A enviar…' : `✉️ Enviar por email (${withEmail})`}
              </button>
            )}
          </div>
        </div>
        {resultMsg && <p className="text-xs mt-2" style={{ color: '#374151' }}>{resultMsg}</p>}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b" style={{ borderColor: '#0D1B2A10' }}>
        {([
          { key: 'submissions', label: `Submissões (${submissions.length})` },
          { key: 'horizontal',  label: 'Correção horizontal' },
          { key: 'analytics',   label: `Análise${gradedCount > 0 ? ` (${gradedCount} corrigidas)` : ''}` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-5 py-3 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderBottomColor: tab === key ? '#00B4D8' : 'transparent',
              color: tab === key ? '#00B4D8' : '#6B7280',
              marginBottom: '-1px',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Filtro por turma (Submissões + Análise) ── */}
      {(tab === 'submissions' || tab === 'analytics') && turmaOptions.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <span className="text-xs font-medium" style={{ color: '#6B7280' }}>Turma:</span>
          <button onClick={() => setTurmaView('all')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold border"
            style={{ borderColor: turmaView === 'all' ? '#0D1B2A' : '#0D1B2A20', background: turmaView === 'all' ? '#0D1B2A' : 'transparent', color: turmaView === 'all' ? 'white' : '#6B7280' }}>
            Todas ({submissions.length})
          </button>
          {turmaOptions.map(t => (
            <button key={t} onClick={() => setTurmaView(t)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border"
              style={{ borderColor: turmaView === t ? '#0D1B2A' : '#0D1B2A20', background: turmaView === t ? '#0D1B2A' : 'transparent', color: turmaView === t ? 'white' : '#6B7280' }}>
              {t}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab: Correção horizontal ── */}
      {tab === 'horizontal' && (
        <HorizontalGrading
          submissions={submissions}
          questions={questions}
          fallbackYear={fallbackYear}
          onChanged={() => router.refresh()}
          sessionId={sessionId}
          subject={(testSnapshot as TestSnapshot).subject}
          yearLevel={(testSnapshot as TestSnapshot).yearLevel}
          topic={(testSnapshot as TestSnapshot).topic}
        />
      )}

      {/* ── Tab: Análise ── */}
      {tab === 'analytics' && (
        <AnalyticsDashboard submissions={turmaScopedSubs} questions={questions} fallbackYear={fallbackYear}
          turmaView={turmaView} allSubmissions={submissions} />
      )}

      {/* ── Tab: Submissões ── */}
      {tab === 'submissions' && (
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#0D1B2A10' }}>
        {/* Filtros */}
        <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: '#0D1B2A08' }}>
          {(['all', 'pending', 'graded'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: filter === f ? '#0D1B2A' : 'transparent',
                color: filter === f ? 'white' : '#6B7280',
              }}
            >
              {f === 'all' ? `Todas (${submissions.length})` :
               f === 'pending' ? `Pendentes (${submissions.filter(s => s.status === 'submitted' || s.status === 'grading').length})` :
               `Corrigidas (${submissions.filter(s => s.status === 'graded' || s.status === 'reviewed').length})`}
            </button>
          ))}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #0D1B2A08' }}>
                {['Aluno', 'Turma', 'N.º', 'Nota', 'Estado', 'Submissão', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold"
                    style={{ color: '#6B7280' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((sub, i) => {
                const st = STATUS_LABEL[sub.status] ?? STATUS_LABEL['submitted']
                const percentage = sub.total_score !== null && sub.max_score
                  ? Math.round((sub.total_score / sub.max_score) * 100)
                  : null
                const tLabel = turmaLabel(sub)
                const showHeader = i === 0 || turmaLabel(sorted[i - 1]) !== tLabel

                return (
                  <Fragment key={sub.id}>
                  {showHeader && (
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan={7} className="px-4 py-1.5 text-xs font-semibold" style={{ color: '#0D1B2A', borderTop: '1px solid #0D1B2A10' }}>
                        📋 Turma {tLabel} <span className="font-normal" style={{ color: '#9CA3AF' }}>· {turmaCounts[tLabel]} aluno(s)</span>
                      </td>
                    </tr>
                  )}
                  <tr
                    style={{ borderBottom: i < sorted.length - 1 ? '1px solid #0D1B2A05' : 'none' }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: '#0D1B2A' }}>
                      {sub.student_name}
                      {(() => {
                        const rec = parseIntegrity(sub.answers)
                        const sum = summarizeIntegrity(rec)
                        if (rec?.annulled) return <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#fee2e2', color: '#991b1b' }} title="Exame anulado">⛔ anulado</span>
                        if (!sum.hasAny) return null
                        const c = sum.level === 'high' ? { bg: '#fee2e2', fg: '#991b1b' } : sum.level === 'medium' ? { bg: '#ffedd5', fg: '#9a3412' } : { bg: '#fef9c3', fg: '#854d0e' }
                        return <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.fg }}
                          title="Indícios de integridade — abre para ver">🛡️ indícios</span>
                      })()}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#6B7280' }}>
                      {tLabel}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#6B7280' }}>
                      {sub.student_number ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {sub.total_score !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono" style={{ color: '#0D1B2A' }}>
                            {sub.total_score.toFixed(1)}
                          </span>
                          <span style={{ color: '#9CA3AF' }}>/ {sub.max_score}</span>
                          {percentage !== null && (
                            <span className="text-xs px-1.5 py-0.5 rounded"
                              style={{
                                background: percentage >= 50 ? '#dcfce7' : '#fef2f2',
                                color: percentage >= 50 ? '#166534' : '#dc2626',
                              }}>
                              {percentage}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#d1d5db' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#9CA3AF' }}>
                      {new Date(sub.submitted_at).toLocaleTimeString('pt-PT', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(sub)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-colors"
                        style={{ borderColor: '#0D1B2A20', color: '#0D1B2A' }}
                      >
                        Rever →
                      </button>
                    </td>
                  </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </>
  )
}
