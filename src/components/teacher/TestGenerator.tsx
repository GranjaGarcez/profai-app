'use client'

import { useState } from 'react'

const SUBJECTS_PT = [
  'Matemática', 'Português', 'Ciências Naturais', 'Físico-Química',
  'História', 'Geografia', 'Inglês', 'Espanhol', 'Francês',
  'História e Geografia de Portugal', 'Educação Visual', 'Educação Tecnológica',
  'Educação Física', 'Biologia e Geologia', 'Matemática A', 'Física e Química A',
]

const QUESTION_TYPES = [
  { id: 'multiple_choice', label: 'Escolha múltipla' },
  { id: 'true_false', label: 'Verdadeiro / Falso' },
  { id: 'short_answer', label: 'Resposta curta' },
  { id: 'long_answer', label: 'Resposta longa' },
  { id: 'fill_blank', label: 'Completar espaços' },
]

interface TestGeneratorProps {
  onClose: () => void
  onSave: (content: unknown) => void
}

export default function TestGenerator({ onClose, onSave }: TestGeneratorProps) {
  const [step, setStep] = useState<'form' | 'generating' | 'preview'>('form')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<unknown>(null)

  const [form, setForm] = useState({
    subject: 'Matemática',
    yearLevel: 5,
    topic: '',
    difficulty: 'medium',
    numQuestions: 10,
    questionTypes: ['multiple_choice'],
    country: 'PT',
  })

  function toggleType(id: string) {
    setForm(f => ({
      ...f,
      questionTypes: f.questionTypes.includes(id)
        ? f.questionTypes.filter(t => t !== id)
        : [...f.questionTypes, id]
    }))
  }

  async function handleGenerate() {
    if (!form.topic.trim()) { setError('Indica o tema do teste.'); return }
    if (form.questionTypes.length === 0) { setError('Selecciona pelo menos um tipo de pergunta.'); return }
    setError(null)
    setStep('generating')

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'test', inputs: form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data.content)
      setStep('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setStep('form')
    }
  }

  const content = result as Record<string, unknown> | null
  const questions = content ? (content.questions as Array<Record<string, unknown>>) : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#0D1B2A90' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl" style={{ background: '#F7F3EE' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#0D1B2A15' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
              ✏️ Gerador de Testes
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
              {step === 'form' ? 'Configura o teu teste' : step === 'generating' ? 'A gerar com IA...' : 'Revê o teste gerado'}
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
                <select
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: '#0D1B2A30' }}
                >
                  {SUBJECTS_PT.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>Ano de escolaridade</label>
                <select
                  value={form.yearLevel}
                  onChange={e => setForm(f => ({ ...f, yearLevel: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: '#0D1B2A30' }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}.º ano</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>Tema / Conteúdo</label>
              <input
                type="text"
                value={form.topic}
                onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                placeholder="Ex: Frações equivalentes, Revolução Francesa, Fotossíntese..."
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: '#0D1B2A30' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>Dificuldade</label>
                <div className="flex gap-2">
                  {[
                    { id: 'easy', label: 'Fácil' },
                    { id: 'medium', label: 'Média' },
                    { id: 'hard', label: 'Difícil' },
                  ].map(d => (
                    <button
                      key={d.id}
                      onClick={() => setForm(f => ({ ...f, difficulty: d.id }))}
                      className="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors"
                      style={{
                        background: form.difficulty === d.id ? '#0D1B2A' : 'white',
                        color: form.difficulty === d.id ? '#F7F3EE' : '#6B7280',
                        borderColor: '#0D1B2A30',
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>
                  N.º de perguntas: {form.numQuestions}
                </label>
                <input
                  type="range"
                  min={3}
                  max={20}
                  value={form.numQuestions}
                  onChange={e => setForm(f => ({ ...f, numQuestions: Number(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs" style={{ color: '#6B7280' }}>
                  <span>3</span><span>20</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#0D1B2A' }}>Tipos de pergunta</label>
              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleType(t.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                    style={{
                      background: form.questionTypes.includes(t.id) ? '#00B4D8' : 'white',
                      color: form.questionTypes.includes(t.id) ? 'white' : '#6B7280',
                      borderColor: form.questionTypes.includes(t.id) ? '#00B4D8' : '#0D1B2A30',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm p-3 rounded-lg" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</p>
            )}

            <button
              onClick={handleGenerate}
              className="w-full py-3 rounded-xl font-semibold text-white transition-opacity"
              style={{ background: '#00B4D8' }}
            >
              ✨ Gerar Teste com IA
            </button>
          </div>
        )}

        {/* GENERATING */}
        {step === 'generating' && (
          <div className="p-12 text-center space-y-4">
            <div className="text-5xl animate-bounce">🤖</div>
            <p className="font-semibold" style={{ color: '#0D1B2A' }}>A gerar o teu teste...</p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              O Gemini está a criar {form.numQuestions} perguntas sobre <strong>{form.topic}</strong>
            </p>
            <div className="flex justify-center gap-1 mt-4">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00B4D8', animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* PREVIEW */}
        {step === 'preview' && content && (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl" style={{ background: '#0D1B2A08' }}>
              <h3 className="font-bold text-lg" style={{ color: '#0D1B2A' }}>{content.title as string}</h3>
              <div className="flex gap-4 mt-1 text-xs" style={{ color: '#6B7280' }}>
                <span>📚 {content.subject as string}</span>
                <span>🎓 {content.yearLevel as number}.º ano</span>
                <span>📝 {questions.length} perguntas</span>
                <span>⭐ {content.totalPoints as number} pontos</span>
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {questions.map((q, i) => (
                <div key={i} className="p-4 rounded-xl bg-white border" style={{ borderColor: '#0D1B2A10' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: '#00B4D820', color: '#00B4D8' }}>
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: '#0D1B2A' }}>{q.text as string}</p>
                      {(q.options as string[] | undefined) && (
                        <ul className="mt-2 space-y-1">
                          {(q.options as string[]).map((opt, j) => (
                            <li key={j} className="text-xs" style={{ color: '#6B7280' }}>{opt}</li>
                          ))}
                        </ul>
                      )}
                      <p className="text-xs mt-2 font-medium" style={{ color: '#10B981' }}>
                        ✓ {q.correctAnswer as string}
                      </p>
                    </div>
                    <span className="text-xs font-medium" style={{ color: '#C8A84B' }}>{q.points as number}pt</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep('form')}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium"
                style={{ borderColor: '#0D1B2A30', color: '#0D1B2A' }}
              >
                ← Editar parâmetros
              </button>
              <button
                onClick={() => onSave(result)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: '#00B4D8' }}
              >
                💾 Guardar teste
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
