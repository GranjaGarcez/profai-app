import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { encryptSecret, isEncryptionConfigured } from '@/lib/crypto'
import { PROVIDER_CATALOG, isProviderId, validateKey, type ProviderId } from '@/lib/ai/personal'

// Estado das chaves pessoais do professor. O texto cifrado NUNCA sai daqui —
// devolvemos só fornecedor, modelo, estado e os últimos 4 caracteres.
interface KeyView {
  provider: ProviderId
  model: string
  enabled: boolean
  last4: string
  lastOkAt: string | null
  lastError: string | null
}

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET — lista as chaves do professor (mascaradas) + catálogo de fornecedores
export async function GET() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const catalog = Object.fromEntries(
    Object.entries(PROVIDER_CATALOG).map(([id, s]) => [id, { label: s.label, defaultModel: s.defaultModel, keyHint: s.keyHint, keyUrl: s.keyUrl }])
  )
  if (!isEncryptionConfigured()) {
    return NextResponse.json({ configured: false, keys: [], catalog })
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('user_api_keys')
    .select('provider, model, enabled, key_last4, last_ok_at, last_error')
    .eq('user_id', user.id)

  const keys: KeyView[] = (data ?? [])
    .filter(r => isProviderId(r.provider))
    .map(r => ({
      provider: r.provider as ProviderId,
      model: String(r.model),
      enabled: Boolean(r.enabled),
      last4: String(r.key_last4 ?? ''),
      lastOkAt: (r.last_ok_at as string) ?? null,
      lastError: (r.last_error as string) ?? null,
    }))
  return NextResponse.json({ configured: true, keys, catalog })
}

// POST — adiciona/actualiza uma chave: valida com uma chamada real antes de guardar cifrada
export async function POST(request: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!isEncryptionConfigured()) {
    return NextResponse.json({ error: 'Servidor sem cifra configurada (API_KEY_ENCRYPTION_SECRET). Contacta o administrador.' }, { status: 503 })
  }

  let body: { provider?: unknown; model?: unknown; apiKey?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const provider = body.provider
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  if (!isProviderId(provider)) return NextResponse.json({ error: 'Fornecedor inválido' }, { status: 400 })
  if (apiKey.length < 12) return NextResponse.json({ error: 'Chave demasiado curta' }, { status: 400 })
  const model = (typeof body.model === 'string' && body.model.trim()) || PROVIDER_CATALOG[provider].defaultModel

  // Valida antes de guardar — não gravamos chaves que não funcionam
  const test = await validateKey(provider, model, apiKey)
  if (!test.ok) return NextResponse.json({ error: `Ligação falhou: ${test.error}` }, { status: 400 })

  const admin = createAdminClient()
  // Uma chave activa de cada vez: desliga as outras deste professor
  await admin.from('user_api_keys').update({ enabled: false }).eq('user_id', user.id)
  const { error } = await admin.from('user_api_keys').upsert({
    user_id: user.id,
    provider,
    model,
    key_ciphertext: encryptSecret(apiKey),
    key_last4: apiKey.slice(-4),
    enabled: true,
    last_ok_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,provider' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  console.log(`[BYOK] ${user.id} ligou ${provider} (${model})`)
  return NextResponse.json({ ok: true })
}

// PATCH — liga/desliga o modelo pessoal { provider, enabled }
export async function PATCH(request: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: { provider?: unknown; enabled?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  if (!isProviderId(body.provider)) return NextResponse.json({ error: 'Fornecedor inválido' }, { status: 400 })
  const enabled = body.enabled === true

  const admin = createAdminClient()
  if (enabled) await admin.from('user_api_keys').update({ enabled: false }).eq('user_id', user.id)
  const { error } = await admin.from('user_api_keys')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('user_id', user.id).eq('provider', body.provider)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — remove a chave de um fornecedor (?provider=)
export async function DELETE(request: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const provider = new URL(request.url).searchParams.get('provider')
  if (!isProviderId(provider)) return NextResponse.json({ error: 'Fornecedor inválido' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('user_api_keys').delete().eq('user_id', user.id).eq('provider', provider)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
