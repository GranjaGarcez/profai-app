import { readFileSync } from 'node:fs'
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !line.startsWith('#')) process.env[m[1]] ??= m[2]
}
;(async () => {
  const { generateWithFallback, parseJsonObject } = await import('../src/lib/ai/cascade')

  // Teste-fonte (CN 5.º — A Terra, um planeta especial)
  const source = {
    title: 'Ficha de Avaliação de Ciências Naturais — A Terra, um planeta especial',
    groups: [
      { label: 'Grupo I', description: 'Escolha múltipla (20 pontos)', questions: [
        { type:'multiple_choice', bloomLevel:'Compreender', points:10, text:'Qual das condições da Terra permite a existência de água no estado líquido?', options:['A) A distância ao Sol','B) A cor dos oceanos','C) O número de satélites','D) A velocidade de rotação'], correctAnswer:'A', markScheme:'Resposta: A (10pt). Errada = 0pt.' },
        { type:'multiple_choice', bloomLevel:'Compreender', points:10, text:'A camada gasosa que envolve a Terra e permite a respiração chama-se:', options:['A) hidrosfera','B) atmosfera','C) geosfera','D) biosfera'], correctAnswer:'B', markScheme:'Resposta: B (10pt). Errada = 0pt.' },
      ]},
      { label: 'Grupo II', description: 'Resposta curta (30 pontos)', questions: [
        { type:'short_answer', bloomLevel:'Aplicar', points:15, text:'Explica por que razão a distância da Terra ao Sol é importante para a existência de vida.', correctAnswer:'Permite temperaturas amenas e água líquida.', markScheme:'identificação (5pt) + explicação (10pt).' },
        { type:'short_answer', bloomLevel:'Analisar', points:15, text:'Indica duas diferenças entre a Terra e a Lua que expliquem a ausência de vida na Lua.', correctAnswer:'Ausência de atmosfera e de água líquida.', markScheme:'cada diferença correcta (7,5pt).' },
      ]},
      { label: 'Grupo III', description: 'Situação-problema (50 pontos)', questions: [
        { type:'long_answer', bloomLevel:'Avaliar', points:50, text:'Um cientista afirma que um planeta muito mais próximo do Sol do que a Terra poderia ter vida como a nossa. Concordas? Justifica com base nas condições da Terra que permitem a vida.', correctAnswer:'Não; demasiado calor, sem água líquida, atmosfera instável.', markScheme:'posição (10pt) + 2 condições (20pt) + coerência (20pt).' },
      ]},
    ],
  }

  const NOTE_A = `
NÍVEL DE DIFERENCIAÇÃO — A (APOIO), invisível para o aluno:
• Reduz a exigência cognitiva: prioriza Bloom Recordar/Compreender/Aplicar — evita Analisar/Avaliar/Criar.
• Números e contextos mais simples; scaffolding visível (passos sugeridos).
• Distratores menos subtis. PROIBIDO mencionar "nível"/"apoio"/"fácil".`

  const src = source.groups.map(g => ({ label:g.label, description:g.description, questions: g.questions.map(q => ({ type:q.type, bloomLevel:q.bloomLevel, points:q.points, text:q.text, options:(q as {options?:unknown}).options ?? null, correctAnswer:q.correctAnswer, markScheme:q.markScheme })) }))
  const prompt = `És um professor especialista de Ciências Naturais do 5.º ano em Portugal (AE DGE).

TAREFA: ADAPTA o teste ORIGINAL abaixo, mantendo a base estrutural.
REGRAS DE PRESERVAÇÃO (invioláveis):
• Mesmo número de questões, mesmos grupos e rótulos, mesma ordem e mesmo "type" de cada questão.
• Mantém a cotação ("points") de cada questão IGUAL ao original (soma 100).
• Cada questão avalia o MESMO conceito da original — muda forma/exigência conforme o nível, nunca o conteúdo.
• NÃO acrescentes/removas questões. Título IDÊNTICO.${NOTE_A}
Português de Portugal estrito; dirige-te ao aluno por "tu"; markScheme com pontos que somam "points"; PROIBIDO LaTeX; figure:null.

TESTE ORIGINAL (JSON):
${JSON.stringify({ title: source.title, groups: src })}

Responde APENAS com JSON válido, MESMA estrutura: {"title":"${source.title}","subject":"Ciências Naturais","yearLevel":5,"topic":"A Terra, um planeta especial","difficulty":"medium","totalPoints":100,"duration":50,"instructions":"...","groups":[{"label":"...","description":"...","totalPoints":0,"questions":[{"index":1,"type":"...","bloomLevel":"...","text":"...","figure":null,"options":[...] ou null,"correctAnswer":"...","points":0,"allowCalculator":false,"markScheme":"..."}]}]}`

  const t0 = Date.now()
  const r = await generateWithFallback(prompt, 58_000)
  const adapted = parseJsonObject(r.text) as any
  console.log(`\n${((Date.now()-t0)/1000).toFixed(1)}s | modelo: ${r.modelUsed} | fallback: ${r.isFallback}`)
  const srcQ = source.groups.flatMap(g=>g.questions)
  const adQ = (adapted?.groups??[]).flatMap((g:any)=>g.questions??[])
  console.log(`Título igual: ${adapted?.title === source.title}`)
  console.log(`Nº questões: fonte ${srcQ.length} → adaptado ${adQ.length}`)
  console.log(`Tipos iguais: ${JSON.stringify(srcQ.map(q=>q.type))===JSON.stringify(adQ.map((q:any)=>q.type))}`)
  console.log(`Pontos iguais: ${JSON.stringify(srcQ.map(q=>q.points))===JSON.stringify(adQ.map((q:any)=>q.points))} (${adQ.map((q:any)=>q.points).join('+')} = ${adQ.reduce((s:number,q:any)=>s+(q.points||0),0)})`)
  console.log('\n── ORIGINAL vs ADAPTADO (nível A) ──')
  srcQ.forEach((q,i)=>{ console.log(`\n[${i+1}] ${q.type} ${q.points}pt`); console.log(` orig: ${q.text.slice(0,120)}`); console.log(`  adA: ${String(adQ[i]?.text??'—').slice(0,120)}`) })
})()
