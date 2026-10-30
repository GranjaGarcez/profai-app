// Correcção do aluno — acesso público por id de submissão (UUID não adivinhável).
// SÓ devolve a correcção quando o professor já divulgou (results_released).
// Cada id dá acesso apenas à sua própria submissão; não há listagem.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllQuestions } from '@/lib/exam/types'
import type { TestSnapshot, GradingDetail } from '@/lib/exam/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: sub, error } = await supabase
    .from('exam_submissions')
    .select('id, session_id, student_name, total_score, max_score, status, grading_details, answers')
    .eq('id', id)
    .single()
  if (error || !sub) return NextResponse.json({ error: 'Resultado não encontrado.' }, { status: 404 })

  const { data: session } = await supabase
    .from('exam_sessions')
    .select('title, test_snapshot, results_released')
    .eq('id', sub.session_id)
    .single()
  if (!session) return NextResponse.json({ error: 'Exame não encontrado.' }, { status: 404 })

  const title = session.title as string
  // Ainda não divulgado, ou ainda por corrigir → não revelar nada da correcção.
  if (!session.results_released) {
    return NextResponse.json({ released: false, title, studentName: sub.student_name })
  }
  if (sub.status !== 'graded' && sub.status !== 'reviewed') {
    return NextResponse.json({ released: true, pending: true, title, studentName: sub.student_name })
  }

  const snapshot = session.test_snapshot as TestSnapshot
  const details = (sub.grading_details ?? {}) as Record<string, GradingDetail>
  const answers = (sub.answers ?? {}) as Record<string, string>

  const questions = getAllQuestions(snapshot).map((q, i) => {
    const key = String(q.index)
    const d = details[key]
    return {
      n: i + 1,
      type: q.type,
      text: q.text,
      options: q.options ?? null,
      figure: q.figure ?? null,
      illustration: q.illustration ?? null,
      illustrationCredit: q.illustrationCredit ?? null,
      studentAnswer: answers[key] ?? '',
      correctAnswer: q.correctAnswer,
      points: q.points,
      earned: d?.score ?? 0,
      feedback: d?.feedback ?? '',
    }
  })

  return NextResponse.json({
    released: true,
    title,
    studentName: sub.student_name,
    totalScore: sub.total_score,
    maxScore: sub.max_score ?? snapshot.totalPoints ?? 100,
    allowAids: !!snapshot._allowAids,
    questions,
  })
}
