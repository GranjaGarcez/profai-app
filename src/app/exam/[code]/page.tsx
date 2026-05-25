'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import type { ExamSession, Question, TestSnapshot } from '@/lib/exam/types'
import { getAllQuestions } from '@/lib/exam/types'

type Phase = 'loading' | 'error' | 'identify' | 'exam' | 'submitted'

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Escolha múltipla',
  true_false: 'Verdadeiro / Falso',
  short_answer: 'Resposta curta',
  long_answer: 'Resposta longa',
  fill_blank: 'Completar espaços',
}

export default function ExamPage() {
  const { code } = useParams<{ code: string }>()
  const [phase, setPhase]     = useState<Phase>('loading')
  const [session, setSession] = useState<ExamSession | null>(null)
  const [errorMsg, setError]  = useState('')

  // Dados do aluno
  const [studentName,   setStudentName]   = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [studentClass,  setStudentClass]  = useState('')

  // Respostas: { [questionIndex]: string }
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Temporizador
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Carrega sessão
  useEffect(() => {
    fetch(`/api/exam/session/${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setPhase('error'); return }
        setSession(data.session as ExamSession)
        if (data.session.duration_minutes) {
          setTimeLeft(data.session.duration_minutes * 60)
        }
        setPhase('identify')
      })
      .catch(() => { setError('Não foi possível carregar o exame.'); setPhase('error') })
  }, [code])

  // Temporizador
  useEffect(() => {
    if (phase !== 'exam' || timeLeft === null) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t === null || t <= 1) {
          clearInterval(timerRef.current!)
          handleSubmit()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const questions: Question[] = session ? getAllQuestions(session.test_snapshot as TestSnapshot) : []
  const answered = Object.keys(answers).filter(k => answers[k].trim()).length

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId:     session!.id,
          studentName:   studentName.trim(),
          studentNumber: studentNumber.trim(),
          studentClass:  studentClass.trim(),
          answers,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setPhase('error'); return }
      setPhase('submitted')
    } catch {
      setError('Erro ao submeter. Verifica a tua ligação.')
      setSubmitting(false)
    }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60), sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  // ── Ecrãs ─────────────────────────────────────────────────────────────────

  if (phase === 'loading') return (
    <div className="text-center py-20 text-sm" style={{ color: '#6B7280' }}>A carregar exame...</div>
  )

  if (phase === 'error') return (
    <div className="text-center py-20 space-y-3">
      <p className="text-4xl">❌</p>
      <p className="font-semibold" style={{ color: '#0D1B2A' }}>{errorMsg}</p>
      <p className="text-sm" style={{ color: '#6B7280' }}>Confirma o código com o teu professor.</p>
    </div>
  )

  if (phase === 'submitted') return (
    <div className="text-center py-20 space-y-4">
      <p className="text-5xl">✅</p>
      <h2 className="text-xl font-bold" style={{ color: '#0D1B2A' }}>Exame submetido!</h2>
      <p className="text-sm" style={{ color: '#6B7280' }}>
        A tua resposta foi entregue. O professor irá divulgar os resultados em breve.
      </p>
      <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: '#e0f7fc', color: '#0369a1' }}>
        Respondeste a <strong>{answered}</strong> de <strong>{questions.length}</strong> questões.
      </div>
    </div>
  )

  if (phase === 'identify') return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
          {session!.title}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Código: <strong>{session!.access_code}</strong>
          {session!.duration_minutes && ` · ${session!.duration_minutes} minutos`}
          {' · '}{questions.length} questões
        </p>
      </div>

      <div className="bg-white rounded-2xl border p-6 space-y-4" style={{ borderColor: '#0D1B2A10' }}>
        <h2 className="font-semibold" style={{ color: '#0D1B2A' }}>Os teus dados</h2>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#0D1B2A' }}>
            Nome completo *
          </label>
          <input
            type="text"
            value={studentName}
            onChange={e => setStudentName(e.target.value)}
            placeholder="Ex: Maria Silva"
            className="w-full px-3 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: '#0D1B2A25', outline: 'none' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#0D1B2A' }}>Número</label>
            <input
              type="text" value={studentNumber}
              onChange={e => setStudentNumber(e.target.value)}
              placeholder="Ex: 12"
              className="w-full px-3 py-2.5 rounded-lg border text-sm"
              style={{ borderColor: '#0D1B2A25', outline: 'none' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#0D1B2A' }}>Turma</label>
            <input
              type="text" value={studentClass}
              onChange={e => setStudentClass(e.target.value)}
              placeholder="Ex: 6ºA"
              className="w-full px-3 py-2.5 rounded-lg border text-sm"
              style={{ borderColor: '#0D1B2A25', outline: 'none' }}
            />
          </div>
        </div>

        <button
          disabled={!studentName.trim()}
          onClick={() => setPhase('exam')}
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: '#00B4D8' }}>
          Iniciar exame →
        </button>
      </div>
    </div>
  )

  // ── Fase exame ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Cabeçalho fixo */}
      <div className="sticky top-0 z-10 py-3 px-4 rounded-xl flex items-center justify-between shadow-sm"
        style={{ background: '#0D1B2A', color: '#F7F3EE' }}>
        <div>
          <p className="text-xs font-semibold">{session!.title}</p>
          <p className="text-xs opacity-60">{studentName}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs opacity-70">{answered}/{questions.length} respondidas</span>
          {timeLeft !== null && (
            <span className="font-mono text-sm font-bold px-2 py-0.5 rounded"
              style={{ background: timeLeft < 120 ? '#dc2626' : '#00B4D830', color: timeLeft < 120 ? 'white' : '#00B4D8' }}>
              ⏱ {formatTime(timeLeft)}
            </span>
          )}
        </div>
      </div>

      {/* Instruções */}
      {session!.test_snapshot.instructions && (
        <div className="px-4 py-3 rounded-xl text-xs" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d60' }}>
          <strong>Instruções:</strong> {session!.test_snapshot.instructions}
        </div>
      )}

      {/* Questões */}
      {questions.map((q, i) => (
        <QuestionCard
          key={q.index}
          q={q}
          n={i + 1}
          answer={answers[String(q.index)] ?? ''}
          onChange={v => setAnswers(a => ({ ...a, [String(q.index)]: v }))}
        />
      ))}

      {/* Submeter */}
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#0D1B2A10' }}>
        {answered < questions.length && (
          <p className="text-sm mb-4 text-center" style={{ color: '#92400e' }}>
            ⚠️ Tens <strong>{questions.length - answered}</strong> questão(ões) por responder.
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-opacity disabled:opacity-50"
          style={{ background: '#00B4D8' }}>
          {submitting ? 'A submeter...' : '📤 Submeter exame'}
        </button>
        <p className="text-center text-xs mt-2" style={{ color: '#9CA3AF' }}>
          Após submeter não podes alterar as tuas respostas.
        </p>
      </div>
    </div>
  )
}

// ── Cartão de questão ──────────────────────────────────────────────────────────
function QuestionCard({
  q, n, answer, onChange,
}: {
  q: Question; n: number; answer: string; onChange: (v: string) => void
}) {
  const isMulti = q.type === 'multiple_choice'
  const isTF    = q.type === 'true_false'
  const isOpen  = !isMulti && !isTF

  return (
    <div className="bg-white rounded-2xl border p-5 space-y-3" style={{ borderColor: '#0D1B2A10' }}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: '#0D1B2A', color: '#F7F3EE' }}>{n}</span>
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#0D1B2A08', color: '#6B7280' }}>
          {TYPE_LABEL[q.type] ?? q.type}
        </span>
        <span className="ml-auto text-xs font-bold" style={{ color: '#C8A84B' }}>{q.points} pt</span>
      </div>

      {/* Enunciado */}
      <p className="text-sm font-medium leading-relaxed" style={{ color: '#0D1B2A', lineHeight: 1.7 }}>
        {q.text}
      </p>

      {/* Opções */}
      {isMulti && q.options && (
        <div className="space-y-2 mt-1">
          {q.options.map((opt, j) => {
            const letter = String.fromCharCode(65 + j)
            const selected = answer === letter || answer === opt
            return (
              <label key={j}
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-colors"
                style={{
                  borderColor: selected ? '#00B4D8' : '#0D1B2A15',
                  background: selected ? '#e0f7fc' : 'white',
                }}>
                <input type="radio" className="mt-0.5 shrink-0" checked={selected}
                  onChange={() => onChange(letter)} />
                <span className="text-sm" style={{ color: '#374151' }}>{opt}</span>
              </label>
            )
          })}
        </div>
      )}

      {/* V / F */}
      {isTF && (
        <div className="flex gap-3">
          {['Verdadeiro', 'Falso'].map(opt => {
            const val = opt.charAt(0)
            const selected = answer === val || answer === opt
            return (
              <label key={opt}
                className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer border transition-colors"
                style={{
                  borderColor: selected ? '#00B4D8' : '#0D1B2A15',
                  background: selected ? '#e0f7fc' : 'white',
                }}>
                <input type="radio" checked={selected} onChange={() => onChange(val)} />
                <span className="text-sm font-medium" style={{ color: '#374151' }}>{opt}</span>
              </label>
            )
          })}
        </div>
      )}

      {/* Resposta aberta */}
      {isOpen && (
        <textarea
          value={answer}
          onChange={e => onChange(e.target.value)}
          rows={q.type === 'long_answer' ? 8 : 3}
          placeholder="Escreve a tua resposta aqui..."
          className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none"
          style={{ borderColor: '#0D1B2A25', outline: 'none', lineHeight: 1.7 }}
        />
      )}

      {/* Indicador respondido */}
      {answer.trim() && (
        <p className="text-xs font-medium" style={{ color: '#059669' }}>✓ Respondida</p>
      )}
    </div>
  )
}
