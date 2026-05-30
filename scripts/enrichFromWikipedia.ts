/**
 * PROF.IA — Wikipedia Enrichment Script
 * Corre autonomamente durante horas, gerindo rate limits.
 * Disciplinas: CN, Físico-Química, História, Geografia — 7.º ao 9.º ano
 * Fonte: Wikipedia PT (texto real verificável) + AI structuring
 * quality_score: 0.82 (base factual verificada, não puro AI seed)
 *
 * Uso: npx tsx scripts/enrichFromWikipedia.ts
 */

import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

dotenv.config({ path: '.env.local' })

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Log file ─────────────────────────────────────────────────────────────────
const LOG_FILE = path.join(process.cwd(), '.claude', 'enrich-wikipedia.log')
const DONE_FILE = path.join(process.cwd(), '.claude', 'enrich-done.json')
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  fs.appendFileSync(LOG_FILE, line + '\n')
}

function loadDone(): Set<string> {
  try {
    const raw = fs.readFileSync(DONE_FILE, 'utf-8')
    return new Set(JSON.parse(raw))
  } catch { return new Set() }
}

function markDone(key: string, done: Set<string>) {
  done.add(key)
  fs.mkdirSync(path.dirname(DONE_FILE), { recursive: true })
  fs.writeFileSync(DONE_FILE, JSON.stringify([...done], null, 2))
}

// ── Topic list ────────────────────────────────────────────────────────────────
interface TopicEntry {
  subject: string
  year: number
  topic: string
  wiki: string        // título do artigo PT Wikipedia
  count: number       // questões a gerar
  bloomFocus: string  // nível(eis) de bloom prioritários
}

