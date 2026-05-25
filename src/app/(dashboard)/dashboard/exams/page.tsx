import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ExamSessionList from '@/components/exam/ExamSessionList'

export default async function ExamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sessions } = await supabase
    .from('exam_sessions')
    .select('id, title, access_code, status, duration_minutes, created_at, closed_at, exam_submissions(id, status)')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
            Exames
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Sessões de avaliação lançadas com código de acesso
          </p>
        </div>
        <Link
          href="/dashboard/content"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#00B4D8' }}
        >
          + Novo teste
        </Link>
      </div>

      {/* Lista */}
      {sessions && sessions.length > 0 ? (
        <ExamSessionList sessions={sessions as Parameters<typeof ExamSessionList>[0]['sessions']} />
      ) : (
        <div className="text-center py-20 space-y-4">
          <p className="text-5xl">✏️</p>
          <h3 className="font-semibold text-lg" style={{ color: '#0D1B2A' }}>Nenhum exame lançado ainda</h3>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Abre um teste em <strong>Conteúdos</strong> e clica em{' '}
            <strong>🚀 Lançar Exame</strong> para criar um código de acesso para os alunos.
          </p>
          <Link
            href="/dashboard/content"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#00B4D8' }}
          >
            Ir para Conteúdos →
          </Link>
        </div>
      )}
    </div>
  )
}
