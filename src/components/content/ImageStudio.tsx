'use client'

import { useState } from 'react'
import BrewingLoader from '@/components/shared/BrewingLoader'
import MathFigure from '@/components/math/MathFigure'

interface TableData {
  type: 'table'
  headers: string[]
  rows: string[][]
}

interface ImageStudioProps {
  subject: string
  yearLevel: number
  topic: string
  initialDescription?: string
  correctAnswer?: string   // nunca mostrado ao IA de imagem como conteúdo — só como sinal do que NÃO desenhar
  onUse: (dataUrl: string, credit?: string) => void
  onUseTable?: (table: TableData) => void
  onClose: () => void
}

type Mode = 'gerar' | 'pesquisar' | 'tabela'
type Phase = 'form' | 'loading' | 'result' | 'error' | 'guidance' | 'clarify'

interface ImageResult {
  title: string
  url: string
  thumbUrl: string
  source: 'banco' | 'commons' | 'unsplash' | 'openverse'
  license: string
  artist: string
  descriptionUrl: string
}

const SOURCE_BADGE: Record<ImageResult['source'], { label: string; color: string; bg: string }> = {
  banco:     { label: '★ Já usaste', color: '#92740a', bg: '#fefce8' },
  openverse: { label: 'Openverse',   color: '#059669', bg: '#f0fdf4' },
  commons:   { label: 'Commons',     color: '#0369a1', bg: '#f0f9ff' },
  unsplash:  { label: 'Unsplash',    color: '#7c3aed', bg: '#f5f3ff' },
}

