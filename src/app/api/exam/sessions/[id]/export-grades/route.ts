// Exportar as cotações do exame para Excel (.xlsx): uma folha "Global" com todos os
// alunos + uma folha por turma. Grelha de correção coerente, com todos os elementos
// do teste (cada pergunta com a sua cotação máxima), identificada (nome, ano/turma,
// número) e ordenada pelo número do aluno. Aditivo; não altera nada na base de dados.
//
// Testes ALTERNATIVOS / de medida do mesmo momento (session.test_snapshot._altSessions):
// os alunos que fizeram outro teste aparecem na MESMA folha, num bloco SEPARADO e
// ASSINALADO (⚑ Teste alternativo), com as cotações do teste que fizeram.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import { getAllQuestions } from '@/lib/exam/types'
import type { TestSnapshot, GradingDetail, Question } from '@/lib/exam/types'
import { turmaLabel as turmaLabelOf } from '@/lib/exam/turma'

export const runtime = 'nodejs'

interface Row { id: string; name: string; number: string | null; turma: string; scores: Record<string, number | null>; total: number | null }
interface AltTest { id: string; title: string; code: string; questions: Question[]; totalMax: number; rows: Row[] }

function numKey(n: string | null): number {
  const v = parseInt(String(n ?? '').replace(/\D/g, ''), 10)
  return Number.isFinite(v) ? v : Number.MAX_SAFE_INTEGER
}

type SubRow = {
  id: string; student_name: string; student_number: string | null
  student_class: string | null; student_year: number | null
  grading_details: Record<string, GradingDetail> | null; total_score: number | null
}

