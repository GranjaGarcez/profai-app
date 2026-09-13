// Teste local do motor de IA (sem Next, sem Supabase, sem login).
//   npx tsx scripts/test-cascade.ts            → sonda cada fornecedor + geração completa
//   npx tsx scripts/test-cascade.ts probe      → só a sonda
//   npx tsx scripts/test-cascade.ts full [N]   → só a geração completa de N questões
import { readFileSync, writeFileSync } from 'node:fs'
import { buildProviders, chunkPrompt, generateChunked, parseJsonObject, callOpenAICompat } from '../src/lib/ai/cascade'

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !line.startsWith('#')) process.env[m[1]] ??= m[2]
}

const N = Number(process.argv[3] ?? 12)
const TOPIC = 'A Célula, Unidade fundamental da vida.'
const PROMPT = `És um professor especialista de Ciências Naturais do 5.º ano em Portugal (Aprendizagens Essenciais DGE), com mais de 15 anos de experiência em avaliação.

TAREFA: Cria uma ficha de avaliação EXCELENTE sobre "${TOPIC}".
Duração: 50 minutos | Dificuldade: Média | Total: ${N} questões | 100 pontos

ESTRUTURA (Ciências Naturais):
Grupo I — Escolha múltipla (4 opções, 1 correcta) — 20 pontos
Grupo II — Verdadeiro/Falso e resposta curta com justificação — 30 pontos
Grupo III — Situação-problema com interpretação de dados e explicação científica — 50 pontos

CURRÍCULO OBRIGATÓRIO (Aprendizagens Essenciais — Ciências Naturais, 5.º ano):
• Reconhecer a célula como unidade básica de todos os seres vivos, observando-a ao microscópio.
• Distinguir seres unicelulares de pluricelulares; identificar níveis de organização (célula → tecido → órgão → sistema → organismo).
• Identificar os constituintes comuns da célula (membrana celular, citoplasma, núcleo) e os exclusivos da célula vegetal (parede celular, cloroplastos, vacúolo).
• Utilizar correctamente o microscópio óptico e preparar uma observação simples (epiderme da cebola, água de um charco).

DIRECTRIZES OBRIGATÓRIAS:
1. BLOOM: distribui por níveis cognitivos; questões de análise/avaliação valem mais.
2. CONTEXTO real e significativo para alunos de 10-11 anos (quotidiano português).
3. DISTRATORES plausíveis (erros conceptuais reais), nunca absurdos.
4. LINGUAGEM: Português de Portugal estrito — "correcto", "actividade", "objectivo", "facto", "óptimo" (nunca formas brasileiras).
5. COTAÇÃO: totalPoints = 100 exactamente; pontos inteiros.
6. markScheme OBRIGATÓRIO e específico em cada questão; parcelas em pt cuja soma = "points".
7. PROIBIDO LaTeX; usa Unicode. "figure": null.

VARIEDADE: Cobre pelo menos ${Math.ceil(N * 0.6)} sub-aspectos DISTINTOS de "${TOPIC}" — nunca repitas conceito, procedimento ou contexto.

Responde APENAS com este JSON válido (sem texto, sem markdown, sem \`\`\`):
{
  "title": "Ficha de Avaliação de Ciências Naturais — ${TOPIC}",
  "subject": "Ciências Naturais", "yearLevel": 5, "topic": "${TOPIC}", "difficulty": "medium",
  "totalPoints": 100, "duration": 50,
  "instructions": "Lê atentamente cada questão antes de responder.",
  "groups": [
    { "label": "Grupo I", "description": "Escolha múltipla — selecciona a única opção correcta. (20 pontos)", "totalPoints": 20,
      "questions": [ { "index": 1, "type": "multiple_choice", "bloomLevel": "Compreender", "text": "<<GERA_AQUI>>", "figure": null,
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctAnswer": "A", "points": 4, "allowCalculator": false,
        "markScheme": "Resposta: A (4pt). A opção B induz o erro de [...]. Resposta errada = 0pt." } ] },
    { "label": "Grupo II", "description": "Verdadeiro/Falso e resposta curta. (30 pontos)", "totalPoints": 30,
      "questions": [ { "index": 6, "type": "short_answer", "bloomLevel": "Aplicar", "text": "<<GERA_AQUI>>", "figure": null,
        "correctAnswer": "Resposta modelo completa", "points": 10, "allowCalculator": false,
        "markScheme": "identificação do conceito (3pt) + explicação científica fundamentada (4pt) + terminologia correcta (3pt)" } ] },
    { "label": "Grupo III", "description": "Situação-problema. (50 pontos)", "totalPoints": 50,
      "questions": [ { "index": 9, "type": "long_answer", "bloomLevel": "Analisar", "text": "<<GERA_AQUI>>", "figure": null,
        "correctAnswer": "Resposta modelo completa", "points": 20, "allowCalculator": false,
        "markScheme": "Identificação do fenómeno (4pt) + Explicação causa-efeito (8pt) + Terminologia (4pt) + Conclusão (4pt)" } ] }
  ]
}`

