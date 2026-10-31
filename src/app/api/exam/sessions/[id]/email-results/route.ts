// Enviar a correcção por email aos alunos que forneceram email — só depois de o
// professor ter divulgado os resultados. Usa a API da Resend via fetch (sem SDK).
// Requer as variáveis de ambiente RESEND_API_KEY e EXAM_EMAIL_FROM.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseIntegrity } from '@/lib/exam/integrity'
import { turmaLabel as turmaLabelOf } from '@/lib/exam/turma'
import type { TestSnapshot } from '@/lib/exam/types'

export const runtime = 'nodejs'
export const maxDuration = 120

function esc(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EXAM_EMAIL_FROM
  if (!apiKey || !from) {
    return NextResponse.json({ error: 'Envio de email não configurado. Falta RESEND_API_KEY e/ou EXAM_EMAIL_FROM no ambiente.' }, { status: 503 })
  }

  const turma = req.nextUrl.searchParams.get('turma')?.trim() || null

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('id, title, results_released, test_snapshot')
    .eq('id', id)
    .eq('teacher_id', user.id)
    .single()
  if (error || !session) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })

  const admin = createAdminClient()
  const fallbackYear = (session.test_snapshot as TestSnapshot)?.yearLevel ?? null
  const { data: subs } = await admin
    .from('exam_submissions')
    .select('id, student_name, student_email, total_score, max_score, status, student_year, student_class, answers')
    .eq('session_id', id)
    .in('status', ['graded', 'reviewed'])

  // Divulgado para este aluno? Sessão global OU marcador por submissão; retido/oculto não envia.
  const isReleased = (answers: Record<string, string>) => {
    const integ = parseIntegrity(answers)
    if (integ?.held && !integ?.cleared) return false
    if (integ?.released === false) return false
    return !!session.results_released || integ?.released === true
  }

  const recipients = (subs ?? []).filter(s => {
    if (!(typeof s.student_email === 'string' && s.student_email.includes('@'))) return false
    if (!isReleased((s.answers ?? {}) as Record<string, string>)) return false
    if (turma && turmaLabelOf(s.student_year, s.student_class, fallbackYear) !== turma) return false
    return true
  })
  if (!recipients.length) {
    return NextResponse.json({ sent: 0, skipped: 0, message: turma
      ? `Nenhum aluno com email corrigido e divulgado na turma ${turma}. Divulga a turma primeiro.`
      : 'Nenhum aluno com email corrigido e divulgado. Divulga os resultados primeiro.' })
  }

  const origin = req.nextUrl.origin
  const title = String(session.title)

  const results = await Promise.allSettled(recipients.map(async s => {
    const link = `${origin}/exam/resultado/${s.id}`
    const score = s.total_score ?? 0
    const max = s.max_score ?? 100
    const html = `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#0D1B2A">
        <h2 style="margin:0 0 8px">${esc(title)}</h2>
        <p style="color:#374151">Olá ${esc(String(s.student_name ?? ''))}, a tua prova já está corrigida.</p>
        <p style="font-size:26px;font-weight:800;margin:10px 0">${score} <span style="color:#9CA3AF;font-size:16px">/ ${max}</span></p>
        <p style="color:#374151">Vê a correcção completa, pergunta a pergunta:</p>
        <p><a href="${link}" style="display:inline-block;background:#00B4D8;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-family:Arial,sans-serif">Ver a minha correcção</a></p>
        <p style="color:#9CA3AF;font-size:12px;margin-top:18px">PROF.IA · ${esc(link)}</p>
      </div>`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: s.student_email, subject: `Correcção — ${title}`, html }),
    })
    if (!res.ok) throw new Error(`Resend ${res.status}`)
  }))

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.length - sent
  return NextResponse.json({ sent, failed, total: recipients.length })
}
