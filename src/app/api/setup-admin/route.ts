import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Rota de uso único para criar o utilizador administrador confirmado.
// Protegida por SETUP_TOKEN (env var). Desactivar após uso em produção.
export async function POST(request: NextRequest) {
  const setupToken = process.env.SETUP_TOKEN
  if (!setupToken) {
    return NextResponse.json({ error: 'SETUP_TOKEN não configurado.' }, { status: 403 })
  }

  let body: { token?: string; email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  if (body.token !== setupToken) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 403 })
  }

  const email = body.email?.trim()
  const password = body.password

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: 'Email e password (mín. 8 caracteres) obrigatórios.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verificar se o utilizador já existe
  const { data: existing } = await supabase.auth.admin.listUsers()
  const exists = existing?.users?.find(u => u.email === email)

  if (exists) {
    // Actualizar password e confirmar email se ainda não estiver confirmado
    const { error } = await supabase.auth.admin.updateUserById(exists.id, {
      password,
      email_confirm: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, action: 'updated', message: 'Utilizador actualizado e confirmado.' })
  }

  // Criar novo utilizador confirmado (sem precisar de email)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'admin', name: 'Administrador' },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    action: 'created',
    message: 'Utilizador criado com sucesso. Podes entrar em /login.',
    user_id: data.user.id,
  })
}
