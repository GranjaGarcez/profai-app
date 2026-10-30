import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAllQuestions } from '@/lib/exam/types'
import type { TestSnapshot } from '@/lib/exam/types'

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
    .select('teacher_id, test_snapshot')
    .eq('id', sub.session_id)
    .single()

  if (!sess || sess.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Máximo autoritário desta pergunta (do snapshot) — nunca deixar a nota passar dele.
  const qMax = getAllQuestions(sess.test_snapshot as TestSnapshot)
    .find(q => String(q.index) === String(questionKey))?.points
  const maxN = typeof qMax === 'number' ? qMax : (Number(score) || 0)
  const safeScore = Math.max(0, Math.min(Number(score) || 0, maxN))

  // 1) Caminho ATÓMICO (função SQL): um único UPDATE com bloqueio da linha — evita a
  // corrida que revertia alterações; recalcula o total pela SOMA; conta a revisão.
  const by = user.email ?? null
  const { data: rpcTotal, error: rpcErr } = await supabase.rpc('profai_set_question_grade', {
    p_id: id, p_qkey: String(questionKey), p_score: safeScore, p_max: maxN,
    p_feedback: feedback ?? null, p_notes: teacherNotes ?? null, p_by: by,
  })
  if (!rpcErr) return NextResponse.json({ ok: true, newTotal: rpcTotal })

  // 2) Recurso (migração 20261030 ainda não aplicada): ler-modificar-gravar, MAS com o
  // total recalculado pela soma de todas as perguntas (sem deriva) + revisão + histórico.
  type LogEntry = { at: string; by?: string; from: number | null; to: number }
  type Det = { score: number; max?: number; feedback?: string; auto?: boolean; manual?: boolean; rev?: number; log?: LogEntry[] }
  const details = (sub.grading_details ?? {}) as Record<string, Det>
  const prev = details[questionKey] ?? ({} as Det)
  const entry: LogEntry = { at: new Date().toISOString(), from: typeof prev.score === 'number' ? prev.score : null, to: safeScore }
  if (by) entry.by = by
  const log = [...(prev.log ?? []), entry].slice(-20)
  details[questionKey] = {
    ...prev,
    score: safeScore,
    max: typeof qMax === 'number' ? qMax : prev.max,
    feedback: feedback ?? prev.feedback ?? '',
    auto: false,
    manual: true,
    rev: (prev.rev ?? 0) + 1,
    log,
  }
  // Total = soma das notas de todas as perguntas (fonte de verdade).
  const newTotal = Object.values(details).reduce((s, d) => s + (Number(d?.score) || 0), 0)

  const updates: Record<string, unknown> = {
    grading_details: details, total_score: newTotal, status: 'reviewed', graded_at: new Date().toISOString(),
  }
  if (teacherNotes !== undefined) updates.teacher_notes = teacherNotes

  const { error } = await supabase.from('exam_submissions').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, newTotal })
}
