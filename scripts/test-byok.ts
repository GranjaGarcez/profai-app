import { readFileSync } from 'node:fs'
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !line.startsWith('#')) process.env[m[1]] ??= m[2]
}
;(async () => {
  const { encryptSecret, decryptSecret, isEncryptionConfigured } = await import('../src/lib/crypto')
  const { validateKey, personalProvider } = await import('../src/lib/ai/personal')
  const { generateChunked } = await import('../src/lib/ai/cascade')

  console.log('cifra configurada:', isEncryptionConfigured())
  const secret = 'sk-ant-EXEMPLO-1234567890'
  const round = decryptSecret(encryptSecret(secret))
  console.log('cifra ida-e-volta:', round === secret ? 'OK' : 'FALHOU')

  const gkey = process.env.GEMINI_API_KEY!
  console.log('\nvalidateKey google/gemini-2.5-flash (chave real):')
  console.log(' →', JSON.stringify(await validateKey('google', 'gemini-2.5-flash', gkey)))
  console.log('validateKey google/modelo-inexistente:')
  console.log(' →', JSON.stringify(await validateKey('google', 'gemini-nao-existe-999', gkey)))
  console.log('validateKey anthropic/chave-falsa (deve falhar limpo):')
  console.log(' →', JSON.stringify(await validateKey('anthropic', 'claude-sonnet-5', 'sk-ant-invalida')))

  console.log('\ngeração de 6 questões COM chave pessoal (google via Gemini):')
  const personal = personalProvider('google', 'gemini-2.5-flash', gkey)
  const prompt = readFileSync('scripts/test-cascade.ts', 'utf8').match(/const PROMPT = `([\s\S]*?)`\n\nconst BR/)![1]
    .replace(/\$\{TOPIC\}/g, 'A Célula, Unidade fundamental da vida.').replace(/\$\{N\}/g, '6').replace(/\$\{Math\.ceil\(N \* 0\.6\)\}/g, '4').replace(/\`/g, '`')
  const t0 = Date.now()
  const r = await generateChunked(prompt, 6, { personal })
  console.log(` → ${((Date.now()-t0)/1000).toFixed(1)}s | modelo: ${r.modelUsed} | personalModel: ${r.personalModel} | fallback amber: ${r.isFallback} | personalFellBack: ${r.personalFellBack} | blocos ${r.partsOk}/${r.parts}`)
})()
