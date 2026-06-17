import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const c = body.content as Record<string, unknown>
  if (!c) return NextResponse.json({ error: 'content obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('content_items')
    .update({
      title:      (c.title as string)     ?? undefined,
      subject:    (c.subject as string)   ?? undefined,
      year_level: (c.yearLevel as number) ?? undefined,
      topic:      (c.topic as string)     ?? undefined,
      content:    c,
    })
    .eq('id', id)
    .eq('teacher_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
