// ── Integridade do exame (registo + resumo) ───────────────────────────────────
// Um registo de integridade por submissão, guardado como JSON dentro de
// `answers.__integrity` (chave reservada — zero migração, viaja com a submissão,
// é ignorado pela correção tal como as chaves `calc_`). Junta:
//   • events[]       — sinais ao vivo captados no dispositivo do aluno (saídas de
//                       ecrã, colagens, etc.); só o que o browser PODE ver.
//   • suspended      — o exame foi suspenso automaticamente ao atingir o limite.
//   • contentFlags[] — indícios de conteúdo acima do ano / fora do teste (análise
//                       da IA, pós-entrega; do lado do professor).
//   • annulled       — decisão HUMANA do professor de anular (nunca automática).
// Nada disto é prova por si só: são INDÍCIOS para o professor decidir.

export const INTEGRITY_KEY = '__integrity'

export type IntegrityEventKind =
  | 'exit'            // saiu do ecrã do teste (trocou de aba/app, minimizou)
  | 'blur'            // janela perdeu o foco
  | 'paste'           // colou texto numa resposta
  | 'copy'            // copiou texto do teste
  | 'fullscreen_exit' // saiu do ecrã inteiro
  | 'tap_burst'       // rajada de toques anómala dentro da página

export interface IntegrityEvent {
  t: number             // epoch ms
  kind: IntegrityEventKind
  durMs?: number        // duração (ex.: tempo fora do ecrã)
  qKey?: string         // pergunta associada, quando aplicável
  info?: string         // detalhe curto (ex.: início do texto colado, truncado)
}

export interface ContentFlag {
  qKey: string
  level: 'above' | 'off_topic' | 'ok'   // acima do ano · fora do tema · sem indício
  terms: string[]                        // termos/expressões que levantam a suspeita
  reason: string
  confidence: number                     // 0–1
}

export interface IntegrityRecord {
  v: 1
  events?: IntegrityEvent[]
  suspended?: boolean
  contentFlags?: ContentFlag[]
  annulled?: { at: string; reason: string }
  // Análise dedicada ao uso da língua (pós-correcção). Tipo em src/lib/exam/language.ts;
  // guardado como unknown aqui para não acoplar os módulos.
  language?: unknown
  // Divulgação: submissão RETIDA (não libertada ao aluno mesmo com a sessão divulgada),
  // tipicamente por fortes indícios; `cleared` = o professor certificou → liberta e nunca
  // mais é retida automaticamente.
  held?: boolean
  cleared?: { at: string; reason?: string }
  // Divulgação POR TURMA (aditivo): o professor libertou/ocultou esta submissão sem
  // usar o interruptor global da sessão. `true` = libertada; `false` = ocultada. A porta
  // do resultado abre se a sessão estiver divulgada OU se isto for `true`.
  released?: boolean
}

/** Lê o registo de integridade de um objecto de respostas (tolerante a tudo). */
export function parseIntegrity(answers: Record<string, string> | null | undefined): IntegrityRecord | null {
  const raw = answers?.[INTEGRITY_KEY]
  if (!raw) return null
  try {
    const r = typeof raw === 'string' ? JSON.parse(raw) : raw
    return r && typeof r === 'object' ? (r as IntegrityRecord) : null
  } catch { return null }
}

/** Devolve um objecto de respostas com o registo de integridade fundido (imutável). */
export function withIntegrity(
  answers: Record<string, string>,
  patch: Partial<IntegrityRecord>,
): Record<string, string> {
  const prev = parseIntegrity(answers) ?? { v: 1 as const }
  const next: IntegrityRecord = { ...prev, ...patch, v: 1 }
  return { ...answers, [INTEGRITY_KEY]: JSON.stringify(next) }
}

export interface IntegritySummary {
  exits: number
  blurs: number           // perdas de foco sem ir a 2.º plano
  pastes: number
  awayMs: number          // tempo total fora do ecrã
  suspended: boolean
  contentAbove: number    // nº de respostas marcadas acima do ano / fora do tema
  annulled: boolean
  level: 'none' | 'low' | 'medium' | 'high'   // gravidade global (indício)
  hasAny: boolean
}

/** Resumo legível para o painel do professor. Converte sinais em gravidade. */
export function summarizeIntegrity(rec: IntegrityRecord | null): IntegritySummary {
  const events = rec?.events ?? []
  const exits = events.filter(e => e.kind === 'exit').length
  const blurs = events.filter(e => e.kind === 'blur').length
  const pastes = events.filter(e => e.kind === 'paste').length
  const awayMs = events.filter(e => e.kind === 'exit' || e.kind === 'blur').reduce((s, e) => s + (e.durMs ?? 0), 0)
  const contentAbove = (rec?.contentFlags ?? []).filter(f => f.level !== 'ok').length
  const suspended = !!rec?.suspended
  const annulled = !!rec?.annulled

  // Gravidade (indício, não veredicto): colagens e saídas longas pesam mais.
  let pts = 0
  pts += pastes * 3
  pts += exits * 1
  pts += blurs * 1
  if (awayMs > 30_000) pts += 2
  pts += contentAbove * 2
  if (suspended) pts += 4
  const level: IntegritySummary['level'] =
    annulled ? 'high' : pts >= 6 ? 'high' : pts >= 3 ? 'medium' : pts >= 1 ? 'low' : 'none'

  return { exits, blurs, pastes, awayMs, suspended, contentAbove, annulled, level, hasAny: pts > 0 || annulled }
}

// Fortes indícios de plágio/batota — para reter na divulgação (o professor decide).
// Junta os sinais que já temos: anulado, conteúdo acima do ano/fora do tema, escrita
// pouco fidedigna (cópia/IA), prova suspensa, colagens, ou muitas saídas do ecrã.
export function strongSuspicion(rec: IntegrityRecord | null): { suspect: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (!rec) return { suspect: false, reasons }
  if (rec.annulled) reasons.push('exame anulado')
  if ((rec.contentFlags ?? []).some(f => f.level !== 'ok')) reasons.push('conteúdo acima do ano / fora do tema')
  const lang = rec.language as { reliability?: string } | undefined
  if (lang?.reliability === 'suspeita') reasons.push('escrita pouco fidedigna (cópia/IA)')
  const s = summarizeIntegrity(rec)
  if (s.suspended) reasons.push('prova suspensa')
  if (s.pastes > 0) reasons.push(`${s.pastes} colagem(ns)`)
  if (s.exits >= 4) reasons.push(`${s.exits} saídas do ecrã`)
  return { suspect: reasons.length > 0, reasons }
}

// Filtros de ruído do registo ao vivo (no dispositivo do aluno). Não há suspensão:
// regista-se em silêncio e o professor decide. Estes limiares só evitam registar
// falsos sinais (toques acidentais, colagens triviais).
export const INTEGRITY_THRESHOLDS = {
  minExitMs: 1_200,        // ignora "saídas" instantâneas (toques acidentais)
  substantialPasteLen: 25, // nº de caracteres a partir do qual a colagem conta
}
