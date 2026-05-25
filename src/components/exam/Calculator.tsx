'use client'

import { useState, useCallback } from 'react'

type Op = '+' | '-' | '×' | '÷' | '^' | null

interface CalcState {
  display: string
  prev: number | null
  op: Op
  waitNext: boolean
  expression: string
}

const INIT: CalcState = {
  display: '0', prev: null, op: null, waitNext: false, expression: '',
}

function fmt(n: number): string {
  if (isNaN(n)) return 'Erro'
  if (!isFinite(n)) return '∞'
  const rounded = parseFloat(n.toPrecision(10))
  return rounded.toString()
}

function applyOp(op: Op, a: number, b: number): number {
  if (op === '+') return a + b
  if (op === '-') return a - b
  if (op === '×') return a * b
  if (op === '÷') return b !== 0 ? a / b : NaN
  if (op === '^') return Math.pow(a, b)
  return b
}

const toRad = (deg: number) => (deg * Math.PI) / 180

export default function Calculator({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<CalcState>(INIT)
  const [pos, setPos] = useState({ x: 24, y: 90 })
  const [dragging, setDragging] = useState<{ ox: number; oy: number } | null>(null)

  const digit = useCallback((d: string) => {
    setState(s => {
      if (s.waitNext) return { ...s, display: d === '.' ? '0.' : d, waitNext: false }
      if (s.display === 'Erro') return { ...INIT, display: d }
      if (d === '.' && s.display.includes('.')) return s
      const newDisplay = s.display === '0' && d !== '.' ? d : s.display + d
      return { ...s, display: newDisplay }
    })
  }, [])

  const operate = useCallback((op: Op) => {
    setState(s => {
      const cur = parseFloat(s.display)
      if (isNaN(cur)) return { ...INIT }
      if (s.prev !== null && !s.waitNext && s.op) {
        const result = applyOp(s.op, s.prev, cur)
        return {
          display: fmt(result),
          prev: result,
          op,
          waitNext: true,
          expression: `${fmt(result)} ${op}`,
        }
      }
      return {
        ...s,
        prev: cur,
        op,
        waitNext: true,
        expression: `${s.display} ${op}`,
      }
    })
  }, [])

  const equals = useCallback(() => {
    setState(s => {
      if (s.prev === null || s.op === null) return s
      const cur = parseFloat(s.display)
      const result = applyOp(s.op, s.prev, cur)
      return {
        display: fmt(result),
        prev: null,
        op: null,
        waitNext: true,
        expression: `${s.expression} ${s.display} =`,
      }
    })
  }, [])

  const sci = useCallback((fn: (x: number) => number, label: string) => {
    setState(s => {
      const x = parseFloat(s.display)
      const result = fn(x)
      return {
        ...s,
        display: fmt(result),
        waitNext: true,
        expression: `${label}(${s.display})`,
      }
    })
  }, [])

  const clear = useCallback(() => setState(INIT), [])

  const backspace = useCallback(() => {
    setState(s => {
      if (s.waitNext || s.display === 'Erro') return s
      const d = s.display.length > 1 ? s.display.slice(0, -1) : '0'
      return { ...s, display: d }
    })
  }, [])

  const negate = useCallback(() => {
    setState(s => {
      const x = parseFloat(s.display)
      return { ...s, display: fmt(-x) }
    })
  }, [])

  const setConst = useCallback((value: number, label: string) => {
    setState(s => ({ ...s, display: fmt(value), waitNext: false, expression: label }))
  }, [])

  // ── Drag ────────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDragging({ ox: e.clientX - pos.x, oy: e.clientY - pos.y })
  }, [pos])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return
    setPos({ x: e.clientX - dragging.ox, y: e.clientY - dragging.oy })
  }, [dragging])

  const onMouseUp = useCallback(() => setDragging(null), [])

  // ── Botão helper ────────────────────────────────────────────────────────────
  function Btn({
    label, action, wide, color,
  }: {
    label: string
    action: () => void
    wide?: boolean
    color?: string
  }) {
    return (
      <button
        onClick={action}
        className={`flex items-center justify-center rounded-lg text-sm font-semibold h-10 transition-all active:scale-95 select-none ${wide ? 'col-span-2' : ''}`}
        style={{ background: color ?? '#1e293b', color: 'white', fontSize: label.length > 3 ? 11 : 14 }}
      >
        {label}
      </button>
    )
  }

  return (
    <div
      className="fixed z-50 shadow-2xl rounded-2xl overflow-hidden"
      style={{
        left: pos.x,
        top: pos.y,
        width: 268,
        background: '#0f172a',
        border: '1px solid #334155',
        userSelect: 'none',
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Cabeçalho / arraste */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ background: '#1e293b', borderBottom: '1px solid #334155', cursor: dragging ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
      >
        <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
          🧮 Calculadora
        </span>
        <button
          onClick={onClose}
          className="text-sm leading-none px-1"
          style={{ color: '#64748b' }}
        >
          ✕
        </button>
      </div>

      {/* Visor */}
      <div className="px-3 pt-3 pb-2">
        <div className="rounded-xl px-3 py-2" style={{ background: '#020617', minHeight: 60 }}>
          <p className="text-xs text-right truncate mb-0.5" style={{ color: '#475569', minHeight: 16 }}>
            {state.expression || ' '}
          </p>
          <p className="text-2xl font-mono font-bold text-right truncate" style={{ color: '#f1f5f9' }}>
            {state.display}
          </p>
        </div>
      </div>

      {/* Teclado */}
      <div className="px-3 pb-3 grid grid-cols-4 gap-1.5">
        {/* Linha científica 1 */}
        <Btn label="sin" action={() => sci(x => Math.sin(toRad(x)), 'sin')} color="#1e3a5f" />
        <Btn label="cos" action={() => sci(x => Math.cos(toRad(x)), 'cos')} color="#1e3a5f" />
        <Btn label="tan" action={() => sci(x => Math.tan(toRad(x)), 'tan')} color="#1e3a5f" />
        <Btn label="π" action={() => setConst(Math.PI, 'π')} color="#1e3a5f" />

        {/* Linha científica 2 */}
        <Btn label="√" action={() => sci(x => Math.sqrt(x), '√')} color="#1e3a5f" />
        <Btn label="x²" action={() => sci(x => x * x, 'sq')} color="#1e3a5f" />
        <Btn label="log" action={() => sci(x => Math.log10(x), 'log')} color="#1e3a5f" />
        <Btn label="ln" action={() => sci(x => Math.log(x), 'ln')} color="#1e3a5f" />

        {/* Linha controlo */}
        <Btn label="AC" action={clear} color="#7f1d1d" />
        <Btn label="⌫" action={backspace} />
        <Btn label="xⁿ" action={() => operate('^')} color="#0369a1" />
        <Btn label="÷" action={() => operate('÷')} color="#0369a1" />

        {/* 7 8 9 × */}
        <Btn label="7" action={() => digit('7')} />
        <Btn label="8" action={() => digit('8')} />
        <Btn label="9" action={() => digit('9')} />
        <Btn label="×" action={() => operate('×')} color="#0369a1" />

        {/* 4 5 6 - */}
        <Btn label="4" action={() => digit('4')} />
        <Btn label="5" action={() => digit('5')} />
        <Btn label="6" action={() => digit('6')} />
        <Btn label="−" action={() => operate('-')} color="#0369a1" />

        {/* 1 2 3 + */}
        <Btn label="1" action={() => digit('1')} />
        <Btn label="2" action={() => digit('2')} />
        <Btn label="3" action={() => digit('3')} />
        <Btn label="+" action={() => operate('+')} color="#0369a1" />

        {/* +/- 0 . = */}
        <Btn label="+/−" action={negate} />
        <Btn label="0" action={() => digit('0')} />
        <Btn label="." action={() => digit('.')} />
        <Btn label="=" action={equals} color="#0284c7" />
      </div>
    </div>
  )
}
