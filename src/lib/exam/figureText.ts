/**
 * PROF.IA — Descrição textual dos dados de uma figura.
 *
 * Usado para ancorar a CORRIGENDA e o CRÍTICO aos valores reais do gráfico/tabela:
 * numa questão de interpretação de dados, os números da figura são a fonte de
 * verdade. Sem isto, a resposta é escrita a partir de um conjunto de dados imaginado,
 * diferente do que o gráfico mostra (ex.: resposta fala de "60 unidades" quando o
 * gráfico tem barras Baixa/Média/Alta).
 *
 * Devolve uma linha legível com os dados, ou null se a figura não tiver dados úteis.
 */
export function describeFigure(figure: unknown): string | null {
  if (!figure || typeof figure !== 'object') return null
  const f = figure as Record<string, unknown>
  const type = String(f.type ?? '')
  const title = typeof f.title === 'string' && f.title ? ` "${f.title}"` : ''

  if (type === 'bar_chart' && Array.isArray(f.bars)) {
    const bars = (f.bars as Array<Record<string, unknown>>)
      .map(b => `${b.label} = ${b.value}`).join('; ')
    const unit = f.yLabel ? ` (${f.yLabel})` : ''
    return bars ? `Gráfico de barras${title}${unit}: ${bars}.` : null
  }
  if (type === 'pie_chart' && Array.isArray(f.slices)) {
    const slices = (f.slices as Array<Record<string, unknown>>)
      .map(s => `${s.label} = ${s.value}`).join('; ')
    return slices ? `Gráfico circular${title}: ${slices}.` : null
  }
  if (type === 'table' && Array.isArray(f.headers) && Array.isArray(f.rows)) {
    const headers = (f.headers as unknown[]).map(String).join(' | ')
    const rows = (f.rows as unknown[])
      .map(r => (Array.isArray(r) ? r.map(String).join(' | ') : '')).join('  //  ')
    return headers && rows ? `Tabela — colunas: ${headers}; linhas: ${rows}.` : null
  }

  // Figuras geométricas / outras: expõe os campos numéricos relevantes.
  const rest = Object.entries(f).filter(([k]) => k !== 'type' && k !== 'title')
  if (rest.length) {
    return `Figura "${type}": ${rest.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')}.`
  }
  return type ? `Figura "${type}".` : null
}
