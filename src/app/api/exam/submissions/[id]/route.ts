import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH — professor substitui a cotação de uma questão específica
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { questionKey, score, feedback, teacherNotes } = await request.json()

  // Verifica que a submissão pertence a uma sessão do professor
  const { data: sub, error: fetchErr } = await supabase
    .from('exam_submissions')
    .select('id, grading_details, total_score, max_score, session_id')
    .eq('id', id)
    .single()

  if (fetchErr || !sub) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  // Verifica propriedade via session
  const { data: sess } = await supabase
    .from('exam_sessions')
    .select('teacher_id')
    .eq('id', sub.session_id)
    .single()

  if (!sess || sess.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Atualiza detalhe da questão
  const details = (sub.grading_details ?? {}) as Record<string, { score: number; max: number; feedback: string; auto: boolean }>
  const oldScore = details[questionKey]?.score ?? 0
  details[questionKey] = {
    ...(details[questionKey] ?? {}),
    score: Number(score),
    feedback: feedback ?? details[questionKey]?.feedback ?? '',
    auto: false, // marcado como revisão manual
  }

  // Recalcula total
  const newTotal = (sub.total_score ?? 0) - oldScore + Number(score)

  const updates: Record<string, unknown> = {
    grading_details: details,
    total_score: newTotal,
    status: 'reviewed',
  }
  if (teacherNotes !== undefined) updates.teacher_notes = teacherNotes

  const { error } = await supabase
    .from('exam_submissions')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, newTotal })
}