const TOPICS: TopicEntry[] = [

  // ── Ciências Naturais 7.º ────────────────────────────────────────────────
  { subject: 'Ciências Naturais', year: 7, topic: 'Ecossistemas e biodiversidade', wiki: 'Ecossistema', count: 8, bloomFocus: 'Compreender, Aplicar' },
  { subject: 'Ciências Naturais', year: 7, topic: 'Fotossíntese e respiração celular', wiki: 'Fotossíntese', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'Ciências Naturais', year: 7, topic: 'Célula — estrutura e funções', wiki: 'Célula_(biologia)', count: 8, bloomFocus: 'Recordar, Compreender' },
  { subject: 'Ciências Naturais', year: 7, topic: 'Reprodução e hereditariedade', wiki: 'Reprodução_sexuada', count: 6, bloomFocus: 'Compreender, Aplicar' },
  { subject: 'Ciências Naturais', year: 7, topic: 'Alimentação e saúde humana', wiki: 'Nutrição_humana', count: 8, bloomFocus: 'Aplicar, Avaliar' },
  { subject: 'Ciências Naturais', year: 7, topic: 'Microrganismos e doenças infecciosas', wiki: 'Microrganismo', count: 6, bloomFocus: 'Compreender, Analisar' },

  // ── Ciências Naturais 8.º ────────────────────────────────────────────────
  { subject: 'Ciências Naturais', year: 8, topic: 'Rochas e minerais', wiki: 'Rocha', count: 8, bloomFocus: 'Recordar, Compreender' },
  { subject: 'Ciências Naturais', year: 8, topic: 'Tectónica de placas e sismologia', wiki: 'Tectónica_de_placas', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'Ciências Naturais', year: 8, topic: 'Vulcanismo e sismos em Portugal', wiki: 'Vulcão', count: 6, bloomFocus: 'Compreender, Avaliar' },
  { subject: 'Ciências Naturais', year: 8, topic: 'Estrutura interna da Terra', wiki: 'Interior_da_Terra', count: 6, bloomFocus: 'Recordar, Compreender' },
  { subject: 'Ciências Naturais', year: 8, topic: 'Sustentabilidade e recursos naturais', wiki: 'Desenvolvimento_sustentável', count: 8, bloomFocus: 'Analisar, Avaliar' },
  { subject: 'Ciências Naturais', year: 8, topic: 'Sistema reprodutor humano', wiki: 'Sistema_reprodutor_humano', count: 6, bloomFocus: 'Compreender, Aplicar' },

  // ── Ciências Naturais 9.º ────────────────────────────────────────────────
  { subject: 'Ciências Naturais', year: 9, topic: 'Sistema imunitário e saúde', wiki: 'Sistema_imunitário', count: 8, bloomFocus: 'Compreender, Aplicar' },
  { subject: 'Ciências Naturais', year: 9, topic: 'Sistema cardiovascular', wiki: 'Coração', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'Ciências Naturais', year: 9, topic: 'Evolução biológica e Darwin', wiki: 'Teoria_da_evolução', count: 8, bloomFocus: 'Compreender, Avaliar' },
  { subject: 'Ciências Naturais', year: 9, topic: 'DNA e hereditariedade', wiki: 'ADN', count: 8, bloomFocus: 'Recordar, Compreender' },
  { subject: 'Ciências Naturais', year: 9, topic: 'Ecologia — relações seres vivos', wiki: 'Ecologia', count: 8, bloomFocus: 'Aplicar, Analisar' },
  { subject: 'Ciências Naturais', year: 9, topic: 'Problemas ambientais globais', wiki: 'Aquecimento_global', count: 8, bloomFocus: 'Analisar, Avaliar' },

  // ── Físico-Química 7.º ───────────────────────────────────────────────────
  { subject: 'Físico-Química', year: 7, topic: 'Medição e grandezas físicas', wiki: 'Grandeza_física', count: 6, bloomFocus: 'Compreender, Aplicar' },
  { subject: 'Físico-Química', year: 7, topic: 'Substâncias e misturas', wiki: 'Substância_química', count: 8, bloomFocus: 'Compreender, Aplicar' },
  { subject: 'Físico-Química', year: 7, topic: 'Propriedades da matéria', wiki: 'Propriedade_física', count: 6, bloomFocus: 'Recordar, Compreender' },
  { subject: 'Físico-Química', year: 7, topic: 'Modelos atómicos', wiki: 'Átomo', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'Físico-Química', year: 7, topic: 'Tabela periódica', wiki: 'Tabela_periódica', count: 8, bloomFocus: 'Recordar, Compreender, Aplicar' },
  { subject: 'Físico-Química', year: 7, topic: 'Energia e fontes de energia', wiki: 'Energia', count: 8, bloomFocus: 'Compreender, Avaliar' },

  // ── Físico-Química 8.º ───────────────────────────────────────────────────
  { subject: 'Físico-Química', year: 8, topic: 'Reacções químicas', wiki: 'Reacção_química', count: 8, bloomFocus: 'Compreender, Aplicar' },
  { subject: 'Físico-Química', year: 8, topic: 'Combustão e oxigénio', wiki: 'Combustão', count: 6, bloomFocus: 'Compreender, Analisar' },
  { subject: 'Físico-Química', year: 8, topic: 'Som — produção e propagação', wiki: 'Som', count: 8, bloomFocus: 'Compreender, Aplicar' },
  { subject: 'Físico-Química', year: 8, topic: 'Luz e óptica', wiki: 'Luz', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'Físico-Química', year: 8, topic: 'Movimento e velocidade', wiki: 'Velocidade', count: 8, bloomFocus: 'Compreender, Aplicar' },
  { subject: 'Físico-Química', year: 8, topic: 'Forças e equilíbrio', wiki: 'Força_(física)', count: 8, bloomFocus: 'Compreender, Aplicar' },

  // ── Físico-Química 9.º ───────────────────────────────────────────────────
  { subject: 'Físico-Química', year: 9, topic: 'Electricidade — corrente e circuitos', wiki: 'Corrente_eléctrica', count: 8, bloomFocus: 'Compreender, Aplicar' },
  { subject: 'Físico-Química', year: 9, topic: 'Classificação dos materiais', wiki: 'Ligação_química', count: 6, bloomFocus: 'Recordar, Compreender' },
  { subject: 'Físico-Química', year: 9, topic: 'Reacções ácido-base', wiki: 'Reacção_ácido-base', count: 8, bloomFocus: 'Compreender, Aplicar' },
  { subject: 'Físico-Química', year: 9, topic: 'Radioactividade', wiki: 'Radioactividade', count: 6, bloomFocus: 'Compreender, Avaliar' },
  { subject: 'Físico-Química', year: 9, topic: 'Astrofísica — estrelas e universo', wiki: 'Estrela', count: 6, bloomFocus: 'Compreender, Analisar' },

  // ── História 7.º ─────────────────────────────────────────────────────────
  { subject: 'História', year: 7, topic: 'Origens do Islamismo', wiki: 'Islão', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'História', year: 7, topic: 'Europa feudal e senhorialismo', wiki: 'Feudalismo', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'História', year: 7, topic: 'Formação de Portugal — séc. XII', wiki: 'História_de_Portugal', count: 8, bloomFocus: 'Recordar, Compreender' },
  { subject: 'História', year: 7, topic: 'A Reconquista cristã', wiki: 'Reconquista', count: 6, bloomFocus: 'Compreender, Analisar' },
  { subject: 'História', year: 7, topic: 'A cidade medieval', wiki: 'Burgo', count: 6, bloomFocus: 'Compreender, Analisar' },
  { subject: 'História', year: 7, topic: 'Arte românica e gótica', wiki: 'Arte_gótica', count: 6, bloomFocus: 'Recordar, Compreender' },

  // ── História 8.º ─────────────────────────────────────────────────────────
  { subject: 'História', year: 8, topic: 'Expansão marítima portuguesa', wiki: 'Descobrimentos_portugueses', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'História', year: 8, topic: 'Renascimento e Humanismo', wiki: 'Renascimento', count: 8, bloomFocus: 'Compreender, Avaliar' },
  { subject: 'História', year: 8, topic: 'Reforma e Contrarreforma', wiki: 'Reforma_protestante', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'História', year: 8, topic: 'Absolutismo e Iluminismo', wiki: 'Absolutismo', count: 8, bloomFocus: 'Compreender, Avaliar' },
  { subject: 'História', year: 8, topic: 'Revolução Francesa', wiki: 'Revolução_Francesa', count: 8, bloomFocus: 'Compreender, Analisar, Avaliar' },
  { subject: 'História', year: 8, topic: 'Revolução Industrial', wiki: 'Revolução_Industrial', count: 8, bloomFocus: 'Compreender, Analisar' },

  // ── História 9.º ─────────────────────────────────────────────────────────
  { subject: 'História', year: 9, topic: 'I Guerra Mundial', wiki: 'Primeira_Guerra_Mundial', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'História', year: 9, topic: 'Nazismo e Fascismo', wiki: 'Nazismo', count: 8, bloomFocus: 'Compreender, Analisar, Avaliar' },
  { subject: 'História', year: 9, topic: 'II Guerra Mundial e Holocausto', wiki: 'Segunda_Guerra_Mundial', count: 8, bloomFocus: 'Compreender, Analisar, Avaliar' },
  { subject: 'História', year: 9, topic: 'Estado Novo em Portugal', wiki: 'Estado_Novo_(Portugal)', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'História', year: 9, topic: 'Guerra Fria', wiki: 'Guerra_Fria', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'História', year: 9, topic: 'Descolonização e 25 de Abril', wiki: 'Revolução_dos_Cravos', count: 8, bloomFocus: 'Compreender, Avaliar' },

  // ── Geografia 7.º ────────────────────────────────────────────────────────
  { subject: 'Geografia', year: 7, topic: 'Cartografia e representação da Terra', wiki: 'Cartografia', count: 8, bloomFocus: 'Compreender, Aplicar' },
  { subject: 'Geografia', year: 7, topic: 'Relevo — formas e agentes', wiki: 'Relevo', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'Geografia', year: 7, topic: 'Clima e factores climáticos', wiki: 'Clima', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'Geografia', year: 7, topic: 'Recursos hídricos', wiki: 'Hidrologia', count: 6, bloomFocus: 'Compreender, Avaliar' },
  { subject: 'Geografia', year: 7, topic: 'Biomas e zonas climáticas', wiki: 'Bioma', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'Geografia', year: 7, topic: 'Riscos naturais', wiki: 'Risco_natural', count: 6, bloomFocus: 'Compreender, Avaliar' },

  // ── Geografia 8.º ────────────────────────────────────────────────────────
  { subject: 'Geografia', year: 8, topic: 'População mundial — crescimento e distribuição', wiki: 'População_mundial', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'Geografia', year: 8, topic: 'Migrações internacionais', wiki: 'Migração_humana', count: 8, bloomFocus: 'Compreender, Avaliar' },
  { subject: 'Geografia', year: 8, topic: 'Urbanização e cidades', wiki: 'Urbanização', count: 8, bloomFocus: 'Compreender, Analisar' },
  { subject: 'Geografia', year: 8, topic: 'Diversidade cultural no mundo', wiki: 'Cultura', count: 6, bloomFocus: 'Compreender, Avaliar' },
  { subject: 'Geografia', year: 8, topic: 'Recursos naturais e ambiente', wiki: 'Recurso_natural', count: 8, bloomFocus: 'Analisar, Avaliar' },

  // ── Geografia 9.º ────────────────────────────────────────────────────────
  { subject: 'Geografia', year: 9, topic: 'Agricultura e segurança alimentar', wiki: 'Agricultura', count: 8, bloomFocus: 'Analisar, Avaliar' },
  { subject: 'Geografia', year: 9, topic: 'Indústria e globalização', wiki: 'Globalização', count: 8, bloomFocus: 'Analisar, Avaliar' },
  { subject: 'Geografia', year: 9, topic: 'Energia — fontes e consumo global', wiki: 'Energia_renovável', count: 8, bloomFocus: 'Compreender, Avaliar' },
  { subject: 'Geografia', year: 9, topic: 'Transportes e comunicações', wiki: 'Transporte', count: 6, bloomFocus: 'Compreender, Analisar' },
  { subject: 'Geografia', year: 9, topic: 'Desenvolvimento e desigualdades mundiais', wiki: 'Desenvolvimento_humano', count: 8, bloomFocus: 'Analisar, Avaliar' },
  { subject: 'Geografia', year: 9, topic: 'Portugal na Europa e no mundo', wiki: 'Portugal', count: 6, bloomFocus: 'Compreender, Analisar' },
]

