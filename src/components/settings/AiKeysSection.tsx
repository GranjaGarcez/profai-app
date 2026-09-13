'use client'

import { useEffect, useState } from 'react'

type ProviderId = 'anthropic' | 'google' | 'openai'
interface CatalogEntry { label: string; defaultModel: string; keyHint: string; keyUrl: string }
interface KeyView { provider: ProviderId; model: string; enabled: boolean; last4: string; lastOkAt: string | null; lastError: string | null }

const NAVY = '#0D1B2A', BLUE = '#00B4D8'

export default function AiKeysSection() {
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(true)
  const [catalog, setCatalog] = useState<Record<string, CatalogEntry>>({})
  const [keys, setKeys] = useState<KeyView[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  // Formulário
  const [provider, setProvider] = useState<ProviderId>('anthropic')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/user/ai-keys')
      const d = await r.json()
      setConfigured(d.configured ?? false)
      setCatalog(d.catalog ?? {})
      setKeys(d.keys ?? [])
    } catch { setConfigured(false) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Modelo por defeito ao trocar de fornecedor (se o campo não foi editado)
  useEffect(() => {
    if (catalog[provider]) setModel(catalog[provider].defaultModel)
  }, [provider, catalog])

  function flash(kind: 'ok' | 'err', text: string) {
    setMsg({ kind, text }); setTimeout(() => setMsg(null), 6000)
  }

  async function connect() {
    if (apiKey.trim().length < 12) return flash('err', 'Introduz uma chave de API válida.')
    setBusy(true)
    try {
      const r = await fetch('/api/user/ai-keys', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model: model.trim(), apiKey: apiKey.trim() }),
      })
      const d = await r.json()
      if (!r.ok) flash('err', d.error ?? 'Falha ao ligar.')
      else { flash('ok', 'Chave validada e ligada. Os teus testes passam a usar este modelo.'); setApiKey('') ; await load() }
    } catch { flash('err', 'Erro de rede.') }
    setBusy(false)
  }

  async function toggle(p: ProviderId, enabled: boolean) {
    setBusy(true)
    try {
      const r = await fetch('/api/user/ai-keys', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: p, enabled }),
      })
      if (!r.ok) { const d = await r.json(); flash('err', d.error ?? 'Falha.') }
      await load()
    } catch { flash('err', 'Erro de rede.') }
    setBusy(false)
  }

  async function remove(p: ProviderId) {
    if (!confirm('Remover esta chave? Deixarás de a usar até a inserires de novo.')) return
    setBusy(true)
    try {
      await fetch(`/api/user/ai-keys?provider=${p}`, { method: 'DELETE' })
      await load()
    } catch { flash('err', 'Erro de rede.') }
    setBusy(false)
  }

  const cat = catalog[provider]

  return (
    <div className="bg-white rounded-2xl border p-6 space-y-4" style={{ borderColor: '#0D1B2A10' }}>
      <div>
        <h3 className="font-semibold" style={{ color: NAVY }}>🔑 A minha IA (chave de API pessoal)</h3>
        <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
          Usa o teu próprio modelo de topo (Claude, Gemini ou GPT) nos teus testes, à tua conta de API. Enquanto estiver ligada, é o primeiro a gerar; se atingir o limite, o PROF.IA muda para os modelos gratuitos e avisa-te.
        </p>
        <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
          Nota: um plano de chat (Claude Pro, ChatGPT Plus) <strong>não</strong> serve — é preciso crédito de API separado. A chave é guardada cifrada e nunca é mostrada de volta.
        </p>
      </div>

      {msg && (
        <div className="px-4 py-2.5 rounded-xl text-sm font-medium"
          style={msg.kind === 'ok'
            ? { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }
            : { background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: '#9CA3AF' }}>A carregar…</p>
      ) : !configured ? (
        <div className="p-4 rounded-xl text-sm" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #f59e0b50' }}>
          Esta funcionalidade ainda não está activada no servidor (falta a variável <code>API_KEY_ENCRYPTION_SECRET</code>). Contacta o administrador do PROF.IA.
        </div>
      ) : (
        <>
          {/* Chaves existentes */}
          {keys.length > 0 && (
            <div className="space-y-2">
              {keys.map(k => (
                <div key={k.provider} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: '#F7F3EE' }}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>
                      {catalog[k.provider]?.label ?? k.provider}
                      {k.enabled && <span className="ml-2 px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: '#00B4D820', color: BLUE }}>Activa</span>}
                    </p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>{k.model} · chave ····{k.last4}</p>
                    {k.lastError && <p className="text-xs mt-0.5" style={{ color: '#b91c1c' }}>Último erro: {k.lastError}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggle(k.provider, !k.enabled)} disabled={busy}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: k.enabled ? '#9CA3AF' : BLUE }}>
                      {k.enabled ? 'Desligar' : 'Ligar'}
                    </button>
                    <button onClick={() => remove(k.provider)} disabled={busy}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                      style={{ background: '#fee2e2', color: '#991b1b' }}>
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Adicionar / actualizar */}
          <div className="pt-2 border-t space-y-3" style={{ borderColor: '#0D1B2A08' }}>
            <p className="text-xs font-semibold" style={{ color: '#374151' }}>Adicionar ou actualizar uma chave</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs" style={{ color: '#6B7280' }}>
                Fornecedor
                <select value={provider} onChange={e => setProvider(e.target.value as ProviderId)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#e2e8f0', color: NAVY }}>
                  {Object.entries(catalog).map(([id, c]) => <option key={id} value={id}>{c.label}</option>)}
                </select>
              </label>
              <label className="text-xs" style={{ color: '#6B7280' }}>
                Modelo
                <input value={model} onChange={e => setModel(e.target.value)}
                  placeholder={cat?.defaultModel}
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#e2e8f0', color: NAVY }} />
              </label>
            </div>
            <label className="text-xs block" style={{ color: '#6B7280' }}>
              Chave de API
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder="cola aqui a tua chave"
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-mono" style={{ borderColor: '#e2e8f0', color: NAVY }} />
            </label>
            {cat && (
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                {cat.keyHint} <a href={cat.keyUrl} target="_blank" rel="noopener noreferrer" style={{ color: BLUE }}>Obter chave →</a>
              </p>
            )}
            <button onClick={connect} disabled={busy}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: BLUE }}>
              {busy ? 'A validar…' : '✓ Testar e ligar'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
