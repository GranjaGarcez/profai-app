// Teste local das rubricas: npx tsx scripts/test-rubric.ts  (usa scripts/.last-test.json)
import { readFileSync } from 'node:fs'
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !line.startsWith('#')) process.env[m[1]] ??= m[2]
}
;(async () => {
  const { enrichMarkSchemes, isRichMarkScheme } = await import('../src/lib/exam/rubric')
  const t = JSON.parse(readFileSync('scripts/.last-test.json', 'utf8'))
  const qs = (t.groups as Array<{ questions: Array<Record<string, unknown>> }>).flatMap(g => g.questions).map(q => ({
    index: Number(q.index), type: String(q.type), text: String(q.text), options: q.options,
    correctAnswer: q.correctAnswer, points: Number(q.points) || 0, markScheme: q.markScheme as string | undefined,
  }))
  console.log(`${qs.length} questões | rubricas já ricas: ${qs.filter(q => isRichMarkScheme(q.markScheme)).length}`)
  const t0 = Date.now()
  const map = await enrichMarkSchemes(qs, { subject: 'Ciências Naturais', yearLevel: 5, topic: t.topic }, 20_000)
  console.log(`${map.size}/${qs.length} rubricas em ${Date.now() - t0}ms`)
  for (const i of [1, 6, 11]) if (map.has(i)) console.log(`\n[${i}] (${qs.find(q => q.index === i)?.points}pt) ${map.get(i)}`)
})()