const BR = /\b(correto|correta|atividade|atividades|objetivo|objetivos|aspeto|aspetos|ótimo|ótima|fato|direto|direta|ação|coleção|seleção)\b/gi
const s = (ms: number) => `${(ms / 1000).toFixed(1)}s`

function summarize(obj: Record<string, unknown> | null) {
  if (!obj) return 'JSON inválido'
  const groups = (obj.groups ?? []) as Array<{ label: string; totalPoints?: number; questions: Array<{ type: string; points: number; text: string; markScheme?: string; correctAnswer?: unknown }> }>
  const all = groups.flatMap(g => g.questions ?? [])
  const pts = all.reduce((a, q) => a + (Number(q.points) || 0), 0)
  const blob = JSON.stringify(obj)
  const br = [...new Set((blob.match(BR) ?? []).map(w => w.toLowerCase()))]
  const missing = all.filter(q => !q.markScheme || q.correctAnswer == null).length
  return `${all.length} questões | ${pts} pts | grupos: ${groups.map(g => `${g.label}(${(g.questions ?? []).length}q/${g.totalPoints ?? '?'}pt)`).join(', ')} | sem markScheme/resposta: ${missing} | PT-BR: ${br.length ? br.join(',') : 'nenhum'}`
}

async function probe() {
  console.log('\n══ SONDA: um bloco de 4 questões por fornecedor (paralelo, como em produção) ══')
  const provs = buildProviders().filter(p => p.tier === 1)
  const p4 = chunkPrompt(PROMPT, 4, 1, 3)
  await Promise.all(provs.map(async p => {
    const t0 = Date.now()
    const text = await callOpenAICompat(p.url, p.key, p.model, p4, p.timeoutMs, p.label, p.headers ?? {}, p.system, p.maxTokens, p.extraBody)
    const obj = text ? parseJsonObject(text) : null
    console.log(`  ${p.label.padEnd(20)} ${s(Date.now() - t0).padStart(6)}  ${text ? `${text.length} chars → ${summarize(obj)}` : 'FALHOU'}`)
  }))
}

async function full() {
  console.log(`\n══ GERAÇÃO COMPLETA: ${N} questões por blocos ══`)
  const t0 = Date.now()
  const r = await generateChunked(PROMPT, N)
  const obj = parseJsonObject(r.text)
  console.log(`  ${s(Date.now() - t0)} | blocos ${r.partsOk}/${r.parts} | modelos: ${r.modelUsed} | fallback: ${r.isFallback}`)
  console.log('  ' + summarize(obj))
  const groups = (obj?.groups ?? []) as Array<{ label: string; questions: Array<{ index: number; type: string; points: number; text: string }> }>
  for (const g of groups) for (const q of g.questions) console.log(`   ${String(q.index).padStart(2)}. [${q.type} ${q.points}pt] ${q.text.replace(/\s+/g, ' ').slice(0, 95)}`)
  writeFileSync('scripts/.last-test.json', JSON.stringify(obj, null, 2))
  console.log('  → scripts/.last-test.json')
}

const mode = process.argv[2] ?? 'all'
;(async () => {
  if (mode === 'probe' || mode === 'all') await probe()
  if (mode === 'full' || mode === 'all') await full()
})()
