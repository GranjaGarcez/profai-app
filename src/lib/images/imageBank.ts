/**
 * PROF.IA — Image Bank Service
 *
 * Mesmo princípio do question_bank: só cresce com imagens que um professor
 * realmente escolheu e usou (nunca com resultados de pesquisa não revistos) —
 * é essa curadoria humana que mantém a relevância alta com o tempo.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface BankImage {
  id: string
  query: string
  source: string
  url: string
  thumbUrl: string | null
  credit: string | null
}

export async function findBankImages(
  subject: string, yearLevel: number, topic: string, numWanted = 6
): Promise<BankImage[]> {
  const supabase = createAdminClient()
  const keywords = topic.split(/[\s,;]+/).filter(w => w.length >= 4).slice(0, 4).join(' | ')
  const tsQuery = keywords || topic.split(' ')[0]
  if (!tsQuery) return []

  try {
    const { data, error } = await supabase
      .from('image_bank')
      .select('id, query, source, url, thumb_url, credit')
      .eq('subject', subject)
      .eq('year_level', yearLevel)
      .eq('is_active', true)
      .textSearch('topic', tsQuery, { config: 'portuguese' })
      .order('usage_count', { ascending: false })
      .limit(numWanted)

    if (error || !data) return []
    return data.map(r => ({
      id: r.id as string, query: r.query as string, source: r.source as string,
      url: r.url as string, thumbUrl: r.thumb_url as string | null, credit: r.credit as string | null,
    }))
  } catch (err) {
    console.warn('[IMAGE-BANK] findBankImages falhou silenciosamente:', err)
    return []
  }
}

export async function saveImageUse(params: {
  subject: string; yearLevel: number; topic: string; query: string
  source: string; url: string; thumbUrl?: string | null; credit?: string | null; userId: string
}): Promise<void> {
  const supabase = createAdminClient()
  try {
    const { error } = await supabase.rpc('upsert_image_usage', {
      p_subject: params.subject,
      p_year_level: params.yearLevel,
      p_topic: params.topic,
      p_query: params.query,
      p_source: params.source,
      p_url: params.url,
      p_thumb_url: params.thumbUrl ?? null,
      p_credit: params.credit ?? null,
      p_created_by: params.userId,
    })
    if (error) console.warn('[IMAGE-BANK] saveImageUse falhou:', error.message)
  } catch (err) {
    console.warn('[IMAGE-BANK] saveImageUse falhou silenciosamente:', err)
  }
}
