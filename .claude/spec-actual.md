# Spec: Actualizar cascade de modelos em generate/route.ts

## Contexto
A cascade de IA em `src/app/api/ai/generate/route.ts` falha para todos os modelos.
Diagnóstico do log de produção (2026-09-07):

| Modelo | Erro | Acção |
|--------|------|-------|
| Groq llama-3.3-70b-versatile | HTTP 404 — modelo não existe | **Substituir** |
| kimi-k2.6:free (OpenRouter) | HTTP 404 — free tier removido | **Remover** |
| NIM mistral-small-4-119b-2603 | HTTP 410 — EOL 2026-07-27 | **Remover** |
| SambaNova DeepSeek-V3.1 | HTTP 402 — saldo zero | **Remover** |
| GitHub gpt-4o | fetch failed — token expirado | **Remover** bloco (token expirado) |
| Gemini 2.5-flash (3 chaves) | Timeout | Manter, nada a mudar |
| Mistral mistral-small | HTTP 429 transiente | Manter |
| nemotron:free | Timeout conhecido | Manter |

Catálogo Groq actual (verificado via API 2026-09-07):
- `qwen/qwen3.8-27b` ← usar este (27B, multilíngue, melhor candidato)
- `qwen/qwen3.6-27b`
- `openai/gpt-oss-120b` (anteriormente reprovado para PT-PT — não usar)
- `groq/compound`, `groq/compound-mini`

## Alterações exactas

### 1. Groq Tier 1 — substituir modelo (≈ linha 607)

ANTES:
```typescript
callOpenAICompat(
  'https://api.groq.com/openai/v1/chat/completions',
  process.env.GROQ_API_KEY, 'llama-3.3-70b-versatile',
  prompt, 20_000, 'Groq:llama-3.3-70b',
  {}, FALLBACK_SYSTEM_ENHANCED, 16_000
```

DEPOIS:
```typescript
callOpenAICompat(
  'https://api.groq.com/openai/v1/chat/completions',
  process.env.GROQ_API_KEY, 'qwen/qwen3.8-27b',
  prompt, 20_000, 'Groq:qwen3.8-27b',
  {}, FALLBACK_SYSTEM_ENHANCED, 16_000
```

Alterar também o `tried.push('groq-llama')` para `tried.push('groq-qwen3')`.

### 2. Remover bloco kimi-k2.6:free (Tier 2, ≈ linha 647)

Remover completamente o bloco:
```typescript
if (process.env.OPENROUTER_API_KEY && ok()) {
  tried.push('kimi-k2.6')
  const orH = { 'HTTP-Referer': ... }
  const r = await callOpenAICompat(
    '...openrouter...', ..., 'moonshotai/kimi-k2.6:free', ...
  )
  if (r) return { text: r, isFallback: true, modelUsed: 'kimi-k2.6-free' }
}
```

### 3. Remover bloco GitHub gpt-4o (≈ linha 659)

Remover completamente o bloco:
```typescript
if (process.env.GITHUB_API_KEY && ok()) {
  tried.push('github-gpt4o')
  const r = await callOpenAICompat(
    'https://models.inference.ai.azure.com/...', ..., 'gpt-4o', ...
  )
  if (r) return { text: r, isFallback: true, modelUsed: 'github-gpt4o' }
}
```

### 4. Remover bloco NIM mistral-small-4-119b (≈ linha 672)

Remover completamente o bloco:
```typescript
{
  const nimKeys = [process.env.NIM_API_KEY, process.env.NIM_API_KEY_2]...
  if (nimKeys.length > 0) {
    tried.push('nim-mistral-small-4')
    const r = await callOpenAICompat('https://integrate.api.nvidia.com/...', ...)
    if (r) return { ... }
  }
}
```

### 5. Remover bloco SambaNova (≈ linha 687)

Remover completamente o bloco:
```typescript
if (process.env.SAMBANOVA_API_KEY && ok()) {
  tried.push('sambanova')
  const r = await callOpenAICompat('https://api.sambanova.ai/...', ...)
  if (r) return { ... }
}
```

## O que NÃO alterar
- Gemini (3 chaves em paralelo no Tier 1) — manter exactamente como está
- Mistral mistral-small — manter
- nemotron:free — manter
- Toda a lógica de Promise.any(), deadline, validateAndRepair(), etc.
- Nenhum outro ficheiro

## Verificação
Após as alterações, a cascade deve listar apenas:
tried: groq-qwen3, gemini-1, gemini-2, gemini-3, mistral, nemotron
(6 modelos em vez de 10)
