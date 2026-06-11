import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurriculumConstraint } from '@/lib/curriculum'
import { findQuestions, saveQuestions, markUsed, bankToExamQuestion } from '@/lib/exam/questionBank'

// Netlify/Vercel: duração máxima da função (segundos)
export const maxDuration = 60

// ── Taxonomia de Bloom — validação determinística (validator.py port) ─────────
const BLOOM_LEVELS = ['Lembrar', 'Compreender', 'Aplicar', 'Analisar', 'Avaliar', 'Criar'] as const
type BloomLevel = typeof BLOOM_LEVELS[number]

// Mapeamento de variantes em inglês e PT-BR para PT-PT canónico
const BLOOM_ALIASES: Record<string, BloomLevel> = {
  'Recordar': 'Lembrar',  'Remember': 'Lembrar',   'Knowledge': 'Lembrar',
  'Compreender': 'Compreender', 'Understand': 'Compreender', 'Comprehension': 'Compreender',
  'Aplicar': 'Aplicar',   'Apply': 'Aplicar',       'Application': 'Aplicar',
  'Analisar': 'Analisar', 'Analyse': 'Analisar',    'Analyze': 'Analisar',   'Analysis': 'Analisar',
  'Avaliar': 'Avaliar',   'Evaluate': 'Avaliar',    'Evaluation': 'Avaliar',
  'Criar': 'Criar',       'Create': 'Criar',        'Synthesis': 'Criar',    'Sintetizar': 'Criar',
}

function normalizeBloom(raw: string | undefined): BloomLevel | undefined {
  if (!raw) return undefined
  const s = raw.trim()
  if (BLOOM_LEVELS.includes(s as BloomLevel)) return s as BloomLevel
  if (s in BLOOM_ALIASES) return BLOOM_ALIASES[s]
  // Tentativa por prefixo (ex: "Anali" → "Analisar")
  return BLOOM_LEVELS.find(l => s.toLowerCase().startsWith(l.toLowerCase().slice(0, 4)))
}

// Prompt do crítico adversarial (adaptado de prompts.py::prompt_critico)
// Usa modelo DIFERENTE do gerador para diversidade de perspectiva
function buildCriticPrompt(subject: string, yearLevel: number, topic: string,
                            questions: Array<Record<string, unknown>>): string {
  const sample = questions.slice(0, 10).map((q, i) =>
    `Q${i + 1} [${q.type}|${q.bloomLevel}|${q.points}pt]: ${String(q.text ?? '').slice(0, 90)}`
  ).join('\n')
  return `És revisor crítico independente de fichas de avaliação. A tua função é DESCOBRIR falhas — não elogiar. Parte do princípio de que a ficha tem defeitos e procura-os.

FICHA: ${subject} · ${yearLevel}.º ano · Tópico: "${topic}"
AMOSTRA DE QUESTÕES (máx. 10):
${sample}

AUDITA sem complacência — verifica CADA questão da amostra:
1. alinhamento_topico: cada questão avalia realmente "${topic}"? Ou é genérica?
2. nivel_cognitivo_real: o bloom declarado corresponde ao que é realmente exigido? Um "Analisar" não pode resolver-se por evocação simples.
3. ambiguidade: há enunciados com mais de uma leitura razoável? Dupla negação? Distratores absurdos?
4. adequacao_ano: linguagem e exigência são próprias do ${yearLevel}.º ano (${yearLevel <= 6 ? '10-12 anos' : yearLevel <= 9 ? '12-15 anos' : '15-18 anos'})?
5. markScheme: os critérios são específicos (com pontos parcelares) ou vagos ("resposta correcta")?

Devolve EXCLUSIVAMENTE este JSON (sem texto antes ou depois):
{"aprovado": bool, "score": 0-10, "problemas": [{"tipo": str, "gravidade": "alta|media|baixa", "descricao": str, "questao": int}]}`
}

// ── Perfis disciplinares de estrutura e cotação ────────────────────────────────
function yearContext(yearLevel: number): string {
  if (yearLevel <= 4) return `NÍVEL: ${yearLevel}.º ano (1.º ciclo) — linguagem muito simples e concreta; problemas de 1–2 passos; contextos familiares; apoio visual; Bloom predominante: Recordar/Compreender. Seleção pode ter até 40% do total; respostas longas formais são raras.`
  if (yearLevel <= 6) return `NÍVEL: ${yearLevel}.º ano (2.º ciclo) — linguagem clara (10–12 anos); 2–3 passos; contextos quotidianos e naturais; equilíbrio concreto-abstracto. Bloom: 20% Recordar · 35% Compreender/Aplicar · 45% Analisar/Avaliar.`
  if (yearLevel <= 9) return `NÍVEL: ${yearLevel}.º ano (3.º ciclo) — linguagem formal crescente; multi-passo com abstracção; contextos científicos e sociais. Bloom: 10% Recordar · 30% Compreender/Aplicar · 60% Analisar/Avaliar/Criar. Seleção máximo 20%; resolução/desenvolvimento mínimo 50%.`
  return `NÍVEL: ${yearLevel}.º ano (Secundário) — linguagem rigorosa; problemas complexos multi-passo; nível próximo do exame nacional (IAVE). Bloom: 5% Recordar · 20% Compreender/Aplicar · 75% Analisar/Avaliar/Criar. Seleção máximo 15%; resolução/desenvolvimento mínimo 60%.`
}

