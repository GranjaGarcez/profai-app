import { readFileSync } from 'node:fs'
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !line.startsWith('#')) process.env[m[1]] ??= m[2]
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

;(async () => {
  const { getCurriculumConstraint } = await import('../src/lib/curriculum')
  const { buildMatrix, buildProviders } = await import('../src/lib/ai/cascade')

  // ── Tier 1: o currículo emite descritores oficiais para todo o 2.º ciclo? ──
  const subjects: Array<[string, number]> = [
    ['Matemática', 5], ['Matemática', 6],
    ['Ciências Naturais', 5], ['Ciências Naturais', 6],
    ['Português', 5], ['Português', 6],
    ['História e Geografia de Portugal', 5], ['História e Geografia de Portugal', 6],
  ]
  console.log('══════ 2.º CICLO — presença de descritores oficiais ══════')
  for (const [subj, yr] of subjects) {
    const curr = getCurriculumConstraint(subj, yr)
    const hasDesc = curr.includes('Descritores (o aluno deve ficar capaz de)')
    const hasPerfil = /PERFIL DOS ALUNOS/i.test(curr)
    const nDesc = (curr.match(/^\s+- /gm) || []).length
    console.log(`  ${hasDesc ? '✓' : '✗'} ${subj} ${yr}.º — descritores:${hasDesc} (${nDesc} linhas) · perfil:${hasPerfil} · ${curr.length} car.`)
  }

  // ── Tier 2: a matriz ancora nos descritores novos (HGP)? ──
  // "drift" = termos tradicionalmente ensinados mas FORA dos descritores AE deste domínio.
  const c = { subject: 'História e Geografia de Portugal', yearLevel: 5, topic: 'A formação do reino de Portugal' }
  const drift = /ourique|douro|tejo|s\.?\s*mamede|guimar/i
  const curr = getCurriculumConstraint(c.subject, c.yearLevel)
  const base = `Ficha de ${c.subject} ${c.yearLevel}.º sobre "${c.topic}". Total: 8 questões | 100 pontos\n${curr}\nDIRECTRIZES: questões alinhadas aos descritores oficiais.`
  for (const mode of ['equilibrado', 'estrito'] as const) {
    console.log(`\n══════ MATRIZ ${mode.toUpperCase()} — ${c.subject} ${c.yearLevel}.º · "${c.topic}" ══════`)
    const mtx = await buildMatrix(base, c, 8, ['multiple_choice', 'true_false', 'short_answer', 'long_answer'], [], buildProviders(), 15_000, 'medium', mode)
    if (!mtx) { console.log('  (matriz falhou)'); continue }
    let drifts = 0
    mtx.forEach((q, i) => {
      const facet = String(q.faceta || '')
      const isDrift = drift.test(facet)
      if (isDrift) drifts++
      console.log(`  ${i + 1}. ${isDrift ? '⚠ ' : '  '}[${q.bloom} · ${q.pontos}pt] ${facet.slice(0, 90)}`)
    })
    console.log(`  Facetas com deriva fora-AE (Ourique/rios/S.Mamede): ${drifts}/${mtx.length}`)
  }
})().catch(e => { console.error('ERRO:', e?.message || e); process.exit(1) })
