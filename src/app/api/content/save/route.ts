import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Garante que o perfil existe (protege contra utilizadores criados antes do trigger)
  await supabase.from('profiles').upsert(
    { id: user.id, email: user.email, role: 'teacher', country_code: 'PT', plan: 'free' },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  const body = await request.json()
  const { type, content } = body
  const c = content as Record<string, unknown>

  const { data, error } = await supabase.from('content_items').insert({
    teacher_id: user.id,
    type: type ?? 'test',
    title: (c?.title as string) ?? 'Sem título',
    subject: (c?.subject as string) ?? null,
    year_level: (c?.yearLevel as number) ?? null,
    country_code: (c?.countryCode as string) ?? 'PT',
    topic: (c?.topic as string) ?? null,
    content: c,
    is_public: false,
    tags: [],
  }).select('id').single()

  if (error) {
    console.error('Erro ao guardar conteúdo:', error.message, error.code, error.details)
    return NextResponse.json({ error: error.message ?? 'Erro desconhecido' }, { status: 500 })
  }

  return NextResponse.json({ id: data?.id })
}
