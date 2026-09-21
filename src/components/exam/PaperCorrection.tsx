'use client'
// Correção de prova em papel (aditivo). Fotos -> transcrição OCR -> revisão
// humana obrigatória -> correção com o motor existente. Não altera o fluxo digital.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllQuestions, type TestSnapshot, type Question } from '@/lib/exam/types'

interface OcrAnswer { text: string; confidence: number; illegible: boolean; notes?: string }
interface OcrResult {
  answers: Record<string, OcrAnswer>
  student: { name?: string; number?: string; class?: string }
  needsReview: boolean
  flagged: string[]
  warnings: string[]
}

const THRESHOLD = 0.85

// Reduz a foto para no máx. 1600px e devolve data-URI JPEG (payload menor, OCR fiável).
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('erro a ler ficheiro'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('erro a carregar imagem'))
      img.onload = () => {
        const max = 1600
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(reader.result as string)
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

function confColor(c: number): string {
  if (c >= THRESHOLD) return '#166534'
  if (c >= 0.6) return '#b45309'
  return '#b91c1c'
}

export default function PaperCorrection({ sessionId, testSnapshot }: { sessionId: string; testSnapshot: TestSnapshot }) {
  const router = useRouter()
  const questions: Question[] = getAllQuestions(testSnapshot)
  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [phase, setPhase] = useState<'idle' | 'transcribing' | 'review' | 'grading' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [ocr, setOcr] = useState<OcrResult | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [student, setStudent] = useState({ name: '', number: '', class: '' })

  async function addFiles(list: FileList | null) {
    if (!list?.length) return
    setError(null)
    try {
      const urls = await Promise.all(Array.from(list).slice(0, 8).map(fileToDataUrl))
      setImages(prev => [...prev, ...urls].slice(0, 8))
    } catch { setError('Não foi possível processar as fotografias.') }
  }

  async function transcribe() {
    if (!images.length) return
    setPhase('transcribing'); setError(null)
    try {
      const res = await fetch('/api/exam/paper/transcribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, images }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha na transcrição.')
      const r = data as OcrResult
      setOcr(r)
      setAnswers(Object.fromEntries(questions.map(q => [String(q.index), r.answers[String(q.index)]?.text ?? ''])))
      setStudent({ name: r.student.name ?? '', number: r.student.number ?? '', class: r.student.class ?? '' })
      setPhase('review')
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro.'); setPhase('idle') }
  }

  async function grade() {
    if (!student.name.trim()) { setError('Indica o nome do aluno.'); return }
    setPhase('grading'); setError(null)
    try {
      const res = await fetch('/api/exam/paper/grade', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId, studentName: student.name, studentNumber: student.number,
          studentClass: student.class, answers, ocrDetails: ocr?.answers ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha na correção.')
      setPhase('done')
      setTimeout(() => { reset(); router.refresh() }, 1500)
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro.'); setPhase('review') }
  }

  function reset() {
    setImages([]); setOcr(null); setAnswers({}); setStudent({ name: '', number: '', class: '' })
    setPhase('idle'); setError(null); setOpen(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full rounded-2xl border-2 border-dashed p-4 text-sm font-medium transition-colors"
        style={{ borderColor: '#00B4D840', color: '#0369a1', background: '#f0fdff' }}>
        📸 Corrigir prova em papel (foto → OCR → correção)
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border p-5 space-y-4" style={{ borderColor: '#00B4D840' }}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold" style={{ color: '#0D1B2A' }}>📸 Corrigir prova em papel</h3>
        <button onClick={reset} className="text-xs" style={{ color: '#9CA3AF' }}>✕ fechar</button>
      </div>

      {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: '#fef2f2', color: '#b91c1c' }}>{error}</div>}

      {/* Upload */}
      {phase !== 'review' && phase !== 'done' && (
        <div className="space-y-3">
          <label className="block rounded-xl border-2 border-dashed p-4 text-center cursor-pointer text-sm"
            style={{ borderColor: '#0D1B2A20', color: '#6B7280' }}>
            Toca para fotografar ou escolher imagens (máx. 8)
            <input type="file" accept="image/*" capture="environment" multiple className="hidden"
              onChange={e => addFiles(e.target.files)} />
          </label>
          {images.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {images.map((src, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`página ${i + 1}`} width={64} height={80}
                    style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-2 -right-2 rounded-full text-xs w-5 h-5"
                    style={{ background: '#0D1B2A', color: 'white' }}>×</button>
                </div>
              ))}
            </div>
          )}
          <button onClick={transcribe} disabled={!images.length || phase === 'transcribing'}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: '#00B4D8' }}>
            {phase === 'transcribing' ? 'A transcrever…' : 'Transcrever respostas'}
          </button>
        </div>
      )}

      {/* Revisão */}
      {phase === 'review' && ocr && (
        <div className="space-y-4">
          <div className="text-xs rounded-lg px-3 py-2" style={{ background: '#fffbeb', color: '#92400e' }}>
            ⚠️ Revisão obrigatória: confirma/corrige a transcrição antes de corrigir. As linhas a amarelo têm baixa confiança de reconhecimento.
          </div>

          {ocr.warnings?.length > 0 && (
            <div className="text-xs rounded-lg px-3 py-2 space-y-1" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
              <p className="font-semibold">🚩 Integridade das páginas — verifica antes de corrigir:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {ocr.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Nome do aluno" value={student.name} onChange={e => setStudent(s => ({ ...s, name: e.target.value }))}
              className="col-span-3 sm:col-span-1 px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#0D1B2A20' }} />
            <input placeholder="Nº" value={student.number} onChange={e => setStudent(s => ({ ...s, number: e.target.value }))}
              className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#0D1B2A20' }} />
            <input placeholder="Turma" value={student.class} onChange={e => setStudent(s => ({ ...s, class: e.target.value }))}
              className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#0D1B2A20' }} />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {questions.map(q => {
              const key = String(q.index)
              const a = ocr.answers[key]
              const flag = a && (a.illegible || a.confidence < THRESHOLD)
              return (
                <div key={key} className="rounded-lg border p-2.5"
                  style={{ borderColor: flag ? '#f59e0b' : '#e2e8f0', background: flag ? '#fffbeb' : 'white' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: '#0D1B2A' }}>
                      Q{q.index} · {q.points}pt · {q.type === 'multiple_choice' ? 'escolha múltipla' : q.type === 'true_false' ? 'V/F' : q.type === 'long_answer' ? 'resposta longa' : q.type === 'fill_blank' ? 'espaços' : 'resposta curta'}
                    </span>
                    {a && <span className="text-xs font-mono" style={{ color: confColor(a.confidence) }}>
                      {Math.round(a.confidence * 100)}%{a.illegible ? ' ⚠ ilegível' : ''}
                    </span>}
                  </div>
                  <p className="text-xs mb-1.5" style={{ color: '#6B7280' }}>{q.text.slice(0, 120)}</p>
                  {q.type === 'multiple_choice' || q.type === 'true_false' ? (
                    <input value={answers[key] ?? ''} onChange={e => setAnswers(p => ({ ...p, [key]: e.target.value.toUpperCase() }))}
                      className="w-20 px-2 py-1 rounded border text-sm font-mono" style={{ borderColor: '#0D1B2A20' }} />
                  ) : (
                    <textarea value={answers[key] ?? ''} onChange={e => setAnswers(p => ({ ...p, [key]: e.target.value }))}
                      rows={q.type === 'long_answer' ? 4 : 2}
                      className="w-full px-2 py-1 rounded border text-sm" style={{ borderColor: '#0D1B2A20' }} />
                  )}
                  {a?.notes && <p className="text-xs mt-1" style={{ color: '#b45309' }}>OCR: {a.notes}</p>}
                </div>
              )
            })}
          </div>

          <button onClick={grade} disabled={phase !== 'review'}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#0D1B2A' }}>
            {(phase as string) === 'grading' ? 'A corrigir…' : 'Corrigir e guardar'}
          </button>
        </div>
      )}

      {phase === 'grading' && <p className="text-sm text-center" style={{ color: '#6B7280' }}>A corrigir com os mesmos critérios…</p>}
      {phase === 'done' && <p className="text-sm text-center font-semibold" style={{ color: '#166534' }}>✓ Prova corrigida e guardada.</p>}
    </div>
  )
}
