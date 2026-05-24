import { createClient } from '@/lib/supabase/server'
import ContentLibraryClient from './ContentLibraryClient'

export default async function ContentPage() {
  const supabase = await createClient()
  const { data: items, error } = await supabase
    .from('content_items')
    .select('id, type, title, subject, year_level, topic, created_at')
    .order('created_at', { ascending: false })

  return <ContentLibraryClient items={items ?? []} error={error?.message ?? null} />
}
