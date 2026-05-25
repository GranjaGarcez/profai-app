import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET público — o aluno usa este endpoint para carregar o teste pelo código
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const supabase = createAdminClient()

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('id, title, status, duration_minutes, test_snapshot, access_code')
    .eq('access_code', code.toUpperCase())
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'Código inválido ou exame não encontrado.' }, { status: 404 })
  }

  if (session.status !== 'active') {
    return NextResponse.json({ error: 'Este exame já foi encerrado.' }, { status: 410 })
  }

  return NextResponse.json({ session })
}
