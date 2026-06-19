'use client'

import { useState } from 'react'

interface SourceTest {
  title: string
  subject: string
  yearLevel: number
  topic: string
  difficulty: string
  duration?: number
  groups?: Array<{ questions: Array<{ type: string; text: string }> }>
  questions?: Array<{ type: string; text: string }>
}

interface DifferentiationPanelProps {
  contentItemId: string
  test: SourceTest
  onClose: () => void
}

type Phase = 'intro' | 'generating' | 'done' | 'error'

const LEVEL_INFO = {
  A: { label: 'Ficha A — Apoio', desc: 'Scaffolding visível, números inteiros, menor exigência cognitiva', color: '#0EA5E9' },
  C: { label: 'Ficha C — Aprofundamento', desc: 'Sem scaffolding, números mais exigentes, questão de raciocínio', color: '#7C3AED' },
} as const

type Measure = 'none' | 'MU' | 'MS'
const MEASURE_OPTIONS: { id: Measure; label: string }[] = [
  { id: 'none', label: 'Sem marca' },
  { id: 'MU', label: 'MU' },
  { id: 'MS', label: 'MS' },
]

function getAllQuestions(test: SourceTest) {
  if (test.groups?.length) return test.groups.flatMap(g => g.questions)
  return test.questions ?? []
}

export default function DifferentiationPanel({ contentItemId, test, onClose }: DifferentiationPanelProps) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<{ a?: string; c?: string }>({})
  const [progress, setProgress] = useState<string | null>(null)
  const [measures, setMeasures] = useState<{ A: Measure; C: Measure }>({ A: 'none', C: 'none' })

  async function generateLevel(level: 'A' | 'C'): Promise<unknown> {
    const allQs = getAllQuestions(test)
    const questionTypes = [...new Set(allQs.map(q => q.type))]
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'differentiate',
        inputs: {
          subject: test.subject,
          yearLevel: test.yearLevel,
          topic: test.topic,
          difficulty: test.difficulty,
          questionTypes: questionTypes.length ? questionTypes : ['multiple_choice', 'short_answer'],
          numQuestions: Math.max(3, allQs.length),
          duration: test.duration ?? 50,
          country: 'PT',
          level,
          title: test.title, // título forçado a ser idêntico — diferenciação invisível
        },
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `Erro ao gerar Ficha ${level}`)
    return data.content
  }

  async function saveLevel(level: 'A' | 'C', content: Record<string, unknown>): Promise<string> {
    const measure = measures[level]
    const tagged = {
      ...content,
      _differentiationLevel: level,
      _differentiationGroupId: contentItemId,
      ...(measure !== 'none' ? { _measureType: measure } : {}),
    }
    const res = await fetch('/api/content/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'differentiated', content: tagged }),
    })
    const data = await res.json()
    if (!res.ok || !data.id) throw new Error(data.error ?? `Erro ao guardar Ficha ${level}`)
    return data.id as string
  }

  async function tagOriginalAsB() {
    // Marca o teste original como "B — Consolidação" da mesma família, em segundo
    // plano — falha silenciosa não bloqueia o resultado (A e C já estão guardadas).
    try {
      await fetch(`/api/content/${contentItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { ...test, _differentiationLevel: 'B', _differentiationGroupId: contentItemId },
        }),
      })
    } catch { /* não crítico */ }
  }

  async function handleGenerate() {
    setPhase('generating')
    setError(null)
    try {
      setProgress('A gerar Ficha A (Apoio)...')
      const contentA = await generateLevel('A')
      setProgress('A gerar Ficha C (Aprofundamento)...')
      const contentC = await generateLevel('C')

      setProgress('A guardar...')
      const [idA, idC] = await Promise.all([
        saveLevel('A', contentA as Record<string, unknown>),
        saveLevel('C', contentC as Record<string, unknown>),
      ])
      await tagOriginalAsB()

      setResults({ a: idA, c: idC })
      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setPhase('error')
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#0D1B2A90' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4" style={{ background: 'white' }}>

        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
              🎯 Versões adaptadas (A/B/C)
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Diferenciação invisível — mesmo cabeçalho, dificuldade diferente</p>
          </div>
          {phase !== 'generating' && (
            <button onClick={onClose} className="text-xl" style={{ color: '#6B7280' }}>✕</button>
          )}
        </div>

        {phase === 'intro' && (
          <>
            <p className="text-sm" style={{ color: '#374151' }}>
              Este teste passa a ser a <strong>Ficha B — Consolidação</strong>. Vou gerar mais duas versões com o
              <strong> mesmo título e estrutura de cotação</strong>, mas dificuldade diferente:
            </p>
            <div className="space-y-2">
              {(['A', 'C'] as const).map(level => (
                <div key={level} className="p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
                      style={{ background: LEVEL_INFO[level].color }}>{level}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>{LEVEL_INFO[level].label}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{LEVEL_INFO[level].desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 pl-10">
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>Medida no cabeçalho:</span>
                    {MEASURE_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setMeasures(m => ({ ...m, [level]: opt.id }))}
                        className="px-2 py-0.5 rounded-md text-xs font-semibold transition-all"
                        style={{
                          background: measures[level] === opt.id ? '#0D1B2A' : 'white',
                          color: measures[level] === opt.id ? '#F7F3EE' : '#6B7280',
                          border: '1px solid #e2e8f0',
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
              ⚠️ O nível (A/B/C) nunca aparece no documento. Se escolheres uma medida (MU/MS), aparece um código discreto de duas letras no canto do cabeçalho — visível, mas sem indicar o nível de dificuldade.
            </p>
            <button onClick={handleGenerate}
              className="w-full py-2.5 rounded-xl font-semibold text-white"
              style={{ background: '#10B981' }}>
              Gerar Ficha A e Ficha C
            </button>
          </>
        )}

        {phase === 'generating' && (
          <div className="py-8 text-center space-y-3">
            <div className="text-4xl animate-bounce">🎯</div>
            <p className="text-sm font-medium" style={{ color: '#0D1B2A' }}>{progress}</p>
          </div>
        )}

        {phase === 'done' && (
          <>
            <p className="text-sm font-medium" style={{ color: '#166534' }}>✓ Versões criadas com sucesso.</p>
            <div className="space-y-2">
              {results.a && (
                <a href={`/dashboard/content/${results.a}`} className="block text-sm px-3 py-2 rounded-lg border hover:bg-gray-50"
                  style={{ borderColor: '#0D1B2A20', color: '#0D1B2A' }}>
                  {LEVEL_INFO.A.label} →
                </a>
              )}
              {results.c && (
                <a href={`/dashboard/content/${results.c}`} className="block text-sm px-3 py-2 rounded-lg border hover:bg-gray-50"
                  style={{ borderColor: '#0D1B2A20', color: '#0D1B2A' }}>
                  {LEVEL_INFO.C.label} →
                </a>
              )}
            </div>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: '#0D1B2A30', color: '#0D1B2A' }}>
              Fechar
            </button>
          </>
        )}

        {phase === 'error' && (
          <>
            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</p>
            <button onClick={() => setPhase('intro')} className="w-full py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: '#0D1B2A30', color: '#0D1B2A' }}>
              Tentar de novo
            </button>
          </>
        )}
      </div>
    </div>
  )
}
