'use client'

import { useState } from 'react'

interface Criterion { description: string; points: number }
interface MarkScheme { totalPoints: number; criteria: Criterion[]; modelAnswer: string }
interface StructuredQuestion {
  text: string
  type: string
  points: number
  bloomLevel: string
  subtopic: string
  options?: string[] | null
  correctAnswer?: string | null
  difficulty: string
  markScheme: MarkScheme
}

const SUBJECTS = ['Matemática', 'Português', 'Ciências Naturais', 'HGP', 'Físico-Química', 'História', 'Geografia', 'Inglês']
const YEARS = [5, 6, 7, 8, 9, 10, 11, 12]

const BLOOM_COLORS: Record<string, string> = {
  Recordar: '#94A3B8', Compreender: '#60A5FA', Aplicar: '#34D399',
  Analisar: '#FBBF24', Avaliar: '#F87171', Criar: '#A78BFA',
}
const TYPE_LABELS: Record<string, string> = {
  'multiple-choice': 'Escolha múltipla',
  'short-answer': 'Resposta curta',
  'essay': 'Desenvolvimento',
  'true-false': 'Verdadeiro/Falso',
}
const DIFF_LABELS: Record<string, string> = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' }

export default function QuestionImporter() {
  const [rawText, setRawText]       = useState('')
  const [subject, setSubject]       = useState('Matemática')
  const [yearLevel, setYearLevel]   = useState(9)
  const [citation, setCitation]     = useState('')
  const [sourceUrl, setSourceUrl]   = useState('')
  const [questions, setQuestions]   = useState<StructuredQuestion[] | null>(null)
  const [edited, setEdited]         = useState<StructuredQuestion[]>([])
  const [expanded, setExpanded]     = useState<number | null>(null)
  const [status, setStatus]         = useState<'idle'|'processing'|'preview'|'saving'|'saved'>('idle')
  const [error, setError]           = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)

  async function handleStructure() {
    if (!rawText.trim()) return
    setError(null)
    setStatus('processing')
    try {
      const res = await fetch('/api/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, subject, yearLevel, citation, sourceUrl, save: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setQuestions(data.questions)
      setEdited(JSON.parse(JSON.stringify(data.questions)))
      setStatus('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao estruturar')
      setStatus('idle')
    }
  }

  async function handleSave() {
    setError(null)
    setStatus('saving')
    try {
      const res = await fetch('/api/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, subject, yearLevel, citation, sourceUrl, save: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao guardar')
      setSavedCount(data.savedIds?.length ?? edited.length)
      setStatus('saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao guardar')
      setStatus('preview')
    }
  }

  function updateQuestion(i: number, patch: Partial<StructuredQuestion>) {
    setEdited(prev => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q))
  }

  function reset() {
    setRawText(''); setQuestions(null); setEdited([]); setStatus('idle')
    setError(null); setCitation(''); setSourceUrl(''); setExpanded(null)
  }

  // ── Guardado ──────────────────────────────────────────────────────────────
  if (status === 'saved') {
    return (
      <div className="rounded-xl p-8 text-center" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-lg font-bold mb-1" style={{ color: '#15803D' }}>
          {savedCount} {savedCount === 1 ? 'questão guardada' : 'questões guardadas'} no banco!
        </h3>
        <p className="text-sm mb-4" style={{ color: '#16A34A' }}>
          quality_score: 0.95 · {citation || 'sem citação'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: '#0D1B2A' }}
        >
          Importar mais questões
        </button>
      </div>
    )
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  if (status === 'preview' || status === 'saving') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-semibold" style={{ color: '#0D1B2A' }}>
              {edited.length} {edited.length === 1 ? 'questão encontrada' : 'questões encontradas'}
            </span>
            <span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
              ⭐ quality_score: 0.95
            </span>
          </div>
          <button onClick={() => setStatus('idle')} className="text-sm" style={{ color: '#6B7280' }}>
            ← Editar texto
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>
        )}

        <div className="space-y-3">
          {edited.map((q, i) => {
            const bloomColor = BLOOM_COLORS[q.bloomLevel] ?? '#94A3B8'
            const isOpen = expanded === i
            return (
              <div key={i} className="rounded-xl overflow-hidden"
                style={{ border: '1px solid #E5E7EB', borderLeft: `4px solid ${bloomColor}` }}>
                <div className="p-4">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: bloomColor + '22', color: bloomColor }}>
                      {q.bloomLevel}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                      {TYPE_LABELS[q.type] ?? q.type}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: '#F3F4F6', color: '#4B5563' }}>
                      {DIFF_LABELS[q.difficulty] ?? q.difficulty}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: '#F3F4F6', color: '#4B5563' }}>
                      {q.points} pts
                    </span>
                  </div>

                  {/* Texto editável */}
                  <textarea
                    value={q.text}
                    onChange={e => updateQuestion(i, { text: e.target.value })}
                    rows={3}
                    className="w-full text-sm rounded-lg p-2 resize-none"
                    style={{ border: '1px solid #D1D5DB', color: '#111827', background: '#FAFAFA' }}
                  />

                  {/* Opções escolha múltipla */}
                  {q.type === 'multiple-choice' && q.options && (
                    <div className="mt-2 space-y-1">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="text-sm flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium ${
                            q.correctAnswer === String.fromCharCode(65 + oi) ? 'text-white' : ''
                          }`} style={{
                            background: q.correctAnswer === String.fromCharCode(65 + oi) ? '#10B981' : '#F3F4F6',
                            color: q.correctAnswer === String.fromCharCode(65 + oi) ? 'white' : '#6B7280',
                          }}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <span style={{ color: '#374151' }}>{opt.replace(/^[A-D]\)\s*/, '')}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Toggle markScheme */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : i)}
                    className="mt-3 text-xs font-medium"
                    style={{ color: '#00B4D8' }}>
                    {isOpen ? '▲ Ocultar markScheme' : '▼ Ver markScheme'}
                  </button>

                  {isOpen && q.markScheme && (
                    <div className="mt-2 p-3 rounded-lg text-xs space-y-1"
                      style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      {q.markScheme.criteria.map((c, ci) => (
                        <div key={ci} className="flex justify-between gap-2">
                          <span style={{ color: '#374151' }}>{c.description}</span>
                          <span className="font-semibold shrink-0" style={{ color: '#0D1B2A' }}>{c.points}pts</span>
                        </div>
                      ))}
                      <div className="pt-1 mt-1" style={{ borderTop: '1px solid #E2E8F0', color: '#6B7280' }}>
                        <span className="font-medium">Resposta: </span>{q.markScheme.modelAnswer}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm"
          style={{ background: status === 'saving' ? '#94A3B8' : '#0D1B2A' }}>
          {status === 'saving'
            ? '⏳ A guardar...'
            : `💾 Guardar ${edited.length} ${edited.length === 1 ? 'questão' : 'questões'} no Banco`}
        </button>
      </div>
    )
  }

  // ── Formulário ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>
      )}

      <textarea
        value={rawText}
        onChange={e => setRawText(e.target.value)}
        placeholder="Cola aqui o texto das questões (de um livro, exame IAVE, matematica.pt, ficha...)&#10;&#10;Podes colar várias questões de uma vez."
        rows={10}
        className="w-full rounded-xl p-4 text-sm resize-y"
        style={{ border: '1px solid #D1D5DB', color: '#111827', background: '#FAFAFA', minHeight: '200px' }}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Disciplina</label>
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ border: '1px solid #D1D5DB', color: '#111827' }}>
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Ano</label>
          <select
            value={yearLevel}
            onChange={e => setYearLevel(Number(e.target.value))}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ border: '1px solid #D1D5DB', color: '#111827' }}>
            {YEARS.map(y => <option key={y} value={y}>{y}.º ano</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
          Fonte / Citação <span style={{ color: '#9CA3AF' }}>(opcional)</span>
        </label>
        <input
          value={citation}
          onChange={e => setCitation(e.target.value)}
          placeholder='ex: "IAVE — Prova de Aferição Matemática 6.º ano 2023"'
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={{ border: '1px solid #D1D5DB', color: '#111827' }}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
          URL da fonte <span style={{ color: '#9CA3AF' }}>(opcional)</span>
        </label>
        <input
          value={sourceUrl}
          onChange={e => setSourceUrl(e.target.value)}
          placeholder="https://..."
          type="url"
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={{ border: '1px solid #D1D5DB', color: '#111827' }}
        />
      </div>

      <button
        onClick={handleStructure}
        disabled={!rawText.trim() || status === 'processing'}
        className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity"
        style={{ background: !rawText.trim() || status === 'processing' ? '#94A3B8' : '#0D1B2A' }}>
        {status === 'processing' ? '⏳ A analisar com IA...' : '✨ Estruturar com IA'}
      </button>

      <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
        As questões importadas recebem quality_score: 0.95 (fonte externa verificada)
      </p>
    </div>
  )
}
