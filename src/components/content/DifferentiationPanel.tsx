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
type Level = 'A' | 'C' | 'MU' | 'MS'

const LEVEL_INFO: Record<Level, { label: string; desc: string; color: string; group: 'diferenciacao' | 'medida' }> = {
  A:  { label: 'Ficha A — Apoio',           desc: 'Scaffolding visível, números inteiros, menor exigência cognitiva. Invisível para o aluno.', color: '#0EA5E9', group: 'diferenciacao' },
  C:  { label: 'Ficha C — Aprofundamento',  desc: 'Sem scaffolding, números mais exigentes, questão de raciocínio. Invisível para o aluno.',    color: '#7C3AED', group: 'diferenciacao' },
  MU: { label: 'Medida Universal (MU)',     desc: 'Adapta a forma (linguagem, segmentação) — conteúdo e cotação inalterados. Código "MU" impresso no cabeçalho.', color: '#0D9488', group: 'medida' },
  MS: { label: 'Medida Selectiva (MS)',     desc: 'Reestrutura em sub-passos escalonados, simplifica moderadamente — ancorado à AE. Código "MS" impresso no cabeçalho.', color: '#B45309', group: 'medida' },
}

function getAllQuestions(test: SourceTest) {
  if (test.groups?.length) return test.groups.flatMap(g => g.questions)
  return test.questions ?? []
}

export default function DifferentiationPanel({ contentItemId, test, onClose }: DifferentiationPanelProps) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Partial<Record<Level, string>>>({})
  const [progress, setProgress] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<Level, boolean>>({ A: false, C: false, MU: false, MS: false })

  const anySelected = Object.values(selected).some(Boolean)

  function toggle(level: Level) {
    setSelected(s => ({ ...s, [level]: !s[level] }))
  }

  async function generateLevel(level: Level): Promise<unknown> {
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
    if (!res.ok) throw new Error(data.error ?? `Erro ao gerar ${LEVEL_INFO[level].label}`)
    return data.content
  }

  async function saveLevel(level: Level, content: Record<string, unknown>): Promise<string> {
    // _measureType de MU/MS já vem marcado pelo servidor; aqui só o nível A/C/MU/MS
    // pedagógico é registado para a Biblioteca de Conteúdos saber agrupar a família.
    const tagged = { ...content, _differentiationLevel: level === 'MU' || level === 'MS' ? undefined : level, _differentiationGroupId: contentItemId }
    const res = await fetch('/api/content/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'differentiated', content: tagged }),
    })
    const data = await res.json()
    if (!res.ok || !data.id) throw new Error(data.error ?? `Erro ao guardar ${LEVEL_INFO[level].label}`)
    return data.id as string
  }

  async function tagOriginalAsB() {
    // Só marca o original como "B" se a diferenciação pedagógica A/C foi pedida —
    // gerar só MU/MS não transforma o original numa "Ficha B" de família A/B/C.
    if (!selected.A && !selected.C) return
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
    const levels = (Object.keys(selected) as Level[]).filter(l => selected[l])
    if (levels.length === 0) return
    setPhase('generating')
    setError(null)
    try {
      const newResults: Partial<Record<Level, string>> = {}
      for (const level of levels) {
        setProgress(`A gerar ${LEVEL_INFO[level].label}...`)
        const content = await generateLevel(level)
        newResults[level] = await saveLevel(level, content as Record<string, unknown>)
      }
      await tagOriginalAsB()
      setResults(newResults)
      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setPhase('error')
    } finally {
      setProgress(null)
    }
  }

  function LevelCard({ level }: { level: Level }) {
    const info = LEVEL_INFO[level]
    const isOn = selected[level]
    return (
      <button
        onClick={() => toggle(level)}
        className="w-full text-left p-3 rounded-xl border-2 transition-all"
        style={{ background: isOn ? `${info.color}10` : '#f8fafc', borderColor: isOn ? info.color : '#e2e8f0' }}
      >
        <div className="flex items-start gap-3">
          <span className="shrink-0 mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border-2"
            style={{ borderColor: isOn ? info.color : '#cbd5e1', background: isOn ? info.color : 'white' }}>
            {isOn && <span style={{ color: 'white', fontSize: 12, fontWeight: 900 }}>✓</span>}
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>{info.label}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{info.desc}</p>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#0D1B2A90' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: 'white' }}>

        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
              🎯 Versões adaptadas
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Escolhe o que queres gerar — nada é criado por defeito</p>
          </div>
          {phase !== 'generating' && (
            <button onClick={onClose} className="text-xl" style={{ color: '#6B7280' }}>✕</button>
          )}
        </div>

        {phase === 'intro' && (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>
                Diferenciação pedagógica — invisível ao aluno
              </p>
              <div className="space-y-2">
                <LevelCard level="A" />
                <LevelCard level="C" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 mt-3" style={{ color: '#9CA3AF' }}>
                Medida de suporte — DL 54/2018, código impresso no cabeçalho
              </p>
              <div className="space-y-2">
                <LevelCard level="MU" />
                <LevelCard level="MS" />
              </div>
            </div>

            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
              ⚠️ MU/MS continuam ancoradas à Aprendizagem Essencial da disciplina — a IA é instruída a nunca descer abaixo do que o currículo exige, mesmo ao simplificar. Revê sempre antes de usar num PEI ou relatório técnico-pedagógico.
            </p>

            <button onClick={handleGenerate} disabled={!anySelected}
              className="w-full py-2.5 rounded-xl font-semibold text-white disabled:opacity-40 transition-opacity"
              style={{ background: '#10B981' }}>
              {anySelected ? `Gerar ${Object.values(selected).filter(Boolean).length} versão(ões)` : 'Selecciona pelo menos uma versão'}
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
              {(Object.keys(results) as Level[]).map(level => (
                <a key={level} href={`/dashboard/content/${results[level]}`} className="block text-sm px-3 py-2 rounded-lg border hover:bg-gray-50"
                  style={{ borderColor: '#0D1B2A20', color: '#0D1B2A' }}>
                  {LEVEL_INFO[level].label} →
                </a>
              ))}
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
