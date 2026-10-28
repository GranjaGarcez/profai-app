// Análise dedicada ao USO DA LÍNGUA (pós-correcção, accionada pelo professor).
// Corre sobre as submissões já corrigidas, diagnostica a escrita por categorias
// (quantificado), aponta virtudes e recomendações coerentes com o desempenho, e
// sinaliza escrita pouco fidedigna. NÃO altera notas. Guarda em answers.__integrity.language.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllQuestions } from '@/lib/exam/types'
import type { TestSnapshot } from '@/lib/exam/types'
import { analyzeLanguage } from '@/lib/exam/language'
import { withIntegrity, parseIntegrity } from '@/lib/exam/integrity'

export const runtime = 'nodejs'
export const maxDuration = 300

const OPEN = new Set(['short_answer', 'long_answer', 'fill_blank'])

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: session, error } = await supabase
    .from('exam_sessions').select('id, test_snapshot').eq('id', id).eq('teacher_id', user.id).single()
  if (error || !session) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })

  const snapshot = session.test_snapshot as TestSnapshot
  if (!getAllQuestions(snapshot).some(q => OPEN.has(q.type))) {
    return NextResponse.json({ analysed: 0, message: 'Este teste não tem perguntas de resposta aberta para analisar a escrita.' })
  }

  const { data: subs } = await supabase
    .from('exam_submissions')
    .select('id, answers, total_score, max_score')
    .eq('session_id', id)
    .in('status', ['graded', 'reviewed', 'por_corrigir'])

  const toCheck = subs ?? []
  const admin = createAdminClient()
  let analysed = 0, suspeitas = 0, semTexto = 0

  for (const sub of toCheck) {
    const answers = (sub.answers ?? {}) as Record<string, string>
    const pct = typeof sub.total_score === 'number' && typeof sub.max_score === 'number' && sub.max_score > 0
      ? Math.round(100 * sub.total_score / sub.max_score) : undefined
    const result = await analyzeLanguage(snapshot, answers, { pct })
    if (!result) continue

    // Reforça a fidedignidade com os indícios de conteúdo (cópia/IA) já existentes.
    const contentFlags = (parseIntegrity(answers)?.contentFlags ?? [])
    if (result.reliability === 'ok' && contentFlags.some(f => f.level !== 'ok')) {
      result.reliability = 'suspeita'
      result.reliabilityReason = 'A análise de conteúdo assinalou vocabulário/conteúdo acima do ano ou fora do tema.'
    }

    const merged = withIntegrity(answers, { language: result })
    try {
      await admin.from('exam_submissions').update({ answers: merged }).eq('id', sub.id)
      analysed++
      if (result.reliability === 'suspeita') suspeitas++
      if (result.wordCount < 8) semTexto++
    } catch (e) {
      console.error('[PROFAI] lang-check: falha ao guardar para', sub.id, e)
    }
  }

  return NextResponse.json({ analysed, suspeitas, semTexto, total: toCheck.length })
}
