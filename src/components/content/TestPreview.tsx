'use client'

import { useState, useCallback } from 'react'
import MathFigure from '@/components/math/MathFigure'
import SchoolProfileModal from '@/components/school/SchoolProfileModal'
import ExamLauncher from '@/components/exam/ExamLauncher'
import { useSchoolProfile } from '@/lib/hooks/useSchoolProfile'
import { generateTestDocx } from '@/lib/export/testDocx'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Question {
  index: number
  type: string
  bloomLevel?: string
  text: string
  figure?: unknown
  options?: string[]
  correctAnswer: string
  points: number
  markScheme?: string
  allowCalculator?: boolean
}

interface TestGroup {
  label: string
  description: string
  totalPoints?: number
  questions: Question[]
}

interface TestContent {
  title: string
  subject: string
  yearLevel: number
  topic: string
  difficulty: string
  totalPoints: number
  duration?: number
  instructions?: string
  groups?: TestGroup[]
  questions?: Question[]
}

// ── Utilitários ───────────────────────────────────────────────────────────────
const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Fácil', medium: 'Média', hard: 'Difícil',
}

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Escolha múltipla',
  true_false: 'Verdadeiro / Falso',
  short_answer: 'Resposta curta',
  long_answer: 'Resposta longa',
  fill_blank: 'Completar espaços',
}

const ANSWER_LINES: Record<string, number> = {
  short_answer: 4, long_answer: 10, fill_blank: 2, true_false: 0,
}

function normaliseGroups(test: TestContent): TestGroup[] {
  if (test.groups && test.groups.length > 0) return test.groups
  if (test.questions && test.questions.length > 0) {
    return [{ label: 'Questões', description: '', questions: test.questions }]
  }
  return []
}

function deepClone<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── Componente de campo editável (texto simples, uma linha) ───────────────────
function EditField({
  value, onChange, editing, className, style, placeholder,
}: {
  value: string; onChange: (v: string) => void; editing: boolean
  className?: string; style?: React.CSSProperties; placeholder?: string
}) {
  if (!editing) return <span className={className} style={style}>{value}</span>
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      style={{
        ...style,
        background: 'transparent',
        borderBottom: '1.5px dashed #00B4D8',
        outline: 'none',
        width: '100%',
        cursor: 'text',
      }}
    />
  )
}

