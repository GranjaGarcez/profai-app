// Agente de teste Mistral — corre o prompt de docs/prompt-testes-excecionais.md em 3 casos
// reais (Matemática 6.º, Ciências 6.º, HGP 5.º) e audita cobertura, Bloom, somas e PT-PT.
// Re-validação após qualquer alteração ao prompt:  node scripts/mistral-test-agent.mjs
import { readFileSync } from 'node:fs'

// ── ler MISTRAL_API_KEY do .env.local ───────────────────────────────────────
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const KEY = (env.match(/^MISTRAL_API_KEY=(.+)$/m) || [])[1]?.trim()
if (!KEY) { console.error('Sem MISTRAL_API_KEY'); process.exit(1) }

// ── prompt-sistema (versão gourmet, com slots já preenchidos por caso) ───────
function buildPrompt(c) {
  return `És professor especialista de avaliação em Portugal, com 20 anos de sala de aula.
Tarefa única: conceber UMA ficha de avaliação EXCECIONAL — instrumento válido, com
cobertura curricular garantida, Bloom calibrado e corrigenda que uma IA consiga aplicar.
Planeias em silêncio e emites APENAS o JSON final.

REGRAS INVIOLÁVEIS:
1. Só JSON válido e completo. 2. Português de Portugal (nunca PT-BR).
3. Soma de todos os "points" = EXACTAMENTE 100.
4. Em cada questão, soma das parcelas do "markScheme" = "points" da questão.
5. Em questões com números, refaz o cálculo do zero antes de escrever a resposta.
6. Corrigenda e rubrica pensadas para correcção por IA: resposta-modelo completa +
   critérios atómicos, observáveis e somáveis.

PARÂMETROS: ${c.disciplina} · ${c.ano}.º ano · Tópico "${c.topico}" · Total 100 pontos.

ESPECIFICIDADES: ${c.perfil}
Distribuição Bloom-alvo (${c.ano}.º ano): ${c.bloom}

FASE 1 — MATRIZ DE ESPECIFICAÇÃO (antes de qualquer questão).
Sub-aprendizagens oficiais DGE deste tópico (usa o texto exacto):
${c.sub.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}
FORA deste ano (PROIBIDO testar): ${c.cannot}
Distribui as questões pelas sub-aprendizagens: nenhuma central a 0, nenhuma >40% do total.
A distribuição Bloom do conjunto respeita o alvo. Cada linha da matriz = uma questão.
OBRIGATÓRIO: soma a coluna "pontos" da matriz. Tem de dar EXACTAMENTE 100. Se der mais ou
menos, ajusta a cotação das linhas ATÉ somar 100 antes de passares à Fase 2. Nunca >100.

FASE 2 — Escreve as questões que preenchem a matriz; cada uma herda sub-aprendizagem,
Bloom e cotação da sua linha.

PT-PT — escreve a forma CERTA, nunca a errada: actividade≠atividade, óptimo≠ótimo,
facto≠fato, rectângulo≠retângulo, fracção≠fração, percentagem≠porcentagem, acção≠ação,
directo≠direto, correcto≠correto. ("equação","solução","análise","fórmula" são iguais — usa-as.)

QUALIDADE: cada questão específica ao tópico; contexto real português; distratores =
erros conceptuais reais. RIQUEZA: proibido quase-clones (mesma estrutura, dados trocados).
ACUIDADE: cada item mede UMA competência; resposta única e inequívoca; sem pistas de teste.

CORRIGENDA E RUBRICAS (correcção por IA):
A) "correctAnswer" = resposta-modelo que vale 100% (long_answer: texto-modelo real ≥40 palavras).
B) "markScheme" = rubrica analítica, gramática fixa:
   "Critério A: <descritor verificável> (Xpt) + Critério B: <descritor> (Ypt) = TOTALpt"
   Descritores verificáveis ("identifica X","cálculo sem erro"), nunca vagos ("responde bem").
   REGRA CRÍTICA DE FORMATO: o ÚNICO sítio onde escreves "pt" é no total de cada critério, "(Xpt)".
   As bandas de crédito parcial vão em parênteses RECTOS, com números NUS, NUNCA "pt":
   ex: "Conteúdo: nomeia 2 factores (8pt) [crédito: 8 se ambos · 4 se um · 0 se nenhum] +
        Organização: ideia central e desenvolvimento (4pt) [crédito: 4 completo · 2 parcial] +
        Vocabulário científico correcto (4pt) = 16pt".
   A soma dos totais de critério (os "Xpt") = "points". Confirma essa soma antes de escrever.

SCHEMA EXACTO:
{"matriz":[{"aprendizagem":str,"bloom":str,"tipo":str,"pontos":int}],
 "questions":[{"type":str,"text":str,"options":["A) ..","B) ..","C) ..","D) .."]|null,
   "correctAnswer":str,"points":int,"markScheme":str,"bloomLevel":str,"aprendizagem":str}]}

Tipos permitidos: ${c.tipos}. Antes de emitir, verifica: soma=100, cada markScheme soma
os points, cada aprendizagem está na lista, Bloom respeita o alvo, cálculos refeitos,
sem clones, PT-PT. Emite APENAS o JSON.`
}

