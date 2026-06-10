import { NextRequest, NextResponse } from 'next/server'

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({
      error: 'Variáveis Supabase em falta no servidor.',
      missing: {
        NEXT_PUBLIC_SUPABASE_URL: !supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: !serviceKey,
      }
    }, { status: 500 })
  }

  // Usar REST API directamente — mais robusto que o SDK em alguns ambientes
  const adminUrl = `${supabaseUrl}/auth/v1/admin/users`
  const headers = {
    'Content-Type': 'application/json',
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
  }

  // Verificar se utilizador já existe
  const listRes = await fetch(adminUrl, { headers })
  if (!listRes.ok) {
    const txt = await listRes.text()
    return NextResponse.json({ error: `Falha ao listar utilizadores: ${listRes.status} ${txt}` }, { status: 500 })
  }

  const { users } = await listRes.json() as { users: Array<{ id: string; email: string }> }
  const existing = users?.find(u => u.email === email)

  if (existing) {
    // Actualizar password e confirmar
    const updateRes = await fetch(`${adminUrl}/${existing.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ password, email_confirm: true }),
    })
    if (!updateRes.ok) {
      const txt = await updateRes.text()
      return NextResponse.json({ error: `Falha ao actualizar: ${updateRes.status} ${txt}` }, { status: 500 })
    }
    return NextResponse.json({ ok: true, action: 'updated', message: 'Conta actualizada e confirmada. Podes entrar em /login.' })
  }

  // Criar utilizador novo confirmado
  const createRes = await fetch(adminUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin' },
    }),
  })

  if (!createRes.ok) {
    const txt = await createRes.text()
    return NextResponse.json({ error: `Falha ao criar: ${createRes.status} ${txt}` }, { status: 500 })
  }

  const created = await createRes.json() as { id: string }
  return NextResponse.json({
    ok: true,
    action: 'created',
    message: 'Conta criada com sucesso. Podes entrar em /login.',
    user_id: created.id,
  })
}
