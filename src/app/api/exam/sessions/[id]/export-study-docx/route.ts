// Exportar o ESTUDO PEDAGÓGICO para Word (.docx) — relatório EDITÁVEL (o professor
// adapta para a direção/EEs). Usa o motor puro src/lib/exam/pedagogy.ts. Só lê.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType, AlignmentType } from 'docx'
import type { TestSnapshot } from '@/lib/exam/types'
import { buildPedagogyReport, type SubLite } from '@/lib/exam/pedagogy'

export const runtime = 'nodejs'

const TYPE_PT: Record<string, string> = { multiple_choice: 'Escolha múltipla', true_false: 'V/F', short_answer: 'Resposta curta', long_answer: 'Resposta longa', fill_blank: 'Completar' }

function table(headers: string[], rows: string[][]): Table {
  const head = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      shading: { fill: '0D1B2A', type: 'clear', color: 'auto' },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })] })],
    })),
  })
  const body = rows.map(r => new TableRow({
    children: r.map(c => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c, size: 18 })] })] })),
  }))
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [head, ...body] })
}
const h2 = (t: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 }, children: [new TextRun({ text: t, bold: true })] })
const p = (t: string, opts: { italics?: boolean; color?: string } = {}) => new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: t, size: 20, italics: opts.italics, color: opts.color })] })
const bullet = (t: string) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun({ text: t, size: 20 })] })

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const children: (Paragraph | Table)[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'Estudo pedagógico', bold: true, size: 36, font: 'Georgia', color: '0D1B2A' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: `${rep.title} · ${rep.subject} · ${rep.yearLevel}.º ano · Tema: ${rep.topic}`, size: 20, color: '555555' })] }),
  ]

  if (rep.nGraded === 0) {
    children.push(p('Ainda não há correcções completas. O estudo fica disponível quando houver notas.'))
  } else {
    children.push(h2('Resumo'))
    children.push(table(
      ['Indicador', 'Valor'],
      [
        ['Provas corrigidas', String(rep.nGraded)],
        ['Média', `${rep.avg} / ${rep.maxScore}`],
        ['Mediana', String(rep.median)],
        ['Desvio-padrão', String(rep.sd)],
        ['Mínimo / Máximo', `${rep.min} / ${rep.max}`],
        ['Aprovados ≥ 50%', `${rep.passPct}%`],
        ['Fiabilidade (alfa de Cronbach)', rep.alpha === null ? 'n/d' : String(rep.alpha)],
      ],
    ))

    children.push(h2('Distribuição por nível'))
    children.push(table(['Nível 1', 'Nível 2', 'Nível 3', 'Nível 4', 'Nível 5'], [rep.dist.map(d => `${d.count} (${d.pct}%)`)]))

    children.push(h2('Por questão — dificuldade e discriminação'))
    children.push(p('Dificuldade = acerto médio (↓ = difícil). Discriminação separa quem sabe de quem não sabe (“revê” = pode estar ambígua ou mal cotada).', { italics: true, color: '777777' }))
    children.push(table(
      ['Q', 'Tipo', 'Bloom', 'Cot.', 'Dificuldade', 'Erro', 'Discriminação'],
      rep.items.map(it => [String(it.index), TYPE_PT[it.type] ?? it.type, it.bloom, String(it.points), `${it.difficulty}%`, `${it.errorRate}%`, it.discrimination === null ? 'n/d' : `${it.discrimination.toFixed(2)} · ${it.discLabel}`]),
    ))

    if (rep.turmas.length > 1) {
      children.push(h2('Por turma'))
      children.push(table(
        ['Turma', 'Alunos', 'Média', 'Acerto', 'Aprov. ≥50%', 'Mín/Máx', 'DP'],
        rep.turmas.map(t => [t.turma, String(t.n), `${t.avg}/${t.max}`, `${t.avgPct}%`, `${t.passPct}%`, `${t.min}/${t.max_}`, `± ${t.sd}`]),
      ))
    }

    children.push(h2('Por nível de Bloom e por tipo'))
    children.push(table(['Nível de Bloom', 'Acerto médio'], rep.bloom.map(b => [b.bloom, `${b.avgPct}%`])))
    children.push(new Paragraph({ spacing: { after: 60 }, children: [] }))
    children.push(table(['Tipo de pergunta', 'Acerto médio'], rep.types.map(t => [TYPE_PT[t.type] ?? t.type, `${t.avgPct}%`])))

    children.push(h2('Recomendações — turma / global'))
    rep.recClass.forEach(r => children.push(bullet(r)))

    if (rep.recStudents.length > 0) {
      children.push(h2('Recomendações — por aluno'))
      children.push(table(
        ['Aluno', 'Turma', 'Medidas'],
        rep.recStudents.map(s => [s.name, s.turma === '—' ? '' : s.turma, s.notes.join(' ')]),
      ))
    }
  }

  const doc = new Document({ sections: [{ children }] })
  const buf = await Packer.toBuffer(doc)
  const safe = (rep.title || 'exame').replace(/[^\p{L}\p{N}\- ]/gu, '').trim().slice(0, 60) || 'exame'
  return new NextResponse(buf as unknown as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="Estudo pedagogico - ${safe}.docx"`,
    },
  })
}