// ── 3 casos com dados curriculares reais ─────────────────────────────────────
const CASES = [
  {
    disciplina: 'Matemática', ano: 6, topico: 'Proporcionalidade e percentagens',
    tipos: 'multiple_choice, true_false, short_answer, long_answer',
    bloom: '20% Recordar · 35% Compreender/Aplicar · 45% Analisar/Avaliar',
    perfil: 'Mix: selecção (EM/VF) + resposta curta com cálculos apresentados + 1–2 desenvolvimento. Cotação flexível somando 100. Apresentação de cálculos obrigatória.',
    cannot: 'Volume de pirâmides/cones/esferas; teorema de Pitágoras; equações do 2.º grau.',
    sub: [
      'Percentagens: descontos, aumentos, IVA, problemas de percentagens em contexto',
      'Razão e proporção: conceito de razão, proporção, propriedade fundamental',
      'Proporcionalidade directa: identificação, tabelas, gráficos, constante de proporcionalidade',
      'Proporcionalidade inversa: conceito, tabelas, gráficos, produto constante',
      'Regra de três simples directa e inversa',
    ],
  },
  {
    disciplina: 'Ciências Naturais', ano: 6, topico: 'Processos vitais comuns aos seres vivos',
    tipos: 'multiple_choice, true_false, short_answer, long_answer',
    bloom: '20% Recordar · 35% Compreender/Aplicar · 45% Analisar/Avaliar',
    perfil: 'Grupo I selecção (EM/VF), Grupo II análise/resposta curta, Grupo III desenvolvimento. Terminologia científica rigorosa.',
    cannot: 'Sistema nervoso e endócrino (7.º ano); genética (8.º ano); evolução (9.º ano).',
    sub: [
      'Nutrição: sistema digestivo humano (órgãos, funções, digestão mecânica e química), absorção',
      'Respiração: sistema respiratório (órgãos e funções), trocas gasosas nos alvéolos',
      'Circulação: sistema circulatório (coração, vasos, sangue), pequena e grande circulação',
      'Excreção: sistema excretor (rins, ureteres, bexiga), urina, importância da excreção',
      'Reprodução humana: sistema reprodutor, fecundação, desenvolvimento fetal',
    ],
  },
  {
    disciplina: 'História e Geografia de Portugal', ano: 5, topico: 'A Formação de Portugal',
    tipos: 'multiple_choice, true_false, short_answer, long_answer',
    bloom: '20% Recordar · 35% Compreender/Aplicar · 45% Analisar/Avaliar',
    perfil: 'Grupo I selecção 20pts (EM/VF). Grupo II análise de documento incorporado no enunciado 40pts. Grupo III desenvolvimento breve 40pts. Linguagem simples (10–12 anos).',
    cannot: 'Portugal séculos XVI-XVIII (6.º ano); expansão marítima detalhada (já no 5.º mas noutro tópico).',
    sub: [
      'Reconquista cristã: reinos cristãos, reconquista, Condado Portucalense',
      'D. Afonso Henriques: Batalha de S. Mamede (1128), independência (1143)',
      'Formação do Reino de Portugal: fronteiras, 1.ª Dinastia (Afonsina)',
      'Consolidação do território: D. Dinis, estrutura social (povo, clero, nobreza)',
      'Crise de 1383-85: D. Fernando, D. João I, Aljubarrota',
    ],
  },
]

