// Motor de IA do PROF.IA — fornecedores, cascade e geração por blocos.
// Módulo puro (sem Next/Supabase) para poder ser testado localmente com tsx.

export const FALLBACK_SYSTEM_ENHANCED = `És um professor especialista em avaliação em Portugal com 20 anos de experiência. A tua missão é gerar questões de avaliação de QUALIDADE EXCELENTE. Segue CADA regra sem excepção.

═══ FORMATO DE SAÍDA ═══
• Responde EXCLUSIVAMENTE com JSON válido — ZERO texto antes ou depois, ZERO blocos \`\`\`json, ZERO comentários
• JSON deve ser completo e bem formado — nunca truncar no meio de uma chave ou valor

═══ LÍNGUA — PORTUGUÊS DE PORTUGAL ESTRITO ═══
Escreve SEMPRE a forma da esquerda, NUNCA a da direita (só pares que realmente diferem):
actividade≠atividade · óptimo≠ótimo · facto≠fato · objecto≠objeto · directo≠directo · correcto≠correto · incorrecto≠incorreto · aspecto≠aspeto · rectângulo≠retângulo · fracção≠fração · acção≠ação · percentagem≠porcentagem · exacto≠exato · contacto≠contato · efectivo≠efetivo · selecção≠seleção
NOTA: palavras como "equação", "solução", "análise", "síntese", "utilização", "período", "fórmula", "efeito" são IGUAIS em PT-PT e PT-BR — usa-as livremente, são correctas. Não as evites.

═══ QUALIDADE PEDAGÓGICA OBRIGATÓRIA ═══
• Cada questão DEVE ser específica ao tópico pedido — zero questões genéricas que poderiam servir qualquer disciplina
• Contexto real e significativo: usa situações concretas, dados numéricos reais, exemplos do quotidiano português
• Distratores (escolha múltipla): cada opção errada deve corresponder a um erro conceptual REAL e plausível — nunca opções obviamente absurdas
• Questões de desenvolvimento: exigem resposta estruturada com argumentação, não apenas listagens
• Bloom: distribui pelos níveis pedidos — questões de análise/avaliação têm peso maior

═══ ESTRUTURA JSON OBRIGATÓRIA ═══
• "points": número inteiro positivo; a soma de TODAS as questões = exactamente 100
• "correctAnswer": obrigatório em TODAS as questões sem excepção
  - multiple_choice: APENAS "A", "B", "C" ou "D" (só a letra, sem ponto, sem texto adicional)
  - true_false: APENAS "Verdadeiro" ou "Falso"
  - short_answer / long_answer: resposta modelo completa (mínimo 15 palavras)
• "markScheme": obrigatório e ESPECÍFICO — nunca genérico como "resposta correcta"
  - multiple_choice: "Resposta: [letra] ([X]pt). Opção [Y]: induz o erro de [...]. Opção [Z]: confunde [...]. Errada = 0pt."
  - true_false: "[Verdadeiro/Falso] — [razão científica/histórica/factual concreta]. ([X]pt). Errada = 0pt."
  - short_answer (Matemática/FQ): "Dados ([X]pt) + fórmula/método ([X]pt) + cálculo sem erro ([X]pt) + resposta com unidade ([X]pt)"
  - short_answer (outras): "Identificação correcta ([X]pt) + justificação com evidência/raciocínio ([X]pt) + correcção linguística ([X]pt)"
  - long_answer: critérios progressivos — conteúdo/argumentação + organização + vocabulário específico
  - A SOMA dos pontos no markScheme deve ser IGUAL a "points" da questão
• "options": array de 4 strings para multiple_choice (["A) ...", "B) ...", "C) ...", "D) ..."]), null para outros tipos
• "text": texto em Português de Portugal SIMPLES — PROIBIDO qualquer notação LaTeX (\frac, \times, \cdot, \(, \), \[, \] e afins); usa sempre símbolos Unicode directamente: × ÷ ² ³ ⁴ √ π ≠ ≤ ≥ ∈; para fracções usa o campo "figure" com type "fraction_bar"
• Não omitas NENHUM campo do schema pedido

═══ VERIFICAÇÃO FINAL ANTES DE RESPONDER ═══
Antes de gerar o JSON, verifica mentalmente:
✓ O JSON está completo e bem formado?
✓ Todos os "correctAnswer" estão preenchidos?
✓ Todos os "markScheme" têm critérios específicos com pontos que somam "points"?
✓ A soma de todos os "points" é exactamente 100?
✓ Usei Português de Portugal em todo o texto?
✓ Cada questão é específica ao tópico (não genérica)?
✓ Em questões com números/cálculos: refiz o cálculo do zero e "correctAnswer" está aritmeticamente correcto?
✓ Em questões de optimização/divisibilidade ("o máximo/mínimo possível"): o enunciado tem todas as restrições necessárias para uma resposta única, sem soluções triviais alternativas?`

// Tenta fechar um JSON truncado adicionando os caracteres em falta
export function repairTruncatedJson(raw: string): string {
  let s = raw.trimEnd()
  const stack: string[] = []
  let inString = false
  let escape = false
  for (const ch of s) {
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']')
    else if (ch === '}' || ch === ']') stack.pop()
  }
  // Se o JSON foi cortado no meio de uma string (ex: markScheme truncado), fechar a string primeiro
  if (inString) s += '"'
  // Remover vírgula final antes de fechar (trailing comma)
  s = s.replace(/,\s*$/, '')
  // Fechar o que ficou aberto (em ordem inversa)
  return s + stack.reverse().join('')
}

