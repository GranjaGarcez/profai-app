'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import type { ExamSession, Question, TestSnapshot } from '@/lib/exam/types'
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

// ── Símbolos matemáticos ────────────────────────────────────────────────────────
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

// ── Componente principal ────────────────────────────────────────────────────────
export default function ExamPage() {
  const { code } = useParams<{ code: string }>()
  const [phase, setPhase]     = useState<Phase>('loading')
  const [session, setSession] = useState<ExamSession | null>(null)
  const [errorMsg, setError]  = useState('')

  const [studentName,   setStudentName]   = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [studentClass,  setStudentClass]  = useState('')

  const [answers, setAnswers]     = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const [timeLeft, setTimeLeft] = useState<number | null>(null)
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

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session!.id, studentName: studentName.trim(),
          studentNumber: studentNumber.trim(), studentClass: studentClass.trim(), answers,
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

  // ── Ecrãs de estado ────────────────────────────────────────────────────────
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
          {questions.some(q => q.allowCalculator) && ' · 🧮 Calculadora disponível em questões assinaladas'}
        </p>
      </div>
      <div className="bg-white rounded-2xl border p-6 space-y-4" style={{ borderColor: '#0D1B2A10' }}>
        <h2 className="font-semibold" style={{ color: '#0D1B2A' }}>Os teus dados</h2>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#0D1B2A' }}>Nome completo *</label>
          <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)}
            placeholder="Ex: Maria Silva"
            className="w-full px-3 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: '#0D1B2A25', outline: 'none' }} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#0D1B2A' }}>Número</label>
            <input type="text" value={studentNumber} onChange={e => setStudentNumber(e.target.value)}
              placeholder="Ex: 12" className="w-full px-3 py-2.5 rounded-lg border text-sm"
              style={{ borderColor: '#0D1B2A25', outline: 'none' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#0D1B2A' }}>Turma</label>
            <input type="text" value={studentClass} onChange={e => setStudentClass(e.target.value)}
              placeholder="Ex: 6ºA" className="w-full px-3 py-2.5 rounded-lg border text-sm"
              style={{ borderColor: '#0D1B2A25', outline: 'none' }} />
          </div>
        </div>
        <button disabled={!studentName.trim()} onClick={() => setPhase('exam')}
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: '#00B4D8' }}>
          Iniciar exame →
        </button>
      </div>
    </div>
  )

  // ── Fase exame ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Cabeçalho fixo */}
      <div className="sticky top-0 z-10 py-3 px-4 rounded-xl flex items-center justify-between shadow-sm gap-3"
        style={{ background: '#0D1B2A', color: '#F7F3EE' }}>
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">{session!.title}</p>
          <p className="text-xs opacity-60 truncate">{studentName}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs opacity-70">{answered}/{questions.length}</span>
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
        <div className="px-4 py-3 rounded-xl text-xs"
          style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d60' }}>
          <strong>Instruções:</strong> {session!.test_snapshot.instructions}
        </div>
      )}

      {/* Questões */}
      {questions.map((q, i) => (
        <QuestionCard
          key={q.index} q={q} n={i + 1}
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
        <button onClick={handleSubmit} disabled={submitting}
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

  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [showCalc, setShowCalc]         = useState(false)
  const [activeCategory, setActiveCategory] = useState(0)

  // Fracção personalizada
  const [fracNum, setFracNum] = useState('1')
  const [fracDen, setFracDen] = useState('2')

  const insertSymbol = useCallback((sym: string) => {
    const ta = textareaRef.current
    if (!ta) { onChange(answer + sym); return }
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const newValue = answer.slice(0, start) + sym + answer.slice(end)
    onChange(newValue)
    const newPos = start + sym.length
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(newPos, newPos)
    })
  }, [answer, onChange])

  const insertFraction = useCallback(() => {
    const n = fracNum.trim() || '1'
    const d = fracDen.trim() || '2'
    insertSymbol(`(${n}/${d})`)
  }, [fracNum, fracDen, insertSymbol])

  const cat = MATH_SYMBOLS[activeCategory]

  return (
    <div className="bg-white rounded-2xl border p-5 space-y-3" style={{ borderColor: '#0D1B2A10' }}>
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: '#0D1B2A', color: '#F7F3EE' }}>{n}</span>
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#0D1B2A08', color: '#6B7280' }}>
          {TYPE_LABEL[q.type] ?? q.type}
        </span>
        {q.allowCalculator && (
          <button
            onClick={() => setShowCalc(c => !c)}
            className="text-xs px-2 py-0.5 rounded font-medium transition-colors"
            style={{
              background: showCalc ? '#0f172a' : '#e0f7fc',
              color: showCalc ? '#94a3b8' : '#0369a1',
              border: `1px solid ${showCalc ? '#334155' : '#bae6fd'}`,
            }}
          >
            🧮 {showCalc ? 'fechar calculadora' : 'calculadora'}
          </button>
        )}
        <span className="ml-auto text-xs font-bold" style={{ color: '#C8A84B' }}>{q.points} pt</span>
      </div>

      {/* Enunciado */}
      <p className="text-sm font-medium leading-relaxed" style={{ color: '#0D1B2A', lineHeight: 1.7 }}>
        {q.text}
      </p>

      {/* Figura — renderizada se existir */}
      {q.figure != null && (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#0D1B2A08', background: '#fafafa' }}>
          <MathFigure figure={q.figure as Record<string, unknown>} />
        </div>
      )}

      {/* Calculadora inline — só na questão que a permite */}
      {q.allowCalculator && showCalc && (
        <Calculator inline />
      )}

      {/* Escolha múltipla */}
      {isMulti && q.options && (
        <div className="space-y-2 mt-1">
          {q.options.map((opt, j) => {
            const letter = String.fromCharCode(65 + j)
            const selected = answer === letter || answer === opt
            return (
              <label key={j}
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-colors"
                style={{ borderColor: selected ? '#00B4D8' : '#0D1B2A15', background: selected ? '#e0f7fc' : 'white' }}>
                <input type="radio" className="mt-0.5 shrink-0" checked={selected} onChange={() => onChange(letter)} />
                <span className="text-sm" style={{ color: '#374151' }}>{opt}</span>
              </label>
            )
          })}
        </div>
      )}

      {/* Verdadeiro / Falso */}
      {isTF && (
        <div className="flex gap-3">
          {['Verdadeiro', 'Falso'].map(opt => {
            const val = opt.charAt(0)
            const selected = answer === val || answer === opt
            return (
              <label key={opt}
                className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer border transition-colors"
                style={{ borderColor: selected ? '#00B4D8' : '#0D1B2A15', background: selected ? '#e0f7fc' : 'white' }}>
                <input type="radio" checked={selected} onChange={() => onChange(val)} />
                <span className="text-sm font-medium" style={{ color: '#374151' }}>{opt}</span>
              </label>
            )
          })}
        </div>
      )}

      {/* Resposta aberta + teclado matemático */}
      {isOpen && (
        <div className="space-y-2">
          {/* Botão teclado */}
          <button onClick={() => setShowKeyboard(k => !k)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors"
            style={{
              borderColor: showKeyboard ? '#00B4D8' : '#0D1B2A20',
              background: showKeyboard ? '#e0f7fc' : 'white',
              color: showKeyboard ? '#0369a1' : '#6B7280',
            }}>
            <span className="font-mono text-sm">±</span>
            <span>{showKeyboard ? 'Fechar teclado' : 'Teclado matemático'}</span>
          </button>

          {/* Palete */}
          {showKeyboard && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#0D1B2A15' }}>
              {/* Tabs de categoria */}
              <div className="flex overflow-x-auto border-b" style={{ borderColor: '#0D1B2A10', background: '#f8fafc' }}>
                {MATH_SYMBOLS.map((c, ci) => (
                  <button key={ci} onClick={() => setActiveCategory(ci)}
                    className="px-3 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
                    style={{
                      background: activeCategory === ci ? 'white' : 'transparent',
                      color: activeCategory === ci ? '#0D1B2A' : '#9CA3AF',
                      borderBottom: activeCategory === ci ? '2px solid #00B4D8' : '2px solid transparent',
                    }}>
                    {c.cat}
                  </button>
                ))}
              </div>

              <div className="p-2.5 space-y-2" style={{ background: 'white' }}>
                {/* Símbolos */}
                <div className="flex flex-wrap gap-1.5">
                  {cat.items.map((sym, si) => (
                    <button key={si} onClick={() => insertSymbol(sym.insert)}
                      className="min-w-[2.25rem] h-9 px-2 rounded-lg border text-sm font-mono font-medium transition-all active:scale-95 hover:border-cyan-400 hover:bg-cyan-50"
                      style={{ borderColor: '#0D1B2A15', color: '#0D1B2A', background: '#f8fafc' }}
                      title={sym.insert}>
                      {sym.label}
                    </button>
                  ))}
                </div>

                {/* Builder de fracção personalizada */}
                {'hasFractionBuilder' in cat && cat.hasFractionBuilder && (
                  <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: '#0D1B2A08' }}>
                    <span className="text-xs font-medium shrink-0" style={{ color: '#6B7280' }}>
                      Fracção personalizada:
                    </span>
                    <input type="text" value={fracNum} onChange={e => setFracNum(e.target.value)}
                      className="w-12 text-center text-sm border rounded-lg px-1 py-1 font-mono"
                      style={{ borderColor: '#0D1B2A25', outline: 'none' }}
                      placeholder="a" />
                    <span className="font-bold" style={{ color: '#0D1B2A' }}>/</span>
                    <input type="text" value={fracDen} onChange={e => setFracDen(e.target.value)}
                      className="w-12 text-center text-sm border rounded-lg px-1 py-1 font-mono"
                      style={{ borderColor: '#0D1B2A25', outline: 'none' }}
                      placeholder="b" />
                    <button onClick={insertFraction}
                      className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
                      style={{ background: '#00B4D8' }}>
                      Inserir
                    </button>
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                      → insere ({fracNum || 'a'}/{fracDen || 'b'})
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={e => onChange(e.target.value)}
            rows={q.type === 'long_answer' ? 8 : 3}
            placeholder="Escreve a tua resposta aqui..."
            className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none"
            style={{ borderColor: '#0D1B2A25', outline: 'none', lineHeight: 1.7 }}
          />
        </div>
      )}

      {/* Respondida */}
      {answer.trim() && (
        <p className="text-xs font-medium" style={{ color: '#059669' }}>✓ Respondida</p>
      )}
    </div>
  )
}
