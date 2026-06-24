import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { saveImageUse } from '@/lib/images/imageBank'

// Regista que uma imagem foi escolhida e usada — só assim o banco de imagens
// cresce, nunca a partir de resultados de pesquisa não revistos. Falha
// silenciosamente: nunca deve bloquear o professor de usar a imagem.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { subject, yearLevel, topic, query, source, url, thumbUrl, credit } = await request.json()
  if (!subject || !yearLevel || !topic || !query || !source || !url) {
    return NextResponse.json({ error: 'Parâmetros incompletos' }, { status: 400 })
  }

  await saveImageUse({
    subject: String(subject), yearLevel: Number(yearLevel), topic: String(topic),
    query: String(query), source: String(source), url: String(url),
    thumbUrl: thumbUrl ?? null, credit: credit ?? null, userId: user.id,
  })

  return NextResponse.json({ ok: true })
}
