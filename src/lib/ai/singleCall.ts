import {
  buildProviders,
  callOpenAICompat,
  parseJsonObject,
  family,
  onCooldown,
  markCooldown,
} from './cascade'

type Provider = ReturnType<typeof buildProviders>[number]

/**
 * PROF.IA — Chamada única de IA que devolve UM objecto JSON.
 *
 * Para ferramentas que não são a geração de um teste inteiro (gerar/regenerar
 * uma questão, actualizar critérios). Reutiliza a cascata validada em cascade.ts
 * em vez de um par Gemini+modelo-morto ad-hoc:
 *   Gemini 2.5 Flash (3 chaves, THINKING DESLIGADO por defeito → não trunca o JSON)
 *   → Groq gpt-oss-20b/120b (reasoning_effort: low) → Cloudflare llama-70b → reservas.
 *
 * O `llama-3.3-70b-versatile` da Groq (usado antes aqui) está morto — era por isso
 * que a geração de questões, sobretudo escolha múltipla (JSON maior), falhava quando
 * o Gemini truncava ou atingia o limite.
 *
 * Devolve o objecto JSON, ou null se toda a cascata falhar.
 */
export async function callJsonCascade(
  prompt: string,
  opts: { maxTokens?: number; timeoutMs?: number } = {},
): Promise<Record<string, unknown> | null> {
  const maxTokens = opts.maxTokens ?? 3_000
  const timeoutMs = opts.timeoutMs ?? 20_000

  const providers = buildProviders().filter(p => !onCooldown(p))
  const byId = (id: string) => providers.find(p => p.id === id)

  // Ordem: Gemini (todas as chaves) → gpt-oss-20b → gpt-oss-120b → Cloudflare →
  // e, por fim, quaisquer reservas restantes (gemma/mistral/nemotron).
  const ordered: Provider[] = [
    ...providers.filter(p => family(p) === 'gemini'),
    byId('groq-gpt-oss-20b'),
    byId('groq-gpt-oss-120b'),
    byId('cf-llama-3.3-70b'),
  ].filter((p): p is Provider => !!p)
  for (const p of providers) if (!ordered.includes(p)) ordered.push(p)

  for (const p of ordered) {
    const raw = await callOpenAICompat(
      p.url, p.key, p.model, prompt, timeoutMs, p.label,
      p.headers ?? {}, null, maxTokens, p.extraBody,
      (status) => {
        if (status === 429) markCooldown(p.id, (family(p) === 'gemini' ? 10 * 60_000 : 60_000))
        else if (status === 503) markCooldown(p.id, 60_000)
      },
    )
    if (!raw) continue
    const obj = parseJsonObject(raw)
    if (obj) return obj
  }
  return null
}
