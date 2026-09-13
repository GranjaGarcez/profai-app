// Chave de API pessoal do professor ("traz a tua própria chave").
// Um professor com crédito de API (Anthropic, Google ou OpenAI) usa o SEU modelo de
// topo para os seus testes. Estas funções resolvem a chave (decifrada, só server-side)
// num Provider de Tier 0 para a cascade, e validam a chave antes de guardar.
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret, isEncryptionConfigured } from '@/lib/crypto'
import { callOpenAICompat, callAnthropicMessages, FALLBACK_SYSTEM_ENHANCED, type Provider } from '@/lib/ai/cascade'

export type ProviderId = 'anthropic' | 'google' | 'openai'

interface ProviderSpec {
  label: string
  /** Endpoint compatível-OpenAI; ignorado para a Anthropic (usa a Messages API nativa). */
  url: string
  dialect: 'openai' | 'anthropic'
  defaultModel: string
  /** Como o professor obtém a chave (mostrado na UI). */
  keyHint: string
  keyUrl: string
}

// Modelos de topo por defeito (o professor pode escrever outro; a validação confirma-o).
export const PROVIDER_CATALOG: Record<ProviderId, ProviderSpec> = {
  anthropic: {
    label: 'Anthropic (Claude)',
    url: 'https://api.anthropic.com/v1/messages',
    dialect: 'anthropic',
    defaultModel: 'claude-sonnet-5',
    keyHint: 'Chave sk-ant-… com crédito de API (não é o plano Pro do site).',
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
  google: {
    label: 'Google (Gemini)',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    dialect: 'openai',
    defaultModel: 'gemini-2.5-pro',
    keyHint: 'Chave da Google AI Studio — tira o tecto da quota gratuita partilhada.',
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  openai: {
    label: 'OpenAI (GPT)',
    url: 'https://api.openai.com/v1/chat/completions',
    dialect: 'openai',
    defaultModel: 'gpt-5',
    keyHint: 'Chave sk-… com crédito de API (não é o ChatGPT Plus).',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
}

export function isProviderId(v: unknown): v is ProviderId {
  return v === 'anthropic' || v === 'google' || v === 'openai'
}

export interface UserKeyRow {
  provider: ProviderId
  model: string
  key_ciphertext: string
  enabled: boolean
}

// Constrói um Provider de Tier 0 a partir de uma chave (já em texto simples).
export function personalProvider(provider: ProviderId, model: string, apiKey: string): Provider {
  const spec = PROVIDER_CATALOG[provider]
  return {
    id: `personal-${provider}`,
    label: `${spec.label} · ${model}`,
    url: spec.url,
    key: apiKey,
    model,
    tier: 0,
    dialect: spec.dialect,
    timeoutMs: 45_000,
    maxTokens: 4_000,
    maxTokensSingle: 8_000,
    system: FALLBACK_SYSTEM_ENHANCED,
    slots: 99, // gera todos os blocos de um teste
  }
}

// Lê a chave activa do professor e devolve-a como Provider de Tier 0 (ou null).
// Falhas de decifra/configuração nunca rebentam a geração — devolvem null.
export async function resolvePersonalProvider(userId: string): Promise<Provider | null> {
  if (!isEncryptionConfigured()) return null
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('user_api_keys')
      .select('provider, model, key_ciphertext, enabled')
      .eq('user_id', userId)
      .eq('enabled', true)
      .maybeSingle()
    if (!data || !isProviderId(data.provider)) return null
    const apiKey = decryptSecret(data.key_ciphertext as string)
    return personalProvider(data.provider, String(data.model), apiKey)
  } catch (err) {
    console.warn('[BYOK] resolvePersonalProvider falhou:', err instanceof Error ? err.message : err)
    return null
  }
}

// Valida uma chave com uma chamada real e barata antes de a guardar.
// Devolve { ok, error? } — nunca lança.
export async function validateKey(provider: ProviderId, model: string, apiKey: string): Promise<{ ok: boolean; error?: string }> {
  const spec = PROVIDER_CATALOG[provider]
  // A sonda tem de gerar >50 caracteres: callOpenAICompat trata respostas curtas como
  // falha, o que dava falso-negativo com uma chave válida a responder só "OK".
  const probe = 'Escreve uma frase completa, em português de Portugal, a confirmar que estás operacional e pronto a gerar questões de avaliação.'
  let status = 0
  const onErr = (s: number) => { status = s }
  try {
    // 256 tokens: folga para modelos com raciocínio (evita content vazio por budget curto)
    const text = spec.dialect === 'anthropic'
      ? await callAnthropicMessages(apiKey, model, probe, 25_000, `BYOK:test:${provider}`, null, 256, onErr)
      : await callOpenAICompat(spec.url, apiKey, model, probe, 25_000, `BYOK:test:${provider}`, {}, null, 256, {}, onErr)
    if (text) return { ok: true }
    const byStatus: Record<number, string> = {
      401: 'Chave inválida ou sem autorização.',
      403: 'Chave sem permissão para este modelo.',
      404: `O modelo "${model}" não existe para esta chave. Confirma o nome do modelo.`,
      429: 'Sem crédito de API ou limite atingido neste momento.',
    }
    return { ok: false, error: byStatus[status] ?? 'A chave não respondeu. Confirma a chave, o modelo e o crédito de API.' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao contactar o fornecedor.' }
  }
}
