import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export interface BankStats {
  total: number
  bySubject: { subject: string; count: number; avgQuality: number; yearLevels: number[] }[]
  recentlyAdded: number
  withFeedback: number
  topRated: { id: string; text: string; subject: string; qualityScore: number; type: string }[]
}

export async function GET() {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()

  // 1. Total activo
  const { count: total } = await admin
    .from('question_bank')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // 2. Por disciplina — count + avgQuality + anos
  const { data: bySubjectRaw } = await admin
    .from('question_bank')
    .select('subject, year_level, quality_score')
    .eq('is_active', true)

  const subjectMap = new Map<string, { count: number; totalQuality: number; years: Set<number> }>()
  for (const row of bySubjectRaw ?? []) {
    const key = row.subject as string
    if (!subjectMap.has(key)) subjectMap.set(key, { count: 0, totalQuality: 0, years: new Set() })
    const entry = subjectMap.get(key)!
    entry.count++
    entry.totalQuality += Number(row.quality_score ?? 0.7)
    if (row.year_level) entry.years.add(Number(row.year_level))
  }
  const bySubject = Array.from(subjectMap.entries())
    .map(([subject, { count, totalQuality, years }]) => ({
      subject,
      count,
      avgQuality: count > 0 ? Math.round((totalQuality / count) * 100) / 100 : 0,
      yearLevels: Array.from(years).sort((a, b) => a - b),
    }))
    .sort((a, b) => b.count - a.count)

  // 3. Adicionadas nos últimos 7 dias
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: recentlyAdded } = await admin
    .from('question_bank')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .gte('created_at', sevenDaysAgo)

  // 4. Com feedback (pelo menos 1 voto)
  const { count: withFeedback } = await admin
    .from('question_feedback')
    .select('question_id', { count: 'exact', head: true })

  // 5. Top 5 por quality_score
  const { data: topRatedRaw } = await admin
    .from('question_bank')
    .select('id, text, subject, quality_score, type')
    .eq('is_active', true)
    .order('quality_score', { ascending: false })
    .limit(5)

  const topRated = (topRatedRaw ?? []).map(q => ({
    id: q.id as string,
    text: String(q.text ?? '').slice(0, 120),
    subject: q.subject as string,
    qualityScore: Number(q.quality_score ?? 0),
    type: q.type as string,
  }))

  const stats: BankStats = {
    total: total ?? 0,
    bySubject,
    recentlyAdded: recentlyAdded ?? 0,
    withFeedback: withFeedback ?? 0,
    topRated,
  }

  return NextResponse.json(stats)
}
