'use client'

import { useEffect, useMemo, useState } from 'react'
import { fixMarkSchemeSum } from '@/lib/exam/markScheme'
import { turmaLabel as turmaLabelOf } from '@/lib/exam/turma'

interface GradingDetail { score: number; max: number; feedback?: string; auto?: boolean; manual?: boolean; ai_confidence?: number }
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
  bloomLevel?: string
  figure?: unknown
}

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Escolha múltipla', true_false: 'Verdadeiro / Falso',
  short_answer: 'Resposta curta', long_answer: 'Resposta longa', fill_blank: 'Completar',
}

export default function HorizontalGrading({
  submissions, questions, fallbackYear, onChanged, sessionId, subject, yearLevel, topic,
}: {
  submissions: Submission[]
  questions: Question[]
  fallbackYear: number | null
  onChanged: () => void
  sessionId: string
  subject: string
  yearLevel: number
  topic: string
}) {
  const [qi, setQi] = useState(0)
  const [turma, setTurma] = useState<'all' | string>('all')
  // Overrides locais (cotação/estado) para a vista ficar fluida sem recarregar a página.
  const [scores, setScores] = useState<Record<string, number>>({})   // chave `${subId}|${qKey}`
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({})   // marcado por ti nesta sessão
  const [onlyPending, setOnlyPending] = useState(false)                   // mostrar só o que falta rever
  const [showQ, setShowQ] = useState(true)                                // mostrar/ocultar enunciado (p/ ver respostas)

  // ── Editar critérios desta pergunta (exame já lançado) + re-corrigir só ela ──
  const [editing, setEditing] = useState(false)
  const [editAnswer, setEditAnswer] = useState('')
  const [editMark, setEditMark] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [savingCrit, setSavingCrit] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [critMsg, setCritMsg] = useState<string | null>(null)

  const labelOf = (s: Submission) => turmaLabelOf(s.student_year, s.student_class, fallbackYear)
  const turmas = useMemo(() => Array.from(new Set(submissions.map(labelOf))).sort((a, b) => a.localeCompare(b, 'pt')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submissions, fallbackYear])

  const q = questions[qi]
  const qKey = q ? String(q.index) : ''

  // Fecha o editor de critérios ao mudar de questão (evita editar a errada).
  function closeEditor() { setEditing(false); setConfirmSave(false); setCritMsg(null) }
  function changeQi(next: number) {
    setQi(Math.max(0, Math.min(questions.length - 1, next)))
    closeEditor()
  }

  // Navegação por teclado entre questões (quando não se está a escrever num campo).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowRight') { setQi(i => Math.min(questions.length - 1, i + 1)); closeEditor() }
      if (e.key === 'ArrowLeft') { setQi(i => Math.max(0, i - 1)); closeEditor() }
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

  // ── Editor de critérios: pré-visualização do impacto (sobre TODAS as submissões,
  // não só a turma filtrada — o servidor re-corrige o exame inteiro) ──────────────
  const gradedSubs = submissions.filter(s => s.grading_details?.[qKey])
  const preservedSubs = gradedSubs.filter(s => {
    const d = s.grading_details![qKey]
    return d?.manual === true || (d?.auto === false && s.status === 'reviewed')
  })
  const regradableCount = gradedSubs.length - preservedSubs.length

  function openEditor() {
    setEditAnswer(q.correctAnswer ?? '')
    setEditMark(q.markScheme ?? '')
    setConfirmSave(false); setCritMsg(null); setEditing(true)
  }

  async function regenerateCriteria() {
    setRegenerating(true); setCritMsg(null)
    try {
      const res = await fetch('/api/ai/refresh-criteria', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject, yearLevel, topic, type: q.type, points: q.points,
          text: q.text, options: q.options ?? null, figure: q.figure ?? null,
        }),
      })
      const d = await res.json()
      if (!res.ok || !d.criteria) throw new Error(d.error || 'Falha ao regenerar.')
      setEditAnswer(String(d.criteria.correctAnswer ?? ''))
      setEditMark(String(d.criteria.markScheme ?? ''))
      setCritMsg('Critérios regenerados pela IA — revê e ajusta antes de guardar.')
    } catch (e) { setCritMsg(e instanceof Error ? e.message : 'Erro.') }
    finally { setRegenerating(false) }
  }

  async function saveCriteria() {
    setSavingCrit(true); setCritMsg(null)
    try {
      const res = await fetch(`/api/exam/sessions/${sessionId}/edit-criteria`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionKey: qKey, correctAnswer: editAnswer, markScheme: editMark }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Falha ao guardar.')
      setCritMsg(`Critérios guardados. ${d.regraded} resposta(s) re-corrigida(s)` +
        `${d.preserved ? `, ${d.preserved} revisão(ões) manual(ais) preservada(s)` : ''}` +
        `${d.stillPending ? `, ${d.stillPending} ficaram por confirmar` : ''}.`)
      setConfirmSave(false); setEditing(false)
      onChanged()   // recarrega snapshot (critérios novos) + notas
    } catch (e) { setCritMsg(e instanceof Error ? e.message : 'Erro.'); setConfirmSave(false) }
    finally { setSavingCrit(false) }
  }

  return (
    <div className="space-y-4">
      {/* Controlos */}
      <div className="flex items-center gap-2 flex-wrap bg-white rounded-xl border px-3 py-2" style={{ borderColor: '#0D1B2A10' }}>
        <button onClick={() => changeQi(qi - 1)} disabled={qi === 0}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold border disabled:opacity-40"
          style={{ borderColor: '#0D1B2A20', color: '#0D1B2A' }}>◀</button>
        <select value={qi} onChange={e => changeQi(Number(e.target.value))}
          className="px-2 py-1.5 rounded-lg text-sm border" style={{ borderColor: '#0D1B2A20', color: '#0D1B2A' }}>
          {questions.map((qq, i) => <option key={i} value={i}>Questão {i + 1} de {questions.length}</option>)}
        </select>
        <button onClick={() => changeQi(qi + 1)} disabled={qi === questions.length - 1}
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
          <button onClick={() => (editing ? setEditing(false) : openEditor())}
            className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-md border"
            style={{ borderColor: editing ? '#b45309' : '#C8A84B', background: editing ? '#fffbeb' : '#fdf6e3', color: '#92400e' }}
            title="Corrigir a resposta certa / os critérios desta pergunta e re-corrigir só esta pergunta">
            {editing ? '✕ Fechar critérios' : '✏️ Editar critérios'}
          </button>
          <button onClick={() => setShowQ(v => !v)}
            className="text-xs font-semibold px-2 py-0.5 rounded-md border"
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

      {/* ── Editor de critérios (exame já lançado) ── */}
      {editing && (
        <div className="bg-white rounded-xl border-2 p-4 space-y-3" style={{ borderColor: '#C8A84B' }}>
          <div className="flex items-start gap-2">
            <span className="text-lg">✏️</span>
            <div>
              <p className="text-sm font-bold" style={{ color: '#92400e' }}>Corrigir critérios da Questão {qi + 1}</p>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                Muda só a corrigenda desta pergunta. O enunciado, as opções e a cotação ficam iguais; as outras
                perguntas e as cotações que já deste à mão <strong>não são tocadas</strong>. Os critérios anteriores
                ficam guardados (reversíveis).
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: '#374151' }}>Resposta certa</label>
            <textarea value={editAnswer} onChange={e => setEditAnswer(e.target.value)} rows={2}
              className="w-full mt-1 px-2.5 py-1.5 rounded-lg border text-sm"
              style={{ borderColor: '#0D1B2A20', outline: 'none', color: '#0D1B2A' }} />
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: '#374151' }}>Critérios de correção ({q.points} pt)</label>
            <textarea value={editMark} onChange={e => setEditMark(e.target.value)} rows={4}
              placeholder="Ex.: Identifica a causa (3pt) + Justifica com o conceito (2pt)"
              className="w-full mt-1 px-2.5 py-1.5 rounded-lg border text-sm"
              style={{ borderColor: '#0D1B2A20', outline: 'none', color: '#0D1B2A' }} />
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Os pontos parcelares são reajustados para somarem {q.points}.</p>
          </div>

          {critMsg && <p className="text-xs" style={{ color: '#92400e' }}>{critMsg}</p>}

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={regenerateCriteria} disabled={regenerating || savingCrit}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border disabled:opacity-50"
              style={{ borderColor: '#00B4D8', color: '#0369a1' }}>
              {regenerating ? 'A regenerar…' : '↻ Regenerar com IA'}
            </button>
            <span className="text-xs ml-auto" style={{ color: '#6B7280' }}>
              Re-corrige {regradableCount} resposta(s){preservedSubs.length ? ` · preserva ${preservedSubs.length} manual(ais)` : ''}
            </span>
          </div>

          {!confirmSave ? (
            <button onClick={() => setConfirmSave(true)} disabled={!editAnswer.trim() || savingCrit}
              className="w-full text-sm font-bold px-4 py-2 rounded-lg text-white disabled:opacity-50"
              style={{ background: '#C8A84B' }}>
              Guardar e re-corrigir esta pergunta
            </button>
          ) : (
            <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: '#C8A84B', background: '#fffbeb' }}>
              <p className="text-xs" style={{ color: '#92400e' }}>
                Vais re-corrigir <strong>{regradableCount}</strong> resposta(s) a esta pergunta com os critérios novos.
                {preservedSubs.length > 0 && <> As <strong>{preservedSubs.length}</strong> que já cotaste à mão ficam intactas.</>}
                {' '}Confirmas?
              </p>
              <div className="flex gap-2">
                <button onClick={saveCriteria} disabled={savingCrit}
                  className="flex-1 text-sm font-bold px-4 py-2 rounded-lg text-white disabled:opacity-50"
                  style={{ background: '#C8A84B' }}>
                  {savingCrit ? 'A guardar e re-corrigir…' : 'Sim, re-corrigir'}
                </button>
                <button onClick={() => setConfirmSave(false)} disabled={savingCrit}
                  className="text-sm font-semibold px-4 py-2 rounded-lg border"
                  style={{ borderColor: '#0D1B2A20', color: '#6B7280' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
