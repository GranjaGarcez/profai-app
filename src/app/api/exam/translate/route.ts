// Traduzir os enunciados (e opções) de um exame para a língua de um aluno LPNM.
// FASE 1 — só visualização: não altera o teste nem as respostas; o aluno continua a
// responder como hoje. Público (o aluno usa-o pelo exame), mas só funciona se o
// professor tiver ligado a tradução (snapshot._allowTranslation) e para uma língua da
// lista curada. Resultado em cache em snapshot._translations[lang] (1 chamada de IA
// por língua por exame).
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callJsonCascade } from '@/lib/ai/singleCall'
import { getAllQuestions } from '@/lib/exam/types'
import type { TestSnapshot } from '@/lib/exam/types'
import { langLabel } from '@/lib/exam/languages'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { sessionId, lang } = await request.json().catch(() => ({})) as { sessionId?: string; lang?: string }
  const label = lang ? langLabel(lang) : null
  if (!sessionId || !lang || !label) {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: session, error } = await admin
    .from('exam_sessions').select('id, status, test_snapshot').eq('id', sessionId).single()
  if (error || !session) return NextResponse.json({ error: 'Exame não encontrado.' }, { status: 404 })
  if (session.status !== 'active') return NextResponse.json({ error: 'Exame encerrado.' }, { status: 410 })

  const snapshot = session.test_snapshot as TestSnapshot
  if (!snapshot._allowTranslation) {
    return NextResponse.json({ error: 'A tradução não está disponível neste exame.' }, { status: 403 })
  }

  // Cache
  const cached = snapshot._translations?.[lang]
  if (cached) return NextResponse.json({ questions: cached })

  const questions = getAllQuestions(snapshot)
  const items = questions.map(q => ({
    i: String(q.index),
    text: q.text,
    options: Array.isArray(q.options) && q.options.length ? q.options : undefined,
  }))

  const prompt = `Traduz de Português de Portugal para ${label} os enunciados e opções de um teste escolar, para um aluno que ainda não domina o português poder COMPREENDER a pergunta.

REGRAS:
- Traduz fielmente o SIGNIFICADO; não resolvas, não respondas, não acrescentes nem removas informação.
- Mantém INTACTOS os números, símbolos, fórmulas, unidades e nomes próprios.
- Traduz as opções pela MESMA ordem (não as reordenes). Se uma opção começa por "A)"/"B)"… mantém essa etiqueta.
- Linguagem simples e clara, adequada a uma criança de 10-12 anos.

QUESTÕES (JSON):
${JSON.stringify(items)}

Responde APENAS com JSON válido, no formato { "<i>": { "text": "<tradução>", "options": ["<trad opção 1>", ...] } } (inclui "options" só quando a questão as tiver). Usa as mesmas chaves "i".`

  const out = await callJsonCascade(prompt, { maxTokens: 3_000 })
  if (!out) return NextResponse.json({ error: 'Não foi possível traduzir agora. Tenta novamente.' }, { status: 503 })

  // Normaliza: só chaves conhecidas, só strings.
  const result: Record<string, { text: string; options?: string[] }> = {}
  for (const q of questions) {
    const key = String(q.index)
    const r = (out as Record<string, unknown>)[key] as { text?: unknown; options?: unknown } | undefined
    if (!r || typeof r.text !== 'string') continue
    const entry: { text: string; options?: string[] } = { text: r.text }
    if (Array.isArray(r.options)) entry.options = (r.options as unknown[]).map(String)
    result[key] = entry
  }
  if (Object.keys(result).length === 0) {
    return NextResponse.json({ error: 'A tradução falhou. Tenta novamente.' }, { status: 502 })
  }

  // Grava em cache (best-effort; não bloqueia a resposta se falhar).
  try {
    const next: TestSnapshot = { ...snapshot, _translations: { ...(snapshot._translations ?? {}), [lang]: result } }
    await admin.from('exam_sessions').update({ test_snapshot: next }).eq('id', sessionId)
  } catch { /* cache é best-effort */ }

  return NextResponse.json({ questions: result })
}
