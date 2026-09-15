import { readFileSync, writeFileSync } from 'node:fs'
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !line.startsWith('#')) process.env[m[1]] ??= m[2]
}
const TOPIC = 'A Terra, um planeta especial'
const N = Number(process.argv[2] ?? 12)
const PROMPT = `És um professor especialista de Ciências Naturais do 5.º ano em Portugal, com mais de 15 anos de experiência em avaliação.

TAREFA: Cria uma ficha de avaliação EXCELENTE sobre "${TOPIC}".
Duração: 50 minutos | Dificuldade: Média | Total: ${N} questões | 100 pontos

ESTRUTURA (Ciências Naturais): Grupo I escolha múltipla (20pt) · Grupo II resposta curta (30pt) · Grupo III situação-problema (50pt)

CURRÍCULO OBRIGATÓRIO — Ciências Naturais 5.º ano (AE DGE)
DOMÍNIO: A Terra, um planeta com vida / A importância das rochas e do solo... — subdomínio "A Terra, um planeta especial":
  • Condições da Terra que permitem a existência de vida: distância ao Sol e temperatura amena; presença de água no estado líquido; atmosfera com oxigénio e camada protectora; tempo de rotação/translação.
  • A Terra como sistema: interacção entre subsistemas (atmosfera, hidrosfera, geosfera, biosfera).
  • Comparação da Terra com outros planetas do sistema solar quanto às condições para a vida.
✅ PODES AVALIAR: as condições que tornam a Terra especial para a vida; os subsistemas terrestres e a sua interacção; comparação simples Terra/Lua/outros planetas.
❌ NÃO PERTENCE A ESTE ANO: composição química da atmosfera em detalhe, leis de Kepler, fotossíntese ao nível celular, tectónica de placas.

DIRECTRIZES PEDAGÓGICAS OBRIGATÓRIAS:
1. BLOOM: distribui; análise/avaliação valem mais.
2. CONTEXTO real para 10-11 anos, Português de Portugal estrito.
VARIEDADE E RIQUEZA: Cobre pelo menos ${Math.ceil(N*0.6)} sub-aspectos DISTINTOS de "${TOPIC}".

Responde APENAS com este JSON válido (sem texto, sem markdown, sem \`\`\`):
{"title":"Ficha de Avaliação de Ciências Naturais — ${TOPIC}","subject":"Ciências Naturais","yearLevel":5,"topic":"${TOPIC}","difficulty":"medium","totalPoints":100,"duration":50,"instructions":"...","groups":[{"label":"Grupo I","description":"Escolha múltipla (20 pontos)","totalPoints":20,"questions":[{"index":1,"type":"multiple_choice","bloomLevel":"Compreender","text":"<<GERA>>","figure":null,"options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":"A","points":4,"allowCalculator":false,"markScheme":"..."}]}]}`

;(async () => {
  const { buildMatrix, generateChunked, parseJsonObject } = await import('../src/lib/ai/cascade')
  const meta = { subject: 'Ciências Naturais', yearLevel: 5, topic: TOPIC }
  const { buildProviders } = await import('../src/lib/ai/cascade')
  console.log('══ MATRIZ ══')
  const mtx = await buildMatrix(PROMPT, meta, N, ['multiple_choice','true_false','short_answer','long_answer'], [], buildProviders(), 12_000)
  if (mtx) mtx.forEach((c,i)=>console.log(`  ${String(i+1).padStart(2)}. [${c.grupo} · ${c.tipo} · ${c.bloom} · ${c.pontos}pt] ${c.faceta.slice(0,90)}`))
  else console.log('  (matriz falhou — cairia no modo genérico)')
  console.log(`  soma pontos: ${mtx?.reduce((s,c)=>s+c.pontos,0)}`)

  console.log('\n══ TESTE GERADO (colado à matriz) ══')
  const t0 = Date.now()
  const r = await generateChunked(PROMPT, N, { meta, types: ['multiple_choice','true_false','short_answer','long_answer'] })
  const obj = parseJsonObject(r.text) as any
  console.log(`  ${((Date.now()-t0)/1000).toFixed(1)}s | modelo: ${r.modelUsed} | fallback: ${r.isFallback} | blocos ${r.partsOk}/${r.parts}`)
  const qs = (obj?.groups??[]).flatMap((g:any)=>g.questions??[])
  console.log(`  ${qs.length} questões | ${qs.reduce((s:number,q:any)=>s+(q.points||0),0)} pts`)
  for (const g of obj?.groups??[]) { console.log(` ${g.label} (${g.totalPoints}pt)`); for (const q of g.questions??[]) console.log(`   ${q.index}. [${q.type} ${q.points}pt] ${String(q.text).replace(/\s+/g,' ').slice(0,110)}`) }
  writeFileSync('scripts/.last-test.json', JSON.stringify(obj, null, 2))
})()
