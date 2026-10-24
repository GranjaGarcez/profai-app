// Reatribuir manualmente a turma (e ano) de uma submissão. Não toca nas respostas
// nem na correcção — só na identificação de turma, para o professor arrumar quem o
// aluno escreveu mal. Normaliza o que receber.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canonicalTurma } from '@/lib/exam/turma'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { ano: anoRaw, turma: turmaRaw } = await request.json()

  // Propriedade via sessão
  const { data: sub } = await supabase
    .from('exam_submissions')
    .select('id, session_id')
    .eq('id', id)
    .single()
  if (!sub) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  const { data: sess } = await supabase
    .from('exam_sessions')
    .select('teacher_id')
    .eq('id', sub.session_id)
    .single()
  if (!sess || sess.teacher_id !== user.id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { ano, turma } = canonicalTurma(anoRaw, turmaRaw, Number(anoRaw) || null)
  if (!turma) return NextResponse.json({ error: 'Indica a turma.' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('exam_submissions')
    .update({ student_class: turma, student_year: ano })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Garante que a turma existe na lista do professor (não crítico)
  try {
    if (turma) await admin.from('turmas').upsert(
      { teacher_id: user.id, nome: turma, ano },
      { onConflict: 'teacher_id,ano,nome', ignoreDuplicates: true },
    )
  } catch { /* não crítico */ }

  return NextResponse.json({ ok: true, ano, turma })
}
