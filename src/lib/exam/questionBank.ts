/**
 * PROF.IA — Question Bank Service
 *
 * Fluxo:
 *  1. findQuestions()   — pesquisa o banco por questões válidas não vistas pelo professor
 *  2. saveQuestions()   — guarda questões geradas por IA no banco
 *  3. markUsed()        — regista que o professor usou estas questões
 *
 * A pesquisa usa full-text search (português) sobre topic+text,
 * filtrada por subject/year_level/type/difficulty e excluindo
 * questões já usadas pelo mesmo professor.
 */

import { createAdminClient } from '@/lib/supabase/admin'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface BankQuestion {
  id: string
  subject: string
  year_level: number
  topic: string
  type: string
  bloom_level?: string
  difficulty: string
  text: string
  options?: string[]
  correct_answer: string
  mark_scheme?: string
  figure?: unknown
  points: number
  allow_calculator: boolean
  quality_score: number
  citation?: string
  source_url?: string
}

export interface BankSearchParams {
  subject: string
  yearLevel: number
  topic: string
  types: string[]
  difficulty: string
  numWanted: number
  userId: string
}

// ── Pesquisa ──────────────────────────────────────────────────────────────────

// O banco é um recurso de poupança (0 chamadas IA) — só compensa se não baixar a
// qualidade: score mínimo 0.6 e critérios de correcção com corpo (rubrica com
// pelo menos duas parcelas "(Npt)"), para a correcção automática ser fiável.
const MIN_QUALITY = 0.6
function servable(r: Record<string, unknown>): boolean {
  const ms = typeof r.mark_scheme === 'string' ? r.mark_scheme : ''
  const parcels = (ms.match(/\(\s*\d+(?:[.,]\d+)?\s*(?:pts?|pontos?)\s*\)/gi) ?? []).length
  return Number(r.quality_score) >= MIN_QUALITY && ms.length >= 60 && parcels >= 1
}

export async function findQuestions(params: BankSearchParams): Promise<BankQuestion[]> {
  const supabase = createAdminClient()

  try {
    // Questões já vistas por este professor
    const { data: used } = await supabase
      .from('question_usage')
      .select('question_id')
      .eq('teacher_id', params.userId)

    const usedIds = (used ?? []).map(r => r.question_id as string)

    // Palavras-chave do tópico (palavras com 4+ chars, mais distintivas).
    // Só letras/dígitos: qualquer pontuação ("vida.") tornava o tsquery inválido
    // e o PostgREST devolvia 400 — o banco nunca era consultado.
    const keywords = params.topic
      .split(/[\s,;]+/)
      .map(w => w.replace(/[^\p{L}\p{N}]/gu, ''))
      .filter(w => w.length >= 4)
      .slice(0, 4)
      .join(' | ')   // OR em full-text search

    const tsQuery = keywords || params.topic.replace(/[^\p{L}\p{N} ]/gu, '').split(' ')[0]

    // Overfetch para shuffle depois. As já usadas são excluídas em JS: com centenas de
    // UUIDs, o not.in.(…) no URL ultrapassava o limite do PostgREST → 400 "Bad Request"
    // e o banco nunca respondia (um professor tinha 842 usadas).
    const fetchLimit = Math.min(500, params.numWanted * 4 + usedIds.length)

    const query = supabase
      .from('question_bank')
      .select('*')
      .eq('subject', params.subject)
      .eq('year_level', params.yearLevel)
      .eq('is_active', true)
      .gte('quality_score', 0.5)
      .in('type', params.types)
      .textSearch('topic', tsQuery, { config: 'portuguese' })
      .order('quality_score', { ascending: false })
      .limit(fetchLimit)

    const { data, error } = await query

    if (error) {
      // Qualquer erro no full-text → ILIKE simples como fallback
      console.warn('[BANK] Erro na pesquisa FTS, a usar ILIKE:', error.message)
      return findQuestionsIlike(params, usedIds)
    }

    const usedSet = new Set(usedIds)
    const fresh = (data ?? []).filter(r => !usedSet.has(r.id as string) && servable(r))
    if (fresh.length === 0 && (data ?? []).length > 0) {
      console.log(`[BANK] ${(data ?? []).length} candidatas FTS, todas já usadas — a tentar ILIKE`)
      return findQuestionsIlike(params, usedIds)
    }

    // Shuffle e limita ao necessário (variedade entre gerações)
    const shuffled = fresh.sort(() => Math.random() - 0.5)
    console.log(`[BANK] ${shuffled.length} candidatas → a usar ${Math.min(shuffled.length, params.numWanted)}`)
    return shuffled.slice(0, params.numWanted) as BankQuestion[]

  } catch (err) {
    console.warn('[BANK] findQuestions falhou silenciosamente:', err)
    return []
  }
}

