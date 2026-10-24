/**
 * PROF.IA — Normalização de turma/ano.
 *
 * Os alunos escrevem a turma de formas inconsistentes (ex.: Turma "G" + Ano "6g",
 * "6º G", "6G", "g", "turma A"…) e acabavam em grupos diferentes. Esta função
 * extrai um par canónico (ano, turma) a partir dos dois campos, de forma tolerante:
 *  - o ano é o número 1–12 encontrado no campo ano (ou, em falta, no da turma, ou
 *    o ano do próprio teste);
 *  - a turma são as letras, ignorando o número do ano, "º", "turma", espaços e
 *    pontuação, em maiúsculas.
 *
 * Determinística e sem efeitos — usada no registo da submissão (dados limpos) e no
 * agrupamento do painel de correcção (corrige também os dados já guardados).
 */
export function canonicalTurma(
  yearRaw: unknown,
  classRaw: unknown,
  fallbackYear?: number | null,
): { ano: number | null; turma: string } {
  const strip = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  const yrU = strip(yearRaw).toUpperCase()
  const clsU = strip(classRaw).toUpperCase().replace(/TURMA/g, '')

  const yearOf = (s: string): number | null => {
    const m = s.match(/\b(1[0-2]|[1-9])\b/) || s.match(/(1[0-2]|[1-9])/)
    return m ? Number(m[1]) : null
  }
  const ano = yearOf(yrU) ?? yearOf(clsU) ?? (fallbackYear ?? null)

  // Letras da turma: tira pontuação/º, remove o número do ano (prefixo "6G" → "G")
  // e quaisquer dígitos restantes ("G6" → "G"). Fica em maiúsculas.
  let t = clsU.replace(/[^A-Z0-9]/g, '')
  if (ano != null) t = t.replace(new RegExp('^' + ano), '')
  t = t.replace(/[0-9]/g, '')
  const turma = t || clsU.replace(/[^A-Z0-9]/g, '')
  return { ano, turma }
}

/** Etiqueta canónica da turma, ex.: "6º A". Usa "—" quando não há turma. */
export function turmaLabel(yearRaw: unknown, classRaw: unknown, fallbackYear?: number | null): string {
  const { ano, turma } = canonicalTurma(yearRaw, classRaw, fallbackYear)
  return `${ano != null ? ano + 'º ' : ''}${turma || '—'}`.trim()
}
