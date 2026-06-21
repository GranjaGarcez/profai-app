'use client'

import { useState } from 'react'
import MathFigure from '@/components/math/MathFigure'
import BrewingLoader from '@/components/shared/BrewingLoader'

const SUBJECTS_PT = [
  'Matemática', 'Português', 'Ciências Naturais', 'Físico-Química',
  'História', 'Geografia', 'Inglês', 'Espanhol', 'Francês',
  'História e Geografia de Portugal', 'Filosofia', 'Educação Visual', 'Educação Tecnológica',
  'Educação Física', 'Biologia e Geologia', 'Matemática A', 'Física e Química A', 'TIC',
]

const METHODOLOGIES = [
  'Madeline Hunter', 'Backward Design', 'Inquiry-Based Learning', 'Project-Based Learning (PBL)',
  'Flipped Classroom', 'Cooperative Learning', 'Método Socrático', 'Aprendizagem Experiencial',
  'Differentiated Instruction', 'Cognitive Apprenticeship', 'Modelo 5E',
]

interface LessonPlanGeneratorProps {
  onClose: () => void
  onSave: (content: unknown) => void
}

interface ExternalTool {
  tool: string
  mode: 'conteudo_pronto' | 'prompt_pesquisa' | 'conceito'
  content: string
}

interface Phase {
  name: string
  duration: number
  objective?: string
  teacherScript?: string
  guidingQuestions?: string[]
  expectedAnswers?: string[]
  studentActivity?: string
  transition?: string
  externalTool?: ExternalTool | null
}

interface LessonPlanContent {
  title: string
  subject: string
  yearLevel: number
  duration: number
  methodology?: string
  objectives: string[]
  materials: string[]
  phases: Phase[]
  differentiation: string
  formativeAssessment?: string
  homework?: string | null
  mindMap?: { type: string; topic: string; branches: Array<{ label: string; children?: string[] }> } | null
}

const TOOL_MODE_LABEL: Record<string, string> = {
  conteudo_pronto: '📋 Conteúdo pronto a colar',
  prompt_pesquisa: '🔎 Prompt / termo a pesquisar',
  conceito: '💡 Conceito a desenvolver',
}

