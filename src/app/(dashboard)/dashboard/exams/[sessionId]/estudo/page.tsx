import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { TestSnapshot } from '@/lib/exam/types'
import { buildPedagogyReport, type SubLite } from '@/lib/exam/pedagogy'
import StudyActions from './StudyActions'

interface Props { params: Promise<{ sessionId: string }> }

const TYPE_PT: Record<string, string> = { multiple_choice: 'Escolha múltipla', true_false: 'V/F', short_answer: 'Resposta curta', long_answer: 'Resposta longa', fill_blank: 'Completar' }
const pctColor = (p: number) => p >= 70 ? '#166534' : p >= 50 ? '#92400e' : '#dc2626'
const card = { border: '1px solid #0D1B2A10', borderRadius: 12, padding: 16, background: 'white' } as const
const th = { padding: '8px 10px', textAlign: 'left' as const, color: '#6B7280', fontWeight: 600, fontSize: 12, background: '#f8fafc' }
const td = { padding: '7px 10px', fontSize: 12, borderTop: '1px solid #0D1B2A08', color: '#0D1B2A' }

export default async function StudyPage({ params }: Props) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session, error } = await supabase
    .from('exam_sessions').select('id, title, test_snapshot').eq('id', sessionId).eq('teacher_id', user.id).single()
  if (error || !session) notFound()

  const { data: submissions } = await supabase
    .from('exam_submissions')
    .select('id, student_name, student_number, student_class, student_year, total_score, max_score, status, grading_details')
    .eq('session_id', sessionId)

  const snapshot = session.test_snapshot as TestSnapshot
  const rep = buildPedagogyReport(snapshot, (submissions ?? []) as SubLite[])

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="no-print">
        <Link href={`/dashboard/exams/${sessionId}`} className="text-sm hover:underline" style={{ color: '#6B7280' }}>← Voltar à correcção</Link>
      </div>

      <StudyActions sessionId={sessionId} />

      {/* Cabeçalho do relatório */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>Estudo pedagógico</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{rep.title} · {rep.subject} · {rep.yearLevel}.º ano · Tema: {rep.topic}</p>
        <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{rep.nGraded} prova(s) corrigida(s)</p>
      </div>

      {rep.nGraded === 0 ? (
        <div style={card}><p className="text-sm" style={{ color: '#6B7280' }}>Ainda não há correcções completas. O estudo fica disponível quando houver notas.</p></div>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { l: 'Média', v: `${rep.avg}`, s: `/ ${rep.maxScore}` },
              { l: 'Mediana', v: `${rep.median}`, s: `DP ± ${rep.sd}` },
              { l: 'Mín / Máx', v: `${rep.min} / ${rep.max}`, s: 'valores' },
              { l: 'Aprovados ≥50%', v: `${rep.passPct}%`, s: `fiab. α ${rep.alpha ?? 'n/d'}` },
            ].map(x => (
              <div key={x.l} style={{ ...card, textAlign: 'center' }}>
                <p className="text-2xl font-bold font-mono" style={{ color: '#0D1B2A' }}>{x.v}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{x.l}</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>{x.s}</p>
              </div>
            ))}
          </div>

          {/* Distribuição por nível */}
          <div style={card}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: '#0D1B2A' }}>Distribuição por nível</h2>
            <div className="flex items-end gap-2" style={{ height: 90 }}>
              {rep.dist.map(d => {
                const h = Math.max(4, d.pct)
                return (
                  <div key={d.nivel} className="flex-1 flex flex-col items-center justify-end" style={{ height: '100%' }}>
                    <span className="text-xs font-mono" style={{ color: '#6B7280' }}>{d.count}</span>
                    <div style={{ width: '70%', height: `${h}%`, background: d.nivel <= 2 ? '#fca5a5' : d.nivel === 3 ? '#fde68a' : '#86efac', borderRadius: 4 }} />
                    <span className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Nv {d.nivel}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Por questão */}
          <div style={card}>
            <h2 className="text-sm font-semibold mb-2" style={{ color: '#0D1B2A' }}>Por questão — dificuldade e discriminação</h2>
            <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>Dificuldade = acerto médio (↓ = difícil). Discriminação = o quanto a pergunta separa quem sabe de quem não sabe (“revê” = pode estar ambígua/mal cotada).</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Q', 'Tipo', 'Bloom', 'Cot.', 'Dificuldade', 'Erro', 'Discrim.'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {rep.items.map(it => (
                    <tr key={it.index}>
                      <td style={{ ...td, fontWeight: 700 }}>{it.index}</td>
                      <td style={td}>{TYPE_PT[it.type] ?? it.type}</td>
                      <td style={td}>{it.bloom}</td>
                      <td style={{ ...td, fontFamily: 'monospace' }}>{it.points}</td>
                      <td style={{ ...td, fontFamily: 'monospace', color: pctColor(it.difficulty), fontWeight: 600 }}>{it.difficulty}%</td>
                      <td style={{ ...td, fontFamily: 'monospace', color: it.errorRate >= 50 ? '#dc2626' : '#6B7280' }}>{it.errorRate}%</td>
                      <td style={td}>
                        {it.discrimination === null ? <span style={{ color: '#9CA3AF' }}>n/d</span>
                          : <span style={{ color: it.discLabel === 'revê' ? '#dc2626' : it.discLabel === 'boa' ? '#166534' : '#92400e', fontWeight: 600 }}>{it.discrimination.toFixed(2)} · {it.discLabel}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bloom + tipos + turmas */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div style={card}>
              <h2 className="text-sm font-semibold mb-2" style={{ color: '#0D1B2A' }}>Por nível de Bloom</h2>
              {rep.bloom.map(b => (
                <div key={b.bloom} className="flex items-center gap-2 mb-1">
                  <span className="text-xs flex-1 truncate" style={{ color: '#374151' }}>{b.bloom}</span>
                  <div style={{ width: 80, height: 8, background: '#e5e7eb', borderRadius: 4 }}><div style={{ width: `${b.avgPct}%`, height: 8, background: pctColor(b.avgPct), borderRadius: 4 }} /></div>
                  <span className="text-xs font-mono w-9 text-right" style={{ color: pctColor(b.avgPct) }}>{b.avgPct}%</span>
                </div>
              ))}
            </div>
            <div style={card}>
              <h2 className="text-sm font-semibold mb-2" style={{ color: '#0D1B2A' }}>Por tipo de pergunta</h2>
              {rep.types.map(t => (
                <div key={t.type} className="flex items-center gap-2 mb-1">
                  <span className="text-xs flex-1 truncate" style={{ color: '#374151' }}>{TYPE_PT[t.type] ?? t.type}</span>
                  <div style={{ width: 80, height: 8, background: '#e5e7eb', borderRadius: 4 }}><div style={{ width: `${t.avgPct}%`, height: 8, background: pctColor(t.avgPct), borderRadius: 4 }} /></div>
                  <span className="text-xs font-mono w-9 text-right" style={{ color: pctColor(t.avgPct) }}>{t.avgPct}%</span>
                </div>
              ))}
            </div>
          </div>

          {rep.turmas.length > 1 && (
            <div style={card}>
              <h2 className="text-sm font-semibold mb-2" style={{ color: '#0D1B2A' }}>Por turma</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Turma', 'Alunos', 'Média', 'Acerto', 'Aprov. ≥50%', 'Mín/Máx', 'DP'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {rep.turmas.map(t => (
                      <tr key={t.turma}>
                        <td style={{ ...td, fontWeight: 700 }}>{t.turma}</td>
                        <td style={td}>{t.n}</td>
                        <td style={{ ...td, fontFamily: 'monospace' }}>{t.avg} / {t.max}</td>
                        <td style={{ ...td, fontFamily: 'monospace', color: pctColor(t.avgPct), fontWeight: 600 }}>{t.avgPct}%</td>
                        <td style={{ ...td, fontFamily: 'monospace', color: t.passPct < 50 ? '#dc2626' : '#166534' }}>{t.passPct}%</td>
                        <td style={{ ...td, fontFamily: 'monospace' }}>{t.min} / {t.max_}</td>
                        <td style={{ ...td, fontFamily: 'monospace' }}>± {t.sd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recomendações (regras) */}
          <div style={{ ...card, borderColor: '#C8A84B40', background: '#fffdf5' }}>
            <h2 className="text-sm font-bold mb-2" style={{ color: '#0D1B2A' }}>Recomendações — turma / global</h2>
            <ul className="list-disc pl-5 space-y-1">
              {rep.recClass.map((r, i) => <li key={i} className="text-sm" style={{ color: '#374151' }}>{r}</li>)}
            </ul>
          </div>

          {rep.recStudents.length > 0 && (
            <div style={card}>
              <h2 className="text-sm font-bold mb-2" style={{ color: '#0D1B2A' }}>Recomendações — por aluno</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Aluno', 'Turma', 'Medidas'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {rep.recStudents.map(s => (
                      <tr key={s.id}>
                        <td style={{ ...td, fontWeight: 600 }}>{s.name}</td>
                        <td style={td}>{s.turma === '—' ? '' : s.turma}</td>
                        <td style={{ ...td, color: '#374151' }}>{s.notes.join(' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