// Helper para chamar qualquer endpoint OpenAI-compatible via fetch
// systemPrompt: null → só mensagem user (útil para Tier 1 cujo prompt já tem tudo)
export async function callOpenAICompat(
  url: string,
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs = 25_000,
  label = '',
  extraHeaders: Record<string, string> = {},
  systemPrompt: string | null = FALLBACK_SYSTEM_ENHANCED,
  maxTokens = 8192,
  extraBody: Record<string, unknown> = {},
  onHttpError?: (status: number) => void
): Promise<string | null> {
  try {
    const messages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
      : [{ role: 'user', content: prompt }]
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5,
        max_tokens: maxTokens,
        ...extraBody,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) {
      // Ler corpo da resposta para diagnóstico (primeiros 200 chars)
      let body = ''
      try { body = (await res.text()).slice(0, 200) } catch { /* ignore */ }
      console.warn(`[PROFAI] ${label} falhou: HTTP ${res.status} | ${body}`)
      onHttpError?.(res.status)
      return null
    }
    const data = await res.json() as { choices: Array<{ message: { content: string } }> }
    const text = data.choices[0]?.message?.content ?? ''
    if (text.length > 50) {
      console.log(`[PROFAI] ${label} OK (${text.length} chars)`)
      return text
    }
    console.warn(`[PROFAI] ${label} resposta curta: "${text.slice(0, 100)}"`)
    return null
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`[PROFAI] ${label} erro: ${msg.slice(0, 120)}`)
    return null
  }
}

export interface GenerationResult {
  text: string
  isFallback: boolean
  modelUsed: string
  /** Modelo pessoal do professor usado (rótulo), se a chave pessoal gerou conteúdo. */
  personalModel?: string
  /** true quando a chave pessoal foi tentada mas o sistema teve de recorrer à cascade gratuita. */
  personalFellBack?: boolean
}

// ── Fornecedores ─────────────────────────────────────────────────────────────
// Limites medidos (2026-09-13):
//  • Groq gpt-oss-20b/120b: 8 000 tokens/min e o pré-check conta o max_tokens pedido
//    → max_tokens pequeno e UM bloco por geração.
//  • Gemini 2.5-flash: 40 s+ para um teste inteiro (thinking); ~10-20 s por bloco de 4.
//  • Cloudflare llama-3.3-70b: sem limite/min (10k neurónios/dia); lento em saídas longas.
//  • OpenRouter :free / Mistral: 429 frequente → só Tier 2.
export interface Provider {
  id: string
  label: string
  url: string
  key: string
  model: string
  /** 0 = chave pessoal do professor (topo, sem aviso); 1 = gratuito principal; 2 = fallback amber. */
  tier: 0 | 1 | 2
  /** 'anthropic' usa a Messages API nativa; ausente/'openai' usa o endpoint compatível-OpenAI. */
  dialect?: 'openai' | 'anthropic'
  timeoutMs: number
  /** max_tokens por bloco (Groq: conta para o TPM de 8 000 → tem de ficar abaixo). */
  maxTokens: number
  /** max_tokens numa geração única (ferramentas que não são testes). */
  maxTokensSingle?: number
  system: string | null
  headers?: Record<string, string>
  extraBody?: Record<string, unknown>
  /** Blocos em paralelo que este fornecedor aguenta numa geração. */
  slots: number
  /** Fora da ronda inicial — só entra quando os outros já foram tentados (lento). */
  reserve?: boolean
}

const OR_HEADERS = { 'HTTP-Referer': 'https://profai-app.onrender.com', 'X-Title': 'PROF.IA' }
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions'