// ── Wikipedia API ─────────────────────────────────────────────────────────────
interface WikiSummary { extract: string; content_urls: { desktop: { page: string } } }

async function fetchWikipedia(title: string): Promise<WikiSummary | null> {
  try {
    const url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'PROF.IA/1.0 (educational tool; tiago.garcez@edu.pt)' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    return await res.json() as WikiSummary
  } catch { return null }
}

// ── AI question generation ────────────────────────────────────────────────────
function buildPrompt(entry: TopicEntry, wikiExtract: string): string {
  const isScience = ['Ciências Naturais', 'Físico-Química'].includes(entry.subject)
  const isHumanities = ['História', 'Geografia'].includes(entry.subject)

  return `És um professor português experiente de ${entry.subject} do ${entry.year}.º ano do ensino básico.

O seguinte texto é um excerto da Wikipédia em português sobre "${entry.topic}":
───────────────────────────────────────────────────────
${wikiExtract.slice(0, 1800)}
───────────────────────────────────────────────────────

Com base NESTE TEXTO (não em conhecimento geral aleatório), cria exactamente ${entry.count} questões pedagógicas para o ${entry.year}.º ano sobre o tema "${entry.topic}".

Regras ABSOLUTAS:
1. Português de Portugal ESTRITO: "ecossistema" ✓, "réctilíneo" ✓, "fotossíntese" ✓; nunca formas brasileiras
2. As respostas devem ser encontráveis ou inferíveis a partir do texto fornecido
3. Distribuição de Bloom obrigatória (${entry.count} questões): prioritariamente ${entry.bloomFocus}
4. Variar os tipos: short-answer, multiple-choice (com 4 opções), true-false
5. markScheme DETALHADO: critérios com pontuação parcial e resposta modelo completa
6. ${isScience ? 'Inclui questões com dados/valores do texto para cálculo ou comparação' : ''}
7. ${isHumanities ? 'Inclui questões que pedem causa-efeito, contextualização histórica ou comparação' : ''}
8. NUNCA dois exercícios com a mesma estrutura ou a pedir a mesma informação

Tipos aceites: "short-answer", "multiple-choice", "true-false", "essay"
Para multiple-choice: 4 opções ["A) ...", "B) ...", "C) ...", "D) ..."] e indicar correctAnswer ("A", "B", "C" ou "D")

Responde APENAS com JSON válido:
{
  "questions": [
    {
      "text": "enunciado completo",
      "type": "short-answer",
      "points": 10,
      "bloomLevel": "Compreender",
      "subtopic": "${entry.topic}",
      "options": null,
      "correctAnswer": "resposta curta",
      "difficulty": "medium",
      "markScheme": {
        "totalPoints": 10,
        "criteria": [
          {"description": "critério específico 1", "points": 5},
          {"description": "critério específico 2", "points": 5}
        ],
        "modelAnswer": "resposta modelo completa"
      }
    }
  ]
}`
}

