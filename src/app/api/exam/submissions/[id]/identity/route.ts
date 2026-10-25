// Certificar/editar os DADOS DO ALUNO de uma submissão (nome, número e, opcional,
// ano/turma). O professor confirma a pedido da app antes de exportar as grelhas.
// Não toca nas respostas nem na correcção.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canonicalTurma } from '@/lib/exam/turma'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => null) as
    | { name?: string; number?: string; ano?: string | number; turma?: string } | null

  // Propriedade via sessão
  const { data: sub } = await supabase
    .from('exam_submissions').select('id, session_id').eq('id', id).single()
  if (!sub) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  const { data: sess } = await supabase
    .from('exam_sessions').select('teacher_id').eq('id', sub.session_id).single()
  if (!sess || sess.teacher_id !== user.id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const updates: Record<string, unknown> = {}
  if (typeof body?.name === 'string') {
    const n = body.name.trim()
    if (!n) return NextResponse.json({ error: 'O nome não pode ficar vazio.' }, { status: 400 })
    updates.student_name = n
  }
  if (body?.number !== undefined) updates.student_number = String(body.number).trim() || null
  if (body?.turma !== undefined || body?.ano !== undefined) {
    const { ano, turma } = canonicalTurma(body?.ano, body?.turma, Number(body?.ano) || null)
    if (turma) updates.student_class = turma
    if (ano) updates.student_year = ano
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true })

  const admin = createAdminClient()
  const { error } = await admin.from('exam_submissions').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
