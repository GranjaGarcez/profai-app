'use client'

import { useState } from 'react'

interface S { id: string; title: string; access_code: string; created_at: string }

// Relatório geral entre exames (Excel): escolhe os testes e descarrega um só ficheiro
// com índice, resumo por turma (aluno × teste) e detalhe por teste.
export default function OverviewExport({ sessions }: { sessions: S[] }) {
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState<Set<string>>(() => new Set(sessions.map(s => s.id)))

  function toggle(id: string) {
    setSel(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }
  const all = sel.size === sessions.length
  function toggleAll() { setSel(all ? new Set() : new Set(sessions.map(s => s.id))) }

  function download() {
    const ids = Array.from(sel)
    const qs = ids.length && ids.length < sessions.length ? `?ids=${encodeURIComponent(ids.join(','))}` : ''
    const a = document.createElement('a')
    a.href = `/api/exam/export-overview${qs}`
    document.body.appendChild(a); a.click(); a.remove()
  }

  if (sessions.length === 0) return null

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border"
        style={{ borderColor: '#16653430', color: '#166534' }}
        title="Juntar vários testes num só Excel: resumo por turma (aluno × teste) + detalhe por teste">
        📚 Relatório geral (Excel)
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: '#00000050' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mt-6 mb-4 overflow-hidden" style={{ maxHeight: 'calc(100vh - 3rem)' }}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: '#0D1B2A10' }}>
              <div>
                <h3 className="font-bold" style={{ color: '#0D1B2A' }}>Relatório geral (Excel)</h3>
                <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Um só ficheiro: índice, resumo por turma (aluno × teste com nota e %) e detalhe por teste. Gera uma folha por turma automaticamente.</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="overflow-y-auto p-5" style={{ maxHeight: 'calc(100vh - 14rem)' }}>
              <label className="flex items-center gap-2 px-2.5 py-1.5 mb-1 rounded-lg cursor-pointer text-sm font-semibold" style={{ background: '#f8fafc' }}>
                <input type="checkbox" checked={all} onChange={toggleAll} />
                <span style={{ color: '#0D1B2A' }}>Todos os testes ({sessions.length})</span>
              </label>
              <div className="space-y-1">
                {sessions.map(s => (
                  <label key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-sm"
                    style={{ background: sel.has(s.id) ? '#f0fdf4' : 'transparent', border: `1px solid ${sel.has(s.id) ? '#86efac' : '#0D1B2A10'}` }}>
                    <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} />
                    <span className="font-medium flex-1 min-w-0 truncate" style={{ color: '#0D1B2A' }}>{s.title}</span>
                    <span className="text-xs font-mono" style={{ color: '#9CA3AF' }}>{s.access_code}</span>
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>{new Date(s.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-5 py-3 flex items-center gap-2" style={{ borderColor: '#0D1B2A10' }}>
              <button onClick={download} disabled={sel.size === 0}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#166534' }}>
                ⬇️ Descarregar ({sel.size})
              </button>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>Os alunos de medida aparecem assinalados (⚑) com o teste que fizeram.</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