export default function LessonPlanGenerator({ onClose, onSave }: LessonPlanGeneratorProps) {
  const [step, setStep] = useState<'form' | 'generating' | 'preview'>('form')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LessonPlanContent | null>(null)

  const [form, setForm] = useState({
    subject: 'Matemática',
    yearLevel: 5,
    topic: '',
    duration: 50,
    country: 'PT',
    methodologies: [] as string[],
    preferences: '',
  })

  function toggleMethodology(m: string) {
    setForm(f => ({
      ...f,
      methodologies: f.methodologies.includes(m)
        ? f.methodologies.filter(x => x !== m)
        : f.methodologies.length >= 2 ? f.methodologies : [...f.methodologies, m],
    }))
  }

  async function handleGenerate() {
    if (!form.topic.trim()) { setError('Indica o tema da aula.'); return }
    setError(null)
    setStep('generating')
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'lesson_plan', inputs: form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data.content as LessonPlanContent)
      setStep('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setStep('form')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#0D1B2A90' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl" style={{ background: '#F7F3EE' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#0D1B2A15' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
              📋 Planificação de Aula
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
              {step === 'form' ? 'Configura a aula' : step === 'generating' ? 'A gerar com IA...' : 'Revê a planificação gerada'}
            </p>
          </div>
          <button onClick={onClose} className="text-xl" style={{ color: '#6B7280' }}>✕</button>
        </div>

        {/* FORM */}
        {step === 'form' && (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>Disciplina</label>
                <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#0D1B2A30' }}>
                  {SUBJECTS_PT.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>Ano de escolaridade</label>
                <select value={form.yearLevel} onChange={e => setForm(f => ({ ...f, yearLevel: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#0D1B2A30' }}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}.º ano</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>Tema / Conteúdo</label>
              <input type="text" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                placeholder="Ex: Proporcionalidade directa, Revolução Industrial, Fotossíntese..."
                className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#0D1B2A30' }} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>
                Duração: {form.duration} minutos
              </label>
              <div className="flex gap-2">
                {[45, 50, 90, 100].map(min => (
                  <button key={min} onClick={() => setForm(f => ({ ...f, duration: min }))}
                    className="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors"
                    style={{
                      background: form.duration === min ? '#0D1B2A' : 'white',
                      color: form.duration === min ? '#F7F3EE' : '#6B7280',
                      borderColor: '#0D1B2A30',
                    }}>
                    {min} min
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#0D1B2A' }}>
                Metodologia <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(opcional, até 2)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {METHODOLOGIES.map(m => (
                  <button key={m} onClick={() => toggleMethodology(m)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                    style={{
                      background: form.methodologies.includes(m) ? '#00B4D8' : 'white',
                      color: form.methodologies.includes(m) ? 'white' : '#6B7280',
                      borderColor: form.methodologies.includes(m) ? '#00B4D8' : '#0D1B2A30',
                    }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>
                Algo que queiras incluir <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(opcional)</span>
              </label>
              <textarea value={form.preferences} onChange={e => setForm(f => ({ ...f, preferences: e.target.value }))}
                rows={2} placeholder="Ex: quero usar Kahoot para revisão, e no fim um mapa mental..."
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor: '#0D1B2A30' }} />
              <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                Só é usado o que fizer sentido pedagógico para o tema — nada é forçado.
              </p>
            </div>

            {error && (
              <p className="text-sm p-3 rounded-lg" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</p>
            )}

            <button onClick={handleGenerate}
              className="w-full py-3 rounded-xl font-semibold text-white transition-opacity"
              style={{ background: '#C8A84B' }}>
              ✨ Gerar Planificação com IA
            </button>
          </div>
        )}

        {/* GENERATING */}
        {step === 'generating' && (
          <div className="p-12">
            <BrewingLoader subject="plano de aula" topic={form.topic} />
          </div>
        )}

        {/* PREVIEW */}
        {step === 'preview' && result && (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl" style={{ background: '#0D1B2A08' }}>
              <h3 className="font-bold text-lg" style={{ color: '#0D1B2A' }}>{result.title}</h3>
              <div className="flex flex-wrap gap-4 mt-1 text-xs" style={{ color: '#6B7280' }}>
                <span>📚 {result.subject}</span>
                <span>🎓 {result.yearLevel}.º ano</span>
                <span>⏱ {result.duration} min</span>
                {result.methodology && <span>🧭 {result.methodology}</span>}
              </div>
            </div>

            {result.objectives?.length > 0 && (
              <div className="p-4 rounded-xl bg-white border" style={{ borderColor: '#0D1B2A10' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>Objectivos</p>
                <ul className="space-y-1">
                  {result.objectives.map((o, i) => (
                    <li key={i} className="text-sm" style={{ color: '#374151' }}>• {o}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
              {result.phases?.map((p, i) => (
                <div key={i} className="p-4 rounded-xl bg-white border" style={{ borderColor: '#0D1B2A10' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm" style={{ color: '#0D1B2A' }}>{p.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: '#0D1B2A10', color: '#6B7280' }}>{p.duration} min</span>
                  </div>
                  {p.teacherScript && (
                    <p className="text-xs italic mb-1.5" style={{ color: '#374151' }}>&ldquo;{p.teacherScript}&rdquo;</p>
                  )}
                  {p.studentActivity && (
                    <p className="text-xs mb-1.5" style={{ color: '#6B7280' }}><strong>Alunos:</strong> {p.studentActivity}</p>
                  )}
                  {p.externalTool && (
                    <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                      <p className="font-semibold mb-1" style={{ color: '#0369a1' }}>
                        {p.externalTool.tool} — {TOOL_MODE_LABEL[p.externalTool.mode]}
                      </p>
                      <p style={{ color: '#374151', whiteSpace: 'pre-wrap' }}>{p.externalTool.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {result.mindMap && (
              <div className="p-4 rounded-xl bg-white border" style={{ borderColor: '#0D1B2A10' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>Mapa mental</p>
                <MathFigure figure={result.mindMap} />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep('form')}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: '#0D1B2A30', color: '#0D1B2A' }}>
                ← Editar parâmetros
              </button>
              <button onClick={() => onSave(result)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#C8A84B' }}>
                💾 Guardar planificação
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
