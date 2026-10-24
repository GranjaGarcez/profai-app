import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ResultSlips from '@/components/exam/ResultSlips'
import type { TestSnapshot } from '@/lib/exam/types'

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function ResultSlipsPage({ params }: Props) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('id, title, test_snapshot')
    .eq('id', sessionId)
    .eq('teacher_id', user.id)
    .single()
  if (error || !session) notFound()

  const { data: submissions } = await supabase
    .from('exam_submissions')
    .select('id, student_name, student_number, student_class, student_year')
    .eq('session_id', sessionId)

  const fallbackYear = (session.test_snapshot as TestSnapshot)?.yearLevel ?? null

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="no-print">
        <Link href={`/dashboard/exams/${sessionId}`} className="text-sm hover:underline" style={{ color: '#6B7280' }}>
          ← Voltar à correcção
        </Link>
      </div>
      <ResultSlips title={session.title as string} submissions={submissions ?? []} fallbackYear={fallbackYear} />
    </div>
  )
}
