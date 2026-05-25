import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import GradingDashboard from '@/components/exam/GradingDashboard'

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function ExamDetailPage({ params }: Props) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Sessão
  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('teacher_id', user.id)
    .single()

  if (error || !session) notFound()

  // Submissões
  const { data: submissions } = await supabase
    .from('exam_submissions')
    .select('*')
    .eq('session_id', sessionId)
    .order('submitted_at', { ascending: true })

  const subs = submissions ?? []
  const total = subs.length
  const graded = subs.filter(s => s.status === 'graded' || s.status === 'reviewed').length
  const isActive = session.status === 'active'

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
        <Link href="/dashboard/exams" className="hover:underline">Exames</Link>
        <span>›</span>
        <span style={{ color: '#0D1B2A' }}>{session.title}</span>
      </div>

      {/* Cabeçalho da sessão */}
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#0D1B2A10' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
                {session.title}
              </h2>
              <span
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{
                  background: isActive ? '#dcfce7' : '#f3f4f6',
                  color: isActive ? '#166534' : '#6B7280',
                }}
              >
                {isActive ? '● Activo' : '◼ Encerrado'}
              </span>
            </div>
            <div className="flex gap-4 text-sm flex-wrap" style={{ color: '#6B7280' }}>
              <span>Código: <strong className="font-mono" style={{ color: '#0D1B2A' }}>{session.access_code}</strong></span>
              {session.duration_minutes && (
                <span>⏱ {session.duration_minutes} minutos</span>
              )}
              <span>
                📅 {new Date(session.created_at).toLocaleDateString('pt-PT', {
                  day: '2-digit', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Link do exame */}
          <div className="text-right shrink-0">
            <p className="text-xs font-medium mb-1" style={{ color: '#9CA3AF' }}>Link para alunos</p>
            <code className="text-xs px-3 py-1.5 rounded-lg" style={{ background: '#f8fafc', color: '#0369a1', border: '1px solid #e2e8f0' }}>
              /exam/{session.access_code}
            </code>
          </div>
        </div>

        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t" style={{ borderColor: '#0D1B2A08' }}>
          {[
            { label: 'Submissões', value: total },
            { label: 'Corrigidas', value: graded },
            { label: 'Pendentes', value: total - graded },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold" style={{ color: '#0D1B2A' }}>{stat.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard de correcção */}
      <GradingDashboard
        sessionId={sessionId}
        submissions={subs}
        testSnapshot={session.test_snapshot}
        isActive={isActive}
      />
    </div>
  )
}
