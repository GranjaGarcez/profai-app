// Divulgar / ocultar os resultados aos alunos (interruptor do professor).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { released } = await req.json().catch(() => ({ released: true }))

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('id')
    .eq('id', id)
    .eq('teacher_id', user.id)
    .single()
  if (error || !session) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })

  const { error: updErr } = await createAdminClient()
    .from('exam_sessions')
    .update({ results_released: !!released, results_released_at: released ? new Date().toISOString() : null })
    .eq('id', id)
  if (updErr) return NextResponse.json({ error: 'Não foi possível actualizar. A migração já foi aplicada?' }, { status: 500 })

  return NextResponse.json({ released: !!released })
}
