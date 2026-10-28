'use client'

import { useState } from 'react'
import { turmaLabel as turmaLabelOf } from '@/lib/exam/turma'
import {
  readLanguage, aggregateLanguage, LANG_CATEGORIES, langColor,
  type LanguageAnalysis,
} from '@/lib/exam/language'

interface Sub {
  id: string
  student_name: string
  student_class: string | null
  student_year?: number | null
  status: string
  answers: Record<string, string>
}

const per100ForCat = (a: LanguageAnalysis, key: string) =>
  a.wordCount > 0 ? Math.round(((a.counts[key] ?? 0) / a.wordCount) * 100 * 10) / 10 : 0

export default function LanguageTab({
  sessionId, submissions, fallbackYear, turmaView, onChanged,
}: {
  sessionId: string
  submissions: Sub[]
  fallbackYear: number | null
  turmaView: 'all' | string
  onChanged: () => void
}) {
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const labelOf = (s: Sub) => turmaLabelOf(s.student_year, s.student_class, fallbackYear)
  const rows = submissions
    .filter(s => turmaView === 'all' || labelOf(s) === turmaView)
    .map(s => ({ s, lang: readLanguage(s.answers) }))
    .filter(r => r.lang)
    .sort((a, b) => (b.lang!.per100) - (a.lang!.per100))

  const analysedCount = submissions.filter(s => readLanguage(s.answers)).length
  const agg = aggregateLanguage(rows.map(r => r.lang!))

  async function run() {
    setRunning(true); setMsg(null)
    try {
      const res = await fetch(`/api/exam/sessions/${sessionId}/lang-check`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Falha.')
      setMsg(d.analysed != null
        ? `Analisadas ${d.analysed} escrita(s)${d.suspeitas ? `, ${d.suspeitas} pouco fidedigna(s)` : ''}${d.semTexto ? `, ${d.semTexto} sem texto suficiente` : ''}.`
        : (d.message ?? 'Concluído.'))
      onChanged()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Erro.') }
    finally { setRunning(false) }
  }

  return (
    <div className="space-y-4">
      {/* Acção */}
      <div className="rounded-xl border px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
        style={{ borderColor: '#0D1B2A10', background: '#f8fafc' }}>
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>✍️ Análise de língua</p>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            Diagnóstico da escrita (ortografia, frase, interpretação…), quantificado e normalizado por 100 palavras. Não altera notas. Corre depois de corrigir.
          </p>
        </div>
        <button onClick={run} disabled={running}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 shrink-0"
          style={{ background: '#7C3AED' }}>
          {running ? 'A analisar…' : analysedCount > 0 ? 'Reanalisar língua (IA)' : 'Analisar língua (IA)'}
        </button>
      </div>
      {msg && <p className="text-xs" style={{ color: '#6B21a8' }}>{msg}</p>}

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border p-10 text-center" style={{ borderColor: '#0D1B2A10' }}>
          <p className="text-3xl mb-2">✍️</p>
          <p className="text-sm" style={{ color: '#6B7280' }}>Ainda sem análise de língua. Corrige o teste e depois carrega em “Analisar língua”.</p>
        </div>
      ) : (
        <>
          {/* Agregado por turma */}
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#0D1B2A10' }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>
              Perfil de escrita {turmaView === 'all' ? 'da turma/grupo' : `· ${turmaView}`}
            </h3>
            <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>
              {agg.nStudents} aluno(s) · {agg.totalWords} palavras · erros por 100 palavras (verde ≤1 · âmbar ≤3 · vermelho &gt;3)
              {agg.nSuspeita > 0 && <span style={{ color: '#991b1b' }}> · ⚠ {agg.nSuspeita} escrita(s) pouco fidedigna(s)</span>}
            </p>
            <div className="space-y-1.5">
              {agg.byCategory.map(c => {
                const col = langColor(c.per100)
                return (
                  <div key={c.key} className="flex items-center gap-2">
                    <span className="text-xs w-40 shrink-0 truncate" style={{ color: '#374151' }}>{c.label}</span>
                    <div className="flex-1 h-3 rounded-full" style={{ background: '#f1f5f9' }}>
                      <div className="h-3 rounded-full" style={{ width: `${Math.min(100, c.per100 * 20)}%`, background: col.fg, opacity: 0.85 }} />
                    </div>
                    <span className="text-xs font-mono w-16 text-right px-1.5 rounded" style={{ background: col.bg, color: col.fg }}>{c.per100}/100</span>
                    <span className="text-xs w-12 text-right" style={{ color: '#9CA3AF' }}>{c.errors} err.</span>
                  </div>
                )
              })}
            </div>
            {agg.recommendations.length > 0 && (
              <ul className="list-disc pl-5 mt-3 space-y-1">
                {agg.recommendations.map((r, i) => <li key={i} className="text-xs" style={{ color: '#374151' }}>{r}</li>)}
              </ul>
            )}
          </div>

          {/* Por aluno */}
          <div className="space-y-2">
            {rows.map(({ s, lang }) => {
              const a = lang!
              const col = langColor(a.per100)
              const isOpen = open[s.id]
              return (
                <div key={s.id} className="bg-white rounded-xl border" style={{ borderColor: a.reliability === 'suspeita' ? '#fca5a5' : '#0D1B2A10' }}>
                  <button onClick={() => setOpen(o => ({ ...o, [s.id]: !o[s.id] }))}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>{s.student_name}</span>
                    {turmaView === 'all' && <span className="text-xs" style={{ color: '#9CA3AF' }}>· {labelOf(s)}</span>}
                    {a.wordCount < 8
                      ? <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#f1f5f9', color: '#64748b' }}>sem texto</span>
                      : <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: col.bg, color: col.fg }}>{a.per100}/100 · {a.total} err.</span>}
                    {a.reliability === 'suspeita' && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#fee2e2', color: '#991b1b' }}
                        title={a.reliabilityReason || 'Escrita pouco fidedigna'}>⚠ não fidedigno</span>
                    )}
                    {/* Tira de cores por categoria */}
                    <span className="ml-auto flex items-center gap-0.5">
                      {LANG_CATEGORIES.map(c => {
                        const p = per100ForCat(a, c.key)
                        const cc = langColor(p)
                        return <span key={c.key} title={`${c.label}: ${a.counts[c.key] ?? 0}`} className="inline-block rounded-sm"
                          style={{ width: 10, height: 10, background: (a.counts[c.key] ?? 0) > 0 ? cc.fg : '#e5e7eb' }} />
                      })}
                    </span>
                    <span className="text-xs ml-1" style={{ color: '#9CA3AF' }}>{isOpen ? '▾' : '▸'}</span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-3 space-y-2 border-t" style={{ borderColor: '#0D1B2A08' }}>
                      {a.reliability === 'suspeita' && a.reliabilityReason && (
                        <p className="text-xs mt-2 px-2 py-1.5 rounded" style={{ background: '#fef2f2', color: '#991b1b' }}>
                          ⚠ Escrita pouco fidedigna para avaliar a língua: {a.reliabilityReason}
                        </p>
                      )}
                      {a.diagnostic && <p className="text-sm mt-2" style={{ color: '#374151' }}>{a.diagnostic}</p>}
                      {a.virtues.length > 0 && (
                        <p className="text-xs" style={{ color: '#166534' }}>👍 {a.virtues.join(' · ')}</p>
                      )}
                      {a.issues.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {a.issues.map((it, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#374151' }}
                              title={LANG_CATEGORIES.find(c => c.key === it.category)?.label}>
                              <span style={{ color: '#dc2626' }}>{it.wrong}</span>{it.correct ? <> → <span style={{ color: '#166534' }}>{it.correct}</span></> : null}
                            </span>
                          ))}
                        </div>
                      )}
                      {a.recommendations.length > 0 && (
                        <ul className="list-disc pl-5 space-y-0.5">
                          {a.recommendations.map((r, i) => <li key={i} className="text-xs" style={{ color: '#374151' }}>{r}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
