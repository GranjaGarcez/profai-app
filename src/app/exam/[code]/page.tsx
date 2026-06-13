'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import type { CalcEntry, ExamSession, Question, TestSnapshot } from '@/lib/exam/types'
import { getAllQuestions } from '@/lib/exam/types'
import Calculator from '@/components/exam/Calculator'
import MathFigure from '@/components/math/MathFigure'

type Phase = 'loading' | 'error' | 'identify' | 'exam' | 'submitted'

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Escolha múltipla',
  true_false:      'Verdadeiro / Falso',
  short_answer:    'Resposta curta',
  long_answer:     'Resposta longa',
  fill_blank:      'Completar espaços',
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

// ── Símbolos matemáticos ───────────────────────────────────────────────────────
const MATH_SYMBOLS = [
  {
    cat: 'Operadores',
    items: [
      { label: '×', insert: '×' },
      { label: '÷', insert: '÷' },
      { label: '±', insert: '±' },
      { label: '·', insert: '·' },
      { label: '%', insert: '%' },
      { label: '∞', insert: '∞' },
      { label: '( )', insert: '()' },
    ],
  },
  {
    cat: 'Potências',
    items: [
      { label: 'x²', insert: '²' },
      { label: 'x³', insert: '³' },
      { label: 'x⁴', insert: '⁴' },
      { label: 'xⁿ', insert: '^' },
      { label: '√', insert: '√' },
      { label: '∛', insert: '∛' },
      { label: '∜', insert: '∜' },
    ],
  },
  {
    cat: 'Frações',
    items: [
      { label: '½', insert: '½' },
      { label: '⅓', insert: '⅓' },
      { label: '⅔', insert: '⅔' },
      { label: '¼', insert: '¼' },
      { label: '¾', insert: '¾' },
      { label: '⅕', insert: '⅕' },
      { label: '⅖', insert: '⅖' },
      { label: '⅗', insert: '⅗' },
      { label: '⅘', insert: '⅘' },
      { label: '⅛', insert: '⅛' },
      { label: '⅜', insert: '⅜' },
      { label: '⅝', insert: '⅝' },
    ],
    hasFractionBuilder: true,
  },
  {
    cat: 'Relações',
    items: [
      { label: '≠', insert: '≠' },
      { label: '≤', insert: '≤' },
      { label: '≥', insert: '≥' },
      { label: '≈', insert: '≈' },
      { label: '∝', insert: '∝' },
      { label: '~', insert: '~' },
      { label: '⇒', insert: '⇒' },
      { label: '⟺', insert: '⟺' },
    ],
  },
  {
    cat: 'Gregas',
    items: [
      { label: 'π', insert: 'π' },
      { label: 'α', insert: 'α' },
      { label: 'β', insert: 'β' },
      { label: 'γ', insert: 'γ' },
      { label: 'θ', insert: 'θ' },
      { label: 'λ', insert: 'λ' },
      { label: 'μ', insert: 'μ' },
      { label: 'σ', insert: 'σ' },
      { label: 'φ', insert: 'φ' },
      { label: 'ω', insert: 'ω' },
      { label: 'Σ', insert: 'Σ' },
      { label: 'Δ', insert: 'Δ' },
      { label: 'Ω', insert: 'Ω' },
    ],
  },
  {
    cat: 'Geometria',
    items: [
      { label: '°', insert: '°' },
      { label: '∠', insert: '∠' },
      { label: '⊥', insert: '⊥' },
      { label: '∥', insert: '∥' },
      { label: '△', insert: '△' },
      { label: '□', insert: '□' },
      { label: '⊙', insert: '⊙' },
      { label: '→', insert: '→' },
      { label: '↔', insert: '↔' },
      { label: 'π', insert: 'π' },
    ],
  },
  {
    cat: 'Conjuntos',
    items: [
      { label: '∈', insert: '∈' },
      { label: '∉', insert: '∉' },
      { label: '⊂', insert: '⊂' },
      { label: '⊃', insert: '⊃' },
      { label: '∩', insert: '∩' },
      { label: '∪', insert: '∪' },
      { label: '∅', insert: '∅' },
      { label: 'ℕ', insert: 'ℕ' },
      { label: 'ℤ', insert: 'ℤ' },
      { label: 'ℚ', insert: 'ℚ' },
      { label: 'ℝ', insert: 'ℝ' },
      { label: 'ℂ', insert: 'ℂ' },
    ],
  },
]

