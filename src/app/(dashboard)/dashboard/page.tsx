import { createClient } from '@/lib/supabase/server'

const quickCreate = [
  { label: 'Teste / Avaliação', icon: '✏️', desc: 'Gerar com IA em segundos', color: '#00B4D8' },
  { label: 'Planificação', icon: '📋', desc: 'Plano de aula completo', color: '#C8A84B' },
  { label: 'Rubrica', icon: '⭐', desc: 'Critérios de avaliação', color: '#8B5CF6' },
  { label: 'Diferenciação', icon: '🎯', desc: 'Níveis A, B e C', color: '#10B981' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const firstName = user?.email?.split('@')[0] ?? 'Professor'

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Boas-vindas */}
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
          Bem-vindo, {firstName} 👋
        </h2>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          O que queres criar hoje?
        </p>
      </div>

      {/* Criação rápida */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#6B7280' }}>
          Criar com IA
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickCreate.map(item => (
            <button
              key={item.label}
              className="p-4 rounded-xl text-left border bg-white hover:shadow-md transition-shadow"
              style={{ borderColor: '#0D1B2A10' }}
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>{item.label}</div>
              <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Exames activos */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#6B7280' }}>
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

      {/* Conteúdos recentes */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#6B7280' }}>
          Recentes
        </h3>
        <div className="rounded-xl border bg-white p-8 text-center" style={{ borderColor: '#0D1B2A10' }}>
          <p className="text-3xl mb-2">📄</p>
          <p className="text-sm font-medium" style={{ color: '#0D1B2A' }}>Ainda sem conteúdos</p>
          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
            Os teus testes, planificações e rubricas aparecem aqui
          </p>
        </div>
      </div>

    </div>
  )
}
