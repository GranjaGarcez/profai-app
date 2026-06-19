import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TestPreview from '@/components/content/TestPreview'
import LessonPlanPreview from '@/components/content/LessonPlanPreview'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ContentDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !item) notFound()

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
        <Link href="/dashboard/content" className="hover:underline">Conteúdos</Link>
        <span>›</span>
        <span style={{ color: '#0D1B2A' }}>{item.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
            {item.title}
          </h2>
          <div className="flex gap-3 mt-1 text-xs" style={{ color: '#6B7280' }}>
            {item.subject && <span>📚 {item.subject}</span>}
            {item.year_level && <span>🎓 {item.year_level}.º ano</span>}
            {item.topic && <span>📌 {item.topic}</span>}
            <span>🗓 {new Date(item.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
        <Link
          href="/dashboard/content"
          className="shrink-0 px-4 py-2 rounded-lg border text-sm"
          style={{ borderColor: '#0D1B2A20', color: '#0D1B2A' }}
        >
          ← Voltar
        </Link>
      </div>

      {/* Conteúdo por tipo */}
      {(item.type === 'test' || item.type === 'differentiated') && (
        <TestPreview content={item.content} contentItemId={item.id} />
      )}

      {item.type === 'lesson_plan' && <LessonPlanPreview content={item.content} />}

      {item.type !== 'test' && item.type !== 'differentiated' && item.type !== 'lesson_plan' && (
        <div className="p-6 rounded-xl border bg-white" style={{ borderColor: '#0D1B2A10' }}>
          <pre className="text-xs overflow-auto" style={{ color: '#374151' }}>
            {JSON.stringify(item.content, null, 2)}
          </pre>
        </div>
      )}

    </div>
  )
}