// ── Componente principal ───────────────────────────────────────────────────────
export default function ExamPage() {
  const { code } = useParams<{ code: string }>()
  const [phase, setPhase]     = useState<Phase>('loading')
  const [session, setSession] = useState<ExamSession | null>(null)
  const [errorMsg, setError]  = useState('')

  const [studentName,   setStudentName]   = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [studentClass,  setStudentClass]  = useState('')

  const [answers, setAnswers]             = useState<Record<string, string>>({})
  const [calcHistories, setCalcHistories] = useState<Record<string, CalcEntry[]>>({})
  const [submitting, setSubmitting]       = useState(false)
  const [timeLeft, setTimeLeft]           = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch(`/api/exam/session/${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setPhase('error'); return }
        setSession(data.session as ExamSession)
        if (data.session.duration_minutes) setTimeLeft(data.session.duration_minutes * 60)
        setPhase('identify')
      })
      .catch(() => { setError('Não foi possível carregar o exame.'); setPhase('error') })
  }, [code])

  useEffect(() => {
    if (phase !== 'exam' || timeLeft === null) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t === null || t <= 1) { clearInterval(timerRef.current!); handleSubmit(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const questions: Question[] = session ? getAllQuestions(session.test_snapshot as TestSnapshot) : []
  const answered = Object.keys(answers).filter(k => answers[k].trim()).length
  const progress = questions.length > 0 ? (answered / questions.length) * 100 : 0

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      const answersWithCalc: Record<string, string> = { ...answers }
      for (const [qIdx, entries] of Object.entries(calcHistories)) {
        if (entries.length > 0) {
          answersWithCalc[`calc_${qIdx}`] = entries
            .map((e, i) => `${i + 1}. ${e.expr} = ${e.result}`)
            .join(' | ')
        }
      }
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session!.id, studentName: studentName.trim(),
          studentNumber: studentNumber.trim(), studentClass: studentClass.trim(),
          answers: answersWithCalc,
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
    const urgent = s < 120
    return { text: `${m}:${String(sec).padStart(2, '0')}`, urgent }
  }

  // ── Ecrãs de estado ────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: '#0D1B2A', borderTopColor: 'transparent' }} />
      <p className="text-sm font-medium" style={{ color: '#6B7280' }}>A carregar exame...</p>
    </div>
  )

  if (phase === 'error') return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
        style={{ background: '#fef2f2', border: '2px solid #fecaca' }}>
        ✕
      </div>
      <div>
        <p className="text-lg font-bold mb-1" style={{ color: '#0D1B2A' }}>{errorMsg}</p>
        <p className="text-sm" style={{ color: '#6B7280' }}>Confirma o código com o teu professor.</p>
      </div>
    </div>
  )

  if (phase === 'submitted') return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center px-4">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
        style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', boxShadow: '0 0 0 8px #dcfce7' }}>
        ✓
      </div>
      <div>
        <h2 className="text-2xl font-black mb-2" style={{ color: '#0D1B2A', fontFamily: 'Georgia, serif' }}>
          Exame submetido!
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          A tua resposta foi entregue com sucesso.
        </p>
      </div>
      <div className="w-full max-w-sm p-5 rounded-2xl"
        style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Questões respondidas</span>
          <span className="text-lg font-black" style={{ color: '#0D1B2A' }}>
            {answered}<span style={{ color: '#9CA3AF' }}>/{questions.length}</span>
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${Math.round((answered / questions.length) * 100)}%`, background: '#059669' }} />
        </div>
      </div>
      <p className="text-xs" style={{ color: '#9CA3AF' }}>
        O professor irá divulgar os resultados em breve.
      </p>
    </div>
  )

  // ── Ecrã de identificação ──────────────────────────────────────────────────
  if (phase === 'identify') return (
    <div className="space-y-5 max-w-lg mx-auto">
      {/* Banner do exame */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(13,27,42,0.08)' }}>
        <div className="p-1" style={{ background: 'linear-gradient(90deg, #0D1B2A 0%, #0D1B2A 65%, #00B4D8 100%)' }} />
        <div className="px-6 py-5" style={{ background: 'white' }}>
          <h1 className="text-xl font-black mb-1" style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A' }}>
            {session!.title}
          </h1>
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: '#f1f5f9', color: '#374151' }}>
              Código: <strong>{session!.access_code}</strong>
            </span>
            {session!.duration_minutes && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: '#f1f5f9', color: '#374151' }}>
                ⏱ {session!.duration_minutes} min
              </span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: '#f1f5f9', color: '#374151' }}>
              {questions.length} questões
            </span>
            {questions.some(q => q.allowCalculator) && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: '#e0f7fc', color: '#0369a1' }}>
                🧮 Calculadora disponível
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Formulário de identificação */}
      <div className="bg-white rounded-2xl p-6 space-y-4"
        style={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(13,27,42,0.06)' }}>
        <h2 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Identificação</h2>

        <div>
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#6B7280', fontSize: 10, letterSpacing: '0.08em' }}>
            Nome completo *
          </label>
          <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)}
            placeholder="Ex: Maria Silva"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all"
            style={{ border: '1.5px solid #e2e8f0', outline: 'none', color: '#0D1B2A' }}
            onFocus={e => (e.target.style.borderColor = '#00B4D8')}
            onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#6B7280', fontSize: 10, letterSpacing: '0.08em' }}>
              Número
            </label>
            <input type="text" value={studentNumber} onChange={e => setStudentNumber(e.target.value)}
              placeholder="Ex: 12"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all"
              style={{ border: '1.5px solid #e2e8f0', outline: 'none', color: '#0D1B2A' }}
              onFocus={e => (e.target.style.borderColor = '#00B4D8')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#6B7280', fontSize: 10, letterSpacing: '0.08em' }}>
              Turma
            </label>
            <input type="text" value={studentClass} onChange={e => setStudentClass(e.target.value)}
              placeholder="Ex: 6ºA"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all"
              style={{ border: '1.5px solid #e2e8f0', outline: 'none', color: '#0D1B2A' }}
              onFocus={e => (e.target.style.borderColor = '#00B4D8')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>
        </div>

        <button disabled={!studentName.trim()} onClick={() => setPhase('exam')}
          className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #00B4D8, #0096b7)', boxShadow: studentName.trim() ? '0 4px 14px rgba(0,180,216,0.4)' : 'none' }}>
          Iniciar exame →
        </button>
      </div>
    </div>
  )

  // ── Fase exame ─────────────────────────────────────────────────────────────
  const timeInfo = timeLeft !== null ? formatTime(timeLeft) : null

  return (
    <div className="space-y-5 pb-8">
      {/* Cabeçalho fixo */}
      <div className="sticky top-0 z-20 rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 4px 16px rgba(13,27,42,0.2)' }}>
        <div className="px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: '#0D1B2A', color: '#F7F3EE' }}>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: '#F7F3EE' }}>{session!.title}</p>
            <p className="text-xs truncate" style={{ color: '#94a3b8' }}>{studentName}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Contador */}
            <div className="text-center">
              <p className="text-xs font-black tabular-nums" style={{ color: '#F7F3EE' }}>
                {answered}<span style={{ color: '#475569' }}>/{questions.length}</span>
              </p>
              <p className="text-xs" style={{ color: '#64748b', fontSize: 9 }}>respostas</p>
            </div>
            {/* Temporizador */}
            {timeInfo && (
              <span className="font-mono font-black text-base px-3 py-1.5 rounded-lg"
                style={{
                  background: timeInfo.urgent ? '#dc2626' : '#1e3a5f',
                  color: timeInfo.urgent ? 'white' : '#00B4D8',
                  boxShadow: timeInfo.urgent ? '0 0 12px rgba(220,38,38,0.5)' : 'none',
                }}>
                {timeInfo.text}
              </span>
            )}
          </div>
        </div>
        {/* Barra de progresso */}
        <div style={{ height: 3, background: '#1e3a5f' }}>
          <div className="h-full transition-all duration-500"
            style={{ width: `${progress}%`, background: progress === 100 ? '#059669' : '#00B4D8' }} />
        </div>
      </div>

      {/* Instruções */}
      {session!.test_snapshot.instructions && (
        <div className="px-4 py-3.5 rounded-2xl text-sm"
          style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', lineHeight: 1.6 }}>
          <strong className="block mb-0.5 text-xs uppercase tracking-wider" style={{ fontSize: 10, letterSpacing: '0.08em' }}>
            Instruções
          </strong>
          {session!.test_snapshot.instructions}
        </div>
      )}

      {/* Questões */}
      {questions.map((q, i) => (
        <QuestionCard
          key={q.index} q={q} n={i + 1} total={questions.length}
          answer={answers[String(q.index)] ?? ''}
          onChange={v => setAnswers(a => ({ ...a, [String(q.index)]: v }))}
          onCalcEntry={(entry: CalcEntry) => setCalcHistories(h => ({
            ...h,
            [String(q.index)]: [...(h[String(q.index)] ?? []), entry],
          }))}
        />
      ))}

      {/* Submeter */}
      <div className="bg-white rounded-2xl p-6 space-y-4"
        style={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(13,27,42,0.06)' }}>

        {/* Resumo de respostas */}
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: '#6B7280' }}>Progresso</span>
          <span className="font-bold" style={{ color: answered === questions.length ? '#059669' : '#0D1B2A' }}>
            {answered} / {questions.length} respondidas
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: progress === 100 ? '#059669' : '#00B4D8' }} />
        </div>

        {answered < questions.length && (
          <p className="text-xs text-center py-2 px-3 rounded-xl"
            style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
            Tens ainda <strong>{questions.length - answered}</strong> questão(ões) por responder.
          </p>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-4 rounded-xl font-black text-white text-base transition-all disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #0D1B2A, #1e3a5f)',
            boxShadow: '0 4px 14px rgba(13,27,42,0.3)',
            letterSpacing: '0.01em',
          }}>
          {submitting ? 'A submeter...' : 'Submeter exame'}
        </button>
        <p className="text-center text-xs" style={{ color: '#9CA3AF' }}>
          Após submeter não podes alterar as tuas respostas.
        </p>
      </div>
    </div>
  )
}

