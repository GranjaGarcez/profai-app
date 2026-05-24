'use client'

import { useState, useRef } from 'react'
import type { SchoolProfile } from '@/lib/hooks/useSchoolProfile'

interface Props {
  current: SchoolProfile
  onSave: (p: SchoolProfile) => void
  onClose: () => void
}

export default function SchoolProfileModal({ current, onSave, onClose }: Props) {
  const [form, setForm] = useState<SchoolProfile>({ ...current })
  const [logoPreview, setLogoPreview] = useState(current.logoDataUrl)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500_000) { alert('Logótipo demasiado grande — máximo 500 KB.'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      const url = ev.target?.result as string
      setLogoPreview(url)
      setForm(f => ({ ...f, logoDataUrl: url }))
    }
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    setLogoPreview('')
    setForm(f => ({ ...f, logoDataUrl: '' }))
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleSave() {
    onSave(form)
    onClose()
  }

  const field = (label: string, key: keyof SchoolProfile, placeholder: string) => (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: '#0D1B2A' }}>{label}</label>
      <input
        type="text"
        value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border text-sm"
        style={{ borderColor: '#0D1B2A25', outline: 'none' }}
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: '#0D1B2A80' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#F7F3EE' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: '#0D1B2A15' }}>
          <div>
            <h2 className="font-bold text-base" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
              🏫 Perfil da Escola
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
              Aparece em todos os testes gerados
            </p>
          </div>
          <button onClick={onClose} className="text-lg" style={{ color: '#6B7280' }}>✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Logo upload */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#0D1B2A' }}>
              Logótipo (PNG ou JPG, máx. 500 KB)
            </label>
            <div className="flex items-center gap-3">
              {logoPreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview} alt="Logo" className="h-14 w-14 object-contain rounded border"
                    style={{ borderColor: '#0D1B2A20' }} />
                  <button onClick={removeLogo}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center"
                    style={{ background: '#dc2626' }}>✕</button>
                </div>
              ) : (
                <div className="h-14 w-14 rounded border-2 border-dashed flex items-center justify-center text-xl"
                  style={{ borderColor: '#0D1B2A25', color: '#9CA3AF' }}>🏛</div>
              )}
              <div className="flex-1">
                <button onClick={() => fileRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                  style={{ borderColor: '#0D1B2A30', color: '#0D1B2A' }}>
                  {logoPreview ? '↩ Substituir' : '📁 Carregar logótipo'}
                </button>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  Recomendado: fundo transparente (PNG)
                </p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={handleLogoFile} />
          </div>

          {field('Agrupamento de Escolas', 'agrupamento', 'ex: Agrupamento de Escolas de Ponte de Lima')}
          {field('Escola / Estabelecimento', 'escola', 'ex: Escola EB 2,3 de Labruge')}
          {field('Concelho', 'concelho', 'ex: Vila do Conde')}
          {field('Ano Lectivo', 'anoLetivo', '2025 / 2026')}
        </div>

        {/* Preview */}
        {(form.agrupamento || form.logoDataUrl) && (
          <div className="mx-6 mb-4 p-3 rounded-xl border text-xs"
            style={{ background: 'white', borderColor: '#0D1B2A10' }}>
            <p className="font-bold mb-1" style={{ color: '#6B7280' }}>Pré-visualização do cabeçalho:</p>
            <div className="flex items-center gap-3">
              {form.logoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoDataUrl} alt="" className="h-8 w-8 object-contain" />
              )}
              <div>
                {form.agrupamento && <p className="font-semibold text-xs" style={{ color: '#0D1B2A' }}>{form.agrupamento}</p>}
                {form.escola && <p className="text-xs" style={{ color: '#6B7280' }}>{form.escola}</p>}
                {form.anoLetivo && <p className="text-xs" style={{ color: '#9CA3AF' }}>Ano lectivo {form.anoLetivo}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium"
            style={{ borderColor: '#0D1B2A30', color: '#0D1B2A' }}>
            Cancelar
          </button>
          <button onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#00B4D8' }}>
            💾 Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
