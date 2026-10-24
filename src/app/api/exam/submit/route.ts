import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gradeSubmission } from '@/lib/exam/grading'
import { canonicalTurma } from '@/lib/exam/turma'
import type { TestSnapshot } from '@/lib/exam/types'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  const { sessionId, studentName, studentNumber, studentClass, studentYear, studentEmail, answers } = await request.json()

  if (!sessionId || !studentName?.trim()) {
    return NextResponse.json({ error: 'Dados de submissão incompletos.' }, { status: 400 })
  }

  // Valida sessão
  const { data: session, error: sessErr } = await supabase
    .from('exam_sessions')
    .select('id, status, test_snapshot, teacher_id')
    .eq('id', sessionId)
    .single()

  if (sessErr || !session) {
    return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })
  }
  if (session.status !== 'active') {
    return NextResponse.json({ error: 'O exame já foi encerrado.' }, { status: 410 })
  }

  // Normaliza turma/ano logo à entrada (determinístico): resolve "6g"/"G", "6º G",
  // "turma A"… para um par canónico, para os alunos caírem na turma certa.
  const fallbackYear = (session.test_snapshot as TestSnapshot)?.yearLevel ?? null
  const { ano, turma } = canonicalTurma(studentYear, studentClass, fallbackYear)

  // Insere submissão em estado "grading"
  const { data: submission, error: subErr } = await supabase
    .from('exam_submissions')
    .insert({
      session_id:     sessionId,
      student_name:   studentName.trim(),
      student_number: studentNumber?.trim() || null,
      student_class:  turma || (studentClass?.trim() || null),
      answers,
      status:         'grading',
    })
    .select('id')
    .single()

  if (subErr || !submission) {
    console.error('Erro ao inserir submissão:', subErr)
    return NextResponse.json({ error: 'Erro ao guardar submissão.' }, { status: 500 })
  }

  // Enriquecimento best-effort: ano do aluno + criação automática da turma.
  // NUNCA pode fazer falhar a submissão (as respostas já estão guardadas acima),
  // por isso fica isolado em try/catch — se a migração ainda não estiver aplicada,
  // simplesmente não faz nada.
  const anoNum = ano
  const turmaNome = turma
  try {
    if (anoNum) {
      await supabase.from('exam_submissions').update({ student_year: anoNum }).eq('id', submission.id)
    }
    const emailTrim = String(studentEmail ?? '').trim()
    if (emailTrim.includes('@')) {
      await supabase.from('exam_submissions').update({ student_email: emailTrim }).eq('id', submission.id)
    }
    if (turmaNome && session.teacher_id) {
      await supabase.from('turmas').upsert(
        { teacher_id: session.teacher_id, nome: turmaNome, ano: anoNum },
        { onConflict: 'teacher_id,ano,nome', ignoreDuplicates: true },
      )
    }
  } catch (e) {
    console.warn('[PROFAI] enriquecimento turma/ano falhou (migração aplicada?):', e)
  }

  // Corrige assincronamente (não bloqueia a resposta ao aluno)
  const snapshot = session.test_snapshot as TestSnapshot
  gradeSubmission(snapshot, answers)
    .then(async ({ details, totalScore, maxScore, pending }) => {
      await supabase
        .from('exam_submissions')
        .update({
          grading_details: details,
          total_score:     totalScore,
          max_score:       maxScore,
          // Se a IA não conseguiu avaliar alguma aberta (quota/falha), fica
          // "por_corrigir" (não "graded" com zeros) → re-correção com 1 clique.
          status:          pending > 0 ? 'por_corrigir' : 'graded',
          graded_at:       new Date().toISOString(),
        })
        .eq('id', submission.id)
    })
    .catch(err => console.error('[PROFAI] Erro na correcção:', err))

  return NextResponse.json({ submissionId: submission.id })
}
