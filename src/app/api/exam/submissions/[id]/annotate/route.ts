// Anotar uma resposta já corrigida: comentário do professor ao aluno e/ou destaque
// (⭐ exemplar / ⚠ falha reveladora). NÃO altera a nota, o estado, nem o marcador de
// revisão manual — é só uma nota pedagógica em cima da correção. Aditivo.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllQuestions } from '@/lib/exam/types'
import type { TestSnapshot, GradingDetail } from '@/lib/exam/types'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => null) as
    | { questionKey?: string | number; comment?: string; highlight?: string | null } | null
  const questionKey = body?.questionKey != null ? String(body.questionKey) : ''
  if (!questionKey) return NextResponse.json({ error: 'Pergunta não indicada.' }, { status: 400 })

  const { data: sub, error: fErr } = await supabase
    .from('exam_submissions').select('id, session_id, grading_details').eq('id', id).single()
  if (fErr || !sub) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  const { data: sess } = await supabase
    .from('exam_sessions').select('teacher_id, test_snapshot').eq('id', sub.session_id).single()
  if (!sess || sess.teacher_id !== user.id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const details = (sub.grading_details ?? {}) as Record<string, GradingDetail>
  const qMax = getAllQuestions(sess.test_snapshot as TestSnapshot).find(q => String(q.index) === questionKey)?.points ?? 0
  const base: GradingDetail = details[questionKey] ?? { score: 0, max: qMax, feedback: '', auto: true }

  const next: GradingDetail = { ...base }
  if (body?.comment !== undefined) {
    const c = String(body.comment).trim()
    if (c) next.teacherComment = c.slice(0, 600); else delete next.teacherComment
  }
  if (body?.highlight !== undefined) {
    next.highlight = body.highlight === 'exemplar' || body.highlight === 'falha' ? body.highlight : undefined
    if (!next.highlight) delete next.highlight
  }
  details[questionKey] = next

  const admin = createAdminClient()
  const { error } = await admin.from('exam_submissions').update({ grading_details: details }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
