'use client'

import { useState } from 'react'
import { getAllQuestions } from '@/lib/exam/types'
import type { TestSnapshot, Question, GradingDetail, RubricCriterion } from '@/lib/exam/types'

// ── Tipos locais ────────────────────────────────────────────────────────────────
interface Submission {
  id: string
  student_name: string
  student_number: string | null
  student_class: string | null
  answers: Record<string, string>
  total_score: number | null
  max_score: number | null
  status: string
  grading_details: Record<string, GradingDetail> | null
  teacher_notes: string | null
  submitted_at: string
  graded_at: string | null
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  submitted: { label: 'Submetido',   color: '#92400e', bg: '#fffbeb' },
  grading:   { label: 'A corrigir',  color: '#1e40af', bg: '#eff6ff' },
  graded:    { label: 'Corrigido',   color: '#166534', bg: '#f0fdf4' },
  reviewed:  { label: 'Revisto',     color: '#6b21a8', bg: '#faf5ff' },
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

// ── Componente de detalhe de submissão ─────────────────────────────────────────
function SubmissionDetail({
  submission,
  questions,
  onClose,
}: {
  submission: Submission
  questions: Question[]
  onClose: () => void
}) {
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState(submission.teacher_notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [localDetails, setLocalDetails] = useState(submission.grading_details ?? {})
  const [localTotal, setLocalTotal] = useState(submission.total_score)

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
  sessionId: _sessionId,
  submissions,
  testSnapshot,
  isActive,
}: {
  sessionId: string
  submissions: Submission[]
  testSnapshot: unknown
  isActive: boolean
}) {
  const [selected, setSelected] = useState<Submission | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'graded'>('all')

  const questions = getAllQuestions(testSnapshot as TestSnapshot)

  const filtered = submissions.filter(s => {
    if (filter === 'pending') return s.status === 'submitted' || s.status === 'grading'
    if (filter === 'graded') return s.status === 'graded' || s.status === 'reviewed'
    return true
  })

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
          onClose={() => setSelected(null)}
        />
      )}

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
              {filtered.map((sub, i) => {
                const st = STATUS_LABEL[sub.status] ?? STATUS_LABEL['submitted']
                const percentage = sub.total_score !== null && sub.max_score
                  ? Math.round((sub.total_score / sub.max_score) * 100)
                  : null

                return (
                  <tr
                    key={sub.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #0D1B2A05' : 'none' }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: '#0D1B2A' }}>
                      {sub.student_name}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#6B7280' }}>
                      {sub.student_class ?? '—'}
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
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
