// Divulgar / ocultar os resultados aos alunos (interruptor do professor).
// Ao DIVULGAR, as submissões com fortes indícios de plágio/batota ficam RETIDAS
// automaticamente (o aluno não as vê) até o professor as certificar — liberta-se só o
// resto. Não retém as que o professor já certificou (`cleared`).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseIntegrity, withIntegrity, strongSuspicion } from '@/lib/exam/integrity'

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

  const admin = createAdminClient()
  const { error: updErr } = await admin
    .from('exam_sessions')
    .update({ results_released: !!released, results_released_at: released ? new Date().toISOString() : null })
    .eq('id', id)
  if (updErr) return NextResponse.json({ error: 'Não foi possível actualizar. A migração já foi aplicada?' }, { status: 500 })

  // Ao divulgar, retém automaticamente os suspeitos ainda não certificados.
  let held = 0, freed = 0
  if (released) {
    const { data: subs } = await admin
      .from('exam_submissions').select('id, answers').eq('session_id', id)
    for (const sub of subs ?? []) {
      const answers = (sub.answers ?? {}) as Record<string, string>
      const rec = parseIntegrity(answers)
      if (rec?.cleared) { freed++; continue }                 // certificado pelo prof → liberta
      const { suspect } = strongSuspicion(rec)
      if (suspect) {
        if (!rec?.held) {
          try { await admin.from('exam_submissions').update({ answers: withIntegrity(answers, { held: true }) }).eq('id', sub.id) } catch { /* best-effort */ }
        }
        held++
      } else freed++
    }
  }

  return NextResponse.json({ released: !!released, held, freed })
}
