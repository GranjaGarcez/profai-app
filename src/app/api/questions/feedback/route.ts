import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/questions/feedback
 * Body: { questionId: string, vote: 1 | -1 }
 *
 * Regista o voto do professor (👍 = 1, 👎 = -1) e actualiza quality_score
 * via função SQL atómica `apply_question_vote`.
 *
 * Regras:
 *   - Um professor só pode votar uma vez por questão (voto substitui anterior)
 *   - 👍 → quality_score + 0.05 (max 1.0)
 *   - 👎 → quality_score − 0.10 (min 0.0)
 *   - Mudança de voto: efeito anterior é desfeito antes de aplicar novo
 */
export async function POST(request: NextRequest) {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Validar corpo
  let body: { questionId?: string; vote?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { questionId, vote } = body
  if (!questionId || typeof questionId !== 'string') {
    return NextResponse.json({ error: 'questionId obrigatório' }, { status: 400 })
  }
  if (vote !== 1 && vote !== -1) {
    return NextResponse.json({ error: 'vote deve ser 1 ou -1' }, { status: 400 })
  }

  // Invocar função atómica via admin client (bypass RLS)
  const admin = createAdminClient()
  const { data: newScore, error } = await admin.rpc('apply_question_vote', {
    p_question_id: questionId,
    p_teacher_id:  user.id,
    p_vote:        vote as 1 | -1,
  })

  if (error) {
    console.error('[FEEDBACK] apply_question_vote falhou:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[FEEDBACK] ${vote === 1 ? '👍' : '👎'} questão ${questionId} → quality_score: ${newScore}`)
  return NextResponse.json({ ok: true, newQualityScore: newScore as number })
}
