// Editar a CORRIGENDA de UMA pergunta de um exame já lançado e re-corrigir SÓ essa
// pergunta, preservando todo o trabalho feito:
//   • o snapshot só muda na corrigenda dessa pergunta (correctAnswer + markScheme);
//     enunciado, opções, cotação e as outras perguntas ficam intactos; a corrigenda
//     anterior fica guardada em `_criteriaHistory` (reversível).
//   • as submissões onde essa pergunta foi COTADA À MÃO pelo professor NÃO são
//     tocadas (preservadas); as outras perguntas de cada submissão também não.
//   • só é re-corrigida a pergunta editada, com os critérios novos.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { regradeSubmissionSelective } from '@/lib/exam/grading'
import { applyCriteriaEdit } from '@/lib/exam/editCriteria'
import type { TestSnapshot, GradingDetail, Question } from '@/lib/exam/types'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null) as
    | { questionKey?: string | number; correctAnswer?: string; markScheme?: string; bloomLevel?: string } | null
  const questionKey = body?.questionKey != null ? String(body.questionKey) : ''
  const correctAnswer = typeof body?.correctAnswer === 'string' ? body.correctAnswer.trim() : ''
  const markScheme = typeof body?.markScheme === 'string' ? body.markScheme : ''
  if (!questionKey) return NextResponse.json({ error: 'Pergunta não indicada.' }, { status: 400 })
  if (!correctAnswer) return NextResponse.json({ error: 'A resposta certa não pode ficar vazia.' }, { status: 400 })

  // Sessão tem de ser do professor.
  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('id, test_snapshot')
    .eq('id', id)
    .eq('teacher_id', user.id)
    .single()
  if (error || !session) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })

  const oldSnapshot = session.test_snapshot as TestSnapshot
  const { snapshot, found } = applyCriteriaEdit(oldSnapshot, questionKey, {
    correctAnswer, markScheme, bloomLevel: body?.bloomLevel,
  })
  if (!found) return NextResponse.json({ error: 'Pergunta não encontrada neste exame.' }, { status: 404 })

  const admin = createAdminClient()

  // 1) Gravar o snapshot com a corrigenda nova (só esta pergunta mudou).
  const { error: upErr } = await admin
    .from('exam_sessions')
    .update({ test_snapshot: snapshot })
    .eq('id', id)
  if (upErr) return NextResponse.json({ error: `Não foi possível guardar os critérios: ${upErr.message}` }, { status: 500 })

  // 2) Re-corrigir SÓ esta pergunta nas submissões já corrigidas, preservando as manuais.
  const { data: subs } = await supabase
    .from('exam_submissions')
    .select('id, answers, grading_details, total_score, max_score, status')
    .eq('session_id', id)
    .in('status', ['graded', 'reviewed', 'por_corrigir'])

  const toProcess = (subs ?? []).filter(s => s.grading_details) // precisa de correcção prévia
  const onlyThis = (q: Question) => String(q.index) === questionKey

  let regraded = 0, preserved = 0, stillPending = 0
  for (const sub of toProcess) {
    const existing = (sub.grading_details ?? {}) as Record<string, GradingDetail>
    const d = existing[questionKey]
    // Preservar se o professor cotou esta pergunta à mão (marcador explícito) ou,
    // em dados antigos sem o marcador, se a submissão está "reviewed" com auto:false.
    const manuallyReviewed = d?.manual === true || (d?.auto === false && sub.status === 'reviewed')
    if (manuallyReviewed) { preserved++; continue }               // intocável

    try {
      const { details, totalScore, maxScore } = await regradeSubmissionSelective(
        snapshot, (sub.answers ?? {}) as Record<string, string>, existing, onlyThis,
      )
      // Pendentes reais = auto:false que NÃO são cotações manuais.
      const pendingNow = Object.values(details).filter(x => x.auto === false && x.manual !== true).length
      const status = sub.status === 'reviewed'
        ? 'reviewed'                                   // mantém o sinal de trabalho manual noutras perguntas
        : (pendingNow > 0 ? 'por_corrigir' : 'graded')
      await admin.from('exam_submissions').update({
        grading_details: details,
        total_score: totalScore,
        max_score: maxScore,
        status,
        graded_at: new Date().toISOString(),
      }).eq('id', sub.id)
      if (details[questionKey]?.auto === false && details[questionKey]?.manual !== true) stillPending++
      regraded++
    } catch (e) {
      console.error('[PROFAI] edit-criteria: re-correcção falhou para', sub.id, e)
    }
  }

  return NextResponse.json({ ok: true, question: questionKey, regraded, preserved, stillPending, total: toProcess.length })
}
