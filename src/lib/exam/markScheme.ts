// ── Corrige inconsistências entre o markScheme (texto livre com pontos parcelares,
// ex: "Conteúdo (16pt) + Organização (12pt) = 28pt") e o "points" total da questão.
// A IA por vezes erra a soma, ou um passo de normalização posterior altera "points"
// depois do markScheme já estar escrito — sem isto, a correcção automática recebe
// um prompt contraditório (cotação máxima vs. critérios que não somam o mesmo) e
// falha ou produz uma rubrica que não bate certo com o total. ──────────────────────

const POINT_RE = /(=\s*)?(\d+(?:[.,]\d+)?)(\s*)(pts?|pontos?)\b/gi

export function fixMarkSchemeSum(markScheme: string | undefined, points: number): string | undefined {
  // Alguns caminhos legados (ex: importação de documentos) podem gravar um
  // markScheme estruturado (objecto) em vez de texto — nunca assumir string.
  if (!markScheme || !points || typeof markScheme !== 'string') return markScheme

  const all = [...markScheme.matchAll(POINT_RE)]
  if (all.length === 0) return markScheme

  // Um "= Xpt" no fim é a soma restated, não um critério próprio — corrige-se
  // à parte, forçando-o sempre a "points", nunca entra na reescala proporcional.
  const criteria = all.filter(m => !m[1])
  const totalRestated = all.find(m => m[1])
  if (criteria.length === 0) return markScheme

  const values = criteria.map(m => parseFloat(m[2].replace(',', '.')))
  const sum = values.reduce((a, b) => a + b, 0)
  if (sum === 0) return markScheme

  const needsFix = Math.abs(sum - points) >= 0.01
  const totalMismatched = totalRestated && Math.abs(parseFloat(totalRestated[2].replace(',', '.')) - points) >= 0.01
  if (!needsFix && !totalMismatched) return markScheme

  // Reescala proporcionalmente e arredonda a inteiros com soma exacta = points
  // (método do maior resto — evita que arredondamentos independentes desviem o total).
  const scaled = values.map(v => (v / sum) * points)
  const floors = scaled.map(Math.floor)
  const remainder = points - floors.reduce((a, b) => a + b, 0)
  const order = scaled
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac)
  const corrected = [...floors]
  for (let k = 0; k < remainder && k < order.length; k++) corrected[order[k].i] += 1

  let ci = 0
  return markScheme.replace(POINT_RE, (_match, eq: string | undefined, _num: string, space: string, unit: string) => {
    if (eq) return `${eq}${points}${space}${unit}`
    return `${corrected[ci++]}${space}${unit}`
  })
}
