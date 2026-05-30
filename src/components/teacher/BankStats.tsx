'use client'

import { useEffect, useState } from 'react'
import type { BankStats } from '@/app/api/questions/stats/route'

const SUBJECT_EMOJI: Record<string, string> = {
  'Matemática': '📐',
  'Português': '📖',
  'Ciências Naturais': '🔬',
  'História e Geografia de Portugal': '🗺️',
  'HGP': '🗺️',
  'História': '🏛️',
  'Geografia': '🌍',
  'Físico-Química': '⚗️',
  'Inglês': '🇬🇧',
  'Espanhol': '🇪🇸',
}

function qualityColor(score: number): string {
  if (score >= 0.85) return '#10B981'
  if (score >= 0.70) return '#C8A84B'
  return '#EF4444'
}

function qualityLabel(score: number): string {
  if (score >= 0.85) return 'Excelente'
  if (score >= 0.70) return 'Boa'
  return 'A melhorar'
}

function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    multiple_choice: 'EM', true_false: 'V/F',
    short_answer: 'RC', long_answer: 'RD', fill_in_blank: 'Comp.',
  }
  return (
    <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: '#0D1B2A12', color: '#0D1B2A99' }}>
      {labels[type] ?? type}
    </span>
  )
}

export default function BankStats() {
  const [stats, setStats] = useState<BankStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/questions/stats')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setStats(data as BankStats)
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Erro'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="rounded-xl border bg-white p-6 animate-pulse" style={{ borderColor: '#0D1B2A10' }}>
      <div className="h-4 w-40 rounded mb-4" style={{ background: '#0D1B2A10' }} />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-lg" style={{ background: '#0D1B2A08' }} />)}
      </div>
    </div>
  )

  if (error) return (
    <div className="rounded-xl border p-4 text-sm" style={{ borderColor: '#dc262630', color: '#dc2626', background: '#fee2e220' }}>
      ⚠️ Não foi possível carregar as estatísticas do banco: {error}
    </div>
  )

  if (!stats) return null

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7280' }}>
        Banco de Questões
      </h3>

      {/* Métricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          value={stats.total}
          label="Questões no banco"
          icon="🗃️"
          color="#00B4D8"
        />
        <StatCard
          value={`+${stats.recentlyAdded}`}
          label="Adicionadas (7 dias)"
          icon="✨"
          color="#10B981"
        />
        <StatCard
          value={stats.bySubject.length}
          label="Disciplinas cobertas"
          icon="📚"
          color="#8B5CF6"
        />
        <StatCard
          value={stats.withFeedback}
          label="Com feedback docente"
          icon="👍"
          color="#C8A84B"
        />
      </div>

      {/* Por disciplina */}
      <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: '#0D1B2A10' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: '#0D1B2A08', background: '#F7F3EE50' }}>
          <span className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>Por disciplina</span>
        </div>
        <div className="divide-y" style={{ borderColor: '#0D1B2A06' }}>
          {stats.bySubject.map(s => (
            <div key={s.subject} className="px-4 py-3 flex items-center gap-3">
              <span className="text-lg w-6 text-center flex-shrink-0">
                {SUBJECT_EMOJI[s.subject] ?? '📝'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: '#0D1B2A' }}>{s.subject}</span>
                  <span className="text-xs flex-shrink-0" style={{ color: '#9CA3AF' }}>
                    {s.yearLevels.map(y => `${y}.º`).join(', ')}
                  </span>
                </div>
                {/* Barra de qualidade */}
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: '#0D1B2A10' }}>
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.round(s.avgQuality * 100)}%`, background: qualityColor(s.avgQuality) }}
                    />
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: qualityColor(s.avgQuality) }}>
                    {qualityLabel(s.avgQuality)}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold tabular-nums" style={{ color: '#0D1B2A' }}>{s.count}</div>
                <div className="text-xs" style={{ color: '#9CA3AF' }}>questões</div>
              </div>
            </div>
          ))}
          {stats.bySubject.length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: '#9CA3AF' }}>
              Banco ainda vazio — gera os primeiros testes para começar a preencher.
            </div>
          )}
        </div>
      </div>

      {/* Top qualidade */}
      {stats.topRated.length > 0 && (
        <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: '#0D1B2A10' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: '#0D1B2A08', background: '#F7F3EE50' }}>
            <span className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>⭐ Melhores questões do banco</span>
          </div>
          <div className="divide-y" style={{ borderColor: '#0D1B2A06' }}>
            {stats.topRated.map((q, i) => (
              <div key={q.id} className="px-4 py-3 flex items-start gap-3">
                <span className="text-xs font-bold w-5 mt-0.5 flex-shrink-0 tabular-nums" style={{ color: '#C8A84B' }}>
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug" style={{ color: '#0D1B2A' }}>
                    {q.text}{q.text.length >= 120 ? '…' : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>{q.subject}</span>
                    <TypeBadge type={q.type} />
                  </div>
                </div>
                <div
                  className="text-xs font-bold flex-shrink-0 px-2 py-0.5 rounded-full"
                  style={{ background: qualityColor(q.qualityScore) + '20', color: qualityColor(q.qualityScore) }}
                >
                  {Math.round(q.qualityScore * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ value, label, icon, color }: { value: number | string; label: string; icon: string; color: string }) {
  return (
    <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#0D1B2A10' }}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</div>
      <div className="text-xs mt-0.5 leading-tight" style={{ color: '#6B7280' }}>{label}</div>
    </div>
  )
}