// ── chamar Mistral ───────────────────────────────────────────────────────────
async function callMistral(prompt) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4, max_tokens: 6000,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.choices[0].message.content
}

// ── auditoria do output ──────────────────────────────────────────────────────
const POINT_RE = /(=\s*)?(\d+(?:[.,]\d+)?)(\s*)(pts?|pontos?)\b/gi
function sumCriteria(ms) {
  const all = [...String(ms || '').matchAll(POINT_RE)]
  const crit = all.filter(m => !m[1]).map(m => parseFloat(m[2].replace(',', '.')))
  return crit.reduce((a, b) => a + b, 0)
}
const ptBR = /\b(atividade|ótimo|fato|retângulo|fração|porcentagem|ação|direto|objeto|efetivo|atual)\b/gi

function audit(c, raw) {
  let p
  try { p = JSON.parse(raw) } catch (e) { return console.log('  ❌ JSON inválido:', e.message, '\n', raw.slice(0, 300)) }
  const qs = p.questions || []
  const total = qs.reduce((a, q) => a + (Number(q.points) || 0), 0)
  // cobertura
  const covered = new Set(qs.map(q => q.aprendizagem))
  const missing = c.sub.filter(s => ![...covered].some(cv => cv && (cv.includes(s.slice(0, 25)) || s.includes(String(cv).slice(0, 25)))))
  // bloom
  const bloom = {}
  qs.forEach(q => { bloom[q.bloomLevel] = (bloom[q.bloomLevel] || 0) + 1 })
  // markScheme sums
  const badSum = qs.filter(q => Math.abs(sumCriteria(q.markScheme) - (Number(q.points) || 0)) >= 0.5)
  // PT-BR
  const brHits = [...String(raw).matchAll(ptBR)].map(m => m[0])

  console.log(`\n━━━ ${c.disciplina} ${c.ano}.º — "${c.topico}" ━━━`)
  console.log(`  Questões: ${qs.length} · Soma points: ${total} ${total === 100 ? '✅' : '❌'}`)
  console.log(`  Matriz: ${(p.matriz || []).length} linhas ${(p.matriz || []).length === qs.length ? '✅' : '⚠️ ≠ nº questões'}`)
  console.log(`  Cobertura sub-aprendizagens: ${c.sub.length - missing.length}/${c.sub.length} ${missing.length === 0 ? '✅' : '⚠️ falta: ' + missing.map(m => m.slice(0, 30)).join(' | ')}`)
  console.log(`  Bloom: ${JSON.stringify(bloom)}`)
  console.log(`  markScheme soma=points: ${qs.length - badSum.length}/${qs.length} ${badSum.length === 0 ? '✅' : '❌ ' + badSum.length + ' erradas'}`)
  console.log(`  PT-BR detectado: ${brHits.length === 0 ? 'nenhum ✅' : '❌ ' + [...new Set(brHits)].join(', ')}`)
  // mostrar matriz
  console.log('  ── Matriz ──')
  ;(p.matriz || []).forEach((m, i) => console.log(`    ${i + 1}. [${m.bloom}|${m.tipo}|${m.pontos}pt] ${String(m.aprendizagem).slice(0, 50)}`))
  // mostrar 2 rubricas (preferir long_answer)
  const devs = qs.filter(q => q.type === 'long_answer')
  const show = (devs.length ? devs : qs).slice(0, 2)
  console.log('  ── Amostra de rubricas ──')
  show.forEach(q => {
    console.log(`    • [${q.type}|${q.points}pt] ${String(q.text).slice(0, 70)}...`)
    console.log(`      corrigenda: ${String(q.correctAnswer).slice(0, 90)}`)
    console.log(`      rubrica:    ${q.markScheme}`)
  })
}

// ── correr os 3 casos ────────────────────────────────────────────────────────
for (const c of CASES) {
  try {
    const raw = await callMistral(buildPrompt(c))
    audit(c, raw)
  } catch (e) { console.log(`\n❌ ${c.disciplina}: ${e.message}`) }
}
