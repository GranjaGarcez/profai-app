// Teste local do banco de questões (sem login): npx tsx scripts/test-bank.ts [userId]
import { readFileSync } from 'node:fs'
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !line.startsWith('#')) process.env[m[1]] ??= m[2]
}
;(async () => {
  const { findQuestions } = await import('../src/lib/exam/questionBank')
  const t0 = Date.now()
  const hits = await findQuestions({
    subject: 'Ciências Naturais', yearLevel: 5, topic: 'A Célula, Unidade fundamental da vida.',
    types: ['multiple_choice', 'true_false', 'short_answer', 'long_answer'], difficulty: 'medium',
    numWanted: 12, userId: process.argv[2] ?? 'dd90ff9d-7e1e-4216-acb0-80528ff4f0f7',
  })
  console.log(`${hits.length} questões do banco em ${Date.now() - t0}ms`)
  for (const h of hits.slice(0, 4)) console.log(` - [${h.type}] ${String(h.text).replace(/\s+/g, ' ').slice(0, 90)}`)
})()