// Fallback com ILIKE quando FTS não retorna resultados
async function findQuestionsIlike(
  params: BankSearchParams,
  usedIds: string[]
): Promise<BankQuestion[]> {
  const supabase = createAdminClient()
  // Palavra mais longa do tópico (sem pontuação) — a primeira era muitas vezes "A"/"O"
  const keyword = params.topic
    .split(/[\s,;]+/)
    .map(w => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .sort((a, b) => b.length - a.length)[0] || params.topic

  const query = supabase
    .from('question_bank')
    .select('*')
    .eq('subject', params.subject)
    .eq('year_level', params.yearLevel)
    .eq('is_active', true)
    .gte('quality_score', 0.5)
    .in('type', params.types)
    .ilike('topic', `%${keyword}%`)
    .order('quality_score', { ascending: false })
    .limit(Math.min(500, params.numWanted * 4 + usedIds.length))

  const { data, error } = await query
  if (error) console.warn('[BANK] Erro na pesquisa ILIKE:', error.message)
  const usedSet = new Set(usedIds)
  const shuffled = (data ?? []).filter(r => !usedSet.has(r.id as string) && servable(r)).sort(() => Math.random() - 0.5)
  return shuffled.slice(0, params.numWanted) as BankQuestion[]
}

// ── Guardar questões novas ────────────────────────────────────────────────────

// Admissão: só gerações de confiança alta (Tier 1, não parciais) entram ACTIVAS —
// visíveis a outros professores. As restantes ficam em quarentena (is_active=false):
// têm id para o autor votar 👍/👎, e um 👍 readmite-as (ver apply_question_vote).
export async function saveQuestions(
  questions: Array<Record<string, unknown>>,
  meta: { subject: string; yearLevel: number; topic: string; difficulty: string },
  userId: string,
  opts: { active?: boolean } = {}
): Promise<string[]> {
  const supabase = createAdminClient()
  const active = opts.active ?? true

  const rows = questions
    .filter(q => q.text && String(q.text).trim().length > 10)
    .map(q => ({
      subject:          meta.subject,
      year_level:       meta.yearLevel,
      topic:            meta.topic,
      type:             String(q.type ?? 'short_answer'),
      bloom_level:      q.bloomLevel ? String(q.bloomLevel) : null,
      difficulty:       meta.difficulty,
      text:             String(q.text ?? '').trim(),
      options:          q.options ?? null,
      correct_answer:   String(q.correctAnswer ?? '').trim(),
      mark_scheme:      q.markScheme ? String(q.markScheme) : null,
      figure:           q.figure ?? null,
      points:           Number(q.points) || 5,
      allow_calculator: Boolean(q.allowCalculator),
      quality_score:    active ? 0.75 : 0.55,
      is_active:        active,
      citation:         q.citation ? String(q.citation) : null,
      source_url:       q.sourceUrl ? String(q.sourceUrl) : null,
      created_by:       userId,
    }))

  if (rows.length === 0) return []

  const { data, error } = await supabase
    .from('question_bank')
    .insert(rows)
    .select('id')

  if (error) {
    console.warn('[BANK] Erro ao guardar:', error.message)
    return []
  }

  const ids = (data ?? []).map(r => r.id as string)
  console.log(`[BANK] ✓ ${ids.length} questões guardadas no banco${active ? '' : ' (quarentena)'}`)
  return ids
}

// ── Actualizar quality_score / estado após o crítico adversarial ────────────────
// saveQuestions() grava com um valor por defeito porque corre antes do crítico;
// isto substitui esse valor pela avaliação real, por questão, e põe em quarentena
// (active=false) as questões com problema grave identificado pelo crítico.
export async function updateQualityScores(updates: Array<{ id: string; qualityScore: number; active?: boolean }>): Promise<void> {
  if (updates.length === 0) return
  const supabase = createAdminClient()
  const results = await Promise.allSettled(
    updates.map(u => supabase.from('question_bank')
      .update(u.active === undefined ? { quality_score: u.qualityScore } : { quality_score: u.qualityScore, is_active: u.active })
      .eq('id', u.id))
  )
  const failed = results.filter(r => r.status === 'rejected').length
  if (failed > 0) console.warn(`[BANK] ${failed} actualização(ões) de quality_score falharam`)
}

// ── Substituir critérios de correcção por rubricas analíticas ───────────────────
export async function updateMarkSchemes(updates: Array<{ id: string; markScheme: string }>): Promise<void> {
  if (updates.length === 0) return
  const supabase = createAdminClient()
  const results = await Promise.allSettled(
    updates.map(u => supabase.from('question_bank').update({ mark_scheme: u.markScheme }).eq('id', u.id))
  )
  const ok = results.filter(r => r.status === 'fulfilled').length
  console.log(`[BANK] ✓ ${ok}/${updates.length} rubricas guardadas`)
}

// ── Marcar como usadas ────────────────────────────────────────────────────────

export async function markUsed(questionIds: string[], userId: string): Promise<void> {
  if (questionIds.length === 0) return
  const supabase = createAdminClient()

  // Regista uso (ignora conflitos — PRIMARY KEY garante unicidade)
  await supabase
    .from('question_usage')
    .upsert(
      questionIds.map(id => ({ question_id: id, teacher_id: userId })),
      { onConflict: 'question_id,teacher_id', ignoreDuplicates: true }
    )

  // Incrementa contador (via função SQL para evitar race conditions)
  await supabase.rpc('increment_question_usage', { ids: questionIds })
}

// ── Converter questão do banco para o formato de exame ────────────────────────

export function bankToExamQuestion(
  bq: BankQuestion,
  index: number
): Record<string, unknown> {
  return {
    index,
    type:            bq.type,
    bloomLevel:      bq.bloom_level ?? 'Aplicar',
    text:            bq.text,
    options:         bq.options ?? undefined,
    correctAnswer:   bq.correct_answer,
    markScheme:      bq.mark_scheme ?? '',
    figure:          bq.figure ?? null,
    points:          bq.points,
    allowCalculator: bq.allow_calculator,
    citation:        bq.citation ?? null,   // para exibição opcional na UI
    _bankId:         bq.id,                 // rastreio interno, não vai para o cliente
  }
}
