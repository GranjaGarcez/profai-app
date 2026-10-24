// Gravar/actualizar o rascunho de uma prova em curso (público, aluno sem conta).
// Um por (sessão, aluno). Permite retomar noutro dispositivo. Não corrige nada.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canonicalTurma } from '@/lib/exam/turma'

export function studentKey(name: unknown, year: unknown, cls: unknown, number: unknown): string {
  const { ano, turma } = canonicalTurma(year, cls, null)
  const n = String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  const num = String(number ?? '').trim()
  return `${n}|${ano ?? ''}${turma}|${num}`
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })

  const { code, name, number, studentClass, year, answers, calc, deadline } = body
  if (!code || !String(name ?? '').trim()) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // Sessão activa pelo código
  const { data: session } = await supabase
    .from('exam_sessions')
    .select('id, status')
    .eq('access_code', String(code).toUpperCase())
    .single()
  if (!session) return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
  if (session.status !== 'active') return NextResponse.json({ error: 'Exame encerrado' }, { status: 410 })

  const key = studentKey(name, year, studentClass, number)
  const { ano } = canonicalTurma(year, studentClass, null)

  const { error } = await supabase.from('exam_drafts').upsert({
    session_id:     session.id,
    student_key:    key,
    student_name:   String(name).trim(),
    student_number: String(number ?? '').trim() || null,
    student_class:  String(studentClass ?? '').trim() || null,
    student_year:   ano,
    answers:        answers ?? {},
    calc:           calc ?? {},
    deadline:       typeof deadline === 'number' ? deadline : null,
    updated_at:     new Date().toISOString(),
  }, { onConflict: 'session_id,student_key' })

  if (error) {
    // Migração ainda não aplicada? Não rebenta — o localStorage continua a cobrir.
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 })
  }
  return NextResponse.json({ ok: true })
}
