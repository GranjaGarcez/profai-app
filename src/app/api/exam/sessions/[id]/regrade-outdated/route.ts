// Re-corrigir com os CRITÉRIOS NOVOS as submissões que foram corrigidas pela IA
// ANTES da última melhoria do motor de correcção (GRADER_IMPROVED_AT). Nunca toca
// nas que o professor ajustou à mão (status "reviewed"), nem nas pendentes (essas
// têm o botão "Corrigir pendentes"). Idempotente: ao re-corrigir, carimba graded_at
// com a hora actual, por isso saem do conjunto "desactualizadas".
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { regradeSubmissionSelective } from '@/lib/exam/grading'
import { GRADER_IMPROVED_AT, GRADER_AFFECTS } from '@/lib/exam/graderVersion'
import type { TestSnapshot, GradingDetail } from '@/lib/exam/types'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('id, test_snapshot')
    .eq('id', id)
    .eq('teacher_id', user.id)
    .single()
  if (error || !session) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })

  // Só as corrigidas automaticamente (graded) antes da melhoria. "reviewed" (ajuste
  // manual) e as pendentes ficam de fora.
  const { data: subs } = await supabase
    .from('exam_submissions')
    .select('id, answers, graded_at, grading_details')
    .eq('session_id', id)
    .eq('status', 'graded')
    .lt('graded_at', GRADER_IMPROVED_AT)

  const outdated = subs ?? []
  if (!outdated.length) return NextResponse.json({ regraded: 0, message: 'Nada a re-corrigir.' })

  const snapshot = session.test_snapshot as TestSnapshot
  const affected = (q: { type: string }) => GRADER_AFFECTS.includes(q.type)
  const admin = createAdminClient()
  let regraded = 0, stillPending = 0

  for (const sub of outdated) {
    try {
      // Só re-corrige as perguntas afectadas; preserva as restantes tal como estavam.
      const { details, totalScore, maxScore, pending } = await regradeSubmissionSelective(
        snapshot,
        (sub.answers ?? {}) as Record<string, string>,
        (sub.grading_details ?? {}) as Record<string, GradingDetail>,
        affected,
      )
      await admin.from('exam_submissions').update({
        grading_details: details,
        total_score: totalScore,
        max_score: maxScore,
        status: pending > 0 ? 'por_corrigir' : 'graded',
        graded_at: new Date().toISOString(),
      }).eq('id', sub.id)
      if (pending > 0) stillPending++; else regraded++
    } catch (e) {
      console.error('[PROFAI] re-correcção (critérios novos) falhou para', sub.id, e)
    }
  }

  return NextResponse.json({ regraded, stillPending, total: outdated.length })
}