export default function ImageStudio({ subject, yearLevel, topic, initialDescription, correctAnswer, onUse, onUseTable, onClose }: ImageStudioProps) {
  const [mode, setMode] = useState<Mode>('gerar')
  const [phase, setPhase] = useState<Phase>('form')
  const [description, setDescription] = useState(initialDescription ?? '')
  const [error, setError] = useState<string | null>(null)
  const [guidance, setGuidance] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string | null>(null)

  // Gerar
  const [image, setImage] = useState<string | null>(null)
  const [promptUsed, setPromptUsed] = useState<string | null>(null)

  // Pesquisar
  const [searchResults, setSearchResults] = useState<ImageResult[]>([])
  const [selected, setSelected] = useState<ImageResult | null>(null)

  // Tabela
  const [clarifyQuestions, setClarifyQuestions] = useState<string[]>([])
  const [clarifyAnswer, setClarifyAnswer] = useState('')
  const [table, setTable] = useState<TableData | null>(null)

  function switchMode(m: Mode) {
    setMode(m); setPhase('form'); setError(null); setGuidance(null); setSelected(null)
  }

  async function handleGenerate() {
    if (!description.trim()) { setError('Descreve o que queres ilustrar.'); return }
    setError(null)
    setPhase('loading')
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, subject, yearLevel, correctAnswer }),
      })
      const data = await res.json()
      if (data.guidance) { setGuidance(data.guidance); setPhase('guidance'); return }
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setImage(data.image)
      setPromptUsed(data.promptUsed ?? null)
      setPhase('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setPhase('error')
    }
  }

  async function handleSearch() {
    if (!description.trim()) { setError('Descreve que imagem procuras.'); return }
    setError(null)
    setSelected(null)
    setPhase('loading')
    try {
      const res = await fetch('/api/ai/search-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, subject, yearLevel, topic }),
      })
      const data = await res.json()
      if (data.guidance) { setGuidance(data.guidance); setPhase('guidance'); return }
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      if (!data.results?.length) throw new Error('Sem resultados — tenta descrever de outra forma.')
      setSearchResults(data.results)
      setSearchQuery(data.query ?? description)
      setPhase('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setPhase('error')
    }
  }

  async function handleGenerateTable(clarification?: string) {
    if (!description.trim()) { setError('Descreve que tabela precisas.'); return }
    setError(null)
    setPhase('loading')
    try {
      const res = await fetch('/api/ai/generate-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, subject, yearLevel, topic, clarification }),
      })
      const data = await res.json()
      if (data.needsClarification) {
        setClarifyQuestions(data.questions ?? [])
        setPhase('clarify')
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setTable(data.table)
      setPhase('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setPhase('error')
    }
  }

  function handleUseSearchResult() {
    if (!selected) return
    const credit = selected.source === 'banco'
      ? selected.license
      : `${selected.title} — ${selected.artist} (${selected.license})`
    onUse(selected.url, credit)

    // Regista o uso no banco próprio — não bloqueia, falha em silêncio.
    // upsert_image_usage() faz correspondência pelo url: se já vier do banco
    // (reutilização), só incrementa o contador — o valor de "source" abaixo só
    // importa para imagens novas (commons/unsplash) a entrar por inserir.
    fetch('/api/ai/save-image-use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject, yearLevel, topic,
        query: searchQuery ?? description,
        source: selected.source,
        url: selected.url, thumbUrl: selected.thumbUrl, credit,
      }),
    }).catch(() => { /* não crítico */ })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#0D1B2A90' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 space-y-4" style={{ background: 'white' }}>

        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
              🎨 Estúdio de Imagens
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Ilustração, imagem real, ou tabela de dados</p>
          </div>
          {phase !== 'loading' && (
            <button onClick={onClose} className="text-xl" style={{ color: '#6B7280' }}>✕</button>
          )}
        </div>

        {/* Separador de modo */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f1f5f9' }}>
          <button onClick={() => switchMode('gerar')}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: mode === 'gerar' ? 'white' : 'transparent', color: mode === 'gerar' ? '#7C3AED' : '#6B7280', boxShadow: mode === 'gerar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            ✨ Gerar
          </button>
          <button onClick={() => switchMode('pesquisar')}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: mode === 'pesquisar' ? 'white' : 'transparent', color: mode === 'pesquisar' ? '#0369a1' : '#6B7280', boxShadow: mode === 'pesquisar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            🔍 Pesquisar real
          </button>
          {onUseTable && (
            <button onClick={() => switchMode('tabela')}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: mode === 'tabela' ? 'white' : 'transparent', color: mode === 'tabela' ? '#059669' : '#6B7280', boxShadow: mode === 'tabela' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              📊 Tabela
            </button>
          )}
        </div>

        {mode === 'gerar' && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
            ⚠️ Só para ilustração decorativa/contextual — nunca para gráficos, circuitos ou diagramas que o aluno tenha de ler com precisão.
            {correctAnswer && ' A IA é instruída a nunca desenhar a resposta correcta desta questão.'}
          </p>
        )}
        {mode === 'pesquisar' && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>
            🔍 Pesquisa em várias fontes: o teu próprio banco de imagens já usadas, Wikimedia Commons (mapas, anatomia, moléculas, quadros — onde a precisão importa), Openverse (arquivos e museus) e Unsplash (fotografia realista contemporânea).
          </p>
        )}
        {mode === 'tabela' && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
            📊 Para tabelas de classificação/comparação — a IA gera dados reais e desenha a tabela exactamente, sem o risco de erro visual de uma imagem. Se o pedido for vago, pergunto antes de inventar dados.
          </p>
        )}

        {(phase === 'form' || phase === 'error') && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>
                {mode === 'gerar' ? 'O que queres ilustrar?' : mode === 'pesquisar' ? 'Que imagem procuras?' : 'Que tabela precisas?'}
              </label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={3} placeholder={
                  mode === 'gerar' ? 'Ex: uma criança a regar plantas num jardim, ao pôr-do-sol'
                  : mode === 'pesquisar' ? 'Ex: sistema digestivo humano, mapa da expansão do Império Romano'
                  : 'Ex: 6 animais e o seu regime alimentar (carnívoro/herbívoro/omnívoro)'
                }
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor: '#0D1B2A30' }} />
            </div>
            {error && (
              <p className="text-sm p-3 rounded-lg" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</p>
            )}
            <button onClick={mode === 'gerar' ? handleGenerate : mode === 'pesquisar' ? handleSearch : () => handleGenerateTable()}
              className="w-full py-2.5 rounded-xl font-semibold text-white transition-opacity"
              style={{ background: mode === 'gerar' ? '#7C3AED' : mode === 'pesquisar' ? '#0369a1' : '#059669' }}>
              {mode === 'gerar' ? '✨ Gerar ilustração' : mode === 'pesquisar' ? '🔍 Pesquisar' : '📊 Gerar tabela'}
            </button>
          </>
        )}

        {phase === 'loading' && (
          <div className="py-10">
            <BrewingLoader subject={mode === 'gerar' ? 'ilustração' : mode === 'pesquisar' ? 'pesquisa de imagem' : 'tabela'} />
          </div>
        )}

        {phase === 'guidance' && guidance && (
          <>
            <div className="px-4 py-3 rounded-xl flex items-start gap-2.5" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
              <span className="text-lg">💡</span>
              <p className="text-sm">{guidance}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setPhase('form'); setGuidance(null) }}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: '#0D1B2A30', color: '#0D1B2A' }}>
                ← Voltar
              </button>
              {onUseTable && (
                <button onClick={() => { switchMode('tabela') }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#059669' }}>
                  📊 Criar tabela
                </button>
              )}
            </div>
          </>
        )}

        {/* Esclarecimento — pedido de tabela vago demais para gerar dados correctos */}
        {phase === 'clarify' && (
          <>
            <div className="px-4 py-3 rounded-xl" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
              <p className="text-sm font-semibold mb-2">Preciso de mais detalhe para garantir dados correctos:</p>
              <ul className="text-sm space-y-1 list-disc pl-4">
                {clarifyQuestions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
            <textarea value={clarifyAnswer} onChange={e => setClarifyAnswer(e.target.value)}
              rows={2} placeholder="Responde aqui, em poucas palavras..."
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor: '#0D1B2A30' }} />
            {error && (
              <p className="text-sm p-3 rounded-lg" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</p>
            )}
            <button onClick={() => handleGenerateTable(clarifyAnswer)}
              className="w-full py-2.5 rounded-xl font-semibold text-white" style={{ background: '#059669' }}>
              📊 Continuar
            </button>
          </>
        )}

        {/* Resultado: gerar */}
        {mode === 'gerar' && phase === 'result' && image && (
          <>
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

        {/* Resultado: pesquisar — grelha ou selecção */}
        {mode === 'pesquisar' && phase === 'result' && !selected && (
          <>
            <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
              {searchResults.map((r, i) => {
                const badge = SOURCE_BADGE[r.source]
                return (
                  <button key={i} onClick={() => setSelected(r)}
                    className="relative rounded-lg overflow-hidden border-2 transition-all hover:border-blue-400"
                    style={{ borderColor: '#e2e8f0', aspectRatio: '1' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.thumbUrl} alt={r.title} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[10px] font-semibold px-1 py-0.5 rounded text-center truncate"
                      style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setPhase('form')}
              className="w-full py-2 rounded-xl border text-sm font-medium" style={{ borderColor: '#0D1B2A30', color: '#0D1B2A' }}>
              ← Pesquisar outra coisa
            </button>
          </>
        )}

        {mode === 'pesquisar' && phase === 'result' && selected && (
          <>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.url} alt={selected.title} className="rounded-xl max-h-64 object-contain" style={{ border: '1px solid #e2e8f0' }} />
            </div>
            <div className="text-xs px-3 py-2 rounded-lg" style={{ background: '#f8fafc', color: '#374151', border: '1px solid #e2e8f0' }}>
              <p><strong>{selected.title}</strong></p>
              {selected.artist && <p style={{ color: '#6B7280' }}>{selected.artist} · {selected.license}</p>}
              {selected.descriptionUrl && selected.source !== 'banco' && (
                <a href={selected.descriptionUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#0369a1' }}>
                  Ver fonte original ↗
                </a>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSelected(null)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: '#0D1B2A30', color: '#0D1B2A' }}>
                ← Voltar aos resultados
              </button>
              <button onClick={handleUseSearchResult}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#0369a1' }}>
                ✓ Usar esta imagem
              </button>
            </div>
          </>
        )}

        {/* Resultado: tabela */}
        {mode === 'tabela' && phase === 'result' && table && (
          <>
            <div className="overflow-x-auto">
              <MathFigure figure={table} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPhase('form')}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: '#0D1B2A30', color: '#0D1B2A' }}>
                🔄 Gerar outra
              </button>
              <button onClick={() => onUseTable?.(table)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#059669' }}>
                ✓ Usar esta tabela
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
