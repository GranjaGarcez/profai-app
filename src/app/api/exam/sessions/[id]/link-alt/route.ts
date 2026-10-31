// Ligar/desligar TESTES ALTERNATIVOS (de medida) do mesmo momento de avaliação a
// esta sessão. Guarda os ids das outras sessões em `test_snapshot._altSessions` da
// sessão PRINCIPAL (zero migração, aditivo). Só liga — não toca nas submissões nem
// na correção. Valida que cada sessão alternativa pertence ao mesmo professor.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TestSnapshot } from '@/lib/exam/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null) as { altSessionIds?: unknown } | null
  const raw = Array.isArray(body?.altSessionIds) ? body!.altSessionIds : []
  const wanted = Array.from(new Set(raw.map(String).filter(Boolean))).filter(x => x !== id)

  const { data: session, error } = await supabase
    .from('exam_sessions').select('id, test_snapshot').eq('id', id).eq('teacher_id', user.id).single()
  if (error || !session) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })

  // Só aceita ids de sessões que também são deste professor.
  let valid: string[] = []
  if (wanted.length) {
    const { data: owned } = await supabase
      .from('exam_sessions').select('id').eq('teacher_id', user.id).in('id', wanted)
    const ownedSet = new Set((owned ?? []).map(s => s.id as string))
    valid = wanted.filter(x => ownedSet.has(x))
  }

  const snapshot = { ...(session.test_snapshot as TestSnapshot) }
  if (valid.length) snapshot._altSessions = valid
  else delete snapshot._altSessions

  const admin = createAdminClient()
  const { error: upErr } = await admin.from('exam_sessions').update({ test_snapshot: snapshot }).eq('id', id)
  if (upErr) return NextResponse.json({ error: `Não foi possível guardar a ligação: ${upErr.message}` }, { status: 500 })

  return NextResponse.json({ ok: true, altSessions: valid })
}
