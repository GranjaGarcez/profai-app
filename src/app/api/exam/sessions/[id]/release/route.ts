// Divulgar / ocultar os resultados aos alunos (interruptor do professor).
// • Sem `turma` → interruptor GLOBAL da sessão (comportamento original, intacto):
//   liga/desliga `results_released`. Ao DIVULGAR, as submissões com fortes indícios
//   de plágio/batota ficam RETIDAS automaticamente (o aluno não as vê) até o
//   professor as certificar — liberta-se só o resto.
// • Com `turma` → divulgação POR TURMA (aditivo, zero migração): marca `released`
//   em cada submissão dessa turma (dentro de `answers.__integrity`), sem mexer no
//   interruptor global. A porta do resultado do aluno passa a abrir se a sessão
//   estiver divulgada OU se a própria submissão estiver marcada como libertada.
//   A mesma lógica de retenção de suspeitos aplica-se à turma.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseIntegrity, withIntegrity, strongSuspicion } from '@/lib/exam/integrity'
import { turmaLabel as turmaLabelOf } from '@/lib/exam/turma'
import type { TestSnapshot } from '@/lib/exam/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({ released: true })) as { released?: boolean; turma?: string }
  const released = body?.released !== false
  const turma = typeof body?.turma === 'string' && body.turma.trim() ? body.turma.trim() : null

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('id, test_snapshot')
    .eq('id', id)
    .eq('teacher_id', user.id)
    .single()
  if (error || !session) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })

  const admin = createAdminClient()
  const fallbackYear = (session.test_snapshot as TestSnapshot)?.yearLevel ?? null

  // ── Divulgação POR TURMA (não toca no interruptor global) ──
  if (turma) {
    const { data: subs } = await admin
      .from('exam_submissions')
      .select('id, answers, student_year, student_class')
      .eq('session_id', id)
    let held = 0, freed = 0, hidden = 0
    for (const sub of subs ?? []) {
      if (turmaLabelOf(sub.student_year, sub.student_class, fallbackYear) !== turma) continue
      const answers = (sub.answers ?? {}) as Record<string, string>
      const rec = parseIntegrity(answers)
      if (!released) {
        // Ocultar esta turma: marca a submissão como não-libertada.
        try { await admin.from('exam_submissions').update({ answers: withIntegrity(answers, { released: false }) }).eq('id', sub.id) } catch { /* best-effort */ }
        hidden++
        continue
      }
      // Divulgar esta turma: suspeito por certificar → retém; resto → liberta.
      const { suspect } = strongSuspicion(rec)
      if (suspect && !rec?.cleared) {
        try { await admin.from('exam_submissions').update({ answers: withIntegrity(answers, { released: true, held: true }) }).eq('id', sub.id) } catch { /* best-effort */ }
        held++
      } else {
        try { await admin.from('exam_submissions').update({ answers: withIntegrity(answers, { released: true }) }).eq('id', sub.id) } catch { /* best-effort */ }
        freed++
      }
    }
    return NextResponse.json({ released, turma, held, freed, hidden })
  }

  // ── Interruptor GLOBAL da sessão (comportamento original) ──
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
