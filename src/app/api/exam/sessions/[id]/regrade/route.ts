// Re-correção em lote das submissões que ficaram por corrigir (ex.: quota de IA
// esgotada no momento do exame). Idempotente — pode voltar a correr quando o
// crédito for reposto. Nunca toca nas respostas do aluno, só nas notas.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gradeSubmission } from '@/lib/exam/grading'
import type { TestSnapshot } from '@/lib/exam/types'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Sessão tem de ser do professor
  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('id, test_snapshot')
    .eq('id', id)
    .eq('teacher_id', user.id)
    .single()
  if (error || !session) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })

  // Submissões ainda não corrigidas com sucesso
  const { data: subs } = await supabase
    .from('exam_submissions')
    .select('id, answers')
    .eq('session_id', id)
    .in('status', ['por_corrigir', 'grading', 'submitted'])

  const pendingSubs = subs ?? []
  if (!pendingSubs.length) return NextResponse.json({ regraded: 0, stillPending: 0, message: 'Nada por corrigir.' })

  const snapshot = session.test_snapshot as TestSnapshot
  const admin = createAdminClient()
  let regraded = 0, stillPending = 0

  // Sequencial por submissão (o limitador global já controla as chamadas de IA).
  for (const sub of pendingSubs) {
    try {
      const { details, totalScore, maxScore, pending } = await gradeSubmission(snapshot, (sub.answers ?? {}) as Record<string, string>)
      await admin.from('exam_submissions').update({
        grading_details: details,
        total_score: totalScore,
        max_score: maxScore,
        status: pending > 0 ? 'por_corrigir' : 'graded',
        graded_at: new Date().toISOString(),
      }).eq('id', sub.id)
      if (pending > 0) stillPending++; else regraded++
    } catch (e) {
      stillPending++
      console.error('[PROFAI] re-correção falhou para', sub.id, e)
    }
  }

  return NextResponse.json({ regraded, stillPending, total: pendingSubs.length })
}
