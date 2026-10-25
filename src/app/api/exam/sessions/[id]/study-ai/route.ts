// Aprofundar o estudo com IA (a PEDIDO do professor → custo só quando carrega).
// Recebe as estatísticas já calculadas (motor puro) e devolve medidas pedagógicas
// redigidas — turma e alunos em risco — ancoradas SÓ nestes dados (não inventa).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callJsonCascade } from '@/lib/ai/singleCall'
import type { TestSnapshot } from '@/lib/exam/types'
import { buildPedagogyReport, type SubLite } from '@/lib/exam/pedagogy'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: session, error } = await supabase
    .from('exam_sessions').select('test_snapshot, teacher_id').eq('id', id).eq('teacher_id', user.id).single()
  if (error || !session) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })

  const { data: subs } = await supabase
    .from('exam_submissions')
    .select('id, student_name, student_number, student_class, student_year, total_score, max_score, status, grading_details')
    .eq('session_id', id)

  const snapshot = session.test_snapshot as TestSnapshot
  const rep = buildPedagogyReport(snapshot, (subs ?? []) as SubLite[])
  if (rep.nGraded === 0) return NextResponse.json({ error: 'Ainda não há correcções completas para analisar.' }, { status: 400 })

  // Resumo compacto (limita o custo): só o essencial + alunos em risco (máx. 25).
  const atRisk = rep.students.filter(s => s.pct < 50).slice(0, 25)
    .map(s => ({ nome: s.name, turma: s.turma, pct: s.pct, fraco: s.weakBloom }))
  const summary = {
    disciplina: rep.subject, ano: rep.yearLevel, tema: rep.topic,
    media_pct: rep.maxScore > 0 ? Math.round(100 * rep.avg / rep.maxScore) : 0,
    aprovados_pct: rep.passPct, alfa: rep.alpha,
    perguntas_dificeis: rep.items.filter(i => i.difficulty < 50).map(i => ({ q: i.index, bloom: i.bloom, acerto: i.difficulty, discrimina: i.discLabel })),
    bloom: rep.bloom, tipos: rep.types,
    turmas: rep.turmas.map(t => ({ turma: t.turma, acerto: t.avgPct, aprovados: t.passPct })),
    alunos_em_risco: atRisk,
  }

  const prompt = `És um especialista em avaliação pedagógica a apoiar um professor de ${rep.subject} do ${rep.yearLevel}.º ano (2.º ciclo, 10-12 anos) em Portugal.

Com base APENAS nestes dados reais de um teste já corrigido (não inventes nada, não acrescentes alunos nem valores que não estejam aqui), escreve medidas concretas e accionáveis para melhorar o desempenho futuro.

DADOS (JSON):
${JSON.stringify(summary)}

REGRAS:
- Português de Portugal estrito. Linguagem de professor para professor, concreta.
- "turma": 4 a 7 medidas para a turma/grupo — o que reensinar, que competências de Bloom reforçar, que perguntas rever, como diferenciar. Refere perguntas pelo número (ex.: "Q3").
- "alunos": para CADA aluno em risco listado, UMA medida individual curta e específica (apoio, foco na competência fraca). Usa o nome tal como vem.
- Não repitas o óbvio nem enchas; cada linha tem de valer a pena.

Responde APENAS com este JSON (sem texto extra, sem markdown):
{"turma":["..."],"alunos":[{"nome":"...","turma":"...","medida":"..."}]}`

  const out = await callJsonCascade(prompt, { maxTokens: 2_200 })
  if (!out) return NextResponse.json({ error: 'A IA não respondeu. Tenta novamente daqui a pouco.' }, { status: 503 })

  const turma = Array.isArray(out.turma) ? (out.turma as unknown[]).map(String).slice(0, 10) : []
  const alunos = Array.isArray(out.alunos)
    ? (out.alunos as Array<Record<string, unknown>>).map(a => ({ nome: String(a.nome ?? ''), turma: String(a.turma ?? ''), medida: String(a.medida ?? '') })).filter(a => a.nome && a.medida)
    : []
  return NextResponse.json({ turma, alunos })
}
