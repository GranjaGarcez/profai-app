// Ligar/desligar a tradução para alunos LPNM num exame (decisão do professor).
// Guarda a flag no snapshot (_allowTranslation); não altera questões nem respostas.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TestSnapshot } from '@/lib/exam/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { allow } = await req.json().catch(() => ({})) as { allow?: boolean }

  const { data: session, error } = await supabase
    .from('exam_sessions').select('id, test_snapshot').eq('id', id).eq('teacher_id', user.id).single()
  if (error || !session) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })

  const snapshot = session.test_snapshot as TestSnapshot
  const next: TestSnapshot = { ...snapshot, _allowTranslation: !!allow }

  const admin = createAdminClient()
  const { error: upErr } = await admin.from('exam_sessions').update({ test_snapshot: next }).eq('id', id)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
  return NextResponse.json({ ok: true, allow: !!allow })
}
