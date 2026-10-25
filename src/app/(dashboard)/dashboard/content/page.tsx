import { createClient } from '@/lib/supabase/server'
import { turmaLabel as turmaLabelOf } from '@/lib/exam/turma'
import ContentLibraryClient from './ContentLibraryClient'

export interface ExamUse { code: string; status: string; created_at: string; session_id: string }

export default async function ContentPage() {
  const supabase = await createClient()
  const { data: items, error } = await supabase
    .from('content_items')
    .select('id, type, title, subject, year_level, topic, created_at, content')
    .order('created_at', { ascending: false })

  // Que conteúdos estão EM USO (foram lançados como exame) + que turmas os usam.
  const { data: { user } } = await supabase.auth.getUser()
  const usage: Record<string, ExamUse[]> = {}
  const turmas: Record<string, string[]> = {}
  if (user) {
    const { data: sessions } = await supabase
      .from('exam_sessions')
      .select('id, content_item_id, access_code, status, created_at')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    const sessionToContent: Record<string, string> = {}
    for (const s of sessions ?? []) {
      const cid = s.content_item_id as string | null
      if (!cid) continue
      sessionToContent[s.id as string] = cid
      ;(usage[cid] ??= []).push({ code: s.access_code, status: s.status, created_at: s.created_at, session_id: s.id })
    }

    // Turmas que já submeteram nesses exames (turma canónica, distinta, por conteúdo).
    const sessionIds = Object.keys(sessionToContent)
    if (sessionIds.length > 0) {
      const { data: subs } = await supabase
        .from('exam_submissions')
        .select('session_id, student_year, student_class')
        .in('session_id', sessionIds)
      const sets: Record<string, Set<string>> = {}
      for (const sub of subs ?? []) {
        const cid = sessionToContent[sub.session_id as string]
        if (!cid) continue
        const label = turmaLabelOf(sub.student_year, sub.student_class, null)
        if (label === '—') continue
        ;(sets[cid] ??= new Set()).add(label)
      }
      for (const [cid, set] of Object.entries(sets)) {
        turmas[cid] = Array.from(set).sort((a, b) => a.localeCompare(b, 'pt'))
      }
    }
  }

  return <ContentLibraryClient items={items ?? []} usage={usage} turmas={turmas} error={error?.message ?? null} />
}