function buildRows(questions: Question[], subs: SubRow[], fallbackYear: number | null): Row[] {
  return subs.map(s => {
    const details = (s.grading_details ?? {}) as Record<string, GradingDetail>
    const scores: Record<string, number | null> = {}
    for (const q of questions) {
      const d = details[String(q.index)]
      scores[String(q.index)] = d && typeof d.score === 'number' ? d.score : null
    }
    return {
      id: s.id, name: s.student_name, number: s.student_number,
      turma: turmaLabelOf(s.student_year, s.student_class, fallbackYear),
      scores, total: typeof s.total_score === 'number' ? s.total_score : null,
    }
  })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const onlyTurma = req.nextUrl.searchParams.get('turma')?.trim() || null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: session, error } = await supabase
    .from('exam_sessions').select('title, test_snapshot, created_at, teacher_id')
    .eq('id', id).eq('teacher_id', user.id).single()
  if (error || !session) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })

  const { data: subs } = await supabase
    .from('exam_submissions')
    .select('id, student_name, student_number, student_class, student_year, grading_details, total_score')
    .eq('session_id', id)

  const snapshot = session.test_snapshot as TestSnapshot
  const questions = getAllQuestions(snapshot)
  const fallbackYear = snapshot.yearLevel ?? null
  const totalMax = questions.reduce((s, q) => s + q.points, 0)
  const rows: Row[] = buildRows(questions, (subs ?? []) as SubRow[], fallbackYear)

  // ── Testes alternativos / de medida ligados a esta sessão ──
  const altTests: AltTest[] = []
  const altIds = (snapshot._altSessions ?? []).filter(Boolean)
  if (altIds.length) {
    const { data: altSessions } = await supabase
      .from('exam_sessions').select('id, title, access_code, test_snapshot')
      .eq('teacher_id', user.id).in('id', altIds)
    for (const alt of altSessions ?? []) {
      const altSnap = alt.test_snapshot as TestSnapshot
      const altQs = getAllQuestions(altSnap)
      const { data: altSubs } = await supabase
        .from('exam_submissions')
        .select('id, student_name, student_number, student_class, student_year, grading_details, total_score')
        .eq('session_id', alt.id)
      altTests.push({
        id: alt.id as string,
        title: (alt.title as string) || 'Teste alternativo',
        code: (alt.access_code as string) || '',
        questions: altQs,
        totalMax: altQs.reduce((s, q) => s + q.points, 0),
        rows: buildRows(altQs, (altSubs ?? []) as SubRow[], altSnap.yearLevel ?? null),
      })
    }
  }

  // Nº de colunas de perguntas a reservar (o maior entre o principal e os alternativos),
  // para o Total/% ficar sempre na mesma coluna em todos os blocos da folha.
  const maxQ = Math.max(questions.length, ...altTests.map(a => a.questions.length), 0)
  const totalCol = 4 + maxQ        // coluna do "Total"
  const pctCol = 5 + maxQ          // coluna do "%"
  const lastCol = pctCol

  const wb = new ExcelJS.Workbook()
  wb.creator = 'PROF.IA'
  wb.created = new Date()

  const dateStr = new Date(session.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })

  // Escreve um bloco (cabeçalho + cotações máximas + alunos + média) a partir de startRow.
  // Devolve a linha seguinte ao bloco. `blockTitle` (quando presente) marca um bloco
  // alternativo com uma faixa âmbar.
  function writeBlock(ws: ExcelJS.Worksheet, startRow: number, blockTitle: string | null, qs: Question[], blockMax: number, data: Row[]): number {
    let row = startRow
    if (blockTitle) {
      ws.mergeCells(row, 1, row, lastCol)
      const c = ws.getCell(row, 1)
      c.value = blockTitle
      c.font = { bold: true, color: { argb: 'FF92400E' } }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3C7' } }
      row++
    }
    const headRow = row
    ws.getCell(headRow, 1).value = 'Nº'
    ws.getCell(headRow, 2).value = 'Nome'
    ws.getCell(headRow, 3).value = 'Turma'
    qs.forEach((_q, i) => { ws.getCell(headRow, 4 + i).value = `Q${i + 1}` })
    ws.getCell(headRow, totalCol).value = 'Total'
    ws.getCell(headRow, pctCol).value = '%'
    ws.getRow(headRow).font = { bold: true }
    ws.getRow(headRow).alignment = { horizontal: 'center' }

    const maxRow = headRow + 1
    ws.getCell(maxRow, 2).value = 'Cotação máxima'
    qs.forEach((q, i) => { ws.getCell(maxRow, 4 + i).value = q.points })
    ws.getCell(maxRow, totalCol).value = blockMax
    ws.getRow(maxRow).font = { italic: true, color: { argb: 'FF9CA3AF' } }
    ws.getRow(maxRow).alignment = { horizontal: 'center' }

    const ordered = [...data].sort((a, b) => {
      const ka = numKey(a.number), kb = numKey(b.number)
      if (ka !== kb) return ka - kb
      return (a.name ?? '').localeCompare(b.name ?? '', 'pt')
    })
    let r = maxRow + 1
    for (const d of ordered) {
      ws.getCell(r, 1).value = d.number ?? ''
      ws.getCell(r, 2).value = d.name
      ws.getCell(r, 3).value = d.turma === '—' ? '' : d.turma
      qs.forEach((q, i) => {
        const v = d.scores[String(q.index)]
        ws.getCell(r, 4 + i).value = v === null ? '' : v
        ws.getCell(r, 4 + i).alignment = { horizontal: 'center' }
      })
      const totalCell = ws.getCell(r, totalCol)
      totalCell.value = d.total === null ? '' : d.total
      totalCell.font = { bold: true }
      totalCell.alignment = { horizontal: 'center' }
      const pct = d.total !== null && blockMax > 0 ? Math.round((d.total / blockMax) * 100) : null
      const pctCell = ws.getCell(r, pctCol)
      pctCell.value = pct === null ? '' : pct / 100
      pctCell.numFmt = '0%'
      pctCell.alignment = { horizontal: 'center' }
      if (pct !== null && pct < 50) pctCell.font = { color: { argb: 'FFDC2626' }, bold: true }
      r++
    }

    const totals = ordered.map(o => o.total).filter((v): v is number => v !== null)
    if (totals.length > 0) {
      const avg = totals.reduce((a, b) => a + b, 0) / totals.length
      ws.getCell(r, 2).value = 'Média'
      ws.getCell(r, 2).font = { bold: true }
      ws.getCell(r, totalCol).value = Math.round(avg * 10) / 10
      ws.getCell(r, totalCol).font = { bold: true }
      ws.getCell(r, pctCol).value = blockMax > 0 ? Math.round((avg / blockMax) * 100) / 100 : ''
      ws.getCell(r, pctCol).numFmt = '0%'
      r++
    }

    // Bordas finas na grelha deste bloco
    for (let rr = headRow; rr < r; rr++) {
      for (let cc = 1; cc <= lastCol; cc++) {
        ws.getCell(rr, cc).border = {
          top: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          left: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          right: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        }
      }
    }
    return r
  }

  function buildSheet(name: string, data: Row[], turmaLabelForHeader: string, turmaKey: string | null) {
    const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ state: 'frozen', xSplit: 2, ySplit: 4 }] })

    // Cabeçalho do teste
    ws.mergeCells(1, 1, 1, lastCol)
    ws.getCell(1, 1).value = snapshot.title
    ws.getCell(1, 1).font = { bold: true, size: 13 }
    ws.mergeCells(2, 1, 2, lastCol)
    ws.getCell(2, 1).value = `${snapshot.subject} · ${snapshot.yearLevel}.º ano · Turma: ${turmaLabelForHeader} · ${dateStr}`
    ws.getCell(2, 1).font = { color: { argb: 'FF6B7280' }, size: 10 }

    // Larguras
    ws.getColumn(1).width = 5
    ws.getColumn(2).width = 28
    ws.getColumn(3).width = 8
    for (let i = 0; i < maxQ; i++) ws.getColumn(4 + i).width = 6
    ws.getColumn(totalCol).width = 8
    ws.getColumn(pctCol).width = 6

    // Bloco principal (teste da maioria)
    let cursor = writeBlock(ws, 4, null, questions, totalMax, data)

    // Blocos de testes alternativos / de medida — só os alunos desta turma (ou todos no Global)
    for (const alt of altTests) {
      const altData = turmaKey ? alt.rows.filter(r => r.turma === turmaKey) : alt.rows
      if (altData.length === 0) continue
      cursor += 1 // linha em branco de separação
      cursor = writeBlock(ws, cursor, `⚑ Teste alternativo (medida): ${alt.title}${alt.code ? ` [${alt.code}]` : ''}`, alt.questions, alt.totalMax, altData)
    }
  }

  if (onlyTurma) {
    buildSheet(onlyTurma, rows.filter(r => r.turma === onlyTurma), onlyTurma, onlyTurma)
  } else {
    buildSheet('Global', rows, 'Todas', null)
    // Turmas = união das turmas do teste principal e dos alternativos.
    const turmaSet = new Set<string>()
    for (const r of rows) if (r.turma !== '—') turmaSet.add(r.turma)
    for (const alt of altTests) for (const r of alt.rows) if (r.turma !== '—') turmaSet.add(r.turma)
    const turmas = Array.from(turmaSet).sort((a, b) => a.localeCompare(b, 'pt'))
    for (const t of turmas) buildSheet(t, rows.filter(r => r.turma === t), t, t)
  }

  const buf = await wb.xlsx.writeBuffer()
  const safeTitle = (snapshot.title || 'exame').replace(/[^\p{L}\p{N}\- ]/gu, '').trim().slice(0, 60) || 'exame'
  const fname = `Cotacoes - ${safeTitle}${onlyTurma ? ` - ${onlyTurma.replace(/[^\p{L}\p{N}\- ]/gu, '')}` : ''}.xlsx`
  return new NextResponse(buf as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fname}"`,
    },
  })
}
