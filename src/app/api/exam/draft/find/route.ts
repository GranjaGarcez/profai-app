// Procurar um rascunho de prova em curso pela identidade do aluno (para retomar
// noutro dispositivo). Público; identidade vai no corpo (nunca no URL).
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { studentKey } from '../route'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const body = await request.json().catch(() => null)
  if (!body?.code || !String(body.name ?? '').trim()) {
    return NextResponse.json({ draft: null })
  }

  const { data: session } = await supabase
    .from('exam_sessions')
    .select('id, status')
    .eq('access_code', String(body.code).toUpperCase())
    .single()
  if (!session || session.status !== 'active') return NextResponse.json({ draft: null })

  const key = studentKey(body.name, body.year, body.studentClass, body.number)
  const { data: draft } = await supabase
    .from('exam_drafts')
    .select('answers, calc, deadline, student_name, student_number, student_class, student_year')
    .eq('session_id', session.id)
    .eq('student_key', key)
    .maybeSingle()

  if (!draft || !draft.answers || Object.keys(draft.answers as object).length === 0) {
    return NextResponse.json({ draft: null })
  }
  return NextResponse.json({ draft })
}
