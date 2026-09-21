// Correção de prova em papel após revisão humana (aditivo). Recebe as respostas
// JÁ REVISTAS pelo professor + meta do OCR; grava como submissão source='paper'
// e corrige com o motor existente (mesmos critérios) + análise de escrita.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gradeSubmission } from '@/lib/exam/grading'
import { analyzeWriting } from '@/lib/exam/writingAnalysis'
import type { TestSnapshot } from '@/lib/exam/types'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { sessionId, studentName, studentNumber, studentClass, answers, ocrDetails } =
    await request.json() as {
      sessionId?: string; studentName?: string; studentNumber?: string; studentClass?: string
      answers?: Record<string, string>; ocrDetails?: unknown
    }

  if (!sessionId || !studentName?.trim() || !answers) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
  }

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('id, test_snapshot')
    .eq('id', sessionId)
    .eq('teacher_id', user.id)
    .single()
  if (error || !session) {
    return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })
  }

  const { data: submission, error: subErr } = await supabase
    .from('exam_submissions')
    .insert({
      session_id:     sessionId,
      student_name:   studentName.trim(),
      student_number: studentNumber?.trim() || null,
      student_class:  studentClass?.trim() || null,
      answers,
      source:         'paper',
      ocr_details:    ocrDetails ?? null,
      status:         'grading',
    })
    .select('id')
    .single()
  if (subErr || !submission) {
    console.error('Erro ao inserir submissão de papel:', subErr)
    return NextResponse.json({ error: 'Erro ao guardar a submissão.' }, { status: 500 })
  }

  const snapshot = session.test_snapshot as TestSnapshot
  // Correção + análise de escrita em paralelo, sem bloquear a resposta.
  Promise.all([gradeSubmission(snapshot, answers), analyzeWriting(snapshot, answers)])
    .then(async ([grade, writing]) => {
      await supabase
        .from('exam_submissions')
        .update({
          grading_details: grade.details,
          total_score:     grade.totalScore,
          max_score:       grade.maxScore,
          writing_analysis: writing,
          status:          'reviewed',   // veio de revisão humana do OCR
          graded_at:       new Date().toISOString(),
        })
        .eq('id', submission.id)
    })
    .catch(err => console.error('[PROFAI] Erro na correcção de papel:', err))

  return NextResponse.json({ submissionId: submission.id })
}
