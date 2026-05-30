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

export async function findQuestions(params: BankSearchParams): Promise<BankQuestion[]> {
  const supabase = createAdminClient()

  try {
    // Questões já vistas por este professor
    const { data: used } = await supabase
      .from('question_usage')
      .select('question_id')
      .eq('teacher_id', params.userId)

    const usedIds = (used ?? []).map(r => r.question_id as string)

    // Palavras-chave do tópico (palavras com 4+ chars, mais distintivas)
    const keywords = params.topic
      .split(/[\s,;]+/)
      .filter(w => w.length >= 4)
      .slice(0, 4)
      .join(' | ')   // OR em full-text search

    const tsQuery = keywords || params.topic.split(' ')[0]

    // Overfetch para shuffle depois
    const fetchLimit = params.numWanted * 4

    let query = supabase
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

    if (usedIds.length > 0) {
      query = query.not('id', 'in', `(${usedIds.map(id => `'${id}'`).join(',')})`)
    }

    const { data, error } = await query

    if (error) {
      // Full-text sem resultados → tenta ILIKE simples como fallback
      if (error.code === 'PGRST116' || error.message.includes('text')) {
        return findQuestionsIlike(params, usedIds)
      }
      console.warn('[BANK] Erro na pesquisa FTS:', error.message)
      return []
    }

    // Shuffle e limita ao necessário (variedade entre gerações)
    const shuffled = (data ?? []).sort(() => Math.random() - 0.5)
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
  const keyword = params.topic.split(' ')[0]

  let query = supabase
    .from('question_bank')
    .select('*')
    .eq('subject', params.subject)
    .eq('year_level', params.yearLevel)
    .eq('is_active', true)
    .gte('quality_score', 0.5)
    .in('type', params.types)
    .ilike('topic', `%${keyword}%`)
    .order('quality_score', { ascending: false })
    .limit(params.numWanted * 4)

  if (usedIds.length > 0) {
    query = query.not('id', 'in', `(${usedIds.map(id => `'${id}'`).join(',')})`)
  }

  const { data } = await query
  const shuffled = (data ?? []).sort(() => Math.random() - 0.5)
  return shuffled.slice(0, params.numWanted) as BankQuestion[]
}

// ── Guardar questões novas ────────────────────────────────────────────────────

export async function saveQuestions(
  questions: Array<Record<string, unknown>>,
  meta: { subject: string; yearLevel: number; topic: string; difficulty: string },
  userId: string
): Promise<string[]> {
  const supabase = createAdminClient()

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
      quality_score:    0.75,
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
  console.log(`[BANK] ✓ ${ids.length} questões guardadas no banco`)
  return ids
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
