'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface OtherSession { id: string; title: string; access_code: string; created_at: string }

// Ligar testes ALTERNATIVOS (de medida) do mesmo momento. Os alunos desses testes
// aparecem na grelha Excel desta sessão, num bloco separado e assinalado.
export default function LinkAltTests({ sessionId, current, others }: {
  sessionId: string
  current: string[]
  others: OtherSession[]
}) {
  const router = useRouter()
  const [sel, setSel] = useState<Set<string>>(new Set(current))
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const dirty = sel.size !== current.length || current.some(c => !sel.has(c))

  function toggle(id: string) {
    setSel(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(`/api/exam/sessions/${sessionId}/link-alt`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ altSessionIds: Array.from(sel) }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Falha.')
      setMsg(`Ligação guardada: ${d.altSessions?.length ?? 0} teste(s) alternativo(s).`)
      router.refresh()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Erro.') }
    finally { setSaving(false) }
  }

  if (others.length === 0) return null

  return (
    <details className="bg-white rounded-2xl border p-5" style={{ borderColor: '#C8A84B40' }}>
      <summary className="cursor-pointer font-semibold text-sm" style={{ color: '#0D1B2A' }}>
        🧩 Testes alternativos / de medida no mesmo momento
        {current.length > 0 && <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: '#fef3c7', color: '#92400e' }}>{current.length} ligado(s)</span>}
      </summary>
      <p className="text-xs mt-2 mb-3" style={{ color: '#6B7280' }}>
        Se, no mesmo momento, alguns alunos (medida/adaptação) fizeram outro teste, liga aqui essa(s) sessão(ões).
        Na grelha Excel desta sessão esses alunos aparecem num <strong>bloco separado e assinalado</strong>,
        com as cotações do teste que fizeram. Não altera correções nem divulgação.
      </p>
      <div className="space-y-1 max-h-72 overflow-y-auto">
        {others.map(o => (
          <label key={o.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-sm"
            style={{ background: sel.has(o.id) ? '#fffbeb' : '#f8fafc', border: `1px solid ${sel.has(o.id) ? '#fde68a' : '#0D1B2A10'}` }}>
            <input type="checkbox" checked={sel.has(o.id)} onChange={() => toggle(o.id)} />
            <span className="font-medium flex-1 min-w-0 truncate" style={{ color: '#0D1B2A' }}>{o.title}</span>
            <span className="text-xs font-mono" style={{ color: '#9CA3AF' }}>{o.access_code}</span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
              {new Date(o.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
            </span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button onClick={save} disabled={saving || !dirty}
          className="px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#0D1B2A' }}>
          {saving ? 'A guardar…' : 'Guardar ligação'}
        </button>
        {msg && <span className="text-xs" style={{ color: '#374151' }}>{msg}</span>}
      </div>
    </details>
  )
}
