// Relatório GERAL entre exames (Excel), centrado na TURMA. Junta vários testes
// (sessões) do professor num só ficheiro:
//   • Índice — os testes incluídos (código-nome, nº de alunos, média).
//   • Resumo <turma> — uma folha por turma: linhas = alunos, colunas = cada teste
//     (código-nome) com Nota e %. Alunos que fizeram um teste diferente (medida)
//     aparecem com valores só na coluna desse teste; os testes de medida vêm
//     ASSINALADOS (⚑) no cabeçalho.
//   • Detalhe <teste> — uma folha por teste, com a grelha pergunta-a-pergunta,
//     agrupada por turma.
// Só lê; aditivo; não altera nada.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import { getAllQuestions } from '@/lib/exam/types'
import type { TestSnapshot, GradingDetail, Question } from '@/lib/exam/types'
import { turmaLabel as turmaLabelOf } from '@/lib/exam/turma'

export const runtime = 'nodejs'

const numKey = (n: string | null): number => {
  const v = parseInt(String(n ?? '').replace(/\D/g, ''), 10)
  return Number.isFinite(v) ? v : Number.MAX_SAFE_INTEGER
}
const normName = (s: string): string =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

interface SubRow {
  id: string; session_id: string; student_name: string; student_number: string | null
  student_class: string | null; student_year: number | null
  grading_details: Record<string, GradingDetail> | null; total_score: number | null
}
interface TestInfo {
  id: string; title: string; code: string; questions: Question[]; totalMax: number
  fallbackYear: number | null; isAlt: boolean; subs: SubRow[]
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const idsParam = req.nextUrl.searchParams.get('ids')?.trim() || null
  const onlyTurma = req.nextUrl.searchParams.get('turma')?.trim() || null
  const wantIds = idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : null

  // Sessões a incluir (do professor). Sem `ids` → todas.
  let sq = supabase.from('exam_sessions').select('id, title, access_code, created_at, test_snapshot').eq('teacher_id', user.id)
  if (wantIds && wantIds.length) sq = sq.in('id', wantIds)
  const { data: sessions } = await sq.order('created_at', { ascending: true })
  if (!sessions || sessions.length === 0) return NextResponse.json({ error: 'Nenhum exame para incluir.' }, { status: 404 })

  const sessionIds = sessions.map(s => s.id as string)
  // Testes de medida = os que aparecem em _altSessions de algum teste incluído.
  const altSet = new Set<string>()
  for (const s of sessions) for (const a of ((s.test_snapshot as TestSnapshot)?._altSessions ?? [])) altSet.add(a)

  const { data: allSubs } = await supabase
    .from('exam_submissions')
    .select('id, session_id, student_name, student_number, student_class, student_year, grading_details, total_score')
    .in('session_id', sessionIds)

  const tests: TestInfo[] = sessions.map(s => {
    const snap = s.test_snapshot as TestSnapshot
    const qs = getAllQuestions(snap)
    return {
      id: s.id as string,
      title: (s.title as string) || 'Teste',
      code: (s.access_code as string) || '',
      questions: qs,
      totalMax: qs.reduce((a, q) => a + q.points, 0),
      fallbackYear: snap.yearLevel ?? null,
      isAlt: altSet.has(s.id as string),
      subs: ((allSubs ?? []) as SubRow[]).filter(x => x.session_id === s.id),
    }
  })

  // ── Registo de alunos por turma (identidade por nome normalizado dentro da turma) ──
  interface StudentRec { name: string; number: string | null; perTest: Record<string, { total: number | null; max: number }> }
  const byTurma = new Map<string, Map<string, StudentRec>>()
  for (const t of tests) {
    for (const sub of t.subs) {
      const turma = turmaLabelOf(sub.student_year, sub.student_class, t.fallbackYear)
      if (turma === '—') continue
      if (onlyTurma && turma !== onlyTurma) continue
      if (!byTurma.has(turma)) byTurma.set(turma, new Map())
      const reg = byTurma.get(turma)!
      const key = normName(sub.student_name) || sub.id
      const rec = reg.get(key) ?? { name: sub.student_name, number: sub.student_number, perTest: {} }
      if (!rec.number && sub.student_number) rec.number = sub.student_number
      rec.perTest[t.id] = { total: typeof sub.total_score === 'number' ? sub.total_score : null, max: t.totalMax }
      reg.set(key, rec)
    }
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = 'PROF.IA'; wb.created = new Date()
  const usedNames = new Set<string>()
  const sheetName = (base: string) => {
    const n = (base || 'Folha').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 28) || 'Folha'
    let name = n, i = 2
    while (usedNames.has(name)) { name = `${n.slice(0, 25)} ${i++}` }
    usedNames.add(name); return name
  }

