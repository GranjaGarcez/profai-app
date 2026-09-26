'use client'

import { useState, useEffect } from 'react'
import MathFigure from '@/components/math/MathFigure'
import BrewingLoader from '@/components/shared/BrewingLoader'
import { subjectsForYear } from '@/lib/subjectsByCycle'

const BLOOM_LEVELS = ['Lembrar', 'Compreender', 'Aplicar', 'Analisar', 'Avaliar', 'Criar'] as const
// % mínima recomendada de ordem superior (Analisar+Avaliar+Criar) por ciclo.
function minHigherOrder(year: number): number {
  if (year <= 4) return 15
  if (year <= 6) return 40
  if (year <= 9) return 55
  return 70
}
function higherOrderShare(bw: Record<string, number>): number {
  const sum = BLOOM_LEVELS.reduce((s, k) => s + (Number(bw[k]) || 0), 0)
  if (sum <= 0) return 0
  return Math.round(((Number(bw.Analisar) || 0) + (Number(bw.Avaliar) || 0) + (Number(bw.Criar) || 0)) / sum * 100)
}

// Estimativa de tempo (minutos) que um aluno médio leva a resolver a prova.
// Heurística: custo-base por tipo × factor de Bloom (ordem superior demora mais)
// + margem de leitura/revisão. É uma estimativa orientadora, não uma garantia.
const TYPE_MINUTES: Record<string, number> = {
  multiple_choice: 1.2, true_false: 1.0, fill_blank: 2, short_answer: 3, long_answer: 8,
}
function estimateMinutes(f: {
  questionTypes: string[]; numQuestions: number; customBloom: boolean
  bloomWeights: Record<string, number>; difficulty: string; yearLevel: number
}): number {
  const types = f.questionTypes.length ? f.questionTypes : ['multiple_choice']
  const avgType = types.reduce((s, t) => s + (TYPE_MINUTES[t] ?? 3), 0) / types.length
  const bloomFactor = f.customBloom
    ? 1 + (higherOrderShare(f.bloomWeights) / 100) * 0.6
    : f.difficulty === 'easy' ? 0.9 : f.difficulty === 'hard' ? 1.35 : 1.05
  // alunos mais novos escrevem/lêem mais devagar
  const ageFactor = f.yearLevel <= 4 ? 1.25 : f.yearLevel <= 6 ? 1.1 : 1
  const overhead = 5 // leitura inicial + revisão final
  return Math.round(f.numQuestions * avgType * bloomFactor * ageFactor + overhead)
}

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
    aeMode: 'equilibrado' as 'equilibrado' | 'estrito',
    customBloom: false,
    bloomWeights: { Lembrar: 15, Compreender: 25, Aplicar: 20, Analisar: 20, Avaliar: 10, Criar: 10 } as Record<string, number>,
  })

  // ── Modo personalizado: escolher AE individualmente (opt-in) ──
  const [personalMode, setPersonalMode] = useState(false)
  const [aeDomains, setAeDomains] = useState<Array<{ name: string; descriptors: string[] }> | null>(null)
  const [aeSelected, setAeSelected] = useState<string[]>([])
  const [aeLoading, setAeLoading] = useState(false)
  const [aeMatching, setAeMatching] = useState(false)
  const [aeNote, setAeNote] = useState('')

  // Carrega a estrutura do currículo quando o modo está ligado (e ao mudar disciplina/ano).
  useEffect(() => {
    if (!personalMode) return
    let cancel = false
    setAeLoading(true); setAeNote('')
    fetch(`/api/curriculum/structure?subject=${encodeURIComponent(form.subject)}&year=${form.yearLevel}`)
      .then(r => r.json())
      .then(d => { if (!cancel) { setAeDomains(d.available ? d.domains.filter((x: { descriptors: string[] }) => x.descriptors.length) : []); setAeSelected([]) } })
      .catch(() => { if (!cancel) setAeDomains([]) })
      .finally(() => { if (!cancel) setAeLoading(false) })
    return () => { cancel = true }
  }, [personalMode, form.subject, form.yearLevel])

  function toggleAE(text: string) {
    setAeSelected(s => s.includes(text) ? s.filter(t => t !== text) : [...s, text])
  }
  async function suggestAE() {
    if (!form.topic.trim()) { setAeNote('Escreve primeiro o tópico.'); return }
    setAeMatching(true); setAeNote('')
    try {
      const res = await fetch('/api/ai/match-ae', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: form.subject, yearLevel: form.yearLevel, topic: form.topic }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Falha ao emparelhar.')
      const matched: string[] = (d.matched ?? []).map((m: { text: string }) => m.text)
      setAeSelected(matched)
      setAeNote(matched.length ? `${matched.length} descritor(es) sugerido(s) para "${form.topic}".${d.nota ? ' ' + d.nota : ''}` : 'Nenhum descritor encontrado para este tópico — escolhe manualmente.')
    } catch (e) { setAeNote(e instanceof Error ? e.message : 'Erro.') }
    finally { setAeMatching(false) }
  }

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
      body: JSON.stringify({ tool: 'test', inputs: { ...form, numQuestions, avoidTexts, bloomWeights: form.customBloom ? form.bloomWeights : null, coverage: personalMode && aeSelected.length ? aeSelected : null } }),
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
                  {subjectsForYear(form.yearLevel).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>Ano de escolaridade</label>
                <select
                  value={form.yearLevel}
                  onChange={e => setForm(f => {
                    const yearLevel = Number(e.target.value)
                    const avail = subjectsForYear(yearLevel)
                    // Se a disciplina atual não existir no novo ciclo, escolhe a primeira válida.
                    const subject = avail.includes(f.subject) ? f.subject : avail[0]
                    return { ...f, yearLevel, subject }
                  })}
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
                <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>
                  Dificuldade {form.customBloom && <span className="font-normal" style={{ color: '#9CA3AF' }}>(desativada — Bloom personalizado)</span>}
                </label>
                <div className="flex gap-2" style={{ opacity: form.customBloom ? 0.4 : 1 }}>
                  {[
                    { id: 'easy', label: 'Fácil' },
                    { id: 'medium', label: 'Média' },
                    { id: 'hard', label: 'Difícil' },
                  ].map(d => (
                    <button
                      key={d.id}
                      disabled={form.customBloom}
                      onClick={() => setForm(f => ({ ...f, difficulty: d.id }))}
                      className="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors disabled:cursor-not-allowed"
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
              <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>Alinhamento curricular</label>
              <div className="flex gap-2">
                {[
                  { id: 'equilibrado', label: 'Equilibrado' },
                  { id: 'estrito', label: 'AE estrito' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setForm(f => ({ ...f, aeMode: m.id as 'equilibrado' | 'estrito' }))}
                    className="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors"
                    style={{
                      background: form.aeMode === m.id ? '#0D1B2A' : 'white',
                      color: form.aeMode === m.id ? '#F7F3EE' : '#6B7280',
                      borderColor: '#0D1B2A30',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                {form.aeMode === 'estrito'
                  ? 'Cada pergunta ancora num descritor oficial das Aprendizagens Essenciais — nada fora das AE.'
                  : 'Prioriza as Aprendizagens Essenciais, admitindo conteúdo consagrado do mesmo domínio.'}
              </p>
            </div>

            {/* Personalização avançada dos níveis de Bloom (opcional) */}
            <div className="rounded-lg border" style={{ borderColor: form.customBloom ? '#c8a84b' : '#0D1B2A20' }}>
              <label className="flex items-center gap-2 px-3 py-2 cursor-pointer">
                <input type="checkbox" checked={form.customBloom}
                  onChange={e => setForm(f => ({ ...f, customBloom: e.target.checked }))} />
                <span className="text-sm font-medium" style={{ color: '#0D1B2A' }}>Personalizar níveis de Bloom (avançado)</span>
              </label>
              {form.customBloom && (() => {
                const bw = form.bloomWeights
                const sum = BLOOM_LEVELS.reduce((s, k) => s + (Number(bw[k]) || 0), 0)
                const higher = higherOrderShare(bw)
                const minH = minHigherOrder(form.yearLevel)
                const risk = higher < minH
                return (
                  <div className="px-3 pb-3 space-y-2">
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      Define o peso (%) de cada nível. Os valores são normalizados para 100%. Sobrepõe-se ao nível de dificuldade.
                    </p>
                    {BLOOM_LEVELS.map(k => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-xs w-28" style={{ color: '#0D1B2A' }}>{k}</span>
                        <input type="range" min={0} max={100} value={Number(bw[k]) || 0}
                          onChange={e => setForm(f => ({ ...f, bloomWeights: { ...f.bloomWeights, [k]: Number(e.target.value) } }))}
                          className="flex-1" />
                        <span className="text-xs w-10 text-right font-mono" style={{ color: '#6B7280' }}>{Number(bw[k]) || 0}%</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs pt-1" style={{ color: '#6B7280' }}>
                      <span>Soma: {sum}% (normalizada)</span>
                      <span>Ordem superior: <strong style={{ color: risk ? '#b45309' : '#166534' }}>{higher}%</strong></span>
                    </div>
                    {sum === 0 && (
                      <p className="text-xs rounded px-2 py-1.5" style={{ background: '#fef2f2', color: '#b91c1c' }}>
                        Todos os pesos a zero — define pelo menos um nível, senão volta ao preset da dificuldade.
                      </p>
                    )}
                    {risk && sum > 0 && (
                      <p className="text-xs rounded px-2 py-1.5" style={{ background: '#fffbeb', color: '#92400e' }}>
                        ⚠️ Ordem superior ({higher}%) abaixo do recomendado para o {form.yearLevel}.º ano (~{minH}%). O teste fica menos exigente do que as Aprendizagens Essenciais pedem e o revisor crítico pode assinalá-lo. Usa conscientemente.
                      </p>
                    )}
                  </div>
                )
              })()}
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
              {(() => {
                const est = estimateMinutes(form)
                const over = est > form.duration
                const under = est < form.duration * 0.55
                return (
                  <div className="mt-1.5 text-xs flex items-center justify-between gap-2 flex-wrap">
                    <span style={{ color: '#6B7280' }}>
                      Tempo estimado para um aluno médio: <strong style={{ color: over ? '#b45309' : '#166534' }}>≈ {est} min</strong>
                    </span>
                    {over && (
                      <span style={{ color: '#92400e' }}>⚠️ excede os {form.duration} min — reduz o nº de questões, simplifica os tipos, ou aumenta a duração.</span>
                    )}
                    {!over && under && (
                      <span style={{ color: '#9CA3AF' }}>bastante folga face aos {form.duration} min — podes acrescentar questões ou aprofundar.</span>
                    )}
                  </div>
                )
              })()}
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

            {/* Modo personalizado — escolher Aprendizagens Essenciais do tema */}
            <div className="rounded-lg border" style={{ borderColor: personalMode ? '#00B4D8' : '#0D1B2A20' }}>
              <label className="flex items-center gap-2 px-3 py-2 cursor-pointer">
                <input type="checkbox" checked={personalMode} onChange={e => setPersonalMode(e.target.checked)} />
                <span className="text-sm font-medium" style={{ color: '#0D1B2A' }}>Modo personalizado — escolher Aprendizagens Essenciais</span>
              </label>
              {personalMode && (
                <div className="px-3 pb-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={suggestAE} disabled={aeMatching || !form.topic.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: '#00B4D8' }}>
                      {aeMatching ? 'A emparelhar…' : '🎯 Sugerir a partir do meu tópico'}
                    </button>
                    {aeSelected.length > 0 && (
                      <button onClick={() => setAeSelected([])} className="text-xs" style={{ color: '#9CA3AF' }}>limpar seleção ({aeSelected.length})</button>
                    )}
                  </div>
                  {aeNote && <p className="text-xs" style={{ color: '#6B7280' }}>{aeNote}</p>}
                  {aeLoading && <p className="text-xs" style={{ color: '#9CA3AF' }}>A carregar Aprendizagens Essenciais…</p>}
                  {aeDomains && aeDomains.length === 0 && !aeLoading && (
                    <p className="text-xs rounded px-2 py-1.5" style={{ background: '#fffbeb', color: '#92400e' }}>
                      Ainda não há descritores AE curados para {form.subject} do {form.yearLevel}.º ano — o modo normal continua a funcionar.
                    </p>
                  )}
                  {aeDomains && aeDomains.length > 0 && (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {aeDomains.map(dom => (
                        <div key={dom.name}>
                          <p className="text-xs font-semibold mb-1" style={{ color: '#0D1B2A' }}>{dom.name}</p>
                          <div className="space-y-1">
                            {dom.descriptors.map(desc => (
                              <label key={desc} className="flex items-start gap-2 text-xs cursor-pointer rounded px-1.5 py-1"
                                style={{ background: aeSelected.includes(desc) ? '#e0f7fc' : 'transparent', color: '#374151' }}>
                                <input type="checkbox" className="mt-0.5" checked={aeSelected.includes(desc)} onChange={() => toggleAE(desc)} />
                                <span>{desc}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>
                    {aeSelected.length > 0
                      ? `${aeSelected.length} descritor(es) selecionado(s) — a geração cobre exactamente estes, sem sobreposição.`
                      : 'Sem seleção, o modo personalizado não se aplica (a geração corre normalmente).'}
                  </p>
                </div>
              )}
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
