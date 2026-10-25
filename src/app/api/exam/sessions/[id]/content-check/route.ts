// Análise de integridade do CONTEÚDO (pós-entrega, do lado do professor).
// Sinaliza respostas abertas com vocabulário/conceitos claramente ACIMA do ano, ou
// FORA do tema do teste — indício de ajuda externa (web/IA). É o sinal que apanha o
// caso real (termos que não foram dados na aula), e funciona mesmo que o aluno tenha
// pesquisado NOUTRO aparelho, porque analisa o texto entregue, não o dispositivo.
//
// NÃO altera notas nem anula nada — só anexa indícios (`contentFlags`) ao registo de
// integridade da submissão, para o professor rever e decidir. Accionado por botão.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callJsonCascade } from '@/lib/ai/singleCall'
import { getAllQuestions } from '@/lib/exam/types'
import type { TestSnapshot } from '@/lib/exam/types'
import { withIntegrity, type ContentFlag } from '@/lib/exam/integrity'

export const runtime = 'nodejs'
export const maxDuration = 300

const OPEN_TYPES = new Set(['short_answer', 'long_answer', 'fill_blank'])

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('id, test_snapshot')
    .eq('id', id)
    .eq('teacher_id', user.id)
    .single()
  if (error || !session) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })

  const snapshot = session.test_snapshot as TestSnapshot
  const questions = getAllQuestions(snapshot)
  const openByKey = new Map(questions.filter(q => OPEN_TYPES.has(q.type)).map(q => [String(q.index), q]))
  if (openByKey.size === 0) {
    return NextResponse.json({ analysed: 0, flagged: 0, message: 'Este teste não tem perguntas de resposta aberta para analisar.' })
  }

  const { data: subs } = await supabase
    .from('exam_submissions')
    .select('id, answers')
    .eq('session_id', id)
    .in('status', ['graded', 'reviewed', 'por_corrigir'])

  const toCheck = subs ?? []
  const admin = createAdminClient()
  const yearLevel = snapshot.yearLevel
  const subject = snapshot.subject
  const topic = snapshot.topic

  let analysed = 0, flaggedSubs = 0, flaggedAnswers = 0

  for (const sub of toCheck) {
    const answers = (sub.answers ?? {}) as Record<string, string>
    // Só respostas abertas com texto com substância.
    const items: Array<{ qKey: string; question: string; answer: string }> = []
    for (const [qKey, q] of openByKey) {
      const a = String(answers[qKey] ?? '').trim()
      if (a.length >= 4) items.push({ qKey, question: q.text, answer: a })
    }
    if (items.length === 0) continue

    const prompt = `És um assistente de integridade académica a ajudar um professor de ${subject} do ${yearLevel}.º ano (2.º ciclo, 10-12 anos) em Portugal.

Tema do teste: "${topic}".

Para CADA resposta abaixo, decide se há INDÍCIO de ajuda externa (pesquisa na net ou IA), com base em dois sinais OBJECTIVOS:
• "above" — usa vocabulário, termos técnicos/científicos ou conceitos CLARAMENTE acima do que se espera no ${yearLevel}.º ano do 2.º ciclo (ex.: terminologia de secundário/universidade numa resposta de uma criança de 10-12 anos).
• "off_topic" — foge do que o enunciado e o tema pedem, ou tem a cara de texto gerado/copiado (registo demasiado formal, impessoal, "enciclopédico").
• "ok" — resposta adequada à idade e ao tema, ainda que boa; NÃO sinalizes bons alunos só por escreverem bem.

REGRAS:
- Sê CONSERVADOR: só sinaliza (above/off_topic) quando o indício é claro. Na dúvida, "ok".
- Lista em "terms" as palavras/expressões concretas que levantam a suspeita (as que não são próprias da idade/tema).
- Isto é um INDÍCIO para o professor rever, não uma acusação. Português de Portugal.

RESPOSTAS (pela ordem):
${items.map((it, i) => `#${i + 1}
Pergunta: ${it.question}
Resposta do aluno: ${it.answer}`).join('\n\n')}

Responde APENAS com este JSON válido (sem texto extra, sem markdown):
{"flags":[{"n":<número #>,"level":"above|off_topic|ok","terms":["..."],"reason":"<frase curta PT-PT>","confidence":<0.0-1.0>}]}`

    const out = await callJsonCascade(prompt, { maxTokens: 1_500 })
    analysed++
    const rawFlags = Array.isArray(out?.flags) ? out!.flags as Array<Record<string, unknown>> : []
    const flags: ContentFlag[] = []
    for (const f of rawFlags) {
      const n = Number(f.n)
      const it = items[n - 1]
      if (!it) continue
      const level = f.level === 'above' || f.level === 'off_topic' ? f.level : 'ok'
      if (level === 'ok') continue
      flags.push({
        qKey: it.qKey,
        level,
        terms: Array.isArray(f.terms) ? (f.terms as unknown[]).map(String).slice(0, 8) : [],
        reason: String(f.reason ?? '').slice(0, 300),
        confidence: Math.min(1, Math.max(0, Number(f.confidence) || 0)),
      })
    }

    // Guarda sempre o resultado (mesmo vazio limpa indícios antigos desactualizados).
    const merged = withIntegrity(answers, { contentFlags: flags })
    try {
      await admin.from('exam_submissions').update({ answers: merged }).eq('id', sub.id)
    } catch (e) {
      console.error('[PROFAI] content-check: falha ao guardar para', sub.id, e)
      continue
    }
    if (flags.length > 0) { flaggedSubs++; flaggedAnswers += flags.length }
  }

  return NextResponse.json({ analysed, flagged: flaggedSubs, flaggedAnswers, total: toCheck.length })
}
