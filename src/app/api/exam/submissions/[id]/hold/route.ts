// Reter / certificar-e-libertar a correcção de uma submissão (decisão do professor).
// "release" = certifiquei, pode ir ao aluno (fica `cleared`, não volta a ser retida).
// "hold" = manter retida (o aluno não vê). Não altera a nota. Guarda em integrity.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withIntegrity } from '@/lib/exam/integrity'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { action, reason } = await req.json().catch(() => ({})) as { action?: 'release' | 'hold'; reason?: string }
  const note = typeof reason === 'string' && reason.trim() ? reason.trim() : undefined

  const { data: sub, error } = await supabase
    .from('exam_submissions').select('id, session_id, answers').eq('id', id).single()
  if (error || !sub) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  const { data: sess } = await supabase
    .from('exam_sessions').select('teacher_id').eq('id', sub.session_id).single()
  if (!sess || sess.teacher_id !== user.id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const answers = (sub.answers ?? {}) as Record<string, string>
  const merged = action === 'release'
    ? withIntegrity(answers, { held: false, cleared: { at: new Date().toISOString(), reason: note } })
    : withIntegrity(answers, { held: true, cleared: undefined })

  const { error: upErr } = await createAdminClient()
    .from('exam_submissions').update({ answers: merged }).eq('id', id)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
  return NextResponse.json({ ok: true, released: action === 'release' })
}
