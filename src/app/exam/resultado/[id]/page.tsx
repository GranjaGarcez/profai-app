'use client'

import { useEffect, useState, use } from 'react'
import QuestionMedia from '@/components/exam/QuestionMedia'
import { speak, ttsAvailable } from '@/lib/a11y/speech'

interface QResult {
  n: number; type: string; text: string; options: string[] | null
  figure?: unknown; illustration?: string | null; illustrationCredit?: string | null
  studentAnswer: string; correctAnswer: string; points: number; earned: number; feedback: string
}
interface ResultData {
  released: boolean; pending?: boolean; title: string; studentName?: string
  totalScore?: number | null; maxScore?: number; questions?: QResult[]
}

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Escolha múltipla', true_false: 'Verdadeiro / Falso',
  short_answer: 'Resposta curta', long_answer: 'Resposta longa', fill_blank: 'Completar',
}

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<ResultData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  // Acessibilidade: tamanho da letra (partilha a preferência com o exame).
  const [fontScale, setFontScale] = useState<number>(() => {
    try { const v = Number(localStorage.getItem('profai_fontscale')); return v >= 1 && v <= 1.5 ? v : 1 } catch { return 1 }
  })
  const fz = (base: number) => Math.round(base * fontScale)
  function changeFontScale(v: number) {
    setFontScale(v)
    try { localStorage.setItem('profai_fontscale', String(v)) } catch { /* noop */ }
  }
  const [legible, setLegible] = useState<boolean>(() => {
    try { return localStorage.getItem('profai_legible') === '1' } catch { return false }
  })
  const legibleStyle = legible ? { letterSpacing: '0.04em', wordSpacing: '0.08em', lineHeight: 2 } : null
  function toggleLegible() {
    setLegible(v => { const nv = !v; try { localStorage.setItem('profai_legible', nv ? '1' : '0') } catch { /* noop */ } return nv })
  }

  useEffect(() => {
    fetch(`/api/exam/result/${id}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) { setError(d.error ?? 'Resultado não disponível.'); return }
        setData(d)
      })
      .catch(() => setError('Não foi possível carregar o resultado.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: '#0D1B2A', borderTopColor: 'transparent' }} />
      <p className="text-sm font-medium" style={{ color: '#6B7280' }}>A carregar…</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-4">
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
        style={{ background: '#fef2f2', border: '2px solid #fecaca' }}>✕</div>
      <p className="text-lg font-bold" style={{ color: '#0D1B2A' }}>{error}</p>
    </div>
  )

  if (!data) return null

  if (!data.released || data.pending) return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center px-4">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
        style={{ background: '#f1f5f9', border: '2px solid #e2e8f0' }}>⏳</div>
      <div>
        <h1 className="text-xl font-black mb-1" style={{ color: '#0D1B2A', fontFamily: 'Georgia, serif' }}>{data.title}</h1>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          {data.pending
            ? 'A tua prova ainda está a ser corrigida. Volta a abrir este link mais tarde.'
            : 'O teu professor ainda não divulgou os resultados. Volta a abrir este link mais tarde.'}
        </p>
      </div>
    </div>
  )

  const total = data.totalScore ?? 0
  const max = data.maxScore ?? 100
  const pct = max > 0 ? Math.round((total / max) * 100) : 0
  const scoreColor = pct >= 50 ? '#059669' : '#b45309'

  return (
    <div className="max-w-2xl mx-auto space-y-5 px-1">
      {/* Cabeçalho + nota */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(13,27,42,0.08)' }}>
        <div style={{ height: 5, background: 'linear-gradient(90deg, #0D1B2A 0%, #0D1B2A 65%, #00B4D8 100%)' }} />
        <div className="px-6 py-5 bg-white">
          <h1 className="text-xl font-black mb-1" style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A' }}>{data.title}</h1>
          {data.studentName && <p className="text-sm mb-3" style={{ color: '#6B7280' }}>{data.studentName}</p>}
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black" style={{ color: scoreColor }}>{total}</span>
            <span className="text-lg font-semibold" style={{ color: '#9CA3AF' }}>/ {max}</span>
            <span className="ml-auto text-sm font-bold px-3 py-1 rounded-full" style={{ background: `${scoreColor}15`, color: scoreColor }}>{pct}%</span>
          </div>
        </div>
      </div>

      {/* Acessibilidade: tamanho da letra */}
      <div className="px-4 py-2 rounded-2xl flex items-center gap-2 flex-wrap" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <span className="text-sm" style={{ color: '#6B7280' }}>Tamanho da letra:</span>
        {[{ s: 1, l: 'A', f: 13 }, { s: 1.25, l: 'A+', f: 16 }, { s: 1.5, l: 'A++', f: 19 }].map(o => (
          <button key={o.s} onClick={() => changeFontScale(o.s)} className="px-2.5 py-1 rounded-lg font-bold border"
            style={{ fontSize: o.f, lineHeight: 1, borderColor: fontScale === o.s ? '#0369a1' : '#e2e8f0', background: fontScale === o.s ? '#e0f7fc' : 'white', color: '#0D1B2A' }}>
            {o.l}
          </button>
        ))}
        <button onClick={toggleLegible} className="px-2.5 py-1 rounded-lg text-sm font-semibold border"
          style={{ borderColor: legible ? '#0369a1' : '#e2e8f0', background: legible ? '#e0f7fc' : 'white', color: '#0D1B2A' }}
          title="Mais espaço entre letras e linhas (ajuda a leitura)">
          Aa {legible ? 'Legível ✓' : 'Mais legível'}
        </button>
      </div>

      {/* Questões */}
      {(data.questions ?? []).map(q => {
        const full = q.earned >= q.points && q.points > 0
        const zero = q.earned <= 0
        const color = full ? '#059669' : zero ? '#dc2626' : '#b45309'
        return (
          <div key={q.n} className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e2e8f0' }}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                style={{ background: '#0D1B2A', color: '#F7F3EE' }}>{q.n}</span>
              <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: '#f1f5f9', color: '#64748b' }}>{TYPE_LABEL[q.type] ?? q.type}</span>
              {ttsAvailable() && (
                <button onClick={() => speak([q.text, ...(q.options ?? [])].join('. '))}
                  className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: '#e0f7fc', color: '#0369a1', border: '1px solid #bae6fd' }}
                  title="Ouvir a leitura desta pergunta">🔊 Ouvir</button>
              )}
              <span className="ml-auto text-sm font-black" style={{ color }}>{q.earned} / {q.points}</span>
            </div>
            <details open className="mb-3 group">
              <summary className="text-xs font-semibold cursor-pointer mb-2 list-none flex items-center gap-1" style={{ color: '#0369a1' }}>
                <span className="group-open:hidden">▸ Ver pergunta{q.figure || q.illustration ? ' e imagem' : ''}</span>
                <span className="hidden group-open:inline">▾ Pergunta</span>
              </summary>
              <p className="mb-2" style={{ color: '#0D1B2A', lineHeight: 1.6, fontSize: fz(14), ...(legibleStyle ?? {}) }}>{q.text}</p>
              <QuestionMedia figure={q.figure} illustration={q.illustration ?? undefined} credit={q.illustrationCredit ?? undefined} />
              {q.options && q.options.length > 0 && (
                <div className="space-y-1 mt-2">
                  {q.options.map((opt, i) => (
                    <p key={i} className="px-2 py-1 rounded" style={{ color: '#374151', background: '#f8fafc', fontSize: fz(12) }}>{opt}</p>
                  ))}
                </div>
              )}
            </details>

            <div className="space-y-1.5" style={{ fontSize: fz(14) }}>
              <p>
                <span className="font-semibold" style={{ color }}>A tua resposta: </span>
                <span style={{ color: '#374151' }}>{q.studentAnswer.trim() || '(em branco)'}</span>
              </p>
              <p>
                <span className="font-semibold" style={{ color: '#059669' }}>Resposta certa: </span>
                <span style={{ color: '#166534' }}>{q.correctAnswer}</span>
              </p>
              {q.feedback && (
                <p className="text-xs mt-1 px-3 py-2 rounded-lg" style={{ background: '#f0f9ff', color: '#0369a1' }}>
                  💬 {q.feedback}
                </p>
              )}
            </div>
          </div>
        )
      })}

      <p className="text-center text-xs pb-6" style={{ color: '#9CA3AF' }}>PROF.IA — a tua correcção</p>
    </div>
  )
}
