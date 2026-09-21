// Transcrição OCR de prova em papel (aditivo). Professor autenticado envia
// fotos; devolve as respostas transcritas por questão para REVISÃO — não grava.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { transcribePaper } from '@/lib/exam/paperOcr'
import type { TestSnapshot } from '@/lib/exam/types'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { sessionId, images } = await request.json() as { sessionId?: string; images?: string[] }
  if (!sessionId || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: 'Faltam a sessão ou as fotografias.' }, { status: 400 })
  }
  if (images.length > 8) {
    return NextResponse.json({ error: 'Máximo de 8 fotografias por prova.' }, { status: 400 })
  }
  if (!images.every(i => typeof i === 'string' && i.startsWith('data:image/'))) {
    return NextResponse.json({ error: 'Formato de imagem inválido.' }, { status: 400 })
  }

  // Sessão tem de pertencer ao professor
  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('id, test_snapshot')
    .eq('id', sessionId)
    .eq('teacher_id', user.id)
    .single()
  if (error || !session) {
    return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })
  }

  const result = await transcribePaper(session.test_snapshot as TestSnapshot, images)
  if (!result) {
    return NextResponse.json({ error: 'Não foi possível transcrever as fotografias. Tenta fotos mais nítidas.' }, { status: 502 })
  }
  return NextResponse.json(result)
}
