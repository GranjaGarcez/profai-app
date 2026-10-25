'use client'

import { useEffect, useMemo, useState } from 'react'
import { fixMarkSchemeSum } from '@/lib/exam/markScheme'
import { turmaLabel as turmaLabelOf } from '@/lib/exam/turma'

interface GradingDetail { score: number; max: number; feedback?: string; auto?: boolean; ai_confidence?: number }
interface Submission {
  id: string
  student_name: string
  student_class: string | null
  student_year?: number | null
  answers: Record<string, string>
  grading_details: Record<string, GradingDetail> | null
  max_score: number | null
  status: string
  submitted_at: string
}
interface Question {
  index: number
  type: string
  text: string
  options?: string[]
  correctAnswer: string
  points: number
  markScheme?: string
}

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Escolha múltipla', true_false: 'Verdadeiro / Falso',
  short_answer: 'Resposta curta', long_answer: 'Resposta longa', fill_blank: 'Completar',
}

export default function HorizontalGrading({
  submissions, questions, fallbackYear, onChanged,
}: {
  submissions: Submission[]
  questions: Question[]
  fallbackYear: number | null
  onChanged: () => void
}) {
  const [qi, setQi] = useState(0)
  const [turma, setTurma] = useState<'all' | string>('all')
  // Overrides locais (cotação/estado) para a vista ficar fluida sem recarregar a página.
  const [scores, setScores] = useState<Record<string, number>>({})   // chave `${subId}|${qKey}`
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({})   // marcado por ti nesta sessão
  const [onlyPending, setOnlyPending] = useState(false)                   // mostrar só o que falta rever
  const [showQ, setShowQ] = useState(true)                                // mostrar/ocultar enunciado (p/ ver respostas)

  const labelOf = (s: Submission) => turmaLabelOf(s.student_year, s.student_class, fallbackYear)
  const turmas = useMemo(() => Array.from(new Set(submissions.map(labelOf))).sort((a, b) => a.localeCompare(b, 'pt')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submissions, fallbackYear])

  const q = questions[qi]
  const qKey = q ? String(q.index) : ''

  // Navegação por teclado entre questões (quando não se está a escrever num campo).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowRight') setQi(i => Math.min(questions.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setQi(i => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [questions.length])

  if (!q) return <p className="text-sm" style={{ color: '#6B7280' }}>Sem questões.</p>

  const rows = submissions
    .filter(s => turma === 'all' || labelOf(s) === turma)
    .sort((a, b) => {
      const ka = labelOf(a), kb = labelOf(b)
      if (ka !== kb) return ka.localeCompare(kb, 'pt')
      return (a.student_name ?? '').localeCompare(b.student_name ?? '', 'pt')
    })

  const curScore = (s: Submission): number | undefined => {
    const k = `${s.id}|${qKey}`
    if (k in scores) return scores[k]
    return s.grading_details?.[qKey]?.score
  }

  async function save(s: Submission, score: number) {
    const clamped = Math.max(0, Math.min(q.points, score))
    const k = `${s.id}|${qKey}`
    setScores(p => ({ ...p, [k]: clamped }))
    setSaved(p => ({ ...p, [k]: false }))
    try {
      const res = await fetch(`/api/exam/submissions/${s.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionKey: qKey, score: clamped }),
      })
      if (res.ok) { setSaved(p => ({ ...p, [k]: true })); setReviewed(p => ({ ...p, [k]: true })); onChanged() }
    } catch { /* mantém o valor local; o professor pode repetir */ }
  }

  // Revisto por ti = cotaste-o agora, ou já estava marcado como ajuste manual (auto:false).
  const isReviewed = (s: Submission) => reviewed[`${s.id}|${qKey}`] || s.grading_details?.[qKey]?.auto === false
  const isObjective = q.type === 'multiple_choice' || q.type === 'true_false'
  const visibleRows = onlyPending ? rows.filter(s => !isReviewed(s)) : rows
  const reviewedCount = rows.filter(isReviewed).length
  const pendingCount = rows.length - reviewedCount

  return (
    <div className="space-y-4">
      {/* Controlos */}
      <div className="flex items-center gap-2 flex-wrap bg-white rounded-xl border px-3 py-2" style={{ borderColor: '#0D1B2A10' }}>
        <button onClick={() => setQi(i => Math.max(0, i - 1))} disabled={qi === 0}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold border disabled:opacity-40"
          style={{ borderColor: '#0D1B2A20', color: '#0D1B2A' }}>◀</button>
        <select value={qi} onChange={e => setQi(Number(e.target.value))}
          className="px-2 py-1.5 rounded-lg text-sm border" style={{ borderColor: '#0D1B2A20', color: '#0D1B2A' }}>
          {questions.map((qq, i) => <option key={i} value={i}>Questão {i + 1} de {questions.length}</option>)}
        </select>
        <button onClick={() => setQi(i => Math.min(questions.length - 1, i + 1))} disabled={qi === questions.length - 1}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold border disabled:opacity-40"
          style={{ borderColor: '#0D1B2A20', color: '#0D1B2A' }}>▶</button>

        <span className="text-xs ml-1" style={{ color: '#9CA3AF' }}>(setas ← → navegam)</span>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button onClick={() => setOnlyPending(v => !v)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border"
            style={{ borderColor: onlyPending ? '#b45309' : '#0D1B2A20', background: onlyPending ? '#fffbeb' : 'transparent', color: onlyPending ? '#92400e' : '#6B7280' }}>
            {onlyPending ? '◉ Só por rever' : '○ Só por rever'}
          </button>
          <label className="text-xs" style={{ color: '#6B7280' }}>Turma:</label>
          <select value={turma} onChange={e => setTurma(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-sm border" style={{ borderColor: '#0D1B2A20', color: '#0D1B2A' }}>
            <option value="all">Todas ({submissions.length})</option>
            {turmas.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Questão (fixa ao topo) — altura limitada para as respostas aparecerem sempre */}
      <div className="sticky top-0 z-10 bg-white rounded-xl border p-3" style={{ borderColor: '#0D1B2A20', boxShadow: '0 2px 8px rgba(13,27,42,0.06)' }}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: '#f1f5f9', color: '#64748b' }}>
            {TYPE_LABEL[q.type] ?? q.type} · {q.points} pt
          </span>
          <span className="text-xs" style={{ color: '#059669' }}>✓ revistas por ti: {reviewedCount}</span>
          <span className="text-xs" style={{ color: pendingCount ? '#b45309' : '#9CA3AF' }}>· por rever: {pendingCount}</span>
          <button onClick={() => setShowQ(v => !v)}
            className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-md border"
            style={{ borderColor: '#0D1B2A20', color: '#0369a1' }}>
            {showQ ? 'Ocultar enunciado' : 'Mostrar enunciado'}
          </button>
        </div>

        {/* Resposta certa — sempre visível (curta e essencial) */}
        <p className="text-xs"><span className="font-bold" style={{ color: '#166534' }}>Resposta certa: </span><span style={{ color: '#166534' }}>{q.correctAnswer}</span></p>

        {showQ && (
          <div className="mt-2" style={{ maxHeight: '32vh', overflowY: 'auto' }}>
            <p className="text-sm font-medium mb-2" style={{ color: '#0D1B2A', lineHeight: 1.6 }}>{q.text}</p>
            {q.options && q.options.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {q.options.map((o, i) => <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: '#f8fafc', color: '#374151' }}>{o}</span>)}
              </div>
            )}
            {q.markScheme && (
              <details>
                <summary className="text-xs cursor-pointer" style={{ color: '#00B4D8' }}>Critérios</summary>
                <p className="text-xs mt-1" style={{ color: '#374151' }}>{fixMarkSchemeSum(q.markScheme, q.points)}</p>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Lista de alunos para ESTA questão (agrupada por turma quando "Todas") */}
      <div className="space-y-2">
        {visibleRows.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: '#9CA3AF' }}>
            {onlyPending ? 'Nada por rever nesta questão. 🎉' : 'Sem alunos.'}
          </p>
        )}
        {visibleRows.map((s, i) => {
          const showHeader = turma === 'all' && (i === 0 || labelOf(visibleRows[i - 1]) !== labelOf(s))
          const k = `${s.id}|${qKey}`
          const sc = curScore(s)
          const d = s.grading_details?.[qKey]
          const ans = s.answers?.[qKey] ?? ''
          const correctObj = isObjective && ans.trim().toUpperCase() === String(q.correctAnswer).trim().toUpperCase()
          const reviewedByYou = isReviewed(s)
          const aiUnsure = !reviewedByYou && typeof d?.ai_confidence === 'number' && d.ai_confidence < 0.7
          // Incoerências: nota acima do máximo, ou resposta em branco com pontos.
          const incOverMax = typeof sc === 'number' && sc > q.points + 0.001
          const incBlankScored = ans.trim() === '' && typeof sc === 'number' && sc > 0
          const incoherent = incOverMax || incBlankScored
          return (
            <div key={s.id}>
              {showHeader && (
                <p className="text-xs font-bold mt-3 mb-1 px-1" style={{ color: '#0D1B2A' }}>📋 Turma {labelOf(s)}</p>
              )}
              <div className="bg-white rounded-xl border-2 p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                style={{ borderColor: incoherent ? '#dc2626' : reviewedByYou ? '#86efac' : '#0D1B2A10', background: incoherent ? '#fef2f2' : 'white' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>{s.student_name}</span>
                    {turma === 'all' && <span className="text-xs" style={{ color: '#9CA3AF' }}>· {labelOf(s)}</span>}
                    {reviewedByYou
                      ? <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#f0fdf4', color: '#166534' }} title="Já revisto/cotado por ti">✓ revisto</span>
                      : aiUnsure
                        ? <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#fffbeb', color: '#92400e' }} title="IA incerta — convém rever">⚠︎ rever</span>
                        : <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#f1f5f9', color: '#64748b' }} title="Cotado pela IA, por confirmar">IA</span>}
                    {incoherent && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#fee2e2', color: '#991b1b' }}>
                        ⚠ {incOverMax ? `nota ${sc} acima do máximo (${q.points})` : 'em branco mas com pontos'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: '#374151', whiteSpace: 'pre-wrap' }}>
                    {ans.trim()
                      ? (isObjective
                          ? <span style={{ color: correctObj ? '#059669' : '#dc2626', fontWeight: 600 }}>{ans} {correctObj ? '✓' : '✗'}</span>
                          : ans)
                      : <span style={{ color: '#9CA3AF' }}>(em branco)</span>}
                  </p>
                </div>
                {/* Controlo de cotação */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isObjective ? (
                    <>
                      <button onClick={() => save(s, q.points)}
                        className="px-2.5 py-1 rounded-md text-xs font-bold"
                        style={{ background: sc === q.points ? '#059669' : '#f0fdf4', color: sc === q.points ? 'white' : '#166534' }}>
                        ✓ {q.points}
                      </button>
                      <button onClick={() => save(s, 0)}
                        className="px-2.5 py-1 rounded-md text-xs font-bold"
                        style={{ background: sc === 0 ? '#dc2626' : '#fef2f2', color: sc === 0 ? 'white' : '#dc2626' }}>
                        ✗ 0
                      </button>
                    </>
                  ) : (
                    <>
                      <input type="number" min={0} max={q.points} step={0.5}
                        defaultValue={sc ?? ''}
                        onBlur={e => { const v = e.target.value; if (v !== '') save(s, Number(v)) }}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        className="w-16 px-2 py-1 rounded-md border text-sm text-center"
                        style={{ borderColor: '#0D1B2A20', outline: 'none', color: '#0D1B2A' }} />
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>/ {q.points}</span>
                    </>
                  )}
                  {incoherent && (
                    <button onClick={() => save(s, incBlankScored ? 0 : q.points)}
                      title={incBlankScored ? 'Pôr a 0 (resposta em branco)' : `Cortar ao máximo (${q.points})`}
                      className="px-2 py-1 rounded-md text-xs font-bold text-white"
                      style={{ background: '#dc2626' }}>
                      corrigir → {incBlankScored ? 0 : q.points}
                    </button>
                  )}
                  <span className="text-xs w-4 text-center" style={{ color: '#059669' }}>{saved[k] ? '✓' : (k in scores ? '…' : '')}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
