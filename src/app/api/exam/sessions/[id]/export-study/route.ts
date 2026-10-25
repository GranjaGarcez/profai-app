// Exportar o ESTUDO PEDAGÓGICO para Excel (multi-folha): Resumo, Por questão (com
// dificuldade e discriminação), Por turma, Por aluno (perfil) e Recomendações.
// Aditivo; só lê. Usa o motor puro src/lib/exam/pedagogy.ts.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import type { TestSnapshot } from '@/lib/exam/types'
import { buildPedagogyReport, type SubLite } from '@/lib/exam/pedagogy'

export const runtime = 'nodejs'

const TYPE_PT: Record<string, string> = { multiple_choice: 'Escolha múltipla', true_false: 'V/F', short_answer: 'Resposta curta', long_answer: 'Resposta longa', fill_blank: 'Completar' }

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

  const wb = new ExcelJS.Workbook()
  wb.creator = 'PROF.IA'; wb.created = new Date()
  const bold = { bold: true } as const
  const head = (ws: ExcelJS.Worksheet, cols: string[]) => { ws.addRow(cols).font = bold }

  // Resumo
  const r = wb.addWorksheet('Resumo')
  r.addRow([rep.title]).font = { bold: true, size: 13 }
  r.addRow([`${rep.subject} · ${rep.yearLevel}.º ano · Tema: ${rep.topic}`]).font = { color: { argb: 'FF6B7280' } }
  r.addRow([])
  r.addRow(['Corrigidos', rep.nGraded]); r.addRow(['Cotação máxima', rep.maxScore])
  r.addRow(['Média', rep.avg]); r.addRow(['Mediana', rep.median]); r.addRow(['Desvio-padrão', rep.sd])
  r.addRow(['Mínimo', rep.min]); r.addRow(['Máximo', rep.max]); r.addRow(['Aprovados ≥50% (%)', rep.passPct])
  r.addRow(['Fiabilidade (alfa de Cronbach)', rep.alpha ?? 'n/d'])
  r.addRow([])
  head(r, ['Nível', 'Alunos', '%'])
  rep.dist.forEach(d => r.addRow([`Nível ${d.nivel}`, d.count, d.pct / 100]).getCell(3).numFmt = '0%')
  r.getColumn(1).width = 30; r.getColumn(2).width = 12; r.getColumn(3).width = 10

  // Por questão
  const q = wb.addWorksheet('Por questão')
  head(q, ['Q', 'Tipo', 'Bloom', 'Cotação', 'Dificuldade (%)', 'Taxa erro (%)', 'Discriminação', 'Leitura'])
  rep.items.forEach(it => q.addRow([
    it.index, TYPE_PT[it.type] ?? it.type, it.bloom, it.points, it.difficulty, it.errorRate,
    it.discrimination === null ? 'n/d' : it.discrimination, it.discLabel,
  ]))
  q.getColumn(2).width = 16; q.getColumn(3).width = 14; ;[4, 5, 6, 7, 8].forEach(c => q.getColumn(c).width = 14)

  // Por turma
  const t = wb.addWorksheet('Por turma')
  head(t, ['Turma', 'Alunos', 'Média', 'Acerto (%)', 'Aprovados ≥50% (%)', 'Mín', 'Máx', 'DP'])
  rep.turmas.forEach(tt => t.addRow([tt.turma, tt.n, tt.avg, tt.avgPct, tt.passPct, tt.min, tt.max_, tt.sd]))
  t.getColumn(1).width = 10

  // Por aluno (perfil)
  const a = wb.addWorksheet('Por aluno')
  const bloomCols = Array.from(new Set(rep.items.map(i => i.bloom)))
  head(a, ['Nº', 'Nome', 'Turma', 'Total', '%', 'Nível', ...bloomCols.map(b => `Bloom: ${b}`), 'Mais frágil (Bloom)'])
  rep.students.forEach(st => {
    const row = [st.number ?? '', st.name, st.turma === '—' ? '' : st.turma, st.total, st.pct / 100, st.nivel,
      ...bloomCols.map(b => (st.byBloom[b] === undefined ? '' : st.byBloom[b] / 100)), st.weakBloom ?? '']
    const rr = a.addRow(row)
    rr.getCell(5).numFmt = '0%'
    bloomCols.forEach((_b, i) => { rr.getCell(7 + i).numFmt = '0%' })
  })
  a.getColumn(2).width = 28; a.getColumn(3).width = 8

  // Recomendações
  const rec = wb.addWorksheet('Recomendações')
  rec.addRow(['Recomendações — turma / global']).font = { bold: true, size: 12 }
  rep.recClass.forEach(line => rec.addRow([line]))
  rec.addRow([]); rec.addRow(['Recomendações — por aluno']).font = { bold: true, size: 12 }
  head(rec, ['Nº', 'Aluno', 'Turma', 'Medidas'])
  rep.recStudents.forEach(s => {
    const prof = rep.students.find(p => p.id === s.id)
    rec.addRow([prof?.number ?? '', s.name, s.turma === '—' ? '' : s.turma, s.notes.join(' ')])
  })
  rec.getColumn(2).width = 26; rec.getColumn(4).width = 80
  rec.getColumn(1).width = 5; rec.getColumn(3).width = 8

  const buf = await wb.xlsx.writeBuffer()
  const safe = (rep.title || 'exame').replace(/[^\p{L}\p{N}\- ]/gu, '').trim().slice(0, 60) || 'exame'
  return new NextResponse(buf as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Estudo pedagogico - ${safe}.xlsx"`,
    },
  })
}
