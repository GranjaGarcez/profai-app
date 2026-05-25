'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  contentItemId: string
  contentTitle: string
  onClose: () => void
}

export default function ExamLauncher({ contentItemId, contentTitle, onClose }: Props) {
  const router = useRouter()
  const [duration, setDuration] = useState('60')
  const [unlimited, setUnlimited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ code: string; sessionId: string } | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleLaunch() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/exam/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentItemId,
          durationMinutes: unlimited ? null : Number(duration),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao lançar exame')
        setLoading(false)
        return
      }
      setResult({ code: data.code, sessionId: data.sessionId })
    } catch {
      setError('Erro de ligação.')
    }
    setLoading(false)
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const examUrl = result
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/exam/${result.code}`
    : ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: '#00000060', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">

        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b" style={{ borderColor: '#0D1B2A10' }}>
          <h2 className="font-bold text-lg" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
            🚀 Lançar Exame
          </h2>
          <p className="text-sm mt-0.5 truncate" style={{ color: '#6B7280' }}>{contentTitle}</p>
        </div>

        <div className="px-6 py-5 space-y-5">

          {!result ? (
            <>
              {/* Duração */}
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: '#0D1B2A' }}>
                  Tempo limite
                </label>

                <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={unlimited}
                    onChange={e => setUnlimited(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500"
                  />
                  <span style={{ color: '#374151' }}>Sem limite de tempo</span>
                </label>

                {!unlimited && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {[30, 45, 60, 90].map(m => (
                        <button
                          key={m}
                          onClick={() => setDuration(String(m))}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                          style={{
                            borderColor: duration === String(m) ? '#00B4D8' : '#0D1B2A20',
                            background: duration === String(m) ? '#e0f7fc' : 'white',
                            color: duration === String(m) ? '#0369a1' : '#6B7280',
                          }}
                        >
                          {m} min
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={5} max={300} value={duration}
                        onChange={e => setDuration(e.target.value)}
                        className="w-20 px-3 py-2 rounded-lg border text-sm text-center font-mono"
                        style={{ borderColor: '#0D1B2A25', outline: 'none' }}
                      />
                      <span className="text-sm" style={{ color: '#6B7280' }}>minutos (personalizado)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Aviso */}
              <div className="p-3 rounded-xl text-xs" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d50' }}>
                ⚠️ Após lançar, o teste fica acessível publicamente através do código de acesso. Fecha a sessão quando terminar.
              </div>

              {error && (
                <p className="text-sm font-medium" style={{ color: '#dc2626' }}>{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-medium"
                  style={{ borderColor: '#0D1B2A20', color: '#6B7280' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleLaunch}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity"
                  style={{ background: '#00B4D8' }}
                >
                  {loading ? 'A lançar...' : '🚀 Lançar agora'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Sucesso */}
              <div className="text-center space-y-4">
                <div className="text-4xl">✅</div>
                <h3 className="font-bold text-xl" style={{ color: '#0D1B2A' }}>Exame lançado!</h3>

                <div className="p-4 rounded-xl" style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#166534' }}>
                    Código de Acesso
                  </p>
                  <p className="text-5xl font-mono font-black tracking-widest" style={{ color: '#0D1B2A' }}>
                    {result.code}
                  </p>
                </div>

                <div
                  className="p-3 rounded-xl text-left cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  onClick={() => handleCopy(examUrl)}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: '#64748b' }}>LINK DIRECTO (clica para copiar)</p>
                  <p className="text-xs font-mono break-all" style={{ color: '#0369a1' }}>{examUrl}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleCopy(result.code)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                  style={{ borderColor: '#0D1B2A20', color: '#0D1B2A' }}
                >
                  {copied ? '✓ Copiado!' : '📋 Copiar código'}
                </button>
                <button
                  onClick={() => router.push(`/dashboard/exams/${result.sessionId}`)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: '#00B4D8' }}
                >
                  Ver exame →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
