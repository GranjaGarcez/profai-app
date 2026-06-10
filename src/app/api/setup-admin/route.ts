import { NextRequest, NextResponse } from 'next/server'

// GET: diagnóstico de vars (sem dados sensíveis)
export async function GET() {
  return NextResponse.json({
    SETUP_TOKEN: !!process.env.SETUP_TOKEN,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabase_url_value: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
  })
}

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

  try {
    const adminUrl = `${supabaseUrl}/auth/v1/admin/users`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    }

    // Verificar se utilizador já existe
    const listRes = await fetch(adminUrl, { headers })
    const listText = await listRes.text()
    if (!listRes.ok) {
      return NextResponse.json({ error: `listUsers ${listRes.status}`, detail: listText }, { status: 500 })
    }

    let users: Array<{ id: string; email: string }> = []
    try {
      const parsed = JSON.parse(listText)
      users = parsed.users ?? parsed ?? []
    } catch {
      return NextResponse.json({ error: 'JSON inválido de listUsers', raw: listText.slice(0, 200) }, { status: 500 })
    }

    const existing = users.find(u => u.email === email)

    if (existing) {
      const updateRes = await fetch(`${adminUrl}/${existing.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ password, email_confirm: true }),
      })
      const updateText = await updateRes.text()
      if (!updateRes.ok) {
        return NextResponse.json({ error: `updateUser ${updateRes.status}`, detail: updateText }, { status: 500 })
      }
      return NextResponse.json({ ok: true, action: 'updated', message: 'Conta actualizada e confirmada. Podes entrar em /login.' })
    }

    const createRes = await fetch(adminUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { role: 'admin' } }),
    })
    const createText = await createRes.text()
    if (!createRes.ok) {
      return NextResponse.json({ error: `createUser ${createRes.status}`, detail: createText }, { status: 500 })
    }

    const created = JSON.parse(createText) as { id: string }
    return NextResponse.json({
      ok: true,
      action: 'created',
      message: 'Conta criada com sucesso. Podes entrar em /login.',
      user_id: created.id,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Excepção não tratada', detail: String(e) }, { status: 500 })
  }
}