// ── Componente de área editável (multilinha) ───────────────────────────────────
function EditArea({
  value, onChange, editing, className, style, placeholder,
}: {
  value: string; onChange: (v: string) => void; editing: boolean
  className?: string; style?: React.CSSProperties; placeholder?: string
}) {
  if (!editing) return <span className={className} style={style}>{value}</span>
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className={className}
      style={{
        ...style,
        background: 'transparent',
        border: '1.5px dashed #00B4D8',
        borderRadius: 4,
        outline: 'none',
        width: '100%',
        resize: 'vertical',
        cursor: 'text',
        padding: '2px 4px',
        lineHeight: '1.7',
      }}
    />
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function TestPreview({
  content,
  contentItemId,
}: {
  content: unknown
  contentItemId?: string
}) {
  const rawTest = content as TestContent

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [editableTest, setEditableTest] = useState<TestContent>(() => deepClone(rawTest))
  const [isEditing, setIsEditing] = useState(false)
  const [showSchoolModal, setShowSchoolModal] = useState(false)
  const [showLauncher, setShowLauncher] = useState(false)
  const { profile, saveProfile, hasProfile } = useSchoolProfile()

  // ── Helpers de edição ────────────────────────────────────────────────────────
  const updateRoot = useCallback(<K extends keyof TestContent>(key: K, val: TestContent[K]) => {
    setEditableTest(t => ({ ...t, [key]: val }))
  }, [])

  const updateGroup = useCallback((gi: number, key: keyof TestGroup, val: unknown) => {
    setEditableTest(t => {
      const groups = deepClone(t.groups ?? [])
      ;(groups[gi] as unknown as Record<string, unknown>)[key as string] = val
      return { ...t, groups }
    })
  }, [])

  const updateQuestion = useCallback((
    gi: number, qi: number, key: keyof Question, val: unknown
  ) => {
    setEditableTest(t => {
      const groups = deepClone(t.groups ?? [])
      ;(groups[gi].questions[qi] as unknown as Record<string, unknown>)[key as string] = val
      return { ...t, groups }
    })
  }, [])

  const updateOption = useCallback((gi: number, qi: number, oi: number, val: string) => {
    setEditableTest(t => {
      const groups = deepClone(t.groups ?? [])
      const opts = [...(groups[gi].questions[qi].options ?? [])]
      opts[oi] = val
      groups[gi].questions[qi].options = opts
      return { ...t, groups }
    })
  }, [])

  // Recalcula totalPoints dos grupos a partir das questões
  const recalcPoints = useCallback((gi: number) => {
    setEditableTest(t => {
      const groups = deepClone(t.groups ?? [])
      groups[gi].totalPoints = groups[gi].questions.reduce((s, q) => s + (q.points ?? 0), 0)
      const total = groups.reduce((s, g) => s + (g.totalPoints ?? 0), 0)
      return { ...t, groups, totalPoints: total }
    })
  }, [])

  // ── Normalização para renderização ──────────────────────────────────────────
  const groups = normaliseGroups(editableTest)
  const allQuestions = groups.flatMap(g => g.questions)

  async function handleDocx() {
    await generateTestDocx(editableTest as Parameters<typeof generateTestDocx>[0])
  }
  function handlePrint() { window.print() }

  return (
    <div>
      {/* ── Modais ── */}
      {showSchoolModal && (
        <SchoolProfileModal
          current={profile}
          onSave={saveProfile}
          onClose={() => setShowSchoolModal(false)}
        />
      )}
      {showLauncher && contentItemId && (
        <ExamLauncher
          contentItemId={contentItemId}
          contentTitle={editableTest.title}
          onClose={() => setShowLauncher(false)}
        />
      )}

      {/* ── Barra de acções (ecrã apenas) ── */}
      <div className="flex flex-wrap gap-2 mb-6 no-print">
        {/* Escola */}
        <button onClick={() => setShowSchoolModal(true)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors"
          style={{
            borderColor: hasProfile ? '#C8A84B60' : '#0D1B2A25',
            color: hasProfile ? '#C8A84B' : '#6B7280',
            background: hasProfile ? '#fffbeb' : 'white',
          }}>
          🏫 {hasProfile ? 'Escola configurada' : 'Configurar escola'}
        </button>

        {/* Editar */}
        <button
          onClick={() => setIsEditing(e => !e)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={{
            background: isEditing ? '#00B4D8' : 'white',
            color: isEditing ? 'white' : '#0D1B2A',
            border: `1.5px solid ${isEditing ? '#00B4D8' : '#0D1B2A25'}`,
          }}>
          {isEditing ? '👁 Pré-visualizar' : '✏️ Editar teste'}
        </button>

        <div className="flex gap-2 ml-auto">
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#0D1B2A' }}>
            🖨️ Imprimir / PDF
          </button>
          <button onClick={handleDocx}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#0D1B2A' }}>
            📄 Word
          </button>
          {contentItemId && (
            <button
              onClick={() => setShowLauncher(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white"
              style={{ background: '#00B4D8' }}
            >
              🚀 Lançar Exame
            </button>
          )}
        </div>

        <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d60' }}>
          ⚠️ Revê sempre o conteúdo gerado por IA antes de distribuir
        </div>
      </div>

      {/* Banner de modo de edição */}
      {isEditing && (
        <div className="no-print mb-4 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
          style={{ background: '#e0f7fc', color: '#0369a1', border: '1.5px dashed #00B4D8' }}>
          ✏️ <span><strong>Modo de edição activo</strong> — clica em qualquer texto ou número para editar. Os campos editáveis têm um sublinhado azul a tracejado.</span>
        </div>
      )}

      {/* ── Documento ── */}
      <div id="test-document" className="bg-white rounded-xl shadow-sm border print-area"
        style={{ borderColor: '#0D1B2A10' }}>

        {/* CABEÇALHO ─────────────────────────────────────────────────────── */}
        <div className="px-10 pt-8 pb-6" style={{ borderBottom: '2px solid #0D1B2A' }}>

          {/* Linha topo: escola + classificação */}
          <div className="flex justify-between items-start mb-5">
            <div className="flex-1 flex items-start gap-4">
              {/* Logótipo */}
              {profile.logoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logoDataUrl}
                  alt="Logótipo da escola"
                  className="h-16 w-16 object-contain shrink-0"
                  style={{ printColorAdjust: 'exact' } as React.CSSProperties}
                />
              )}
              <div>
                {hasProfile ? (
                  <>
                    {profile.agrupamento && (
                      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#0D1B2A' }}>
                        {profile.agrupamento}
                      </p>
                    )}
                    {profile.escola && (
                      <p className="text-xs mt-0.5" style={{ color: '#374151' }}>{profile.escola}</p>
                    )}
                    {profile.concelho && (
                      <p className="text-xs" style={{ color: '#6B7280' }}>{profile.concelho}</p>
                    )}
                    <div className="h-px w-48 my-1" style={{ background: '#0D1B2A20' }} />
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                      Ano lectivo {profile.anoLetivo || '2025 / 2026'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-widest font-semibold mb-0.5" style={{ color: '#6B7280' }}>
                      Agrupamento de Escolas
                    </p>
                    <div className="h-px w-56 mb-1" style={{ background: '#0D1B2A20' }} />
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>Ano lectivo 2025 / 2026</p>
                    <p className="text-xs mt-0.5 no-print" style={{ color: '#00B4D8' }}>
                      ↑ Clica em &quot;Configurar escola&quot; para personalizar
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Classificação */}
            <div className="text-center ml-8 shrink-0">
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>CLASSIFICAÇÃO</p>
              <div className="w-24 h-16 border-2 rounded flex items-center justify-center"
                style={{ borderColor: '#0D1B2A40' }}>
                <p className="text-xs" style={{ color: '#D1D5DB' }}>___ / {editableTest.totalPoints}</p>
              </div>
            </div>
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-center mb-1"
            style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A', letterSpacing: '-0.01em' }}>
            <EditField
              value={editableTest.title}
              onChange={v => updateRoot('title', v)}
              editing={isEditing}
              style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: '#0D1B2A', textAlign: 'center' }}
            />
          </h1>
          <p className="text-center text-sm mb-5" style={{ color: '#374151' }}>
            {editableTest.subject} · {editableTest.yearLevel}.º ano
            {editableTest.duration ? ` · Duração: ${editableTest.duration} minutos` : ''}
            {' · '} Cotação total:{' '}
            {isEditing ? (
              <input
                type="number" min={0} max={999}
                value={editableTest.totalPoints}
                onChange={e => updateRoot('totalPoints', Number(e.target.value))}
                style={{ width: 48, borderBottom: '1.5px dashed #00B4D8', background: 'transparent', outline: 'none', textAlign: 'center' }}
              />
            ) : editableTest.totalPoints} pontos
            {' · '} {DIFFICULTY_LABEL[editableTest.difficulty] ?? editableTest.difficulty}
          </p>

          {/* Dados do aluno */}
          <div className="grid grid-cols-12 gap-x-4 gap-y-3">
            {[
              { label: 'Nome completo do aluno', cols: 'col-span-7' },
              { label: 'N.º', cols: 'col-span-2' },
              { label: 'Turma', cols: 'col-span-3' },
              { label: 'Data', cols: 'col-span-3' },
              { label: 'Professor(a)', cols: 'col-span-5' },
              { label: 'Enc. de Educação', cols: 'col-span-4' },
            ].map(f => (
              <div key={f.label} className={f.cols}>
                <p className="text-xs mb-1 font-medium" style={{ color: '#6B7280' }}>{f.label}</p>
                <div className="h-7 border-b-2" style={{ borderColor: '#0D1B2A50' }} />
              </div>
            ))}
          </div>

          {/* Instruções */}
          {(editableTest.instructions || isEditing) && (
            <div className="mt-4 px-4 py-3 rounded-lg text-xs leading-relaxed"
              style={{ background: '#F7F3EE', color: '#374151', border: '1px solid #0D1B2A15' }}>
              <span className="font-bold" style={{ color: '#0D1B2A' }}>Instruções: </span>
              <EditArea
                value={editableTest.instructions ?? ''}
                onChange={v => updateRoot('instructions', v)}
                editing={isEditing}
                placeholder="Escreve as instruções do teste..."
                style={{ fontSize: '0.75rem', color: '#374151', display: 'inline' }}
              />
            </div>
          )}
        </div>

        {/* GRUPOS ─────────────────────────────────────────────────────────── */}
        <div className="px-10 py-6 space-y-10">
          {groups.map((group, gi) => (
            <div key={gi} className="group-block">

              {/* Cabeçalho do grupo */}
              {group.label && (
                <div className="flex items-baseline justify-between mb-4 pb-2"
                  style={{ borderBottom: '1.5px solid #0D1B2A25' }}>
                  <h2 className="text-base font-bold shrink-0"
                    style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A' }}>
                    <EditField
                      value={group.label}
                      onChange={v => updateGroup(gi, 'label', v)}
                      editing={isEditing}
                      style={{ fontFamily: 'Georgia, serif', fontWeight: 700, color: '#0D1B2A' }}
                    />
                  </h2>
                  {group.description && (
                    <p className="text-xs ml-4 flex-1" style={{ color: '#6B7280' }}>
                      <EditField
                        value={group.description}
                        onChange={v => updateGroup(gi, 'description', v)}
                        editing={isEditing}
                        style={{ color: '#6B7280', fontSize: '0.75rem' }}
                      />
                    </p>
                  )}
                  {group.totalPoints != null && (
                    <span className="text-xs font-bold ml-4 shrink-0" style={{ color: '#0D1B2A' }}>
                      {group.totalPoints} pontos
                    </span>
                  )}
                </div>
              )}

              {/* Questões */}
              <div className="space-y-7">
                {group.questions.map((q, qi) => (
                  <QuestionBlock
                    key={qi}
                    q={q}
                    globalIndex={allQuestions.indexOf(q) + 1}
                    editing={isEditing}
                    onChangeText={v => updateQuestion(gi, qi, 'text', v)}
                    onChangeAnswer={v => updateQuestion(gi, qi, 'correctAnswer', v)}
                    onChangePoints={v => {
                      updateQuestion(gi, qi, 'points', v)
                      recalcPoints(gi)
                    }}
                    onChangeMarkScheme={v => updateQuestion(gi, qi, 'markScheme', v)}
                    onChangeOption={(oi, v) => updateOption(gi, qi, oi, v)}
                    onChangeCalculator={(v: boolean) => updateQuestion(gi, qi, 'allowCalculator' as keyof Question, v)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* RODAPÉ ─────────────────────────────────────────────────────────── */}
        <div className="px-10 py-4 flex justify-between items-center text-xs"
          style={{ borderTop: '1px solid #0D1B2A15', color: '#9CA3AF' }}>
          <span>PROF.IA · Gerado por IA — rever antes de distribuir</span>
          <span>{allQuestions.length} questões · {editableTest.totalPoints} pontos</span>
        </div>
      </div>

      {/* Estilos de impressão */}
      <style jsx global>{`
        @media print {
          body > * { display: none !important; }
          #test-document { display: block !important; }
          #test-document {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          .group-block { page-break-inside: avoid; }
          .question-block { page-break-inside: avoid; }
          @page { margin: 2.2cm 2.5cm; size: A4; }
        }
      `}</style>
    </div>
  )
}

// ── Bloco de uma questão ──────────────────────────────────────────────────────
interface QuestionBlockProps {
  q: Question
  globalIndex: number
  editing: boolean
  onChangeText: (v: string) => void
  onChangeAnswer: (v: string) => void
  onChangePoints: (v: number) => void
  onChangeMarkScheme: (v: string) => void
  onChangeOption: (oi: number, v: string) => void
  onChangeCalculator: (v: boolean) => void
}

function QuestionBlock({
  q, globalIndex, editing,
  onChangeText, onChangeAnswer, onChangePoints, onChangeMarkScheme, onChangeOption, onChangeCalculator,
}: QuestionBlockProps) {
  const answerLines = ANSWER_LINES[q.type] ?? 0
  const isMulti = q.type === 'multiple_choice' || q.type === 'true_false'

  return (
    <div className="question-block">
      <div className="flex gap-3">
        {/* Número da questão */}
        <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: '#0D1B2A', color: '#F7F3EE' }}>
          {globalIndex}
        </span>

        <div className="flex-1">
          {/* Cabeçalho da questão */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs px-2 py-0.5 rounded"
              style={{ background: '#0D1B2A08', color: '#6B7280' }}>
              {TYPE_LABEL[q.type] ?? q.type}
            </span>
            {q.bloomLevel && (
              <span className="text-xs px-2 py-0.5 rounded no-print"
                style={{ background: '#00B4D815', color: '#0369a1' }}>
                {q.bloomLevel}
              </span>
            )}
            {/* Calculadora — badge ou toggle */}
            {editing ? (
              <label className="no-print flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer border transition-colors"
                style={{
                  borderColor: q.allowCalculator ? '#00B4D8' : '#0D1B2A20',
                  background: q.allowCalculator ? '#e0f7fc' : 'transparent',
                  color: q.allowCalculator ? '#0369a1' : '#9CA3AF',
                }}>
                <input
                  type="checkbox"
                  checked={q.allowCalculator ?? false}
                  onChange={e => onChangeCalculator(e.target.checked)}
                  className="w-3 h-3 accent-cyan-500"
                />
                <span className="text-xs">🧮 calculadora</span>
              </label>
            ) : q.allowCalculator ? (
              <span className="no-print text-xs px-2 py-0.5 rounded"
                style={{ background: '#e0f7fc', color: '#0369a1' }}>
                🧮 calculadora
              </span>
            ) : null}
            {/* Pontuação editável */}
            <span className="ml-auto text-xs font-bold" style={{ color: '#6B7280' }}>
              {editing ? (
                <span className="flex items-center gap-1">
                  <input
                    type="number" min={0} max={100}
                    value={q.points}
                    onChange={e => onChangePoints(Number(e.target.value))}
                    style={{
                      width: 40, textAlign: 'center',
                      borderBottom: '1.5px dashed #00B4D8',
                      background: 'transparent', outline: 'none',
                      fontSize: '0.75rem', fontWeight: 700, color: '#6B7280',
                    }}
                  />
                  <span>pt</span>
                </span>
              ) : (
                <>{q.points} {q.points === 1 ? 'ponto' : 'pontos'}</>
              )}
            </span>
          </div>

          {/* Enunciado */}
          <div className="text-sm leading-relaxed font-medium mb-2" style={{ color: '#0D1B2A', lineHeight: '1.7' }}>
            <EditArea
              value={q.text}
              onChange={onChangeText}
              editing={editing}
              style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0D1B2A', lineHeight: '1.7' }}
            />
          </div>

          {/* Figura matemática */}
          {!!q.figure && <MathFigure figure={q.figure} />}

          {/* Opções (escolha múltipla) */}
          {isMulti && q.options && q.options.length > 0 && (
            <div className="mt-3 space-y-2.5">
              {q.options.map((opt, j) => {
                const letter = opt.trim().charAt(0)
                const isCorrect = letter === q.correctAnswer || opt === q.correctAnswer
                return (
                  <label key={j} className="flex items-start gap-3 cursor-pointer">
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: '#0D1B2A30' }} />
                    <span className="text-sm flex-1" style={{ color: '#374151' }}>
                      {editing ? (
                        <input
                          type="text" value={opt}
                          onChange={e => onChangeOption(j, e.target.value)}
                          style={{
                            width: '100%', background: 'transparent', outline: 'none',
                            borderBottom: '1.5px dashed #00B4D8',
                            fontSize: '0.875rem', color: '#374151',
                          }}
                        />
                      ) : opt}
                    </span>
                    {isCorrect && !editing && (
                      <span className="ml-auto text-xs font-semibold no-print shrink-0"
                        style={{ color: '#059669' }}>✓ correcta</span>
                    )}
                  </label>
                )
              })}
            </div>
          )}

          {/* Resposta correcta editável (escolha múltipla, no modo edição) */}
          {isMulti && editing && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: '#059669' }}>Resposta correcta:</span>
              <input
                type="text" value={q.correctAnswer}
                onChange={e => onChangeAnswer(e.target.value)}
                style={{
                  width: 40, textAlign: 'center',
                  borderBottom: '1.5px dashed #00B4D8',
                  background: 'transparent', outline: 'none',
                  fontSize: '0.75rem', fontWeight: 700, color: '#059669',
                }}
              />
              <span className="text-xs" style={{ color: '#9CA3AF' }}>(ex: A, B, C ou D)</span>
            </div>
          )}

          {/* Linhas de resposta */}
          {!isMulti && answerLines > 0 && (
            <div className="mt-4 space-y-4">
              {Array.from({ length: answerLines }).map((_, j) => (
                <div key={j} className="h-px" style={{ background: '#0D1B2A20' }} />
              ))}
            </div>
          )}

          {/* Corrigenda */}
          <div className="no-print mt-3">
            <details>
              <summary className="text-xs font-semibold cursor-pointer select-none"
                style={{ color: '#00B4D8' }}>
                Ver corrigenda
              </summary>
              <div className="mt-2 p-3 rounded-lg text-xs space-y-1.5"
                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                {!isMulti && (
                  <p>
                    <span className="font-bold" style={{ color: '#166534' }}>Resposta: </span>
                    {editing ? (
                      <input
                        type="text" value={q.correctAnswer}
                        onChange={e => onChangeAnswer(e.target.value)}
                        style={{
                          borderBottom: '1.5px dashed #00B4D8',
                          background: 'transparent', outline: 'none',
                          fontSize: '0.75rem', color: '#166534', width: '80%',
                        }}
                      />
                    ) : (
                      <span style={{ color: '#166534' }}>{q.correctAnswer}</span>
                    )}
                  </p>
                )}
                {(q.markScheme || editing) && (
                  <p>
                    <span className="font-bold" style={{ color: '#166534' }}>Critérios: </span>
                    {editing ? (
                      <textarea
                        value={q.markScheme ?? ''}
                        onChange={e => onChangeMarkScheme(e.target.value)}
                        rows={3}
                        style={{
                          width: '100%', resize: 'vertical',
                          border: '1.5px dashed #00B4D8', borderRadius: 4,
                          background: 'transparent', outline: 'none',
                          fontSize: '0.75rem', color: '#374151', padding: '2px 4px',
                        }}
                      />
                    ) : (
                      <span style={{ color: '#374151' }}>{q.markScheme}</span>
                    )}
                  </p>
                )}
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}
