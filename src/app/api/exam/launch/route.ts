import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Gera código de acesso: 6 chars sem caracteres ambíguos
function generateCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { contentItemId, durationMinutes } = await request.json()

  // Fetch do item de conteúdo (snapshot do teste)
  const { data: item, error: itemErr } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', contentItemId)
    .eq('teacher_id', user.id)
    .single()

  if (itemErr || !item) {
    return NextResponse.json({ error: 'Teste não encontrado' }, { status: 404 })
  }

  // Gera código único (retry até 5 vezes)
  let code = ''
  for (let i = 0; i < 5; i++) {
    code = generateCode()
    const { data: existing } = await supabase
      .from('exam_sessions')
      .select('id')
      .eq('access_code', code)
      .maybeSingle()
    if (!existing) break
  }

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .insert({
      teacher_id:      user.id,
      content_item_id: contentItemId,
      access_code:     code,
      title:           item.title,
      status:          'active',
      duration_minutes: durationMinutes ?? null,
      test_snapshot:   item.content,
    })
    .select('id, access_code')
    .single()

  if (error) {
    console.error('Erro ao criar sessão:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sessionId: session.id, code: session.access_code })
}
