import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gradeSubmission } from '@/lib/exam/grading'
import type { TestSnapshot } from '@/lib/exam/types'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  const { sessionId, studentName, studentNumber, studentClass, answers } = await request.json()

  if (!sessionId || !studentName?.trim()) {
    return NextResponse.json({ error: 'Dados de submissão incompletos.' }, { status: 400 })
  }

  // Valida sessão
  const { data: session, error: sessErr } = await supabase
    .from('exam_sessions')
    .select('id, status, test_snapshot')
    .eq('id', sessionId)
    .single()

  if (sessErr || !session) {
    return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })
  }
  if (session.status !== 'active') {
    return NextResponse.json({ error: 'O exame já foi encerrado.' }, { status: 410 })
  }

  // Insere submissão em estado "grading"
  const { data: submission, error: subErr } = await supabase
    .from('exam_submissions')
    .insert({
      session_id:     sessionId,
      student_name:   studentName.trim(),
      student_number: studentNumber?.trim() || null,
      student_class:  studentClass?.trim() || null,
      answers,
      status:         'grading',
    })
    .select('id')
    .single()

  if (subErr || !submission) {
    console.error('Erro ao inserir submissão:', subErr)
    return NextResponse.json({ error: 'Erro ao guardar submissão.' }, { status: 500 })
  }

  // Corrige assincronamente (não bloqueia a resposta ao aluno)
  const snapshot = session.test_snapshot as TestSnapshot
  gradeSubmission(snapshot, answers)
    .then(async ({ details, totalScore, maxScore }) => {
      await supabase
        .from('exam_submissions')
        .update({
          grading_details: details,
          total_score:     totalScore,
          max_score:       maxScore,
          status:          'graded',
          graded_at:       new Date().toISOString(),
        })
        .eq('id', submission.id)
    })
    .catch(err => console.error('[PROFAI] Erro na correcção:', err))

  return NextResponse.json({ submissionId: submission.id })
}
