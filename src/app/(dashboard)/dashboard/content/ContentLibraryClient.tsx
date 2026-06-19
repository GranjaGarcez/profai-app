'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ContentItem {
  id: string
  type: string
  title: string
  subject: string | null
  year_level: number | null
  topic: string | null
  created_at: string
  content?: { _differentiationLevel?: 'A' | 'B' | 'C' } | null
}

const DIFF_BADGE: Record<'A' | 'B' | 'C', { label: string; color: string }> = {
  A: { label: 'A · Apoio', color: '#0EA5E9' },
  B: { label: 'B · Consolidação', color: '#0D1B2A' },
  C: { label: 'C · Aprofundamento', color: '#7C3AED' },
}

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  test: { label: 'Teste', icon: '✏️', color: '#00B4D8' },
  lesson_plan: { label: 'Planificação', icon: '📋', color: '#C8A84B' },
  rubric: { label: 'Rubrica', icon: '⭐', color: '#8B5CF6' },
  differentiated: { label: 'Diferenciação', icon: '🎯', color: '#10B981' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ContentLibraryClient({ items, error }: { items: ContentItem[]; error: string | null }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [localItems, setLocalItems] = useState<ContentItem[]>(items)
  const router = useRouter()

  async function handleDelete(id: string) {
    if (!confirm('Eliminar este conteúdo? Esta acção não pode ser desfeita.')) return
    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase.from('content_items').delete().eq('id', id)
    if (!error) {
      setLocalItems(prev => prev.filter(i => i.id !== id))
    }
    setDeletingId(null)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
            Os meus conteúdos
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            {localItems.length} {localItems.length === 1 ? 'item guardado' : 'itens guardados'}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#00B4D8' }}
        >
          + Criar novo
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl border" style={{ background: '#fee2e220', borderColor: '#dc262630' }}>
          <p className="text-sm" style={{ color: '#dc2626' }}>Erro ao carregar conteúdos: {error}</p>
        </div>
      )}

      {localItems.length === 0 && !error && (
        <div className="rounded-xl border bg-white p-12 text-center" style={{ borderColor: '#0D1B2A10' }}>
          <p className="text-4xl mb-3">📂</p>
          <p className="font-semibold" style={{ color: '#0D1B2A' }}>Ainda não tens conteúdos guardados</p>
          <p className="text-sm mt-1 mb-4" style={{ color: '#6B7280' }}>
            Cria um teste, planificação ou rubrica e guarda-o aqui.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: '#00B4D8' }}
          >
            Criar com IA →
          </Link>
        </div>
      )}

      {localItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localItems.map(item => {
            const meta = TYPE_LABELS[item.type] ?? { label: item.type, icon: '📄', color: '#6B7280' }
            const diffLevel = item.content?._differentiationLevel
            return (
              <div
                key={item.id}
                className="p-5 rounded-xl border bg-white hover:shadow-md transition-all cursor-pointer"
                style={{ borderColor: '#0D1B2A10' }}
                onClick={() => router.push(`/dashboard/content/${item.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${meta.color}20`, color: meta.color }}
                      >
                        {meta.icon} {meta.label}
                      </span>
                      {item.year_level && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#0D1B2A10', color: '#6B7280' }}>
                          {item.year_level}.º ano
                        </span>
                      )}
                      {diffLevel && (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${DIFF_BADGE[diffLevel].color}15`, color: DIFF_BADGE[diffLevel].color }}
                          title="Visível só para ti — nunca aparece no documento impresso"
                        >
                          🎯 {DIFF_BADGE[diffLevel].label}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm leading-snug truncate" style={{ color: '#0D1B2A' }}>
                      {item.title}
                    </h3>
                    {item.subject && (
                      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                        {item.subject}{item.topic ? ` · ${item.topic}` : ''}
                      </p>
                    )}
                    <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                    disabled={deletingId === item.id}
                    className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-red-50"
                    style={{ borderColor: '#dc262630', color: '#dc2626', opacity: deletingId === item.id ? 0.5 : 1 }}
                  >
                    {deletingId === item.id ? '...' : '🗑'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
