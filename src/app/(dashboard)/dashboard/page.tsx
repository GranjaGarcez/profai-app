'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TestGenerator from '@/components/teacher/TestGenerator'

const quickCreate = [
  { id: 'test', label: 'Teste / Avaliação', icon: '✏️', desc: 'Gerar com IA em segundos', color: '#00B4D8' },
  { id: 'lesson_plan', label: 'Planificação', icon: '📋', desc: 'Plano de aula completo', color: '#C8A84B' },
  { id: 'rubric', label: 'Rubrica', icon: '⭐', desc: 'Critérios de avaliação', color: '#8B5CF6' },
  { id: 'differentiated', label: 'Diferenciação', icon: '🎯', desc: 'Níveis A, B e C', color: '#10B981' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSave(content: unknown) {
    setSaveError(null)
    try {
      const res = await fetch('/api/content/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTool ?? 'test', content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      // Redireciona directamente para a página de edição do teste
      if (data.id) {
        router.push(`/dashboard/content/${data.id}`)
      } else {
        setActiveTool(null)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao guardar'
      console.error('Erro ao guardar:', msg)
      setSaveError(msg)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
          O que queres criar hoje? 👋
        </h2>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Selecciona uma ferramenta para começar
        </p>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>
          Criar com IA
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickCreate.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTool(item.id)}
              className="p-4 rounded-xl text-left border bg-white hover:shadow-md transition-all hover:-translate-y-0.5"
              style={{ borderColor: '#0D1B2A10' }}
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>{item.label}</div>
              <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{item.desc}</div>
              <div className="mt-3 text-xs font-medium" style={{ color: item.color }}>Criar →</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>
          Exames activos
        </h3>
        <div className="rounded-xl border bg-white p-8 text-center" style={{ borderColor: '#0D1B2A10' }}>
          <p className="text-3xl mb-2">✏️</p>
          <p className="text-sm font-medium" style={{ color: '#0D1B2A' }}>Nenhum exame activo</p>
          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
            Cria um teste e lança-o para os teus alunos
          </p>
        </div>
      </div>

      {saveError && (
        <div className="p-4 rounded-xl border" style={{ background: '#fee2e220', borderColor: '#dc262630' }}>
          <p className="text-sm font-medium" style={{ color: '#dc2626' }}>⚠️ {saveError}</p>
        </div>
      )}

      {activeTool === 'test' && (
        <TestGenerator onClose={() => setActiveTool(null)} onSave={handleSave} />
      )}

      {activeTool && activeTool !== 'test' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#0D1B2A90' }}>
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
            <p className="text-4xl mb-4">🚧</p>
            <p className="font-semibold" style={{ color: '#0D1B2A' }}>Em construção</p>
            <p className="text-sm mt-1 mb-4" style={{ color: '#6B7280' }}>Esta ferramenta estará disponível em breve.</p>
            <button onClick={() => setActiveTool(null)} className="px-6 py-2 rounded-lg text-white text-sm" style={{ background: '#00B4D8' }}>
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
