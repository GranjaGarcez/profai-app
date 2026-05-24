'use client'

import { useState } from 'react'
import SchoolProfileModal from '@/components/school/SchoolProfileModal'
import { useSchoolProfile } from '@/lib/hooks/useSchoolProfile'

export default function SettingsPage() {
  const { profile, saveProfile, hasProfile } = useSchoolProfile()
  const [showModal, setShowModal] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleSave(p: Parameters<typeof saveProfile>[0]) {
    saveProfile(p)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {showModal && (
        <SchoolProfileModal
          current={profile}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
          ⚙️ Definições
        </h2>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Personaliza o PROF.IA para a tua escola</p>
      </div>

      {saved && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }}>
          ✅ Perfil da escola guardado com sucesso!
        </div>
      )}

      {/* Escola */}
      <div className="bg-white rounded-2xl border p-6 space-y-4" style={{ borderColor: '#0D1B2A10' }}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold" style={{ color: '#0D1B2A' }}>🏫 Perfil da Escola</h3>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
              Nome do agrupamento, escola, logótipo e ano lectivo — aparecem em todos os testes
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#00B4D8' }}>
            {hasProfile ? '✏️ Editar' : '+ Configurar'}
          </button>
        </div>

        {hasProfile ? (
          <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: '#F7F3EE' }}>
            {profile.logoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logoDataUrl} alt="" className="h-12 w-12 object-contain shrink-0" />
            )}
            <div className="text-sm space-y-0.5">
              {profile.agrupamento && <p className="font-semibold" style={{ color: '#0D1B2A' }}>{profile.agrupamento}</p>}
              {profile.escola && <p style={{ color: '#374151' }}>{profile.escola}</p>}
              {profile.concelho && <p style={{ color: '#6B7280' }}>{profile.concelho}</p>}
              <p className="text-xs" style={{ color: '#9CA3AF' }}>Ano lectivo {profile.anoLetivo}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl text-sm text-center" style={{ background: '#F7F3EE', color: '#9CA3AF' }}>
            Ainda não configuraste a tua escola. O cabeçalho dos testes ficará genérico.
          </div>
        )}
      </div>

      {/* Conta */}
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#0D1B2A10' }}>
        <h3 className="font-semibold mb-1" style={{ color: '#0D1B2A' }}>👤 Conta</h3>
        <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Gere a tua subscrição e dados pessoais</p>
        <div className="flex items-center justify-between py-3 border-t text-sm" style={{ borderColor: '#0D1B2A08' }}>
          <span style={{ color: '#374151' }}>Plano actual</span>
          <span className="px-2 py-0.5 rounded text-xs font-semibold"
            style={{ background: '#00B4D820', color: '#00B4D8' }}>Gratuito</span>
        </div>
        <div className="flex items-center justify-between py-3 border-t text-sm" style={{ borderColor: '#0D1B2A08' }}>
          <span style={{ color: '#374151' }}>País</span>
          <span style={{ color: '#6B7280' }}>🇵🇹 Portugal</span>
        </div>
      </div>

      {/* Sobre */}
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#0D1B2A10' }}>
        <h3 className="font-semibold mb-3" style={{ color: '#0D1B2A' }}>ℹ️ Sobre o PROF.IA</h3>
        <div className="text-xs space-y-1" style={{ color: '#6B7280' }}>
          <p>Currículo: Aprendizagens Essenciais DGE (Despacho 8209/2021)</p>
          <p>IA: Gemini 2.5 Flash + Groq llama-3.3-70b (fallback)</p>
          <p>Versão: 0.3.0 — Feito com ❤️ por e para professores portugueses</p>
        </div>
      </div>
    </div>
  )
}