function getSubjectProfile(subject: string, hasMultipleTypes: boolean, yearLevel: number): {
  structureNote: string
  scoringRule: string
} {
  const s = subject.toLowerCase()
  const ctx = yearContext(yearLevel)

  // ── Português / Língua Portuguesa ──────────────────────────────────────────
  if (s.includes('português') || s.includes('portugues') || s.includes('língua')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Português (${yearLevel}.º ano):
• Grupo I — Compreensão do texto (25–35 pts): transcreve um excerto literário ou não-literário no campo "text" de uma questão, seguido de questões de interpretação (escolha múltipla, V/F, resposta curta). O texto é parte do enunciado, não da resposta.
• Grupo II — Gramática / Educação Literária (20–30 pts): conhecimento explícito da língua — classificação morfossintáctica, transformação frásica, coerência e coesão textual. Completar espaços e resposta curta.
• Grupo III — Expressão Escrita (35–45 pts): produção de texto orientada. PESO DOMINANTE obrigatório. markScheme: conteúdo/pertinência 40% + organização/coesão 30% + correcção linguística 30%.
REGRA: nunca menos de 35 pts na Expressão Escrita.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100, pontos sempre inteiros):
   • Compreensão (EM/VF): 3–5 pts/questão
   • Interpretação/Gramática (resposta curta/completar): 4–8 pts/questão
   • Expressão Escrita: MÍNIMO 35 pts — com critérios parciais no markScheme (conteúdo + estrutura + correcção linguística)
   • Distribuição típica: Compreensão ~30 pts | Gramática ~25 pts | Escrita ~45 pts`,
    }
  }

  // ── História ────────────────────────────────────────────────────────────────
  if (s.includes('história') || s.includes('historia')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — História (${yearLevel}.º ano):
• Grupo I — Seleção (máx. 20 pts): escolha múltipla e/ou V/F sobre factos, cronologia e conceitos históricos. 3–4 pts/questão.
• Grupo II — Análise de fontes / Resposta curta (30–40 pts): inclui OBRIGATORIAMENTE pelo menos uma fonte histórica (primária ou secundária) ou descrição de imagem histórica. Questões de interpretação, contextualização e causa-efeito. 5–10 pts/questão.
• Grupo III — Resposta de desenvolvimento (35–50 pts): síntese com tese, argumentação com evidências históricas e conclusão. Discurso histórico coerente. 20–30 pts/questão.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100, pontos sempre inteiros):
   • Seleção (EM/VF): 3–4 pts/questão, máximo 20 pts no grupo
   • Análise de fontes / Resposta curta: 5–10 pts/questão
   • Resposta de desenvolvimento: 20–30 pts — nunca menos de 35% do total; markScheme com critérios de conteúdo histórico + qualidade do discurso
   • Distribuição típica: Seleção ~15% | Fontes/Curta ~35% | Desenvolvimento ~50%`,
    }
  }

  // ── Geografia ───────────────────────────────────────────────────────────────
  if (s.includes('geograf')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Geografia (${yearLevel}.º ano):
• Grupo I — Seleção (máx. 20 pts): escolha múltipla e/ou V/F sobre conceitos, localizações e fenómenos geográficos. 3–4 pts/questão.
• Grupo II — Interpretação de documentos / Resposta curta (30–40 pts): análise de gráficos, tabelas ou mapas com dados reais e actuais. 5–10 pts/questão.
• Grupo III — Resposta de desenvolvimento (35–50 pts): síntese sobre fenómenos geográficos com exemplos concretos actuais. 15–25 pts/questão.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100, pontos sempre inteiros):
   • Seleção: 3–4 pts/questão, máximo 20 pts
   • Interpretação / Curta: 5–10 pts/questão
   • Desenvolvimento: 15–25 pts/questão — mínimo 35 pts no grupo
   • Distribuição típica: Seleção ~15% | Interpretação ~35% | Desenvolvimento ~50%`,
    }
  }

  // ── Ciências Naturais ────────────────────────────────────────────────────────
  if (s.includes('ciência') || s.includes('ciencia') || s.includes('natural') || s.includes('biolog')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Ciências Naturais (${yearLevel}.º ano):
• Grupo I — Seleção (20–25 pts): escolha múltipla e/ou V/F sobre conceitos, classificações e nomenclatura científica. 3–5 pts/questão.
• Grupo II — Interpretação de dados / Resposta curta (25–35 pts): inclui OBRIGATORIAMENTE análise de gráfico, tabela, esquema anatómico ou protocolo experimental. Observação, identificação e relação de variáveis. 5–10 pts/questão.
• Grupo III — Situação-problema / Resposta longa (40–50 pts): método científico, explicação de fenómenos naturais, formulação de hipóteses. Justificação científica obrigatória. 10–20 pts/questão.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100, pontos sempre inteiros):
   • Seleção (EM/VF): 3–5 pts/questão, máximo 25 pts no grupo
   • Interpretação/Resposta curta: 5–10 pts/questão
   • Situação-problema/Longa: 10–20 pts/questão — mínimo 40 pts no grupo
   • Distribuição típica: Seleção ~20% | Interpretação ~30% | Situação-problema ~50%`,
    }
  }

  // ── Físico-Química ───────────────────────────────────────────────────────────
  if (s.includes('físic') || s.includes('fisic') || s.includes('quím') || s.includes('quim')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Físico-Química (${yearLevel}.º ano):
• Grupo I — Seleção (20–25 pts): escolha múltipla e/ou V/F sobre conceitos, definições e grandezas. 3–5 pts/questão.
• Grupo II — Interpretação experimental / Resposta curta (25–35 pts): dados laboratoriais, gráficos ou tabelas com unidades obrigatórias. Variáveis, procedimento, conclusões. 5–10 pts/questão.
• Grupo III — Resolução de problemas (40–50 pts): fórmulas em contexto real; estrutura obrigatória: dados → fórmula → cálculo → resposta com unidade. Multi-passo. 10–20 pts/questão.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100, pontos sempre inteiros):
   • Seleção: 3–5 pts/questão, máximo 25 pts
   • Interpretação experimental: 5–10 pts/questão; unidades obrigatórias nas respostas
   • Resolução de problemas: 10–20 pts/questão — mínimo 40 pts no grupo; markScheme detalha pontos por dados + fórmula + cálculo + unidade
   • Distribuição típica: Seleção ~20% | Interpretação ~30% | Resolução ~50%`,
    }
  }

  // ── Matemática / STEM (default) ──────────────────────────────────────────────
  if (hasMultipleTypes) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Matemática (${yearLevel}.º ano):
• Grupo I — Seleção (20–25 pts): escolha múltipla e/ou V/F. Distratores baseados em erros conceptuais típicos. 3–5 pts (EM), 2–3 pts (VF).
• Grupo II — Cálculo e resposta curta (25–30 pts): aplicação directa com apresentação de cálculos obrigatória. 5–10 pts/questão.
• Grupo III — Resolução de problemas (45–55 pts): multi-passo com contexto real; modelação matemática, estratégia e raciocínio; cálculos e justificação obrigatórios. 10–20 pts/questão.
${ctx}`,
      scoringRule: `6. COTAÇÃO — segue RIGOROSAMENTE esta matriz (totalPoints = 100 exactamente, pontos sempre inteiros):
   • Escolha múltipla: 3–5 pts/questão (total do grupo ≤ 25 pts)
   • Verdadeiro/Falso: 2–3 pts/questão (total do grupo ≤ 15 pts)
   • Resposta curta / Cálculo: 5–10 pts/questão (total do grupo 25–35 pts)
   • Resolução / Resposta longa: 10–20 pts/questão (total do grupo ≥ 45 pts)`,
    }
  }

  // Tipo único — sem estrutura obrigatória de grupos
  return {
    structureNote: `ORGANIZAÇÃO: Todas as questões são do mesmo tipo — usa um único grupo com label e descrição adequados ao tipo pedido.`,
    scoringRule: `6. COTAÇÃO: totalPoints = 100 exactamente; pontos sempre inteiros; distribuição proporcional à complexidade cognitiva (questões de Bloom 4–6 valem mais).`,
  }
}

