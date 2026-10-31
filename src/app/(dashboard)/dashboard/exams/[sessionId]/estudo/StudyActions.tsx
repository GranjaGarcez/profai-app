'use client'

import { useState } from 'react'

interface AiOut { turma: string[]; alunos: { nome: string; turma: string; medida: string }[] }

export default function StudyActions({ sessionId, turma }: { sessionId: string; turma?: string | null }) {
  const [loading, setLoading] = useState(false)
  const [ai, setAi] = useState<AiOut | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const qs = turma ? `?turma=${encodeURIComponent(turma)}` : ''

  function dl(kind: 'xlsx' | 'docx') {
    const a = document.createElement('a')
    a.href = `/api/exam/sessions/${sessionId}/export-study${kind === 'docx' ? '-docx' : ''}${qs}`
    document.body.appendChild(a); a.click(); a.remove()
  }

  async function deepen() {
    setLoading(true); setErr(null)
    try {
      const res = await fetch(`/api/exam/sessions/${sessionId}/study-ai${qs}`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Falha.')
      setAi({ turma: d.turma ?? [], alunos: d.alunos ?? [] })
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro.') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div className="no-print flex items-center gap-2 flex-wrap mb-4">
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#0D1B2A' }}>
          🖨️ Guardar PDF
        </button>
        <button onClick={() => dl('xlsx')} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#166534' }}>
          ⬇️ Excel (multi-folha)
        </button>
        <button onClick={() => dl('docx')} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#1e40af' }}>
          ⬇️ Word (relatório)
        </button>
        <button onClick={deepen} disabled={loading} className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#7C3AED' }}>
          {loading ? 'A IA está a analisar…' : '✨ Aprofundar com IA'}
        </button>
        {err && <span className="text-xs" style={{ color: '#dc2626' }}>{err}</span>}
      </div>

      {ai && (
        <div className="rounded-xl border p-4 mb-5" style={{ borderColor: '#7C3AED40', background: '#faf5ff' }}>
          <h3 className="text-sm font-bold mb-2" style={{ color: '#5b21b6' }}>✨ Recomendações aprofundadas (IA)</h3>
          {ai.turma.length > 0 && (
            <>
              <p className="text-xs font-semibold mb-1" style={{ color: '#6b21a8' }}>Turma / grupo</p>
              <ul className="list-disc pl-5 mb-3 space-y-1">
                {ai.turma.map((t, i) => <li key={i} className="text-sm" style={{ color: '#374151' }}>{t}</li>)}
              </ul>
            </>
          )}
          {ai.alunos.length > 0 && (
            <>
              <p className="text-xs font-semibold mb-1" style={{ color: '#6b21a8' }}>Por aluno</p>
              <ul className="space-y-1">
                {ai.alunos.map((a, i) => (
                  <li key={i} className="text-sm" style={{ color: '#374151' }}>
                    <strong>{a.nome}</strong>{a.turma ? ` (${a.turma})` : ''}: {a.medida}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>Sugestões geradas a partir dos dados deste teste — revê antes de aplicar.</p>
        </div>
      )}
    </div>
  )
}