export function buildProviders(env: NodeJS.ProcessEnv = process.env): Provider[] {
  const list: Provider[] = []
  const gemini = [env.GEMINI_API_KEY, env.GEMINI_API_KEY_2, env.GEMINI_API_KEY_3].filter((k): k is string => !!k)

  // gpt-oss são modelos de raciocínio: sem reasoning_effort=low gastam o max_tokens a pensar e
  // devolvem content vazio. Cada modelo Groq tem o seu próprio balde de 8 000 TPM → 1 bloco cada.
  // Juiz independente (2026-09-13): blocos gpt-oss trouxeram premissas falsas, termos em inglês e
  // conteúdo de secundário para o 5.º ano → 20b só como reserva do Tier 1; 120b em Tier 2 e crítico.
  const groq = (model: string, tag: string, tier: 1 | 2): Provider => ({
    id: `groq-gpt-oss-${tag}`, label: `Groq:gpt-oss-${tag}`, url: GROQ_URL, key: env.GROQ_API_KEY!, model,
    tier, timeoutMs: 20_000, maxTokens: 6_000, maxTokensSingle: 6_000, system: FALLBACK_SYSTEM_ENHANCED,
    extraBody: { reasoning_effort: 'low' }, slots: 1, reserve: true,
  })
  // Gemini 2.5 Flash (validado pedagogicamente) gera TODOS os blocos: 3 chaves × 2 slots = 24 questões
  // em paralelo. Thinking limitado (por defeito 0): os tokens de raciocínio contam para o max_tokens e
  // truncavam o JSON (25 s → 7 s por bloco). Afinável no Render via GEMINI_THINKING_BUDGET.
  const thinking = { extra_body: { google: { thinking_config: { thinking_budget: Math.max(0, Number(env.GEMINI_THINKING_BUDGET ?? 0) || 0) } } } }
  gemini.forEach((key, i) => list.push({
    id: `gemini-${i + 1}`, label: `Gemini:2.5-flash-${i + 1}`, url: GEMINI_URL, key, model: 'gemini-2.5-flash',
    tier: 1, timeoutMs: 25_000, maxTokens: 6_000, maxTokensSingle: 8_000, system: null, extraBody: thinking, slots: 2,
  }))
  if (env.GROQ_API_KEY) list.push(groq('openai/gpt-oss-20b', '20b', 1))
  if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN) {
    // PT-PT impecável mas ~25 tok/s: reserva para blocos pequenos quando os rápidos falham
    list.push({
      id: 'cf-llama-3.3-70b', label: 'CF:llama-3.3-70b',
      url: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`,
      key: env.CLOUDFLARE_API_TOKEN, model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      tier: 1, timeoutMs: 40_000, maxTokens: 2_500, maxTokensSingle: 4_000, system: FALLBACK_SYSTEM_ENHANCED, slots: 1, reserve: true,
    })
  }
  if (env.GROQ_API_KEY) list.push(groq('openai/gpt-oss-120b', '120b', 2))
  if (env.OPENROUTER_API_KEY) {
    list.push({
      id: 'gemma-4-31b-free', label: 'OR:gemma-4-31b:free', url: OR_URL, key: env.OPENROUTER_API_KEY, model: 'google/gemma-4-31b-it:free',
      tier: 2, timeoutMs: 25_000, maxTokens: 4_000, system: FALLBACK_SYSTEM_ENHANCED, headers: OR_HEADERS, slots: 1,
    })
  }
  if (env.MISTRAL_API_KEY) {
    list.push({
      id: 'mistral-small', label: 'Mistral:mistral-small', url: 'https://api.mistral.ai/v1/chat/completions',
      key: env.MISTRAL_API_KEY, model: 'mistral-small-latest',
      tier: 2, timeoutMs: 20_000, maxTokens: 4_000, system: FALLBACK_SYSTEM_ENHANCED, slots: 1,
    })
  }
  if (env.OPENROUTER_API_KEY) {
    list.push({
      id: 'nemotron-3-super-free', label: 'OR:nemotron-3-super:free', url: OR_URL, key: env.OPENROUTER_API_KEY,
      model: 'nvidia/nemotron-3-super-120b-a12b:free',
      tier: 2, timeoutMs: 20_000, maxTokens: 4_000, system: FALLBACK_SYSTEM_ENHANCED, headers: OR_HEADERS, slots: 1,
    })
  }
  return list
}

/** Crítico adversarial: rápido, balde de TPM próprio e modelo diferente dos geradores principais. */
export function criticProvider(env: NodeJS.ProcessEnv = process.env): Provider | null {
  const all = buildProviders(env)
  return all.find(p => p.id === 'groq-gpt-oss-120b') ?? all.find(p => p.id === 'cf-llama-3.3-70b') ?? all.find(p => p.tier === 1) ?? null
}

// Chave esgotada (429 de quota diária no Gemini) ou serviço em sobrecarga (503): não gastar
// timeouts com ela durante uns minutos. Vive enquanto o processo viver.
const cooldownUntil = new Map<string, number>()
export const onCooldown = (p: Provider) => (cooldownUntil.get(p.id) ?? 0) > Date.now()
export const markCooldown = (id: string, ms: number) => { cooldownUntil.set(id, Date.now() + ms) }
export const family = (p: Provider) => p.id.split('-')[0]
/** Chaves Gemini utilizáveis neste momento (partilha o cooldown com a geração de testes). */
export const geminiProviders = (env: NodeJS.ProcessEnv = process.env) =>
  buildProviders(env).filter(p => family(p) === 'gemini' && !onCooldown(p))

async function callProvider(p: Provider, prompt: string, timeoutMs: number, suffix = '', maxTokens = p.maxTokens): Promise<string | null> {
  const onErr = (status: number) => {
    if (status === 429) cooldownUntil.set(p.id, Date.now() + (family(p) === 'gemini' ? 10 * 60_000 : 60_000))
    else if (status === 503) cooldownUntil.set(p.id, Date.now() + 60_000)
  }
  if (p.dialect === 'anthropic') {
    return callAnthropicMessages(p.key, p.model, prompt, timeoutMs, `${p.label}${suffix}`, p.system, maxTokens, onErr)
  }
  return callOpenAICompat(p.url, p.key, p.model, prompt, timeoutMs, `${p.label}${suffix}`, p.headers ?? {}, p.system, maxTokens, p.extraBody, onErr)
}

// Chamada nativa à Messages API da Anthropic (não é compatível-OpenAI: endpoint,
// cabeçalhos e forma do corpo são próprios). Devolve texto ou null, como callOpenAICompat.
export async function callAnthropicMessages(
  apiKey: string, model: string, prompt: string, timeoutMs = 30_000, label = '',
  systemPrompt: string | null = null, maxTokens = 4_000, onHttpError?: (status: number) => void
): Promise<string | null> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model, max_tokens: maxTokens,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) {
      let body = ''
      try { body = (await res.text()).slice(0, 200) } catch { /* ignore */ }
      console.warn(`[PROFAI] ${label} falhou: HTTP ${res.status} | ${body}`)
      onHttpError?.(res.status)
      return null
    }
    const data = await res.json() as { content?: Array<{ type: string; text?: string }> }
    const text = (data.content ?? []).filter(b => b.type === 'text').map(b => b.text ?? '').join('').trim()
    if (text.length > 50) { console.log(`[PROFAI] ${label} OK (${text.length} chars)`); return text }
    console.warn(`[PROFAI] ${label} resposta curta`)
    return null
  } catch (e) {
    console.warn(`[PROFAI] ${label} erro: ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`)
    return null
  }
}

// ── JSON ─────────────────────────────────────────────────────────────────────
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { /* tentar reparar */ }
  try { return JSON.parse(repairTruncatedJson(m[0])) } catch { return null }
}

type RawQuestion = { index?: number; points?: number; text?: string; [k: string]: unknown }
type RawGroup = { label?: string; description?: string; totalPoints?: number; questions?: RawQuestion[] }
type RawTest = Record<string, unknown> & { groups?: RawGroup[] }

function countQuestions(t: RawTest): number {
  return (t.groups ?? []).reduce((s, g) => s + (Array.isArray(g.questions) ? g.questions.length : 0), 0)
}

// ── Geração única (ferramentas que não são testes) ───────────────────────────
// Tier 1 em paralelo (primeiro sucesso vence); Tier 2 sequencial com aviso amber.
export async function generateWithFallback(prompt: string, budgetMs = 58_000, personal?: Provider): Promise<GenerationResult> {
  const deadline = Date.now() + budgetMs
  const t = (maxMs: number) => Math.max(3_000, Math.min(maxMs, deadline - Date.now()))
  const ok = (minMs = 3_000) => Date.now() < deadline - minMs
  const providers = buildProviders()
  const tier1 = providers.filter(p => p.tier === 1)
  const tier2 = providers.filter(p => p.tier === 2)
  const tried = providers.map(p => p.id)

  // Tier 0: chave pessoal do professor — tentada primeiro, sem aviso
  if (personal && !onCooldown(personal)) {
    tried.unshift(personal.id)
    const text = await callProvider(personal, prompt, t(45_000), '', personal.maxTokensSingle ?? personal.maxTokens)
    if (text) return { text, isFallback: false, modelUsed: personal.id, personalModel: personal.label }
    console.warn(`[PROFAI] Chave pessoal (${personal.label}) falhou — a recorrer à cascade gratuita`)
  }
  const personalFellBack = !!personal

  // Tier 1 em duas vagas: primeiro os principais (Gemini), depois as reservas (Groq 20b, CF)
  for (const wave of [tier1.filter(p => !p.reserve && !onCooldown(p)), tier1.filter(p => p.reserve && !onCooldown(p))]) {
    if (wave.length === 0 || !ok()) continue
    try {
      const winner = await Promise.any(wave.map(p =>
        callProvider(p, prompt, t(40_000), '', p.maxTokensSingle ?? p.maxTokens)
          .then(text => text ? { text, model: p.id } : Promise.reject(new Error('sem resultado')))
      ))
      console.log(`[PROFAI] ✓ Tier 1 vencedor: ${winner.model}`)
      return { text: winner.text, isFallback: false, modelUsed: winner.model, personalFellBack }
    } catch {
      console.warn('[PROFAI] Tier 1 sem sucesso nesta vaga')
    }
  }
  console.warn('[PROFAI] Tier 1 indisponível — a usar Tier 2 com aviso ao utilizador')
  for (const p of tier2) {
    if (!ok()) break
    const text = await callProvider(p, prompt, t(p.timeoutMs), '', p.maxTokensSingle ?? p.maxTokens)
    if (text) return { text, isFallback: true, modelUsed: p.id, personalFellBack }
  }
  const elapsed = Math.round((Date.now() - (deadline - budgetMs)) / 1000)
  throw new Error(`Todos os modelos falharam (${elapsed}s). Tentados: ${tried.join(', ') || 'nenhum'}. Tenta novamente.`)
}

// ── Geração por blocos (testes) ──────────────────────────────────────────────
// Um teste de N questões é partido em K blocos de ~4, gerados EM PARALELO por
// fornecedores diferentes (rotação por "slots"). Cada bloco é um mini-teste com a
// estrutura da disciplina; a fusão junta grupos com o mesmo rótulo e re-escala a
// cotação para 100. Bloco falhado → nova tentativa noutro fornecedor (Tier 1 e só
// depois Tier 2). Vantagens: cabe no TPM do Groq, acaba em <20 s no Gemini/CF, e
// uma falha isolada não deita abaixo a geração inteira.
const PART_FOCUS = [
  'conceitos fundamentais, definições e identificação (Bloom Lembrar/Compreender) — o "quê" do tema',
  'aplicação a situações concretas do quotidiano português, com dados reais (Bloom Aplicar) — o "como"',
  'análise, relações causa-efeito, erros conceptuais frequentes e ligação a outros tópicos (Bloom Analisar/Avaliar) — o "porquê"',
  'situações-problema abertas, interpretação de dados ou figuras e argumentação (Bloom Avaliar/Criar)',
  'variedade de contextos — um contexto diferente por questão (escola, casa, natureza, laboratório, história)',
  'revisão transversal — cada questão liga dois sub-aspectos distintos do tema',
]

// Regras que os modelos mais escorregam (juiz independente, 2026-09-13) — reforçadas
// mesmo em geração única.
const STYLE_RULES = `REGRAS DE ESTILO E RIGOR (inegociáveis):
• Dirige-te ao aluno na 2.ª pessoa do singular (tu): "Explica", "Indica", "Analisa", "Justifica" — NUNCA "Explique"/"Analise"/"Indique".
• Nunca refiras gráficos, tabelas, figuras ou "o texto abaixo" que não estejam integralmente descritos no próprio enunciado.
• Terminologia em português (nunca em inglês) e no nível das Aprendizagens Essenciais do ano indicado — nada de conteúdo de ciclos seguintes.
• Cada premissa científica, histórica ou matemática tem de ser verdadeira; se tens dúvidas sobre um facto, escolhe outro exemplo.
`

export function chunkPrompt(prompt: string, n: number, part: number, parts: number, plan: string[] = []): string {
  const focus = PART_FOCUS[Math.min(part, PART_FOCUS.length - 1)]
  const planNote = plan.length === 0 ? '' : `• Sub-aspectos a cobrir nesta parte — um por questão, pela ordem, usando o contexto indicado (nunca outro contexto):
${plan.map((p, i) => `  ${i + 1}) ${p}`).join('\n')}
`
  const partNote = parts === 1 ? planNote : `PARTE ${part + 1} DE ${parts} DE UMA FICHA MAIOR — as outras partes estão a ser geradas em paralelo por outro modelo:
• Gera EXACTAMENTE ${n} questões. Mantém a estrutura de grupos da disciplina mas reduz proporcionalmente as questões de cada grupo; um grupo pode ficar vazio (omite-o) — nunca inventes questões a mais.
• Foco desta parte: ${focus}.
${planNote}• Cotação: distribui 100 pontos por estas ${n} questões (serão re-escaladas ao juntar as partes).

`
  const p = parts === 1 ? prompt : prompt
    .replace(/Total: \d+ questões[^\n|]*/, `Total: ${n} questões`)
    .replace(/Cobre pelo menos \d+ sub-aspectos/, `Cobre ${n} sub-aspectos`)
  return p.replace('Responde APENAS com este JSON', STYLE_RULES + '\n' + partNote + 'Responde APENAS com este JSON')
}

// Plano prévio: lista de sub-aspectos com contextos distintos, repartida pelos blocos
// (fatias contíguas: parte 1 = elementar … parte K = exigente). Sem isto, blocos gerados em
// paralelo repetiam cenários ("a avó e a planta" duas vezes). Uma chamada curta (~2 s).
async function planSubtopics(prompt: string, total: number, providers: Provider[], timeoutMs: number): Promise<string[]> {
  const topic = prompt.match(/sobre "([^"]+)"/)?.[1]
  const meta = prompt.match(/especialista de (.+?) do (\d+)\.º ano/)
  if (!topic || !meta) return []
  // Secção de currículo (AE da DGE) que o route.ts injecta — ancora o plano ao ano certo.
  const ci = prompt.indexOf('CURRÍCULO OBRIGATÓRIO')
  const di = ci >= 0 ? prompt.indexOf('DIRECTRIZES', ci) : -1
  const curriculum = ci >= 0 ? prompt.slice(ci, di > ci ? di : ci + 1_800).trim().slice(0, 1_800) : ''
  const ask = `Disciplina: ${meta[1]} | ${meta[2]}.º ano (Portugal, Aprendizagens Essenciais DGE) | Tema: "${topic}"
${curriculum ? `APRENDIZAGENS ESSENCIAIS A RESPEITAR:\n${curriculum}\n` : ''}
Lista ${total} sub-aspectos DISTINTOS e avaliáveis deste tema para alunos do ${meta[2]}.º ano, do mais elementar ao mais exigente, cada um com um contexto real do quotidiano português DIFERENTE de todos os outros (casa, escola, natureza, cozinha, desporto, laboratório, história, saúde, praia, campo…).
PROIBIDO: conceitos de anos ou ciclos seguintes (no 2.º ciclo, por exemplo, nada de proteínas, ADN, ATP, antibióticos, organelos além de membrana/citoplasma/núcleo/vacúolo/cloroplasto/parede). Nunca repitas um conceito nem um contexto. Português de Portugal.
Responde APENAS com JSON: {"itens":["sub-aspecto — contexto: ...", ...]}`
  // Corrida Gemini/Groq: o plano é curto e ancorado ao currículo; em produção o Gemini
  // chega a demorar >8 s e não vale a pena esperar por ele só para isto.
  const cands = ['gemini-1', 'groq-gpt-oss-20b', 'gemini-2']
    .map(id => providers.find(p => p.id === id)).filter((p): p is Provider => !!p && !onCooldown(p))
  if (cands.length === 0) return []
  try {
    return await Promise.any(cands.map(async p => {
      const text = await callProvider(p, ask, timeoutMs, ' [plano]', 1_200)
      const obj = text ? parseJsonObject(text) as { itens?: unknown } | null : null
      const itens = Array.isArray(obj?.itens) ? obj.itens.map(String).map(s => s.trim()).filter(s => s.length > 8) : []
      if (itens.length < Math.min(3, total)) throw new Error('plano insuficiente')
      return itens.slice(0, total)
    }))
  } catch {
    return []
  }
}

function romanValue(label: string): number {
  const m = label.toUpperCase().match(/\b([IVXLC]+)\b/)
  if (!m) return 999
  const v: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 }
  let total = 0
  const s = m[1]
  for (let i = 0; i < s.length; i++) {
    const cur = v[s[i]], next = v[s[i + 1]] ?? 0
    total += cur < next ? -cur : cur
  }
  return total
}

export function mergeChunks(parts: RawTest[], target?: number): RawTest {
  const byLabel = new Map<string, RawGroup>()
  for (const part of parts) {
    for (const g of part.groups ?? []) {
      const qs = Array.isArray(g.questions) ? g.questions : []
      if (qs.length === 0) continue
      const key = String(g.label ?? 'Grupo').trim().toUpperCase()
      const existing = byLabel.get(key)
      if (existing) existing.questions!.push(...qs)
      else byLabel.set(key, { ...g, questions: [...qs] })
    }
  }
  let groups = [...byLabel.values()].sort((a, b) => romanValue(String(a.label ?? '')) - romanValue(String(b.label ?? '')))
  // Pedimos 1 questão a mais por bloco (os modelos entregam ±1): aparar ao pedido, retirando
  // primeiro as questões mais PARECIDAS com outra (Jaccard sobre as palavras do enunciado —
  // blocos paralelos repetem cenários) e, em empate, o fim do grupo mais numeroso.
  if (target && target > 0) {
    const all0 = groups.flatMap(g => g.questions ?? [])
    const excess = all0.length - target
    if (excess > 0) {
      const sets = all0.map(q => new Set(String(q.text ?? '').toLowerCase().match(/\p{L}{4,}/gu) ?? []))
      const sim = sets.map((a, i) => Math.max(0, ...sets.map((b, j) => {
        if (i === j) return 0
        let inter = 0
        for (const w of a) if (b.has(w)) inter++
        return inter / Math.max(1, a.size + b.size - inter)
      })))
      const sizeOf = new Map<RawQuestion, number>()
      for (const g of groups) for (const q of g.questions ?? []) sizeOf.set(q, g.questions!.length)
      const order = all0.map((q, i) => ({ q, i })).sort((x, y) =>
        sim[y.i] - sim[x.i] || (sizeOf.get(y.q) ?? 0) - (sizeOf.get(x.q) ?? 0) || y.i - x.i)
      const drop = new Set(order.slice(0, excess).map(o => o.q))
      for (const g of groups) g.questions = (g.questions ?? []).filter(q => !drop.has(q))
      groups = groups.filter(g => (g.questions?.length ?? 0) > 0)
    }
  }
  const all = groups.flatMap(g => g.questions ?? [])

  const total = all.reduce((s, q) => s + (Number(q.points) || 0), 0)
  if (all.length > 0 && total > 0 && total !== 100) {
    const f = 100 / total
    let acc = 0
    for (const q of all) {
      const v = Math.max(1, Math.round((Number(q.points) || 0) * f))
      q.points = v
      acc += v
    }
    const diff = 100 - acc
    if (diff !== 0) {
      const heaviest = all.reduce((m, q) => (Number(q.points) || 0) > (Number(m.points) || 0) ? q : m, all[0])
      heaviest.points = (Number(heaviest.points) || 0) + diff
    }
  }
  let idx = 1
  for (const g of groups) {
    g.totalPoints = (g.questions ?? []).reduce((s, q) => s + (Number(q.points) || 0), 0)
    g.description = String(g.description ?? '').replace(/\(\s*\d+\s*pontos?\s*\)/i, `(${g.totalPoints} pontos)`)
    for (const q of g.questions ?? []) q.index = idx++
  }
  return { ...parts[0], groups, totalPoints: 100 }
}

export interface ChunkedResult extends GenerationResult { parts: number; partsOk: number }

// ── Matriz de especificação ───────────────────────────────────────────────────
// Blueprint curricular do teste (grupos × Bloom × tipo × pontos × faceta do tema),
// gerado numa chamada curta ANTES das questões. Depois cada questão é gerada colada a
// uma célula concreta — cobertura, ponderação e fidelidade ao tópico ficam garantidas
// por construção, em vez de dependerem de um modelo compor tudo às cegas.
export interface MatrixCell { grupo: string; tipo: string; bloom: string; pontos: number; faceta: string }
export interface MatrixMeta { subject: string; yearLevel: number; topic: string }

export async function buildMatrix(
  basePrompt: string, meta: MatrixMeta, numQuestions: number, types: string[], avoid: string[],
  providers: Provider[], timeoutMs: number, difficulty = 'medium',
): Promise<MatrixCell[] | null> {
  const bloomRule = difficulty === 'easy'
    ? 'DIFICULDADE FÁCIL: predomina Lembrar/Compreender/Aplicar; no máximo 1 célula de Analisar; nenhuma de Avaliar/Criar.'
    : difficulty === 'hard'
    ? 'DIFICULDADE DIFÍCIL: pelo menos METADE das células em Analisar/Avaliar/Criar; as de ordem superior valem mais pontos.'
    : 'DIFICULDADE MÉDIA: distribuição equilibrada, com ~30–40% das células em Analisar/Avaliar/Criar (valem mais pontos).'
  const ci = basePrompt.indexOf('CURRÍCULO OBRIGATÓRIO')
  const di = ci >= 0 ? basePrompt.indexOf('DIRECTRIZES', ci) : -1
  const curriculum = ci >= 0 ? basePrompt.slice(ci, di > ci ? di : ci + 1_800).trim().slice(0, 1_800) : ''
  const typeList = types.length ? types.join(', ') : 'multiple_choice, true_false, short_answer, long_answer'
  const avoidNote = avoid.length
    ? `\nJÁ EXISTEM no teste estas questões (do banco) — as tuas facetas têm de ser DISTINTAS destas, sem repetir conceito:\n${avoid.slice(0, 15).map((t, i) => `${i + 1}. ${t.slice(0, 110)}`).join('\n')}\n`
    : ''
  const ask = `És um professor especialista de ${meta.subject} do ${meta.yearLevel}.º ano em Portugal a desenhar a MATRIZ DE ESPECIFICAÇÃO de um teste sobre "${meta.topic}".
${curriculum ? `APRENDIZAGENS ESSENCIAIS / CURRÍCULO DO ANO (guarda-fatos):\n${curriculum}\n` : ''}${avoidNote}
ANCORAGEM (passo prévio obrigatório): localiza "${meta.topic}" dentro do currículo do ano acima e identifica o DOMÍNIO e os descritores das Aprendizagens Essenciais a que pertence. Todas as células têm de avaliar descritores desse domínio. Se "${meta.topic}" não constar textualmente no currículo, ancora-o ao domínio mais próximo das AE do ano e mantém o foco no que o professor pediu — nunca derives para conteúdos de anos seguintes nem para associações vagas ao título.

Define EXACTAMENTE ${numQuestions} células — uma por questão. Foca-te nos descritores próprios DESTA unidade, não no tema geral do ano.
${bloomRule}

COBERTURA (prioridade máxima): primeiro enumera mentalmente TODOS os sub-aspectos/descritores essenciais de "${meta.topic}" para este ano. Depois:
• Se ${numQuestions} ≥ nº de sub-aspectos essenciais → cobre-os TODOS (uma faceta por sub-aspecto) e usa as células restantes para APROFUNDAR os mais centrais com Bloom superior — nunca para repetir um sub-aspecto já coberto.
• Se ${numQuestions} < nº de sub-aspectos essenciais → escolhe os MAIS importantes/estruturantes para maximizar a cobertura (regra do "pelo menos").
Enquanto houver um sub-aspecto essencial por cobrir, NUNCA gastes duas células no mesmo sub-aspecto.
Cada célula tem:
• "grupo": "Grupo I" (escolha múltipla / objectivas), "Grupo II" (resposta curta justificada) ou "Grupo III" (resolução de problemas / desenvolvimento) — por exigência cognitiva crescente.
• "tipo": um de: ${typeList}.
• "bloom": Lembrar | Compreender | Aplicar | Analisar | Avaliar | Criar — distribui conforme a regra de dificuldade indicada acima.
• "pontos": inteiro positivo; a SOMA de TODAS as células = exactamente 100.
• "faceta": o CONTEÚDO curricular concreto que a questão avalia — um descritor específico de "${meta.topic}" (um mecanismo, uma relação causa-efeito, uma propriedade, uma definição-chave). É o "quê" curricular, NUNCA um contexto do quotidiano nem uma faceta genérica que serviria outro tema. Cada faceta é distinta; juntas cobrem o essencial da unidade.
Regras: Português de Portugal estrito; nível do ${meta.yearLevel}.º ano (nada de anos/ciclos seguintes); zero facetas repetidas ou genéricas.
Responde APENAS com JSON válido: {"celulas":[{"grupo":"...","tipo":"...","bloom":"...","pontos":0,"faceta":"..."}]}`

  const cands = providers.filter(p => !onCooldown(p)).slice(0, 3)
  if (cands.length === 0) return null
  try {
    return await Promise.any(cands.map(async p => {
      const text = await callProvider(p, ask, timeoutMs, ' [matriz]', 2_500)
      const obj = text ? parseJsonObject(text) as { celulas?: unknown } | null : null
      const rawCells = Array.isArray(obj?.celulas) ? obj!.celulas as Array<Record<string, unknown>> : []
      let cells: MatrixCell[] = rawCells.map(c => ({
        grupo: String(c.grupo ?? 'Grupo I').trim(),
        tipo: String(c.tipo ?? 'short_answer').trim(),
        bloom: String(c.bloom ?? 'Aplicar').trim(),
        pontos: Number(c.pontos) || 0,
        faceta: String(c.faceta ?? '').trim(),
      })).filter(c => c.faceta.length >= 6)
      if (cells.length < Math.max(3, Math.floor(numQuestions * 0.7))) throw new Error('matriz insuficiente')
      cells = cells.slice(0, numQuestions)
      // Normaliza os pontos a soma exacta 100
      const sum = cells.reduce((s, c) => s + c.pontos, 0)
      if (sum > 0 && sum !== 100) {
        let acc = 0
        for (const c of cells) { c.pontos = Math.max(1, Math.round(c.pontos / sum * 100)); acc += c.pontos }
        cells[0].pontos = Math.max(1, cells[0].pontos + (100 - acc))
      }
      return cells
    }))
  } catch { return null }
}

// Prompt de geração colado à matriz: gera exactamente estas células, por ordem.
export function matrixBlockPrompt(basePrompt: string, cells: MatrixCell[]): string {
  const list = cells.map((c, i) => `${i + 1}. [${c.grupo} · ${c.tipo} · Bloom ${c.bloom} · ${c.pontos}pt] Avalia: ${c.faceta}`).join('\n')
  const note = `GERA EXACTAMENTE ESTAS ${cells.length} QUESTÕES, uma por linha da matriz e PELA MESMA ORDEM. Cada questão TEM de:
• avaliar exactamente a faceta curricular indicada em "Avalia:" — com rigor científico e ao nível do ano; NUNCA uma questão genérica que serviria outro tema;
• respeitar o grupo, o tipo, o nível de Bloom e a cotação (pontos) indicados;
• usar contexto real apenas quando ajuda a avaliar a faceta, nunca a substituí-la.
MATRIZ DO TESTE:
${list}

`
  return basePrompt
    .replace(/Total: \d+ questões[^\n|]*/, `Total: ${cells.length} questões`)
    .replace(/Cobre pelo menos \d+ sub-aspectos[^\n]*\n?/, '')
    .replace('Responde APENAS com este JSON', STYLE_RULES + '\n' + note + 'Responde APENAS com este JSON')
}

export async function generateChunked(
  prompt: string,
  numQuestions: number,
  opts: { budgetMs?: number; chunkSize?: number; env?: NodeJS.ProcessEnv; personal?: Provider
          meta?: MatrixMeta; types?: string[]; avoid?: string[]; difficulty?: string } = {}
): Promise<ChunkedResult> {
  const budgetMs = opts.budgetMs ?? 58_000
  const deadline = Date.now() + budgetMs
  const remaining = () => deadline - Date.now()
  const size = opts.chunkSize ?? 3

  const providers = buildProviders(opts.env)
  if (providers.length === 0) throw new Error('Nenhum fornecedor de IA configurado.')
  const tier1 = providers.filter(p => p.tier === 1)
  const tier2 = providers.filter(p => p.tier === 2)
  // Tier 0: chave pessoal do professor — gera TODOS os blocos primeiro, sem aviso
  const personal = opts.personal && !onCooldown(opts.personal) ? opts.personal : undefined

  // Matriz de especificação: blueprint curricular gerado primeiro. Se falhar, cai no
  // modo genérico (plano + corte por semelhança). Só quando há meta (geração de teste).
  const matrix = opts.meta
    ? await buildMatrix(prompt, opts.meta, numQuestions, opts.types ?? [], opts.avoid ?? [],
        [personal, ...tier1, ...tier2].filter((p): p is Provider => !!p), 10_000, opts.difficulty ?? 'medium')
    : null
  if (matrix) console.log(`[PROFAI] Matriz: ${matrix.length} células`)

  // Passagem única quando cabe e há modelo capaz — melhor coerência que blocos.
  const strong = !!personal || tier1.some(p => !p.reserve && !onCooldown(p))
  const K0 = matrix
    ? ((numQuestions <= 14 && strong) ? 1 : Math.max(1, Math.ceil(matrix.length / size)))
    : (numQuestions <= size + 1 ? 1 : Math.ceil(numQuestions / size))
  const cellSlices: MatrixCell[][] = []
  if (matrix) {
    const per = Math.ceil(matrix.length / K0)
    for (let i = 0; i < K0; i++) { const s = matrix.slice(i * per, (i + 1) * per); if (s.length) cellSlices.push(s) }
  }
  // Em produção cada questão rende ~700 tokens de JSON: blocos de 3 (+1 de folga no modo
  // genérico) ficam em ~12-18 s no Gemini; de 4-5 passavam dos 25 s.
  const counts = matrix
    ? cellSlices.map(c => c.length)
    : Array.from({ length: K0 }, (_, i) => Math.floor(numQuestions / K0) + (i < numQuestions % K0 ? 1 : 0) + (K0 > 1 ? 1 : 0))
  const K = counts.length

  // Fila de arranque: intercala fornecedores por ronda de "slots" (cf, gemini-1, groq, gemini-2, …)
  const queue: Provider[] = []
  const starters = tier1.filter(p => !p.reserve && !onCooldown(p))
  const maxSlots = Math.max(...starters.map(p => p.slots), 0)
  for (let r = 0; r < maxSlots; r++) for (const p of starters) if (r < p.slots) queue.push(p)

  const usage = new Map<string, number>()
  const triedBy: Set<string>[] = counts.map(() => new Set())
  const results: Array<{ content: RawTest; model: string; tier: 0 | 1 | 2 } | null> = counts.map(() => null)
  const tried = new Set<string>()

  const take = (p: Provider) => { usage.set(p.id, (usage.get(p.id) ?? 0) + 1); tried.add(p.id) }
  const free = (p: Provider) => (usage.get(p.id) ?? 0) < p.slots

  // Plano genérico só no modo NÃO-matriz (fallback); a matriz já dá facetas concretas.
  const plan = (!matrix && K > 1) ? await planSubtopics(prompt, counts.reduce((a, b) => a + b, 0), providers, 8_000) : []
  if (plan.length > 0) console.log(`[PROFAI] Plano: ${plan.length} sub-aspectos`)
  const planFor = (i: number) => {
    const start = counts.slice(0, i).reduce((a, b) => a + b, 0)
    return plan.slice(start, start + counts[i])
  }

  async function run(i: number, p: Provider): Promise<void> {
    take(p); triedBy[i].add(p.id)
    const bigSingle = !!matrix && K === 1
    const timeout = Math.max(4_000, Math.min(bigSingle ? 48_000 : p.timeoutMs, remaining() - 1_500))
    const blockPrompt = matrix ? matrixBlockPrompt(prompt, cellSlices[i]) : chunkPrompt(prompt, counts[i], i, K, planFor(i))
    const maxTokens = matrix ? Math.min(16_000, 1_400 + cellSlices[i].length * 950) : p.maxTokens
    const text = await callProvider(p, blockPrompt, timeout, K > 1 ? ` [${i + 1}/${K}]` : '', maxTokens)
    if (!text) return
    const parsed = parseJsonObject(text) as RawTest | null
    const n = parsed ? countQuestions(parsed) : 0
    if (!parsed || n === 0) { console.warn(`[PROFAI] ${p.label} [${i + 1}/${K}] JSON inválido ou sem questões`); return }
    results[i] = { content: parsed, model: p.id, tier: p.tier }
  }

  // Ronda 0: se há chave pessoal, gera todos os blocos com ela (em paralelo)
  if (personal) {
    console.log(`[PROFAI] Chave pessoal: ${personal.label} a gerar ${K} bloco(s)`)
    await Promise.all(counts.map((_, i) => run(i, personal)))
    const okCount = results.filter(Boolean).length
    if (okCount < K) console.warn(`[PROFAI] Chave pessoal cobriu ${okCount}/${K} — resto pela cascade gratuita`)
  }

  // Ronda 1: blocos ainda por gerar → fornecedores gratuitos rotativos
  const pending1 = counts.map((_, i) => i).filter(i => !results[i])
  const first = pending1.map(i => queue.length ? queue[i % queue.length] : tier2[i % tier2.length])
  if (!personal && K === 1 && queue.length > 1) {
    // Teste pequeno sem chave pessoal: corrida entre dois fornecedores — o primeiro JSON válido vence
    await Promise.any([queue[0], queue[1]].map(p => run(0, p).then(() => { if (!results[0]) throw new Error('sem resultado') }))).catch(() => {})
  } else if (pending1.length > 0) {
    await Promise.all(pending1.map((i, k) => run(i, first[k])))
  }

  // Rondas seguintes: blocos falhados → fornecedor ainda não tentado (Tier 1 primeiro)
  for (let round = 2; round <= 4 && remaining() > 6_000; round++) {
    const failed = results.map((r, i) => (r ? -1 : i)).filter(i => i >= 0)
    if (failed.length === 0) break
    console.warn(`[PROFAI] Ronda ${round}: ${failed.length} bloco(s) por gerar (${Math.round(remaining() / 1000)}s restantes)`)
    const batch: Array<Promise<void>> = []
    for (const [j, i] of failed.entries()) {
      // Se o Gemini falhou/expirou neste bloco, outra chave Gemini tende a falhar também:
      // preferir outra FAMÍLIA (Groq responde em 2-3 s) antes de repetir a mesma.
      const triedFamilies = new Set([...triedBy[i]].map(id => id.split('-')[0]))
      const usable = (p: Provider) => free(p) && !triedBy[i].has(p.id) && !onCooldown(p)
      const rank = (p: Provider) => (triedFamilies.has(family(p)) ? 1 : 0) + (p.tier === 2 ? 2 : 0)
      const pool = [...tier1, ...tier2].filter(usable).sort((a, b) => rank(a) - rank(b))
      const p = pool[j % Math.max(pool.length, 1)]
      if (p) batch.push(run(i, p))
    }
    if (batch.length === 0) break
    await Promise.all(batch)
  }

  const done = results.filter((r): r is NonNullable<typeof r> => !!r)
  const elapsed = Math.round((Date.now() - (deadline - budgetMs)) / 1000)
  if (done.length === 0) {
    throw new Error(`Todos os modelos falharam (${elapsed}s). Tentados: ${[...tried].join(', ')}. Tenta novamente.`)
  }
  const partial = done.length < K
  const usedTier2 = done.some(r => r.tier === 2)
  const usedPersonal = done.some(r => r.tier === 0)
  const usedFree = done.some(r => r.tier !== 0)
  // A chave pessoal foi tentada mas não cobriu tudo — o professor deve ser avisado
  const personalFellBack = !!personal && usedFree
  const models = [...new Set(done.map(r => r.model))].join('+')
  console.log(`[PROFAI] ✓ ${done.length}/${K} bloco(s) em ${elapsed}s — ${models}${partial ? ' (PARCIAL)' : ''}`)

  const merged = mergeChunks(done.map(r => r.content), numQuestions)
  return {
    text: JSON.stringify(merged),
    // Só é "fallback" (banner amber) se entrou Tier 2 ou ficou parcial; blocos pessoais + Tier 1 não são amber
    isFallback: usedTier2 || partial,
    modelUsed: partial ? `${models} (parcial ${done.length}/${K})` : models,
    personalModel: usedPersonal ? personal!.label : undefined,
    personalFellBack,
    parts: K,
    partsOk: done.length,
  }
}