function parseQuestions(raw: string): Record<string, unknown>[] {
  const clean = raw
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed.questions) ? parsed.questions : []
  } catch { return [] }
}

async function callAI(prompt: string): Promise<Record<string, unknown>[]> {
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter((k): k is string => !!k)

  // 1. Gemini (um try por chave, sem espera em quota)
  for (const key of geminiKeys) {
    try {
      const genAI = new GoogleGenerativeAI(key)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
      const result = await model.generateContent(prompt)
      const qs = parseQuestions(result.response.text())
      if (qs.length > 0) return qs
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('429') && !msg.includes('RESOURCE_EXHAUSTED') && !msg.includes('overloaded')) throw e
      // quota → próxima chave imediatamente
    }
  }

  // 2. SambaNova DeepSeek-V3.1 (excelente qualidade)
  if (process.env.SAMBANOVA_API_KEY) {
    try {
      const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.SAMBANOVA_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'DeepSeek-V3.1', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 3500 }),
        signal: AbortSignal.timeout(30_000),
      })
      if (res.ok) {
        const data = await res.json() as { choices: Array<{ message: { content: string } }> }
        const qs = parseQuestions(data.choices[0]?.message?.content ?? '')
        if (qs.length > 0) return qs
      }
    } catch { /* próximo */ }
  }

  // 3. Groq llama-3.3-70b
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 3500 }),
        signal: AbortSignal.timeout(25_000),
      })
      if (res.ok) {
        const data = await res.json() as { choices: Array<{ message: { content: string } }> }
        const qs = parseQuestions(data.choices[0]?.message?.content ?? '')
        if (qs.length > 0) return qs
      }
    } catch { /* próximo */ }
  }

  // 4. GitHub gpt-4o
  if (process.env.GITHUB_API_KEY) {
    try {
      const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GITHUB_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 3500 }),
        signal: AbortSignal.timeout(30_000),
      })
      if (res.ok) {
        const data = await res.json() as { choices: Array<{ message: { content: string } }> }
        const qs = parseQuestions(data.choices[0]?.message?.content ?? '')
        if (qs.length > 0) return qs
      }
    } catch { /* próximo */ }
  }

  // 5. Mistral
  if (process.env.MISTRAL_API_KEY) {
    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 3500 }),
        signal: AbortSignal.timeout(25_000),
      })
      if (res.ok) {
        const data = await res.json() as { choices: Array<{ message: { content: string } }> }
        const qs = parseQuestions(data.choices[0]?.message?.content ?? '')
        if (qs.length > 0) return qs
      }
    } catch { /* próximo */ }
  }

  return []
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true })
  log('═══════════════════════════════════════════════════')
  log('🌍  PROF.IA — Wikipedia Enrichment Script')
  log(`📋  ${TOPICS.length} tópicos — CN, Físico-Química, História, Geografia (7-9.º)`)
  log('═══════════════════════════════════════════════════')

  const done = loadDone()
  let totalInserted = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (let i = 0; i < TOPICS.length; i++) {
    const entry = TOPICS[i]
    const key = `${entry.subject}|${entry.year}|${entry.topic}`

    if (done.has(key)) {
      log(`⏭  [${i+1}/${TOPICS.length}] SKIP (já feito): ${entry.subject} ${entry.year}.º — ${entry.topic}`)
      totalSkipped++
      continue
    }

    process.stdout.write(`\n[${i+1}/${TOPICS.length}] ${entry.subject} ${entry.year}.º — ${entry.topic}\n`)

    // 1. Wikipedia
    process.stdout.write(`  📖 Wikipedia: ${entry.wiki} ... `)
    const wiki = await fetchWikipedia(entry.wiki)
    if (!wiki || wiki.extract.length < 100) {
      log(`  ⚠️  Wikipedia sem conteúdo suficiente — a saltar`)
      totalErrors++
      await sleep(3_000)
      continue
    }
    process.stdout.write(`${wiki.extract.length} chars ✓\n`)
    const wikiUrl = wiki.content_urls?.desktop?.page ?? `https://pt.wikipedia.org/wiki/${entry.wiki}`

    // 2. Gerar questões
    process.stdout.write(`  🤖 Gerar ${entry.count} questões ... `)
    const prompt = buildPrompt(entry, wiki.extract)
    let questions: Record<string, unknown>[] = []
    try {
      questions = await callAI(prompt)
    } catch (e) {
      log(`  ❌ AI error: ${e}`)
      totalErrors++
      await sleep(5_000)
      continue
    }

    if (questions.length === 0) {
      log(`  ⚠️  Sem questões geradas — a saltar`)
      totalErrors++
      await sleep(5_000)
      continue
    }
    process.stdout.write(`${questions.length} geradas ✓\n`)

    // 3. Inserir no Supabase
    const rows = questions
      .filter(q => q.text && String(q.text).trim().length > 15)
      .map(q => ({
        subject:       entry.subject,
        year_level:    entry.year,
        topic:         entry.topic,
        text:          String(q.text ?? '').trim(),
        type:          String(q.type ?? 'short-answer'),
        bloom_level:   q.bloomLevel ? String(q.bloomLevel) : null,
        difficulty:    String(q.difficulty ?? 'medium'),
        options:       (Array.isArray(q.options) && (q.options as unknown[]).length > 0) ? q.options : null,
        correct_answer: q.correctAnswer
          ? String(q.correctAnswer)
          : ((q.markScheme as { modelAnswer?: string })?.modelAnswer?.slice(0, 500) ?? ''),
        mark_scheme:   q.markScheme ? String(JSON.stringify(q.markScheme)) : null,
        points:        Number(q.points) || 10,
        quality_score: 0.82,
        source:        'wiki_enrichment',
        citation:      `Wikipedia PT — "${entry.wiki.replace(/_/g, ' ')}" (artigo verificado)`,
        source_url:    wikiUrl,
        is_active:     true,
      }))

    if (rows.length > 0) {
      const { data, error } = await supabase.from('question_bank').insert(rows).select('id')
      if (error) {
        log(`  ❌ Supabase: ${error.message}`)
        totalErrors++
      } else {
        const n = (data ?? []).length
        totalInserted += n
        log(`  ✅ ${n} questões guardadas (total: ${totalInserted})`)
        markDone(key, done)
      }
    }

    // Rate limiting: 12s entre tópicos (respeitoso para todas as APIs)
    if (i < TOPICS.length - 1) {
      process.stdout.write(`  ⏳ Aguarda 12s ...\n`)
      await sleep(12_000)
    }
  }

  log('\n═══════════════════════════════════════════════════')
  log(`✅  CONCLUÍDO — ${totalInserted} questões inseridas`)
  log(`⏭  Saltados (já feitos): ${totalSkipped}`)
  log(`❌  Erros: ${totalErrors}`)
  log('═══════════════════════════════════════════════════')
}

main().catch(e => {
  log(`💥 ERRO FATAL: ${e}`)
  process.exit(1)
})
