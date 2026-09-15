import { readFileSync } from 'node:fs'
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !line.startsWith('#')) process.env[m[1]] ??= m[2]
}
;(async () => {
  const { getCurriculumConstraint } = await import('../src/lib/curriculum')
  const { buildMatrix, buildProviders } = await import('../src/lib/ai/cascade')
  const meta = { subject: 'Ciências Naturais', yearLevel: 5, topic: 'A Terra, um planeta especial' }
  const curr = getCurriculumConstraint('Ciências Naturais', 5)
  console.log('Currículo inclui "A Terra, um planeta com vida"?', curr.includes('A Terra, um planeta com vida'))
  // Prompt mínimo com o bloco real de currículo (buildMatrix extrai a partir de CURRÍCULO OBRIGATÓRIO)
  const base = `Ficha de CN 5.º sobre "${meta.topic}". Total: 8 questões | 100 pontos\n${curr}\nDIRECTRIZES: gerar questões alinhadas.`
  for (const diff of ['easy','hard'] as const) {
    console.log(`\n══ MATRIZ — dificuldade ${diff} ══`)
    const mtx = await buildMatrix(base, meta, 8, ['multiple_choice','true_false','short_answer','long_answer'], [], buildProviders(), 12_000, diff)
    if (!mtx) { console.log('  (falhou)'); continue }
    const bloom: Record<string,number> = {}
    mtx.forEach(c=>{bloom[c.bloom]=(bloom[c.bloom]||0)+1})
    mtx.forEach((c,i)=>console.log(`  ${i+1}. [${c.bloom} · ${c.pontos}pt] ${c.faceta.slice(0,80)}`))
    const sup = (bloom['Analisar']||0)+(bloom['Avaliar']||0)+(bloom['Criar']||0)
    console.log(`  Bloom: ${JSON.stringify(bloom)} | ordem superior: ${sup}/${mtx.length} | soma ${mtx.reduce((s,c)=>s+c.pontos,0)}pt`)
  }
})()
