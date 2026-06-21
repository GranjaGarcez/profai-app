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

// Acima deste limiar, a geração é dividida em 2 chamadas sequenciais e fundida
// num só teste — uma única chamada arrisca exceder o orçamento de 60s da função
// (tempo de geração + crítico adversarial) e/ou o limite de tokens de saída.
const BATCH_THRESHOLD = 12

type RawQuestion = Record<string, unknown>
type RawGroup = { label: string; description?: string; totalPoints?: number; questions: RawQuestion[] }
type RawTest = Record<string, unknown> & { groups?: RawGroup[]; questions?: RawQuestion[]; totalPoints?: number }

function getGroups(content: RawTest): RawGroup[] {
  if (content.groups?.length) return content.groups
  if (content.questions?.length) return [{ label: 'Questões', questions: content.questions }]
  return []
}

// Funde N lotes gerados separadamente num só teste: combina grupos pelo label,
// reindexação sequencial, e reescala os pontos proporcionalmente para o total
// global continuar a somar exactamente 100 (cada lote já soma 100 internamente).
function mergeBatches(batches: RawTest[]): RawTest {
  if (batches.length === 1) return batches[0]

  const first = batches[0]
  const labelOrder: string[] = []
  const byLabel = new Map<string, RawQuestion[]>()

  for (const batch of batches) {
    for (const g of getGroups(batch)) {
      if (!byLabel.has(g.label)) { byLabel.set(g.label, []); labelOrder.push(g.label) }
      byLabel.get(g.label)!.push(...g.questions)
    }
  }

  const n = batches.length
  let idx = 1
  const mergedGroups: RawGroup[] = labelOrder.map(label => {
    const questions = byLabel.get(label)!.map(q => {
      const pts = Number(q.points) || 0
      return { ...q, index: idx++, points: Math.max(1, Math.round(pts / n)) }
    })
    return {
      label,
      description: '',
      totalPoints: questions.reduce((s, q) => s + (Number(q.points) || 0), 0),
      questions,
    }
  })

  // Ajuste de arredondamento: garante soma global = 100 exactamente
  const allQs = mergedGroups.flatMap(g => g.questions)
  const currentTotal = allQs.reduce((s, q) => s + (Number(q.points) || 0), 0)
  if (currentTotal !== 100 && allQs.length > 0) {
    const diff = 100 - currentTotal
    const heaviest = allQs.reduce((max, q) => (Number(q.points) || 0) > (Number(max.points) || 0) ? q : max, allQs[0])
    heaviest.points = (Number(heaviest.points) || 0) + diff
    for (const g of mergedGroups) g.totalPoints = g.questions.reduce((s, q) => s + (Number(q.points) || 0), 0)
  }

  return { ...first, groups: mergedGroups, questions: undefined, totalPoints: 100 }
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
    duration: 50,
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

  async function generateOne(numQuestions: number, avoidTexts: string[]): Promise<RawTest> {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'test', inputs: { ...form, numQuestions, avoidTexts } }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data.content as RawTest
  }

  async function handleGenerate() {
    if (!form.topic.trim()) { setError('Indica o tema do teste.'); return }
    if (form.questionTypes.length === 0) { setError('Selecciona pelo menos um tipo de pergunta.'); return }
    setError(null)
    setStep('generating')

    try {
      if (form.numQuestions <= BATCH_THRESHOLD) {
        const content = await generateOne(form.numQuestions, [])
        setResult(content)
      } else {
        // Divide em 2 lotes sequenciais — cada chamada fica dentro do orçamento
        // seguro da função; o 2.º lote evita repetir o que o 1.º já gerou.
        const half1 = Math.ceil(form.numQuestions / 2)
        const half2 = form.numQuestions - half1

        const batch1 = await generateOne(half1, [])
        const texts1 = getGroups(batch1).flatMap(g => g.questions.map(q => String(q.text ?? '')))

        const batch2 = await generateOne(half2, texts1)

        setResult(mergeBatches([batch1, batch2]))
      }
      setStep('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setStep('form')
    }
  }

  const content = result as Record<string, unknown> | null

  // Suporta tanto formato antigo (questions[]) como novo (groups[].questions)
  const questions: Array<Record<string, unknown>> = content
    ? content.questions
      ? (content.questions as Array<Record<string, unknown>>)
      : ((content.groups as Array<Record<string, unknown>> | undefined) ?? [])
          .flatMap(g => (g.questions as Array<Record<string, unknown>>) ?? [])
    : []

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
                  type="range" min={3} max={24} value={form.numQuestions}
                  onChange={e => setForm(f => ({ ...f, numQuestions: Number(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs" style={{ color: '#6B7280' }}>
                  <span>3</span><span>24</span>
                </div>
                {form.numQuestions > BATCH_THRESHOLD && (
                  <p className="text-xs mt-1" style={{ color: '#00B4D8' }}>
                    ⓘ Acima de {BATCH_THRESHOLD}, a geração é feita em 2 etapas para manter a qualidade.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>Duração da prova</label>
              <div className="flex gap-2">
                {[45, 50, 90, 100].map(min => (
                  <button
                    key={min}
                    onClick={() => setForm(f => ({ ...f, duration: min }))}
                    className="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors"
                    style={{
                      background: form.duration === min ? '#0D1B2A' : 'white',
                      color: form.duration === min ? '#F7F3EE' : '#6B7280',
                      borderColor: '#0D1B2A30',
                    }}
                  >
                    {min} min
                  </button>
                ))}
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
          <div className="p-12">
            <BrewingLoader subject="teste" topic={form.topic} />
          </div>
        )}

        {/* PREVIEW */}
        {step === 'preview' && content && (
          <div className="p-6 space-y-4">
            {/* Resumo */}
            <div className="p-4 rounded-xl" style={{ background: '#0D1B2A08' }}>
              <h3 className="font-bold text-lg" style={{ color: '#0D1B2A' }}>{content.title as string}</h3>
              <div className="flex flex-wrap gap-4 mt-1 text-xs" style={{ color: '#6B7280' }}>
                <span>📚 {content.subject as string}</span>
                <span>🎓 {content.yearLevel as number}.º ano</span>
                <span>📝 {questions.length} perguntas</span>
                <span>⭐ {content.totalPoints as number} pontos</span>
                <span>🖼️ {questions.filter(q => q.figure !== null && q.figure !== undefined).length} figuras</span>
              </div>
            </div>

            {/* Diagnóstico: mostra se o AI gerou figuras */}
            {questions.filter(q => q.figure !== null && q.figure !== undefined).length === 0 &&
             ['Matemática', 'Matemática A'].includes(content.subject as string) && (
              <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                ⚠️ O AI não gerou figuras para este teste. Tenta gerar novamente — o prompt foi melhorado.
              </div>
            )}

            {/* Lista de questões */}
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {questions.map((q, i) => (
                <div key={i} className="p-4 rounded-xl bg-white border" style={{ borderColor: '#0D1B2A10' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded shrink-0" style={{ background: '#00B4D820', color: '#00B4D8' }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#0D1B2A' }}>{q.text as string}</p>

                      {/* Figura SVG */}
                      {q.figure !== null && q.figure !== undefined && (
                        <div className="mt-2">
                          <MathFigure figure={q.figure} />
                        </div>
                      )}

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
                    <span className="text-xs font-medium shrink-0" style={{ color: '#C8A84B' }}>{q.points as number}pt</span>
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
