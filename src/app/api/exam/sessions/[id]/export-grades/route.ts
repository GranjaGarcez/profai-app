// Exportar as cotações do exame para Excel (.xlsx): uma folha "Global" com todos os
// alunos + uma folha por turma. Grelha de correção coerente, com todos os elementos
// do teste (cada pergunta com a sua cotação máxima), identificada (nome, ano/turma,
// número) e ordenada pelo número do aluno. Aditivo; não altera nada na base de dados.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import { getAllQuestions } from '@/lib/exam/types'
import type { TestSnapshot, GradingDetail } from '@/lib/exam/types'
import { turmaLabel as turmaLabelOf } from '@/lib/exam/turma'

export const runtime = 'nodejs'

interface Row { id: string; name: string; number: string | null; turma: string; scores: Record<string, number | null>; total: number | null }

function numKey(n: string | null): number {
  const v = parseInt(String(n ?? '').replace(/\D/g, ''), 10)
  return Number.isFinite(v) ? v : Number.MAX_SAFE_INTEGER
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

  const rows: Row[] = (subs ?? []).map(s => {
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

  const wb = new ExcelJS.Workbook()
  wb.creator = 'PROF.IA'
  wb.created = new Date()

  const dateStr = new Date(session.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })

  function buildSheet(name: string, data: Row[], turmaLabelForHeader: string) {
    const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ state: 'frozen', xSplit: 2, ySplit: 4 }] })

    // Cabeçalho do teste
    ws.mergeCells(1, 1, 1, 4 + questions.length + 1)
    ws.getCell(1, 1).value = snapshot.title
    ws.getCell(1, 1).font = { bold: true, size: 13 }
    ws.mergeCells(2, 1, 2, 4 + questions.length + 1)
    ws.getCell(2, 1).value = `${snapshot.subject} · ${snapshot.yearLevel}.º ano · Turma: ${turmaLabelForHeader} · ${dateStr}`
    ws.getCell(2, 1).font = { color: { argb: 'FF6B7280' }, size: 10 }

    // Linha de cabeçalhos
    const headRow = 4
    const headers = ['Nº', 'Nome', 'Turma', ...questions.map((q, i) => `Q${i + 1}`), 'Total', '%']
    ws.getRow(headRow).values = headers
    ws.getRow(headRow).font = { bold: true }
    ws.getRow(headRow).alignment = { horizontal: 'center' }
    // Linha das cotações máximas
    const maxRow = headRow + 1
    ws.getCell(maxRow, 1).value = ''
    ws.getCell(maxRow, 2).value = 'Cotação máxima'
    ws.getCell(maxRow, 3).value = ''
    questions.forEach((q, i) => { ws.getCell(maxRow, 4 + i).value = q.points })
    ws.getCell(maxRow, 4 + questions.length).value = totalMax
    ws.getRow(maxRow).font = { italic: true, color: { argb: 'FF9CA3AF' } }
    ws.getRow(maxRow).alignment = { horizontal: 'center' }

    // Larguras
    ws.getColumn(1).width = 5
    ws.getColumn(2).width = 28
    ws.getColumn(3).width = 8
    questions.forEach((_q, i) => { ws.getColumn(4 + i).width = 6 })
    ws.getColumn(4 + questions.length).width = 8
    ws.getColumn(5 + questions.length).width = 6

    // Alunos ordenados por número, depois nome
    const ordered = [...data].sort((a, b) => {
      const ka = numKey(a.number), kb = numKey(b.number)
      if (ka !== kb) return ka - kb
      return (a.name ?? '').localeCompare(b.name ?? '', 'pt')
    })
    let r = maxRow + 1
    for (const row of ordered) {
      ws.getCell(r, 1).value = row.number ?? ''
      ws.getCell(r, 2).value = row.name
      ws.getCell(r, 3).value = row.turma === '—' ? '' : row.turma
      questions.forEach((q, i) => {
        const v = row.scores[String(q.index)]
        ws.getCell(r, 4 + i).value = v === null ? '' : v
        ws.getCell(r, 4 + i).alignment = { horizontal: 'center' }
      })
      const totalCell = ws.getCell(r, 4 + questions.length)
      totalCell.value = row.total === null ? '' : row.total
      totalCell.font = { bold: true }
      totalCell.alignment = { horizontal: 'center' }
      const pct = row.total !== null && totalMax > 0 ? Math.round((row.total / totalMax) * 100) : null
      const pctCell = ws.getCell(r, 5 + questions.length)
      pctCell.value = pct === null ? '' : pct / 100
      pctCell.numFmt = '0%'
      pctCell.alignment = { horizontal: 'center' }
      if (pct !== null && pct < 50) pctCell.font = { color: { argb: 'FFDC2626' }, bold: true }
      r++
    }

    // Rodapé: média da turma/folha (dos que têm total)
    const totals = ordered.map(o => o.total).filter((v): v is number => v !== null)
    if (totals.length > 0) {
      const avg = totals.reduce((a, b) => a + b, 0) / totals.length
      ws.getCell(r + 1, 2).value = 'Média'
      ws.getCell(r + 1, 2).font = { bold: true }
      ws.getCell(r + 1, 4 + questions.length).value = Math.round(avg * 10) / 10
      ws.getCell(r + 1, 4 + questions.length).font = { bold: true }
      ws.getCell(r + 1, 5 + questions.length).value = totalMax > 0 ? Math.round((avg / totalMax) * 100) / 100 : ''
      ws.getCell(r + 1, 5 + questions.length).numFmt = '0%'
    }

    // Bordas finas na grelha de dados
    for (let rr = headRow; rr < r; rr++) {
      for (let cc = 1; cc <= 5 + questions.length; cc++) {
        ws.getCell(rr, cc).border = {
          top: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          left: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          right: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        }
      }
    }
  }

  if (onlyTurma) {
    // Só uma turma (ficheiro próprio)
    buildSheet(onlyTurma, rows.filter(r => r.turma === onlyTurma), onlyTurma)
  } else {
    // Folha global + uma por turma, no mesmo ficheiro
    buildSheet('Global', rows, 'Todas')
    const turmas = Array.from(new Set(rows.map(r => r.turma).filter(t => t !== '—'))).sort((a, b) => a.localeCompare(b, 'pt'))
    for (const t of turmas) buildSheet(t, rows.filter(r => r.turma === t), t)
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
