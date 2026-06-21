'use client'

import { useState } from 'react'

interface ImageStudioProps {
  subject: string
  yearLevel: number
  initialDescription?: string
  correctAnswer?: string   // nunca mostrado ao IA de imagem como conteúdo — só como sinal do que NÃO desenhar
  onUse: (dataUrl: string) => void
  onClose: () => void
}

type Phase = 'form' | 'generating' | 'result' | 'error'

export default function ImageStudio({ subject, yearLevel, initialDescription, correctAnswer, onUse, onClose }: ImageStudioProps) {
  const [phase, setPhase] = useState<Phase>('form')
  const [description, setDescription] = useState(initialDescription ?? '')
  const [image, setImage] = useState<string | null>(null)
  const [promptUsed, setPromptUsed] = useState<string | null>(null)
  const [technicalWarning, setTechnicalWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (!description.trim()) { setError('Descreve o que queres ilustrar.'); return }
    setError(null)
    setPhase('generating')
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, subject, yearLevel, correctAnswer }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setImage(data.image)
      setPromptUsed(data.promptUsed ?? null)
      setTechnicalWarning(data.technicalWarning ?? null)
      setPhase('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setPhase('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#0D1B2A90' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4" style={{ background: 'white' }}>

        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
              🎨 Estúdio de Imagens
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Ilustração de contexto, gerada por IA</p>
          </div>
          {phase !== 'generating' && (
            <button onClick={onClose} className="text-xl" style={{ color: '#6B7280' }}>✕</button>
          )}
        </div>

        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
          ⚠️ Só para ilustração decorativa/contextual — nunca para gráficos, circuitos ou diagramas que o aluno tenha de ler com precisão. Para esses, usa o sistema de figuras do teste.
          {correctAnswer && ' A IA é instruída a nunca desenhar a resposta correcta desta questão.'}
        </p>

        {(phase === 'form' || phase === 'error') && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>O que queres ilustrar?</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={3} placeholder="Ex: uma criança a regar plantas num jardim, ao pôr-do-sol"
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor: '#0D1B2A30' }} />
            </div>
            {error && (
              <p className="text-sm p-3 rounded-lg" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</p>
            )}
            <button onClick={handleGenerate}
              className="w-full py-2.5 rounded-xl font-semibold text-white transition-opacity"
              style={{ background: '#7C3AED' }}>
              ✨ Gerar ilustração
            </button>
          </>
        )}

        {phase === 'generating' && (
          <div className="py-10 text-center space-y-3">
            <div className="text-4xl animate-bounce">🎨</div>
            <p className="text-sm font-medium" style={{ color: '#0D1B2A' }}>A criar a ilustração...</p>
          </div>
        )}

        {phase === 'result' && image && (
          <>
            {technicalWarning && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                ⚠️ {technicalWarning}
              </p>
            )}
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Ilustração gerada" className="rounded-xl max-h-72 object-contain" style={{ border: '1px solid #e2e8f0' }} />
            </div>
            {promptUsed && (
              <p className="text-xs italic" style={{ color: '#9CA3AF' }}>Prompt usado: {promptUsed}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setPhase('form')}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: '#0D1B2A30', color: '#0D1B2A' }}>
                🔄 Gerar outra
              </button>
              <button onClick={() => onUse(image)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#7C3AED' }}>
                ✓ Usar esta imagem
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