// ── markScheme automático por disciplina e tipo de questão ───────────────────
function autoMarkScheme(type: string, pts: number, subject: string): string {
  const s = subject.toLowerCase()
  const p = (frac: number) => Math.max(1, Math.round(pts * frac))

  if (type === 'multiple_choice') {
    return `Resposta correcta (${pts}pt). Critério: correspondência exacta com a opção correcta — sem cotação parcial. Qualquer outra opção = 0 pontos.`
  }
  if (type === 'true_false') {
    return `Resposta correcta (${pts}pt). Critério: classificação exacta como Verdadeiro ou Falso — sem cotação parcial. Resposta errada = 0 pontos.`
  }

  const isLong = type === 'long_answer'

  if (s.includes('matemát') || s.includes('físic') || s.includes('fisic') || s.includes('quím') || s.includes('quim')) {
    return `Identificação dos dados relevantes (${p(0.2)}pt) + fórmula/método correcto (${p(0.3)}pt) + desenvolvimento do cálculo sem erro (${p(0.3)}pt) + resposta com unidade correcta e conclusão (${p(0.2)}pt).`
  }
  if (s.includes('português') || s.includes('portugues') || s.includes('língua')) {
    if (isLong) {
      return `Conteúdo e pertinência (${p(0.4)}pt) + organização e coesão textual com introdução/desenvolvimento/conclusão (${p(0.3)}pt) + correcção linguística, ortográfica e pontuação (${p(0.3)}pt).`
    }
    return `Identificação correcta do elemento pedido (${p(0.4)}pt) + justificação ou exemplificação adequada com recurso ao texto (${p(0.4)}pt) + correcção linguística (${p(0.2)}pt).`
  }
  if (s.includes('história') || s.includes('historia') || s.includes('geografia') || s.includes('geograf') || s.includes('hgp')) {
    if (isLong) {
      return `Conteúdo histórico/geográfico correcto e pertinente com factos e datas relevantes (${p(0.5)}pt) + organização do discurso com tese, argumentação e conclusão (${p(0.3)}pt) + correcção linguística e vocabulário histórico/geográfico específico (${p(0.2)}pt).`
    }
    return `Identificação correcta do conceito/facto histórico ou geográfico (${p(0.5)}pt) + contextualização e justificação adequada (${p(0.5)}pt).`
  }
  if (s.includes('ciência') || s.includes('ciencia') || s.includes('natural') || s.includes('biolog')) {
    if (isLong) {
      return `Identificação correcta do fenómeno ou conceito científico (${p(0.25)}pt) + explicação científica correcta e fundamentada (${p(0.4)}pt) + terminologia científica adequada (${p(0.2)}pt) + conclusão pertinente (${p(0.15)}pt).`
    }
    return `Resposta científica correcta (${p(0.6)}pt) + justificação com terminologia científica adequada (${p(0.4)}pt).`
  }
  // Genérico
  return isLong
    ? `Conteúdo correcto e completo (${p(0.5)}pt) + organização e coesão (${p(0.3)}pt) + rigor e clareza da expressão (${p(0.2)}pt).`
    : `Resposta correcta e completa (${p(0.6)}pt) + clareza e rigor (${p(0.4)}pt).`
}

// System prompt reforçado para modelos de fallback
// Explícito sobre falhas comuns: PT-BR, JSON incompleto, markScheme vago, questões genéricas
const FALLBACK_SYSTEM_ENHANCED = `És um professor especialista em avaliação em Portugal com 20 anos de experiência. A tua missão é gerar questões de avaliação de QUALIDADE EXCELENTE. Segue CADA regra sem excepção.

═══ FORMATO DE SAÍDA ═══
• Responde EXCLUSIVAMENTE com JSON válido — ZERO texto antes ou depois, ZERO blocos \`\`\`json, ZERO comentários
• JSON deve ser completo e bem formado — nunca truncar no meio de uma chave ou valor

═══ LÍNGUA — PORTUGUÊS DE PORTUGAL ESTRITO ═══
CORRECTO (usa SEMPRE): actividade, óptimo, efeito, facto, fórmula, rectângulo, percentagem, fracção, equação, solução, utilização, análise, síntese, período, séc., efectuado, verificado, concluído
PROIBIDO (nunca usar): atividade, ótimo, efeito✗, fato, fórmula✗, retângulo, porcentagem, fração, equação✗, solução✗, utilização✗, análise✗, síntese✗, período✗

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
• Não omitas NENHUM campo do schema pedido

═══ VERIFICAÇÃO FINAL ANTES DE RESPONDER ═══
Antes de gerar o JSON, verifica mentalmente:
✓ O JSON está completo e bem formado?
✓ Todos os "correctAnswer" estão preenchidos?
✓ Todos os "markScheme" têm critérios específicos com pontos que somam "points"?
✓ A soma de todos os "points" é exactamente 100?
✓ Usei Português de Portugal em todo o texto?
✓ Cada questão é específica ao tópico (não genérica)?`

// Tenta fechar um JSON truncado adicionando os caracteres em falta
function repairTruncatedJson(raw: string): string {
  // Remover vírgula final antes de fechar (trailing comma)
  let s = raw.trimEnd().replace(/,\s*$/, '')
  // Contar chavetas e colchetes por fechar
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
  // Fechar o que ficou aberto (em ordem inversa)
  return s + stack.reverse().join('')
}