  // ── Índice ──
  const idx = wb.addWorksheet(sheetName('Índice'))
  idx.addRow(['Relatório geral de avaliação']).font = { bold: true, size: 14 }
  idx.addRow([`${tests.length} teste(s)${onlyTurma ? ` · turma ${onlyTurma}` : ''} · ${new Date().toLocaleDateString('pt-PT')}`]).font = { color: { argb: 'FF6B7280' } }
  idx.addRow([])
  const idxHead = idx.addRow(['Código', 'Teste', 'Tipo', 'Alunos', 'Média', 'Cotação máx.'])
  idxHead.font = { bold: true }
  for (const t of tests) {
    const totals = t.subs.map(x => x.total_score).filter((v): v is number => typeof v === 'number')
    const avg = totals.length ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10 : ''
    idx.addRow([t.code, t.title, t.isAlt ? '⚑ Medida/alternativo' : 'Principal', t.subs.length, avg, t.totalMax])
  }
  idx.getColumn(1).width = 10; idx.getColumn(2).width = 40; idx.getColumn(3).width = 20
  idx.getColumn(4).width = 9; idx.getColumn(5).width = 9; idx.getColumn(6).width = 12

  // ── Resumo por turma (aluno × teste) ──
  const turmas = Array.from(byTurma.keys()).sort((a, b) => a.localeCompare(b, 'pt'))
  // Testes que cada turma realmente tem (não repetir colunas vazias à toa, mas manter
  // a ordem global dos testes para coerência entre turmas).
  for (const turma of turmas) {
    const reg = byTurma.get(turma)!
    const ws = wb.addWorksheet(sheetName(`Resumo ${turma}`), { views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }] })
    const testsHere = tests.filter(t => Array.from(reg.values()).some(r => r.perTest[t.id]))

    ws.mergeCells(1, 1, 1, 2 + testsHere.length * 2 + 1)
    ws.getCell(1, 1).value = `Resumo — Turma ${turma}`
    ws.getCell(1, 1).font = { bold: true, size: 13 }

    // Linha de cabeçalho dos testes (cada teste ocupa 2 colunas: Nota, %)
    const r1 = 2
    ws.getCell(r1, 1).value = 'Nº'; ws.getCell(r1, 2).value = 'Nome'
    testsHere.forEach((t, i) => {
      const c0 = 3 + i * 2
      ws.mergeCells(r1, c0, r1, c0 + 1)
      const cell = ws.getCell(r1, c0)
      cell.value = `${t.isAlt ? '⚑ ' : ''}${t.title}${t.code ? ` [${t.code}]` : ''}`
      cell.font = { bold: true, color: { argb: t.isAlt ? 'FF92400E' : 'FF0D1B2A' } }
      if (t.isAlt) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3C7' } }
      cell.alignment = { horizontal: 'center' }
    })
    const mediaCol = 3 + testsHere.length * 2
    ws.getCell(r1, mediaCol).value = 'Média %'
    ws.getCell(r1, mediaCol).font = { bold: true }

    // Sub-cabeçalho Nota / %
    const r2 = 3
    testsHere.forEach((_t, i) => {
      const c0 = 3 + i * 2
      ws.getCell(r2, c0).value = 'Nota'; ws.getCell(r2, c0 + 1).value = '%'
    })
    ws.getRow(r2).font = { italic: true, color: { argb: 'FF9CA3AF' } }
    ws.getRow(r2).alignment = { horizontal: 'center' }

    // Alunos ordenados por número, depois nome
    const students = Array.from(reg.values()).sort((a, b) => {
      const ka = numKey(a.number), kb = numKey(b.number)
      if (ka !== kb) return ka - kb
      return a.name.localeCompare(b.name, 'pt')
    })
    let r = r2 + 1
    for (const st of students) {
      ws.getCell(r, 1).value = st.number ?? ''
      ws.getCell(r, 2).value = st.name
      const pcts: number[] = []
      testsHere.forEach((t, i) => {
        const c0 = 3 + i * 2
        const cell = st.perTest[t.id]
        if (!cell) {
          // Não fez este teste — marca com "·" para distinguir de 0.
          ws.getCell(r, c0).value = '·'; ws.getCell(r, c0).alignment = { horizontal: 'center' }
          ws.getCell(r, c0).font = { color: { argb: 'FFBBBBBB' } }
          ws.getCell(r, c0 + 1).value = ''
          return
        }
        ws.getCell(r, c0).value = cell.total === null ? '' : cell.total
        ws.getCell(r, c0).alignment = { horizontal: 'center' }
        const pct = cell.total !== null && cell.max > 0 ? Math.round((cell.total / cell.max) * 100) : null
        const pc = ws.getCell(r, c0 + 1)
        pc.value = pct === null ? '' : pct / 100
        pc.numFmt = '0%'; pc.alignment = { horizontal: 'center' }
        if (pct !== null) { pcts.push(pct); if (pct < 50) pc.font = { color: { argb: 'FFDC2626' }, bold: true } }
      })
      const mc = ws.getCell(r, mediaCol)
      mc.value = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) / 100 : ''
      mc.numFmt = '0%'; mc.font = { bold: true }; mc.alignment = { horizontal: 'center' }
      r++
    }

    ws.getColumn(1).width = 5; ws.getColumn(2).width = 28
    testsHere.forEach((_t, i) => { ws.getColumn(3 + i * 2).width = 7; ws.getColumn(4 + i * 2).width = 6 })
    ws.getColumn(mediaCol).width = 9
  }

  // ── Detalhe por teste (grelha pergunta-a-pergunta, agrupada por turma) ──
  for (const t of tests) {
    const ws = wb.addWorksheet(sheetName(`Det ${t.code || t.title}`), { views: [{ state: 'frozen', xSplit: 2, ySplit: 4 }] })
    const nQ = t.questions.length
    const totalCol = 4 + nQ, pctCol = 5 + nQ
    ws.mergeCells(1, 1, 1, pctCol)
    ws.getCell(1, 1).value = `${t.isAlt ? '⚑ ' : ''}${t.title}${t.code ? ` [${t.code}]` : ''}`
    ws.getCell(1, 1).font = { bold: true, size: 13, color: { argb: t.isAlt ? 'FF92400E' : 'FF0D1B2A' } }
    ws.mergeCells(2, 1, 2, pctCol)
    ws.getCell(2, 1).value = t.isAlt ? 'Teste alternativo / de medida' : 'Teste principal'
    ws.getCell(2, 1).font = { color: { argb: 'FF6B7280' }, size: 10 }

    const headRow = 4
    ws.getCell(headRow, 1).value = 'Nº'; ws.getCell(headRow, 2).value = 'Nome'; ws.getCell(headRow, 3).value = 'Turma'
    t.questions.forEach((_q, i) => { ws.getCell(headRow, 4 + i).value = `Q${i + 1}` })
    ws.getCell(headRow, totalCol).value = 'Total'; ws.getCell(headRow, pctCol).value = '%'
    ws.getRow(headRow).font = { bold: true }; ws.getRow(headRow).alignment = { horizontal: 'center' }
    const maxRow = headRow + 1
    ws.getCell(maxRow, 2).value = 'Cotação máxima'
    t.questions.forEach((q, i) => { ws.getCell(maxRow, 4 + i).value = q.points })
    ws.getCell(maxRow, totalCol).value = t.totalMax
    ws.getRow(maxRow).font = { italic: true, color: { argb: 'FF9CA3AF' } }; ws.getRow(maxRow).alignment = { horizontal: 'center' }

    const rows = t.subs
      .map(s => ({
        name: s.student_name, number: s.student_number,
        turma: turmaLabelOf(s.student_year, s.student_class, t.fallbackYear),
        details: (s.grading_details ?? {}) as Record<string, GradingDetail>,
        total: typeof s.total_score === 'number' ? s.total_score : null,
      }))
      .filter(x => !onlyTurma || x.turma === onlyTurma)
      .sort((a, b) => {
        if (a.turma !== b.turma) return a.turma.localeCompare(b.turma, 'pt')
        const ka = numKey(a.number), kb = numKey(b.number)
        if (ka !== kb) return ka - kb
        return a.name.localeCompare(b.name, 'pt')
      })
    let r = maxRow + 1
    for (const d of rows) {
      ws.getCell(r, 1).value = d.number ?? ''
      ws.getCell(r, 2).value = d.name
      ws.getCell(r, 3).value = d.turma === '—' ? '' : d.turma
      t.questions.forEach((q, i) => {
        const v = d.details[String(q.index)]?.score
        ws.getCell(r, 4 + i).value = typeof v === 'number' ? v : ''
        ws.getCell(r, 4 + i).alignment = { horizontal: 'center' }
      })
      ws.getCell(r, totalCol).value = d.total === null ? '' : d.total
      ws.getCell(r, totalCol).font = { bold: true }; ws.getCell(r, totalCol).alignment = { horizontal: 'center' }
      const pct = d.total !== null && t.totalMax > 0 ? Math.round((d.total / t.totalMax) * 100) : null
      const pc = ws.getCell(r, pctCol)
      pc.value = pct === null ? '' : pct / 100; pc.numFmt = '0%'; pc.alignment = { horizontal: 'center' }
      if (pct !== null && pct < 50) pc.font = { color: { argb: 'FFDC2626' }, bold: true }
      r++
    }
    ws.getColumn(1).width = 5; ws.getColumn(2).width = 28; ws.getColumn(3).width = 8
    for (let i = 0; i < nQ; i++) ws.getColumn(4 + i).width = 6
    ws.getColumn(totalCol).width = 8; ws.getColumn(pctCol).width = 6
  }

  const buf = await wb.xlsx.writeBuffer()
  const fname = `Relatorio geral${onlyTurma ? ` - ${onlyTurma.replace(/[^\p{L}\p{N}\- ]/gu, '')}` : ''}.xlsx`
  return new NextResponse(buf as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fname}"`,
    },
  })
}