// ── Cartão de questão ──────────────────────────────────────────────────────────
function QuestionCard({
  q, n, total, answer, onChange, onCalcEntry,
}: {
  q: Question; n: number; total: number; answer: string
  onChange: (v: string) => void
  onCalcEntry: (entry: CalcEntry) => void
}) {
  const KNOWN_TYPES = ['multiple_choice', 'true_false', 'short_answer', 'long_answer', 'fill_blank']
  const isTextOnly = (q.type as string) === 'text' || !KNOWN_TYPES.includes(q.type as string) || q.points === 0
  const isMulti = q.type === 'multiple_choice'
  const isTF    = q.type === 'true_false'
  const isOpen  = !isMulti && !isTF && !isTextOnly

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [showCalc, setShowCalc]         = useState(false)
  const [activeCategory, setActiveCategory] = useState(0)
  const [fracNum, setFracNum] = useState('1')
  const [fracDen, setFracDen] = useState('2')

  const hasAnswer = answer.trim().length > 0

  const insertSymbol = useCallback((sym: string) => {
    const ta = textareaRef.current
    if (!ta) { onChange(answer + sym); return }
    const start = ta.selectionStart, end = ta.selectionEnd
    const newValue = answer.slice(0, start) + sym + answer.slice(end)
    onChange(newValue)
    const newPos = start + sym.length
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(newPos, newPos) })
  }, [answer, onChange])

  const insertFraction = useCallback(() => {
    insertSymbol(`(${fracNum.trim() || '1'}/${fracDen.trim() || '2'})`)
  }, [fracNum, fracDen, insertSymbol])

  const cat = MATH_SYMBOLS[activeCategory]

  // Questão inválida (type='text' ou points=0) — bloco de leitura apenas
  if (isTextOnly) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(13,27,42,0.04)' }}>
        <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0"
            style={{ background: '#64748b', color: 'white' }}>{n}</span>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#f1f5f9', color: '#64748b' }}>Texto</span>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#0D1B2A', lineHeight: 1.75 }}>{q.text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden transition-all"
      style={{
        border: `1.5px solid ${hasAnswer ? '#bbf7d0' : '#e2e8f0'}`,
        boxShadow: hasAnswer ? '0 0 0 3px rgba(5,150,105,0.08)' : '0 1px 4px rgba(13,27,42,0.06)',
      }}>

      {/* Cabeçalho da questão */}
      <div className="px-5 py-3.5 flex items-center gap-2.5 flex-wrap"
        style={{ borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
        {/* Número */}
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0"
          style={{ background: '#0D1B2A', color: '#F7F3EE' }}>
          {n}
        </span>
        {/* Tipo */}
        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ background: '#f1f5f9', color: '#64748b' }}>
          {TYPE_LABEL[q.type] ?? q.type}
        </span>
        {/* Calculadora */}
        {q.allowCalculator && (
          <button onClick={() => setShowCalc(c => !c)}
            className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
            style={{
              background: showCalc ? '#0D1B2A' : '#e0f7fc',
              color: showCalc ? '#00B4D8' : '#0369a1',
              border: `1px solid ${showCalc ? '#1e3a5f' : '#bae6fd'}`,
            }}>
            🧮 {showCalc ? 'fechar' : 'calculadora'}
          </button>
        )}
        {/* Progresso e pontos */}
        <div className="ml-auto flex items-center gap-2.5">
          {hasAnswer && (
            <span className="text-xs font-semibold" style={{ color: '#059669' }}>✓</span>
          )}
          <span className="text-xs font-black tabular-nums"
            style={{ color: '#C8A84B' }}>
            {q.points} {q.points === 1 ? 'pt' : 'pts'}
          </span>
          <span className="text-xs" style={{ color: '#d1d5db' }}>{n}/{total}</span>
        </div>
      </div>

      {/* Corpo da questão */}
      <div className="px-5 py-4 space-y-4">
        {/* Enunciado */}
        <p className="text-sm font-medium leading-relaxed" style={{ color: '#0D1B2A', lineHeight: 1.75 }}>
          {q.text}
        </p>

        {/* Figura */}
        {q.figure != null && (
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#e2e8f0', background: '#fafafa' }}>
            <MathFigure figure={q.figure as Record<string, unknown>} />
          </div>
        )}

        {/* Calculadora inline */}
        {q.allowCalculator && showCalc && (
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: '#e2e8f0' }}>
            <Calculator inline onEntry={onCalcEntry} />
          </div>
        )}

        {/* ── Escolha múltipla ── */}
        {isMulti && q.options && (
          <div className="space-y-2">
            {q.options.map((opt, j) => {
              const letter = LETTERS[j] ?? String.fromCharCode(65 + j)
              const selected = answer === letter || answer === opt
              const optText = opt.replace(/^[A-E][).]\s*/, '').trim() || opt
              return (
                <label key={j}
                  className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all select-none"
                  style={{
                    border: `1.5px solid ${selected ? '#00B4D8' : '#e2e8f0'}`,
                    background: selected ? '#e0f7fc' : 'white',
                    boxShadow: selected ? '0 0 0 3px rgba(0,180,216,0.12)' : 'none',
                  }}>
                  <input type="radio" className="sr-only" checked={selected} onChange={() => onChange(letter)} />
                  {/* Letra badge */}
                  <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black transition-all"
                    style={{
                      background: selected ? '#00B4D8' : '#f1f5f9',
                      color: selected ? 'white' : '#6B7280',
                    }}>
                    {letter}
                  </span>
                  <span className="text-sm flex-1" style={{ color: selected ? '#0D1B2A' : '#374151', fontWeight: selected ? 600 : 400 }}>
                    {optText}
                  </span>
                  {selected && (
                    <span className="shrink-0 text-base" style={{ color: '#00B4D8' }}>●</span>
                  )}
                </label>
              )
            })}
          </div>
        )}

        {/* ── Verdadeiro / Falso ── */}
        {isTF && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Verdadeiro', val: 'V', icon: '✓' },
              { label: 'Falso', val: 'F', icon: '✕' },
            ].map(opt => {
              const selected = answer === opt.val || answer === opt.label
              return (
                <label key={opt.label}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl cursor-pointer transition-all select-none"
                  style={{
                    border: `1.5px solid ${selected ? '#00B4D8' : '#e2e8f0'}`,
                    background: selected ? '#e0f7fc' : 'white',
                    boxShadow: selected ? '0 0 0 3px rgba(0,180,216,0.12)' : 'none',
                  }}>
                  <input type="radio" className="sr-only" checked={selected} onChange={() => onChange(opt.val)} />
                  <span className="text-xl font-black"
                    style={{ color: selected ? '#0369a1' : '#9CA3AF' }}>
                    {opt.icon}
                  </span>
                  <span className="text-sm font-bold"
                    style={{ color: selected ? '#0D1B2A' : '#374151' }}>
                    {opt.label}
                  </span>
                </label>
              )
            })}
          </div>
        )}

        {/* ── Resposta aberta ── */}
        {isOpen && (
          <div className="space-y-2.5">
            {/* Botão teclado matemático */}
            <button onClick={() => setShowKeyboard(k => !k)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{
                borderColor: showKeyboard ? '#00B4D8' : '#e2e8f0',
                background: showKeyboard ? '#e0f7fc' : '#f8fafc',
                color: showKeyboard ? '#0369a1' : '#6B7280',
              }}>
              <span className="font-mono font-bold text-sm">±</span>
              {showKeyboard ? 'Fechar teclado matemático' : 'Teclado matemático'}
            </button>

            {/* Teclado */}
            {showKeyboard && (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
                {/* Tabs */}
                <div className="flex overflow-x-auto border-b" style={{ borderColor: '#f1f5f9', background: '#f8fafc' }}>
                  {MATH_SYMBOLS.map((c, ci) => (
                    <button key={ci} onClick={() => setActiveCategory(ci)}
                      className="px-3 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
                      style={{
                        background: activeCategory === ci ? 'white' : 'transparent',
                        color: activeCategory === ci ? '#0D1B2A' : '#9CA3AF',
                        borderBottom: `2px solid ${activeCategory === ci ? '#00B4D8' : 'transparent'}`,
                      }}>
                      {c.cat}
                    </button>
                  ))}
                </div>
                <div className="p-3 space-y-2.5 bg-white">
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items.map((sym, si) => (
                      <button key={si} onClick={() => insertSymbol(sym.insert)}
                        className="min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-mono font-semibold transition-all active:scale-95"
                        style={{ border: '1px solid #e2e8f0', color: '#0D1B2A', background: '#f8fafc' }}
                        title={sym.insert}>
                        {sym.label}
                      </button>
                    ))}
                  </div>
                  {'hasFractionBuilder' in cat && cat.hasFractionBuilder && (
                    <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
                      <span className="text-xs font-medium shrink-0" style={{ color: '#6B7280' }}>
                        Fracção:
                      </span>
                      <input type="text" value={fracNum} onChange={e => setFracNum(e.target.value)}
                        className="w-12 text-center text-sm border rounded-lg px-1 py-1 font-mono"
                        style={{ borderColor: '#e2e8f0', outline: 'none' }} placeholder="a" />
                      <span className="font-bold" style={{ color: '#0D1B2A' }}>/</span>
                      <input type="text" value={fracDen} onChange={e => setFracDen(e.target.value)}
                        className="w-12 text-center text-sm border rounded-lg px-1 py-1 font-mono"
                        style={{ borderColor: '#e2e8f0', outline: 'none' }} placeholder="b" />
                      <button onClick={insertFraction}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                        style={{ background: '#00B4D8' }}>
                        Inserir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef} value={answer} onChange={e => onChange(e.target.value)}
              rows={q.type === 'long_answer' ? 8 : 4}
              placeholder="Escreve a tua resposta aqui..."
              className="w-full px-4 py-3 rounded-xl text-sm resize-none transition-all"
              style={{
                border: `1.5px solid ${answer.trim() ? '#bbf7d0' : '#e2e8f0'}`,
                outline: 'none',
                lineHeight: 1.75,
                color: '#0D1B2A',
                background: 'white',
              }}
              onFocus={e => (e.target.style.borderColor = '#00B4D8')}
              onBlur={e => (e.target.style.borderColor = answer.trim() ? '#bbf7d0' : '#e2e8f0')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
