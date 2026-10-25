// Anular (ou reverter a anulação de) uma submissão — DECISÃO HUMANA do professor.
// Guarda a decisão e o motivo no registo de integridade da submissão (com os
// eventos/indícios já lá como prova). Não apaga nada; é reversível. Não mexe na nota.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withIntegrity } from '@/lib/exam/integrity'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null) as { annul?: boolean; reason?: string } | null
  const annul = !!body?.annul
  const reason = String(body?.reason ?? '').slice(0, 500)

  // Submissão + dono (via sessão).
  const { data: sub, error } = await supabase
    .from('exam_submissions')
    .select('id, session_id, answers')
    .eq('id', id)
    .single()
  if (error || !sub) return NextResponse.json({ error: 'Submissão não encontrada.' }, { status: 404 })

  const { data: sess } = await supabase
    .from('exam_sessions')
    .select('teacher_id')
    .eq('id', sub.session_id)
    .single()
  if (!sess || sess.teacher_id !== user.id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const answers = (sub.answers ?? {}) as Record<string, string>
  const merged = withIntegrity(answers, {
    annulled: annul ? { at: new Date().toISOString(), reason } : undefined,
  })

  const admin = createAdminClient()
  const { error: upErr } = await admin.from('exam_submissions').update({ answers: merged }).eq('id', id)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, annulled: annul })
}