// Helper para chamar qualquer endpoint OpenAI-compatible via fetch
// systemPrompt: null → só mensagem user (útil para Tier 1 cujo prompt já tem tudo)
async function callOpenAICompat(
  url: string,
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs = 25_000,
  label = '',
  extraHeaders: Record<string, string> = {},
  systemPrompt: string | null = FALLBACK_SYSTEM_ENHANCED
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
        max_tokens: 8192,   // Groq suporta 32k; outros providers toleram 8k
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) {
      // Ler corpo da resposta para diagnóstico (primeiros 200 chars)
      let body = ''
      try { body = (await res.text()).slice(0, 200) } catch { /* ignore */ }
      console.warn(`[PROFAI] ${label} falhou: HTTP ${res.status} | ${body}`)
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

interface GenerationResult { text: string; isFallback: boolean; modelUsed: string }

// Cascade com dois níveis de qualidade:
// TIER 1 (ouro): Gemini 2.5 Flash + Groq llama-3.3-70b → isFallback: false
// TIER 2 (fallback com prompt reforçado): SambaNova + GitHub gpt-4o + Mistral → isFallback: true
// isFallback:true → banco em primeiro lugar + aviso ao utilizador
// DEADLINE GLOBAL: 22s para toda a cascade → nunca ultrapassa o limite de 26s da Netlify
async function generateWithFallback(prompt: string): Promise<GenerationResult> {
  const deadline = Date.now() + 50_000 // orçamento total — Render suporta 60s (era 22s no Netlify)
  const tried: string[] = []

  // Helper: tempo restante, mínimo 2s, máximo maxMs
  const t = (maxMs: number) => Math.max(2_000, Math.min(maxMs, deadline - Date.now()))
  const ok = (minMs = 2_000) => Date.now() < deadline - minMs

  // ── TIER 1: Groq — rápido e fiável a partir do Render (~300ms) ──────────────
  if (process.env.GROQ_API_KEY && ok()) {
    tried.push('groq-llama')
    const r1 = await callOpenAICompat(
      'https://api.groq.com/openai/v1/chat/completions',
      process.env.GROQ_API_KEY, 'llama-3.3-70b-versatile',
      prompt, t(12_000), 'Groq:llama-3.3-70b'
    )
    if (r1) return { text: r1, isFallback: false, modelUsed: 'groq-llama-3.3-70b' }

    if (ok()) {
      tried.push('groq-qwen')
      const r2 = await callOpenAICompat(
        'https://api.groq.com/openai/v1/chat/completions',
        process.env.GROQ_API_KEY, 'qwen-qwq-32b',
        prompt, t(12_000), 'Groq:qwen-qwq-32b'
      )
      if (r2) return { text: r2, isFallback: false, modelUsed: 'groq-qwen-qwq-32b' }
    }
  }

  // ── TIER 1: Gemini 2.5 Flash — alta latência no Render, usar só se Groq falhar
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter((k): k is string => !!k)

  for (const key of geminiKeys) {
    if (!ok(5_000)) { console.warn('[PROFAI] Gemini: sem tempo restante'); break }
    tried.push('gemini')
    const r = await callOpenAICompat(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      key, 'gemini-2.5-flash', prompt, t(14_000), 'Gemini:2.5-flash',
      {}, null
    )
    if (r) {
      console.log('[PROFAI] ✓ Gemini 2.5 Flash REST')
      return { text: r, isFallback: false, modelUsed: 'gemini-2.5-flash' }
    }
    tried[tried.length - 1] = 'gemini-err'
  }

  // ── TIER 2: fallback com prompt reforçado ────────────────────────────────
  console.warn('[PROFAI] Tier 1 indisponível — a usar fallback com prompt reforçado')

  if (process.env.OPENROUTER_API_KEY && ok()) {
    tried.push('kimi-k2.6')
    const orH = { 'HTTP-Referer': 'https://profai-app.onrender.com', 'X-Title': 'PROF.IA' }
    const r = await callOpenAICompat(
      'https://openrouter.ai/api/v1/chat/completions',
      process.env.OPENROUTER_API_KEY, 'moonshotai/kimi-k2.6:free',
      prompt, t(5_000), 'OR:kimi-k2.6:free', orH
    )
    if (r) return { text: r, isFallback: true, modelUsed: 'kimi-k2.6-free' }
  }

  if (process.env.GITHUB_API_KEY && ok()) {
    tried.push('github-gpt4o')
    const r = await callOpenAICompat(
      'https://models.inference.ai.azure.com/chat/completions',
      process.env.GITHUB_API_KEY, 'gpt-4o',
      prompt, t(5_000), 'GitHub:gpt-4o'
    )
    if (r) return { text: r, isFallback: true, modelUsed: 'github-gpt-4o' }
  }

  // NIM (NVIDIA) — round-robin entre 2 chaves, 40 RPM cada, OpenAI-compatible
  // Validado: mistral-small-4-119b (2.7s, PT-PT correcto, markScheme correcto)
  if (ok()) {
    const nimKeys = [process.env.NIM_API_KEY, process.env.NIM_API_KEY_2].filter((k): k is string => !!k)
    if (nimKeys.length > 0) {
      const nimKey = nimKeys[Math.floor(Date.now() / 1000) % nimKeys.length]
      tried.push('nim-mistral-small-4')
      const r = await callOpenAICompat(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        nimKey, 'mistralai/mistral-small-4-119b-2603',
        prompt, t(6_000), 'NIM:mistral-small-4-119b'
      )
      if (r) return { text: r, isFallback: true, modelUsed: 'nim-mistral-small-4-119b' }
    }
  }

  if (process.env.SAMBANOVA_API_KEY && ok()) {
    tried.push('sambanova')
    const r = await callOpenAICompat(
      'https://api.sambanova.ai/v1/chat/completions',
      process.env.SAMBANOVA_API_KEY, 'DeepSeek-V3.1',
      prompt, t(5_000), 'SambaNova:DeepSeek-V3.1'
    )
    if (r) return { text: r, isFallback: true, modelUsed: 'sambanova-deepseek-v3.1' }
  }

  if (process.env.MISTRAL_API_KEY && ok()) {
    tried.push('mistral')
    const r = await callOpenAICompat(
      'https://api.mistral.ai/v1/chat/completions',
      process.env.MISTRAL_API_KEY, 'mistral-small-latest',
      prompt, t(5_000), 'Mistral:mistral-small'
    )
    if (r) return { text: r, isFallback: true, modelUsed: 'mistral-small' }
  }

  if (process.env.OPENROUTER_API_KEY && ok()) {
    tried.push('nemotron')
    const orH = { 'HTTP-Referer': 'https://profai-app.onrender.com', 'X-Title': 'PROF.IA' }
    const r = await callOpenAICompat(
      'https://openrouter.ai/api/v1/chat/completions',
      process.env.OPENROUTER_API_KEY, 'nvidia/nemotron-3-super-120b-a12b:free',
      prompt, t(8_000), 'OR:nemotron-3-super:free', orH
    )
    if (r) return { text: r, isFallback: true, modelUsed: 'nemotron-3-super-free' }
  }

  const elapsed = Math.round((Date.now() - (deadline - 50_000)) / 1000)
  throw new Error(`Todos os modelos falharam (${elapsed}s). Tentados: ${tried.join(', ') || 'nenhum'}. Tenta novamente.`)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()
  const { tool, inputs } = body

  let prompt = ''

  if (tool === 'test') {
    const { subject, yearLevel, topic, difficulty, questionTypes, numQuestions, duration, country } = inputs
    const countryLabel = country === 'PT' ? 'Portugal (Aprendizagens Essenciais DGE)' : country
    const isMath = ['Matemática', 'Matemática A'].includes(subject)
    const diffLabel = difficulty === 'easy' ? 'Fácil' : difficulty === 'medium' ? 'Média' : 'Difícil'
    const testDuration = duration ?? 50

    // ── Directrizes por disciplina ──────────────────────────────────────────
    const subjectGuidelines: Record<string, string> = {
      'Matemática':         'Inclui problemas com contexto real e significativo. Equilibra cálculo, raciocínio e resolução de problemas. Distratores baseados em erros conceptuais típicos (ex: confundir perímetro com área). Exige apresentação de cálculos nas respostas longas.',
      'Matemática A':       'Inclui problemas com contexto real. Exige demonstração de raciocínio matemático formal. Distratores rigorosos. Problemas multi-passo.',
      'Português':          'Inclui pelo menos um excerto textual (100-150 palavras, adequado ao nível) com questões de compreensão leitora. Avalia gramática em contexto, não isolada. Questão de expressão escrita orientada.',
      'Ciências Naturais':  'Baseia-te em situações observáveis do mundo natural. Inclui interpretação de dados, esquemas ou situações-problema científicas. Promove o raciocínio científico e o método experimental.',
      'Físico-Química':     'Inclui situações experimentais ou problemas com dados reais. Exige aplicação de fórmulas com unidades correctas. Contextualiza com fenómenos do quotidiano.',
      'História':           'Inclui fontes primárias ou secundárias curtas (excerto, imagem descrita) para análise. Avalia compreensão de causalidade, mudança e continuidade. Questões de desenvolvimento com tese.',
      'Geografia':          'Inclui análise de dados geográficos (descrição de gráfico, tabela, mapa simples). Avalia localização, distribuição e relações espaciais.',
      'História e Geografia de Portugal': 'Inclui fontes e dados histórico-geográficos. Avalia compreensão de processos históricos e características geográficas de Portugal.',
    }
    const subjectNote = subjectGuidelines[subject] ?? 'Cria questões rigorosas, contextualizadas e curricularmente alinhadas com as Aprendizagens Essenciais DGE.'

    // ── Restrições curriculares — biblioteca AE DGE ────────────────────────
    const curriculumConstraint = getCurriculumConstraint(subject, yearLevel)

    // ── Figuras matemáticas ─────────────────────────────────────────────────
    // Figuras são opcionais — apenas quando genuinamente úteis para a questão
    // Não forçar um mínimo para não condicionar a estrutura pedagógica
    const figureNote = isMath ? `
FIGURAS SVG — USAR APENAS QUANDO GENUINAMENTE ÚTIL:
Inclui uma figura SVG numa questão SE E SÓ SE a presença visual melhora significativamente a compreensão ou é necessária para resolver o problema. NÃO adiciones figuras para atingir um mínimo — a qualidade pedagógica é prioritária.
Analisa o tópico e aplica a seguinte lógica:

MAPEAMENTO TÓPICO → FIGURA (usa SEMPRE que o tópico for relevante):
• Triângulos, quadriláteros, polígonos, perímetro, área 2D → right_triangle / triangle / rectangle / square
• Círculo, circunferência, raio, diâmetro → circle
• Ângulos, amplitude → angle
• Frações, numerador, denominador, números racionais → fraction_bar
• Recta numérica, ordenar números, inteiros, decimais → number_line
• Gráficos, estatística, dados, frequência, percentagens → bar_chart ou pie_chart
• Cubo, cuboide, paralelepípedo → cuboid ou cube  (todos os anos)
• Prisma triangular → triangular_prism  (5.º ano: identificação; 7.º+: volume)
• Pirâmide → pyramid  (5.º ano: identificação; 9.º+: volume — NUNCA volume no 6.º)
• Cilindro → cylinder  (5.º ano: identificação; 6.º+: volume V=πr²h)
• Cone → cone  (APENAS 9.º ano — PROIBIDO no ${yearLevel}.º ano${yearLevel < 9 ? ' ✗' : ' ✓'})
• Esfera → sphere  (APENAS 9.º ano — PROIBIDO no ${yearLevel}.º ano${yearLevel < 9 ? ' ✗' : ' ✓'})

Para questões de cálculo puro sem componente visual → "figure": null

SINTAXE EXACTA dos tipos disponíveis (copia e adapta com valores reais para o ${yearLevel}.º ano):
  {"type":"right_triangle","leg1":3,"leg2":4,"leg1Label":"3 cm","leg2Label":"4 cm","hypLabel":"5 cm"}
  {"type":"triangle","base":6,"height":4,"baseLabel":"6 cm","heightLabel":"4 cm","sideLabel":"5 cm"}
  {"type":"rectangle","aspectRatio":1.5,"widthLabel":"6 cm","heightLabel":"4 cm"}
  {"type":"square","sideLabel":"5 cm"}
  {"type":"circle","showRadius":true,"radiusLabel":"5 cm"}
  {"type":"circle","showDiameter":true,"diameterLabel":"10 cm"}
  {"type":"angle","degrees":60,"label":"60°"}
  {"type":"number_line","min":0,"max":10,"step":1,"highlighted":[3,7]}
  {"type":"fraction_bar","numerator":3,"denominator":4,"label":"3/4"}
  {"type":"bar_chart","title":"Título","yLabel":"N.º alunos","bars":[{"label":"Jan","value":5},{"label":"Fev","value":8},{"label":"Mar","value":3}]}
  {"type":"pie_chart","title":"Título","slices":[{"label":"Categoria A","value":60},{"label":"Categoria B","value":40}]}
  {"type":"cuboid","widthLabel":"8 cm","heightLabel":"5 cm","depthLabel":"3 cm"}
  {"type":"cube","sideLabel":"4 cm"}
  {"type":"triangular_prism","baseLabel":"6 cm","heightLabel":"4 cm","depthLabel":"10 cm"}
  {"type":"pyramid","baseLabel":"6 cm","heightLabel":"8 cm"}
  {"type":"cylinder","radiusLabel":"3 cm","heightLabel":"10 cm"}
  {"type":"cone","radiusLabel":"4 cm","heightLabel":"9 cm"}
  {"type":"sphere","radiusLabel":"5 cm"}

Para questões onde uma figura não acrescenta nada → "figure": null (não inventes contexto visual forçado).` : ''

    // ── Perfil disciplinar (estrutura + cotação) ────────────────────────────
    const hasMultipleTypes = questionTypes.length > 1
    const { structureNote, scoringRule } = getSubjectProfile(subject, hasMultipleTypes, yearLevel)

    prompt = `És um professor especialista de ${subject} do ${yearLevel}.º ano em ${countryLabel}, com mais de 15 anos de experiência em avaliação formativa e sumativa. Conheces em profundidade as Aprendizagens Essenciais da DGE e os perfis dos alunos do ${yearLevel}.º ano.

TAREFA: Cria uma ficha de avaliação EXCELENTE sobre "${topic}".
Duração: ${testDuration} minutos | Dificuldade: ${diffLabel} | Total: ${numQuestions} questões | 100 pontos

${structureNote}
${figureNote}

${curriculumConstraint}DIRECTRIZES PEDAGÓGICAS OBRIGATÓRIAS:
1. BLOOM: Distribui por níveis cognitivos adaptados à disciplina — questões de Bloom 4–6 (análise/síntese/avaliação) têm sempre peso proporcionalmente maior.
2. CONTEXTO: Questões de desenvolvimento têm sempre contexto real e significativo para alunos de ${yearLevel}.º ano
3. DISTRATORES (escolha múltipla): Cada opção errada corresponde a um erro conceptual real e plausível — nunca opções obviamente absurdas
4. LINGUAGEM: Clara, precisa, Português de Portugal estrito. Usa "rectângulo", "fórmula", "efeito", "facto", "óptimo", "actividade" (nunca formas brasileiras)
5. CURRÍCULO: Alinhamento estrito com as AE da DGE — respeita SEMPRE a secção CURRÍCULO OBRIGATÓRIO acima
${scoringRule}
7. CRITÉRIOS DE CORRECÇÃO — markScheme OBRIGATÓRIO e ESPECÍFICO em CADA questão; pontos parciais cuja SOMA = "points" da questão:
   • Escolha múltipla: "Resposta: [letra] (Xpt). A opção [Y] induz o erro de [...]; A opção [Z] confunde [...]. Resposta errada = 0pt."
   • Verdadeiro/Falso: "[Verdadeiro/Falso] — [razão científica/histórica/linguística concreta]. (Xpt). Resposta errada = 0pt."
   • Matemática/FQ (resposta curta ou longa): "dados (Xpt) + fórmula/método (Xpt) + cálculo sem erro (Xpt) + resposta com unidade correcta (Xpt)"
   • Português (resposta curta): "identificação (Xpt) + justificação com referência ao texto (Xpt) + correcção linguística (Xpt)"
   • Português (expressão escrita): "conteúdo e pertinência (Xpt) + organização e coesão (Xpt) + correcção linguística e ortográfica (Xpt)"
   • CN (resposta aberta): "identificação do fenómeno (Xpt) + explicação científica (Xpt) + terminologia (Xpt) + conclusão (Xpt)"
   • HGP/História/Geografia (desenvolvimento): "conteúdo histórico/geográfico com factos (Xpt) + organização do discurso (Xpt) + vocabulário específico (Xpt)"
   REGRA ABSOLUTA: A soma dos pontos parciais no markScheme = "points" da questão.
8. CALCULADORA: Para cada questão, define allowCalculator:true APENAS se o objectivo é avaliar raciocínio/estratégia com cálculos complexos onde o cálculo não é o alvo (ex: problemas de optimização, geometria analítica, probabilidade composta). Define false para memorização, conceitos, ou quando o cálculo simples é parte essencial do que se avalia.

DISCIPLINA ESPECÍFICA: ${subjectNote}

VARIEDADE E RIQUEZA — REGRAS ABSOLUTAS:
• Cobre pelo menos ${Math.min(numQuestions, Math.ceil(numQuestions * 0.6))} sub-aspectos DISTINTOS de "${topic}" — nunca repitas o mesmo conceito, procedimento ou contexto em questões diferentes.
• Cada questão avalia algo diferente: um conceito, uma aplicação, um erro conceptual frequente, uma conexão com outro tópico, uma situação do mundo real distinta.
• Proibido: duas questões com o mesmo tipo de cálculo/raciocínio aplicado a números diferentes (isso não é avaliação — é repetição).
• A variedade de contextos (situações do mundo real) é tão importante quanto a variedade de conceitos.

Responde APENAS com este JSON válido (sem texto, sem markdown, sem \`\`\`):
{
  "title": "Ficha de Avaliação de ${subject} — ${topic}",
  "subject": "${subject}",
  "yearLevel": ${yearLevel},
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "totalPoints": 100,
  "duration": ${testDuration},
  "instructions": "Lê atentamente cada questão antes de responder. Apresenta todos os cálculos/justificações. Não é permitido o uso de corretor — risca e reescreve com clareza.",
  "groups": [
    {
      "label": "Grupo I",
      "description": "Escolha múltipla — selecciona a única opção correcta. (20 pontos)",
      "totalPoints": 20,
      "questions": [
        {
          "index": 1,
          "type": "multiple_choice",
          "bloomLevel": "Compreender",
          "text": "Enunciado da pergunta com contexto real",
          "figure": null,
          "options": ["A) opção correcta", "B) distrator plausível 1", "C) distrator plausível 2", "D) distrator plausível 3"],
          "correctAnswer": "A",
          "points": 4,
          "allowCalculator": false,
          "markScheme": "Resposta: A. A opção B induz o erro de [...]. A opção C confunde [...]. A opção D [...]. Critério: resposta correcta e completa (4 pontos)."
        }
      ]
    },
    {
      "label": "Grupo II",
      "description": "Resposta curta — responde de forma precisa e justificada. (30 pontos)",
      "totalPoints": 30,
      "questions": [
        {
          "index": 6,
          "type": "short_answer",
          "bloomLevel": "Aplicar",
          "text": "Enunciado com contexto real exigindo aplicação de conhecimentos",
          "figure": null,
          "correctAnswer": "Resposta completa",
          "points": 10,
          "allowCalculator": false,
          "markScheme": "3pt — identificação do conceito; 4pt — desenvolvimento correcto; 3pt — resposta completa e precisa."
        }
      ]
    },
    {
      "label": "Grupo III",
      "description": "Resolução de problemas — apresenta todos os cálculos e justificações. (50 pontos)",
      "totalPoints": 50,
      "questions": [
        {
          "index": 9,
          "type": "long_answer",
          "bloomLevel": "Analisar",
          "text": "Enunciado com contexto real exigindo análise e resolução multi-passo",
          "figure": null,
          "correctAnswer": "Resposta completa com unidades e conclusão",
          "points": 20,
          "allowCalculator": true,
          "markScheme": "4pt — identificação correcta dos dados; 6pt — método/equação correcta; 6pt — cálculo sem erro; 4pt — resposta com unidade e conclusão."
        }
      ]
    }
  ]
}`
  } else if (tool === 'lesson_plan') {
    const { subject, yearLevel, topic, duration, country } = inputs
    const countryLabel = country === 'PT' ? 'Portugal (Aprendizagens Essenciais DGE)' : country
    prompt = `Cria uma planificação de aula de ${subject} para o ${yearLevel}.º ano sobre "${topic}" com duração de ${duration} minutos em ${countryLabel}.

Responde APENAS com este JSON:
{
  "title": "Planificação — ${topic}",
  "subject": "${subject}",
  "yearLevel": ${yearLevel},
  "duration": ${duration},
  "objectives": ["objetivo 1", "objetivo 2"],
  "materials": ["material 1", "material 2"],
  "phases": [
    {"name": "Introdução", "duration": 10, "teacherActivity": "...", "studentActivity": "...", "notes": "..."},
    {"name": "Desenvolvimento", "duration": 30, "teacherActivity": "...", "studentActivity": "...", "notes": "..."},
    {"name": "Consolidação", "duration": 10, "teacherActivity": "...", "studentActivity": "...", "notes": "..."}
  ],
  "assessment": "Descrição do momento de avaliação",
  "differentiation": "Notas de diferenciação pedagógica",
  "homework": "Trabalho de casa"
}`
  } else if (tool === 'rubric') {
    const { subject, yearLevel, taskType, numCriteria, numLevels } = inputs
    prompt = `Cria uma rubrica de avaliação para ${taskType} de ${subject} do ${yearLevel}.º ano com ${numCriteria} critérios e ${numLevels} níveis de desempenho.

Responde APENAS com este JSON:
{
  "title": "Rubrica — ${taskType}",
  "subject": "${subject}",
  "yearLevel": ${yearLevel},
  "criteria": [
    {
      "name": "Nome do critério",
      "weight": 25,
      "levels": [
        {"level": "Excelente", "score": 4, "descriptor": "Descrição detalhada"},
        {"level": "Bom", "score": 3, "descriptor": "Descrição detalhada"},
        {"level": "Suficiente", "score": 2, "descriptor": "Descrição detalhada"},
        {"level": "Insuficiente", "score": 1, "descriptor": "Descrição detalhada"}
      ]
    }
  ]
}`
  } else {
    return NextResponse.json({ error: 'Ferramenta desconhecida' }, { status: 400 })
  }

  try {
    const genStartMs = Date.now() // Para calcular tempo disponível ao crítico adversarial

    // ── Question Bank: verificar se há questões reutilizáveis ──────────────
    let bankHits: Awaited<ReturnType<typeof findQuestions>> = []
    let numFromAI = tool === 'test' ? (inputs as Record<string, unknown>).numQuestions as number : 0

    if (tool === 'test') {
      const { subject, yearLevel, topic, questionTypes, difficulty, numQuestions } = inputs as {
        subject: string; yearLevel: number; topic: string
        questionTypes: string[]; difficulty: string; numQuestions: number
      }

      // Em modo fallback, tentar buscar o máximo possível do banco (até 3× o pedido)
      // para minimizar a quantidade gerada por modelos de menor qualidade.
      // O valor final ajusta-se depois de saber se é fallback ou não.
      bankHits = await findQuestions({
        subject, yearLevel, topic,
        types: questionTypes,
        difficulty,
        numWanted: numQuestions * 3, // pool alargado — só usamos numQuestions
        userId: user.id,
      })
      // Limitar ao pedido por agora; re-avalia após saber se é fallback
      const bankAvailable = bankHits
      bankHits = bankAvailable.slice(0, numQuestions)

      numFromAI = numQuestions - bankHits.length

      if (bankHits.length > 0) {
        console.log(`[BANK] ${bankHits.length} do banco | ${numFromAI} por gerar`)
      }

      // Se o banco tem tudo → devolver directamente sem chamar a IA
      if (numFromAI <= 0) {
        const { subject: s, yearLevel: y, topic: t, difficulty: d,
                duration, numQuestions: nq } = inputs as Record<string, unknown>
        const bankQuestions = bankHits.map((bq, i) => bankToExamQuestion(bq, i + 1))
        const bankIds = bankHits.map(bq => bq.id)
        await markUsed(bankIds, user.id)

        const bankContent = {
          title: `Ficha de Avaliação de ${s} — ${t}`,
          subject: s, yearLevel: y, topic: t, difficulty: d,
          totalPoints: bankQuestions.reduce((sum, q) => sum + (q.points as number), 0),
          duration: duration ?? 50,
          instructions: 'Lê atentamente cada questão antes de responder. Apresenta todos os cálculos/justificações.',
          groups: [{ label: 'Grupo I', description: 'Questões', totalPoints: 100, questions: bankQuestions }],
          _source: 'bank',
        }
        console.log(`[BANK] ✓ 100% banco (${nq} questões, 0 chamadas IA)`)
        return NextResponse.json({ content: bankContent })
      }

      // Ajustar o prompt para gerar apenas as questões em falta
      if (bankHits.length > 0) {
        prompt = prompt.replace(
          /Total: \d+ questões/,
          `Total: ${numFromAI} questões (complementar banco existente)`
        )
      }
    }

    const genResult = await generateWithFallback(prompt)
    const { text, isFallback, modelUsed } = genResult

    // Em modo fallback: usar o máximo possível do banco para cobrir as questões
    // Isso reduz a quantidade de questões geradas pelo modelo inferior
    if (isFallback && tool === 'test') {
      const { subject, yearLevel, topic, questionTypes, difficulty, numQuestions } = inputs as {
        subject: string; yearLevel: number; topic: string
        questionTypes: string[]; difficulty: string; numQuestions: number
      }
      // Pedir o máximo disponível que ainda não foi usado por este utilizador
      const extraBank = await findQuestions({
        subject, yearLevel, topic,
        types: questionTypes,
        difficulty,
        numWanted: numQuestions,
        userId: user.id,
      })
      if (extraBank.length > bankHits.length) {
        console.log(`[BANK] Fallback: banco expandido de ${bankHits.length} → ${extraBank.length} questões`)
        bankHits = extraBank
        numFromAI = numQuestions - bankHits.length
      }
    }

    console.log(`[PROFAI] Modelo: ${modelUsed} | fallback: ${isFallback}`)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[PROFAI] Sem JSON na resposta. Texto recebido (500 chars):', text.slice(0, 500))
      throw new Error('Resposta inválida da IA')
    }
    let content: Record<string, unknown>
    try {
      content = JSON.parse(jsonMatch[0])
    } catch {
      // Tentar reparar JSON truncado: fechar colchetes/chavetas em falta
      const repaired = repairTruncatedJson(jsonMatch[0])
      try {
        content = JSON.parse(repaired)
        console.warn('[PROFAI] JSON reparado com sucesso (estava truncado)')
      } catch {
        console.error('[PROFAI] JSON irreparável (primeiros 500 chars):', jsonMatch[0].slice(0, 500))
        throw new Error('JSON malformado — a IA devolveu uma resposta incompleta. Tenta novamente.')
      }
    }

    // ── Validação e reparação estrutural (zero chamadas IA extra) ────────────
    if (tool === 'test') {
      type QRaw = {
        index: number; figure: unknown; points?: number; type?: string
        text?: string; correctAnswer?: unknown; markScheme?: string; options?: unknown[]
        _bankId?: string; bloomLevel?: string
      }
      type GRaw = { label: string; questions: QRaw[]; totalPoints?: number }
      const groups = (content.groups ?? []) as GRaw[]

      // 1. Remover questões com texto duplicado
      const seenTexts = new Set<string>()
      let removed = 0
      for (const g of groups) {
        const before = g.questions.length
        g.questions = (g.questions ?? []).filter(q => {
          const key = String(q.text ?? '').trim().toLowerCase().slice(0, 80)
          if (!key || seenTexts.has(key)) return false
          seenTexts.add(key)
          return true
        })
        removed += before - g.questions.length
      }
      if (removed > 0) console.warn(`[PROFAI] ${removed} questão(ões) duplicada(s) removida(s)`)

      // 2. Normalizar correctAnswer de MCQ → apenas a letra (A/B/C/D)
      for (const g of groups) {
        for (const q of g.questions) {
          if (q.type === 'multiple_choice' && q.correctAnswer) {
            q.correctAnswer = String(q.correctAnswer).trim().charAt(0).toUpperCase()
          }
          // 3. Garantir markScheme em TODOS os tipos de questão
          const markSchemeMissing = !q.markScheme || String(q.markScheme).trim().length < 25
          if (markSchemeMissing) {
            const pts = Number(q.points) || 0
            const subj = String((inputs as Record<string, unknown>)?.subject ?? '')
            q.markScheme = autoMarkScheme(q.type ?? 'short_answer', pts, subj)
          }
          // 3b. Normalizar bloomLevel para taxonomia PT-PT canónica (validator.py port)
          const rawBloom = q.bloomLevel as string | undefined
          const normalised = normalizeBloom(rawBloom)
          if (normalised) q.bloomLevel = normalised
        }
      }

      // 4. Re-indexar sequencialmente
      let idx = 1
      for (const g of groups) for (const q of g.questions) q.index = idx++

      // 5. Normalizar totalPoints (soma deve ser 100)
      const allQs = groups.flatMap(g => g.questions)
      const currentTotal = allQs.reduce((s, q) => s + (Number(q.points) || 0), 0)
      if (currentTotal > 0 && currentTotal !== 100) {
        const diff = 100 - currentTotal
        const heaviest = allQs.reduce((max, q) =>
          (Number(q.points) || 0) > (Number(max.points) || 0) ? q : max, allQs[0])
        if (heaviest) heaviest.points = (Number(heaviest.points) || 0) + diff
        console.log(`[PROFAI] Pontos normalizados: ${currentTotal} → 100`)
      }
      for (const g of groups) {
        g.totalPoints = g.questions.reduce((s, q) => s + (Number(q.points) || 0), 0)
      }
      content.totalPoints = 100

      // ── Guardar questões IA no banco + combinar com banco existente ────────
      const allQsFinal = groups.flatMap(g => g.questions)
      const withFig = allQsFinal.filter(q => q.figure !== null && q.figure !== undefined)
      console.log(`[PROFAI] ✓ ${allQsFinal.length} questões IA | ${withFig.length} figuras | 100pts`)

      // Guardar questões novas no banco (await para injectar _bankId na resposta)
      const { subject, yearLevel, topic, difficulty } = (inputs ?? {}) as Record<string, unknown>
      const bankIds = bankHits.map(bq => bq.id)
      if (subject && topic) {
        try {
          const saveable = allQsFinal.filter(
            q => q.text && String(q.text ?? '').trim().length > 10
          )
          const savedIds = await saveQuestions(saveable as Array<Record<string, unknown>>, {
            subject: String(subject), yearLevel: Number(yearLevel),
            topic: String(topic), difficulty: String(difficulty ?? 'medium'),
          }, user.id)
          saveable.forEach((q, i) => { if (savedIds[i]) q._bankId = savedIds[i] })
          markUsed([...savedIds, ...bankIds], user.id).catch(
            err => console.warn('[BANK] markUsed falhou:', err)
          )
        } catch (err) {
          console.warn('[BANK] save falhou:', err)
        }
      }

      // Injectar questões do banco no início (já validadas, alta qualidade)
      if (bankHits.length > 0) {
        const bankQs = bankHits.map((bq, i) => bankToExamQuestion(bq, i + 1))
        let nextIdx = bankQs.length + 1
        for (const g of groups) for (const q of g.questions) q.index = nextIdx++
        content.groups = [
          { label: 'Banco', description: '', totalPoints: bankQs.reduce((s, q) => s + (q.points as number), 0), questions: bankQs },
          ...groups,
        ]
        const totalAll = [...bankQs, ...allQsFinal].reduce((s, q) => s + (Number(q.points) || 0), 0)
        content.totalPoints = totalAll
        console.log(`[BANK] Teste híbrido: ${bankQs.length} banco + ${allQsFinal.length} IA`)
      }

      // ── Distribuição Bloom (validator.py port) ─────────────────────────────
      // Zero chamadas API — análise determinística da cobertura cognitiva
      const bloomCounts = Object.fromEntries(BLOOM_LEVELS.map(l => [l, 0])) as Record<string, number>
      for (const g of (content.groups as typeof groups)) {
        for (const q of g.questions) {
          const bl = String(q.bloomLevel ?? '')
          if (bl in bloomCounts) bloomCounts[bl]++
        }
      }
      const totalQs = Object.values(bloomCounts).reduce((s, v) => s + v, 0)
      const higherOrder = (bloomCounts['Analisar'] ?? 0) + (bloomCounts['Avaliar'] ?? 0) + (bloomCounts['Criar'] ?? 0)
      const higherPct = totalQs > 0 ? Math.round(higherOrder / totalQs * 100) : 0
      content._bloomDistribution = bloomCounts
      if (higherPct < 25 && totalQs >= 5) {
        const msg = `Bloom: ${higherPct}% de ordem superior (Analisar+Avaliar+Criar). Ideal ≥ 30% para o ${yearLevel}.º ano.`
        console.warn(`[PROFAI] ${msg}`)
        content._bloomWarning = msg
      }
      console.log(`[PROFAI] Bloom: ${JSON.stringify(bloomCounts)} | ${higherPct}% ordem superior`)

      // ── Crítico adversarial leve (inspirado em prompts.py::prompt_critico) ─
      // Corre apenas em Tier 1 (Gemini/Groq como gerador), com modelo DIFERENTE
      // Não bloqueia: se falhar ou demorar, a ficha é entregue sem crítica
      if (!isFallback && process.env.GROQ_API_KEY && genStartMs) {
        const elapsed = Date.now() - genStartMs
        const remainingForCritic = 50_000 - elapsed
        if (remainingForCritic > 6_000) {
          const allQsForCritic = (content.groups as typeof groups).flatMap(g => g.questions)
          const criticPrompt = buildCriticPrompt(
            String(subject ?? ''), Number(yearLevel ?? 0),
            String(topic ?? ''), allQsForCritic as Array<Record<string, unknown>>
          )
          // Usa llama-3.3-70b como crítico — modelo DIFERENTE de Gemini (adversarial)
          const rawCritic = await callOpenAICompat(
            'https://api.groq.com/openai/v1/chat/completions',
            process.env.GROQ_API_KEY, 'llama-3.3-70b-versatile',
            criticPrompt, Math.min(5_000, remainingForCritic - 1_000),
            'Crítico:Groq:llama', {}, null
          )
          if (rawCritic) {
            try {
              const jsonMatch = rawCritic.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                const critica = JSON.parse(jsonMatch[0]) as {
                  aprovado: boolean; score: number
                  problemas: Array<{ tipo: string; gravidade: string; descricao: string; questao: number }>
                }
                content._criticScore = critica.score
                if (!critica.aprovado && critica.problemas?.length > 0) {
                  const high = critica.problemas.filter(p => p.gravidade === 'alta')
                  content._criticWarnings = critica.problemas
                  console.warn(`[CRÍTICO] Score: ${critica.score}/10 | ${high.length} problema(s) alta gravidade`)
                } else {
                  content._criticApproved = true
                  console.log(`[CRÍTICO] ✓ Aprovado (score ${critica.score}/10)`)
                }
              }
            } catch { /* parse falhou — ignora silenciosamente */ }
          }
        }
      }

      // Aviso de qualidade: activo quando foi usado modelo de fallback E há questões IA
      if (isFallback && groups.flatMap(g => g.questions).length > 0) {
        content._qualityWarning = true
        content._modelUsed = modelUsed
      }
    }

    return NextResponse.json({ content })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Erro na geração:', msg)
    return NextResponse.json({ error: `Erro: ${msg}` }, { status: 500 })
  }
}
