'use client'

import { useState, useCallback, useRef } from 'react'
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
  _bankId?: string   // ID no banco — presente quando a questão foi guardada/veio do banco
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

// Linhas de resposta por tipo (altura em px cada uma)
const ANSWER_LINES: Record<string, number> = {
  short_answer: 5, long_answer: 12, fill_blank: 3, true_false: 0,
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

function normaliseGroups(test: TestContent): TestGroup[] {
  if (test.groups && test.groups.length > 0) return test.groups
  if (test.questions && test.questions.length > 0) {
    return [{ label: 'Questões', description: '', questions: test.questions }]
  }
  return []
}

function deepClone<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── Painel de distribuição de cotação ─────────────────────────────────────────
const GROUP_COLORS = ['#0D1B2A', '#00B4D8', '#7c3aed', '#059669', '#C8A84B']

interface CategoryDef {
  label: string
  types: string[]
  targetLabel: string
  okFn: (pct: number) => boolean
}

function getDisciplineProfile(subject: string): CategoryDef[] {
  const s = subject.toLowerCase()

  if (s.includes('português') || s.includes('portugues') || s.includes('língua')) {
    return [
      {
        label: 'Compreensão / Gramática',
        types: ['multiple_choice', 'true_false', 'short_answer', 'fill_blank'],
        targetLabel: '~55%', okFn: p => p >= 45 && p <= 70,
      },
      {
        label: 'Expressão Escrita',
        types: ['long_answer'],
        targetLabel: '≥ 35%', okFn: p => p >= 35,
      },
    ]
  }
  if (s.includes('história') || s.includes('historia') || s.includes('geograf')) {
    return [
      {
        label: 'Seleção',
        types: ['multiple_choice', 'true_false'],
        targetLabel: '≤ 20%', okFn: p => p <= 20,
      },
      {
        label: 'Fontes / Resposta curta',
        types: ['short_answer', 'fill_blank'],
        targetLabel: '30–45%', okFn: p => p >= 25,
      },
      {
        label: 'Desenvolvimento',
        types: ['long_answer'],
        targetLabel: '≥ 35%', okFn: p => p >= 35,
      },
    ]
  }
  if (s.includes('ciência') || s.includes('ciencia') || s.includes('natural') || s.includes('biolog')) {
    return [
      {
        label: 'Seleção',
        types: ['multiple_choice', 'true_false'],
        targetLabel: '≤ 25%', okFn: p => p <= 25,
      },
      {
        label: 'Interpretação de dados',
        types: ['short_answer', 'fill_blank'],
        targetLabel: '25–35%', okFn: p => p >= 20,
      },
      {
        label: 'Situação-problema',
        types: ['long_answer'],
        targetLabel: '≥ 40%', okFn: p => p >= 40,
      },
    ]
  }
  if (s.includes('físic') || s.includes('fisic') || s.includes('quím') || s.includes('quim')) {
    return [
      {
        label: 'Seleção',
        types: ['multiple_choice', 'true_false'],
        targetLabel: '≤ 25%', okFn: p => p <= 25,
      },
      {
        label: 'Interpretação experimental',
        types: ['short_answer', 'fill_blank'],
        targetLabel: '25–35%', okFn: p => p >= 20,
      },
      {
        label: 'Resolução de problemas',
        types: ['long_answer'],
        targetLabel: '≥ 40%', okFn: p => p >= 40,
      },
    ]
  }
  return [
    {
      label: 'Seleção',
      types: ['multiple_choice', 'true_false'],
      targetLabel: '≤ 25%', okFn: p => p <= 25,
    },
    {
      label: 'Cálculo / Curta',
      types: ['short_answer', 'fill_blank'],
      targetLabel: '25–35%', okFn: p => p >= 20,
    },
    {
      label: 'Resolução',
      types: ['long_answer'],
      targetLabel: '≥ 45%', okFn: p => p >= 45,
    },
  ]
}

function ScoreBreakdown({
  groups, totalPoints, subject,
}: {
  groups: TestGroup[]; totalPoints: number; subject: string
}) {
  const allQs = groups.flatMap(g => g.questions)
  const profile = getDisciplineProfile(subject)

  const groupData = groups.map((g, i) => ({
    label: g.label,
    pts: g.questions.reduce((s, q) => s + q.points, 0),
    color: GROUP_COLORS[i % GROUP_COLORS.length],
  }))

  const pct = (n: number) => totalPoints > 0 ? Math.round((n / totalPoints) * 100) : 0

  const categories = profile.map(cat => {
    const pts = allQs.filter(q => cat.types.includes(q.type)).reduce((s, q) => s + q.points, 0)
    const p = pct(pts)
    return { ...cat, pts, p, ok: pts === 0 || cat.okFn(p) }
  })

  const bloomMap: Record<string, number> = {}
  for (const q of allQs) if (q.bloomLevel) bloomMap[q.bloomLevel] = (bloomMap[q.bloomLevel] ?? 0) + 1
  const bloomEntries = Object.entries(bloomMap).sort((a, b) => b[1] - a[1])

  const warnings = categories.filter(c => c.pts > 0 && !c.ok)
  const cols = categories.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
  const allOk = warnings.length === 0 && allQs.length > 0

  return (
    <div className="no-print mb-6 rounded-2xl overflow-hidden"
      style={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(13,27,42,0.06)' }}>

      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between"
        style={{ background: '#0D1B2A', borderBottom: '1px solid #1e3a5f' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-5 rounded-sm" style={{ background: '#00B4D8' }} />
          <h3 className="text-sm font-bold tracking-wide" style={{ color: '#F7F3EE' }}>
            Estrutura e Distribuição da Cotação
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: allOk ? '#059669' : '#d97706', color: 'white' }}>
            {allOk ? '✓ Equilibrado' : `${warnings.length} aviso${warnings.length > 1 ? 's' : ''}`}
          </span>
          <span className="text-xs" style={{ color: '#94a3b8' }}>
            {allQs.length} questões · {totalPoints} pts · {subject}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5" style={{ background: '#fafbfc' }}>

        {/* Barra de grupos */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5"
            style={{ color: '#64748b' }}>Distribuição por grupo</p>
          <div className="flex rounded-lg overflow-hidden h-8 gap-px" style={{ background: '#e2e8f0' }}>
            {groupData.map((g, i) => {
              const p = pct(g.pts)
              return p > 0 ? (
                <div key={i}
                  style={{ width: `${p}%`, background: g.color, transition: 'width 0.3s' }}
                  className="flex items-center justify-center text-xs text-white font-bold overflow-hidden relative"
                  title={`${g.label}: ${g.pts} pts (${p}%)`}>
                  {p > 8 && <span className="relative z-10">{p}%</span>}
                </div>
              ) : null
            })}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2.5">
            {groupData.map((g, i) => (
              <span key={i} className="flex items-center gap-2 text-xs" style={{ color: '#374151' }}>
                <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: g.color }} />
                <span style={{ color: '#6B7280' }}>{g.label}</span>
                <strong style={{ color: '#0D1B2A' }}>{g.pts} pts</strong>
                <span style={{ color: '#9CA3AF' }}>({pct(g.pts)}%)</span>
              </span>
            ))}
          </div>
        </div>

        {/* Categorias pedagógicas */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5"
            style={{ color: '#64748b' }}>
            Perfil pedagógico
            <span className="ml-2 normal-case font-normal" style={{ color: '#94a3b8' }}>
              boas práticas DGE · {subject}
            </span>
          </p>
          <div className={`grid ${cols} gap-2.5`}>
            {categories.map(cat => (
              <div key={cat.label}
                className="rounded-xl p-3.5"
                style={{
                  background: cat.pts === 0 ? '#f8fafc'
                    : cat.ok ? 'white' : '#fffbeb',
                  border: `1px solid ${cat.pts === 0 ? '#e2e8f0'
                    : cat.ok ? '#bbf7d0' : '#fcd34d'}`,
                  borderLeft: `3px solid ${cat.pts === 0 ? '#e2e8f0'
                    : cat.ok ? '#059669' : '#d97706'}`,
                }}>
                <p className="text-xs font-medium mb-2 leading-snug" style={{ color: '#6B7280' }}>
                  {cat.label}
                </p>
                <p className="text-2xl font-black leading-none mb-1"
                  style={{ color: cat.pts === 0 ? '#d1d5db' : cat.ok ? '#0D1B2A' : '#92400e', fontVariantNumeric: 'tabular-nums' }}>
                  {cat.p}%
                </p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  {cat.pts} pts · alvo {cat.targetLabel}
                </p>
                {cat.pts > 0 && (
                  <p className="text-xs font-semibold mt-1.5"
                    style={{ color: cat.ok ? '#059669' : '#b45309' }}>
                    {cat.ok ? '✓ no intervalo' : '⚠ fora do intervalo'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bloom */}
        {bloomEntries.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2.5"
              style={{ color: '#64748b' }}>Taxonomia de Bloom</p>
            <div className="flex flex-wrap gap-2">
              {bloomEntries.map(([level, count]) => (
                <span key={level}
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ background: '#e0f7fc', color: '#0369a1', border: '1px solid #bae6fd' }}>
                  {level}
                  <span className="ml-1.5 opacity-70">
                    {count} {count === 1 ? 'q.' : 'q.'}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Avisos */}
        {warnings.length > 0 && (
          <div className="px-4 py-3 rounded-xl"
            style={{ background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e' }}>
            <p className="text-xs font-bold mb-1.5 flex items-center gap-1.5">
              <span>⚠</span> Recomendações de ajuste
            </p>
            {warnings.map(w => (
              <p key={w.label} className="text-xs">
                {w.label}: {w.p}% — alvo {w.targetLabel}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Campo editável ────────────────────────────────────────────────────────────
function EditField({
  value, onChange, editing, className, style, placeholder,
}: {
  value: string; onChange: (v: string) => void; editing: boolean
  className?: string; style?: React.CSSProperties; placeholder?: string
}) {
  if (!editing) return <span className={className} style={style}>{value}</span>
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} className={className}
      style={{ ...style, background: 'transparent', borderBottom: '1.5px dashed #00B4D8', outline: 'none', width: '100%', cursor: 'text' }}
    />
  )
}

// ── Área editável ─────────────────────────────────────────────────────────────
function EditArea({
  value, onChange, editing, className, style, placeholder,
}: {
  value: string; onChange: (v: string) => void; editing: boolean
  className?: string; style?: React.CSSProperties; placeholder?: string
}) {
  if (!editing) return <span className={className} style={style}>{value}</span>
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={3} className={className}
      style={{ ...style, background: 'transparent', border: '1.5px dashed #00B4D8', borderRadius: 4, outline: 'none', width: '100%', resize: 'vertical', cursor: 'text', padding: '2px 4px', lineHeight: '1.7' }}
    />
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function TestPreview({
  content, contentItemId,
}: {
  content: unknown
  contentItemId?: string
}) {
  const rawTest = content as TestContent
  const [editableTest, setEditableTest] = useState<TestContent>(() => deepClone(rawTest))
  const [isEditing, setIsEditing] = useState(false)
  const [showSchoolModal, setShowSchoolModal] = useState(false)
  const [showLauncher, setShowLauncher] = useState(false)
  const { profile, saveProfile, hasProfile } = useSchoolProfile()

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
  const updateQuestion = useCallback((gi: number, qi: number, key: keyof Question, val: unknown) => {
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
  const recalcPoints = useCallback((gi: number) => {
    setEditableTest(t => {
      const groups = deepClone(t.groups ?? [])
      groups[gi].totalPoints = groups[gi].questions.reduce((s, q) => s + (q.points ?? 0), 0)
      const total = groups.reduce((s, g) => s + (g.totalPoints ?? 0), 0)
      return { ...t, groups, totalPoints: total }
    })
  }, [])

  const groups = normaliseGroups(editableTest)
  const allQuestions = groups.flatMap(g => g.questions)

  async function handleDocx() {
    await generateTestDocx(editableTest as Parameters<typeof generateTestDocx>[0])
  }

  return (
    <div>
      {showSchoolModal && (
        <SchoolProfileModal current={profile} onSave={saveProfile} onClose={() => setShowSchoolModal(false)} />
      )}
      {showLauncher && contentItemId && (
        <ExamLauncher contentItemId={contentItemId} contentTitle={editableTest.title} onClose={() => setShowLauncher(false)} />
      )}

      {/* ── Barra de acções ────────────────────────────────────────────────── */}
      <div className="no-print mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Escola */}
          <button onClick={() => setShowSchoolModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all"
            style={{
              borderColor: hasProfile ? '#C8A84B50' : '#e2e8f0',
              color: hasProfile ? '#92740a' : '#6B7280',
              background: hasProfile ? '#fefce8' : 'white',
            }}>
            <span style={{ fontSize: 15 }}>🏫</span>
            {hasProfile ? 'Escola configurada' : 'Configurar escola'}
          </button>

          {/* Editar */}
          <button onClick={() => setIsEditing(e => !e)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-all"
            style={{
              background: isEditing ? '#0D1B2A' : 'white',
              color: isEditing ? '#F7F3EE' : '#0D1B2A',
              borderColor: isEditing ? '#0D1B2A' : '#e2e8f0',
            }}>
            <span style={{ fontSize: 14 }}>{isEditing ? '👁' : '✏️'}</span>
            {isEditing ? 'Pré-visualizar' : 'Editar teste'}
          </button>

          {/* Acções principais — à direita */}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 14 }}>🖨️</span> Imprimir
            </button>
            <button onClick={handleDocx}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 14 }}>📄</span> Word
            </button>
            {contentItemId && (
              <button onClick={() => setShowLauncher(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #00B4D8, #0096b7)', boxShadow: '0 2px 8px rgba(0,180,216,0.35)' }}>
                <span style={{ fontSize: 14 }}>🚀</span> Lançar Exame
              </button>
            )}
          </div>
        </div>

        {/* Avisos */}
        {isEditing && (
          <div className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
            ✏️ <span><strong>Modo de edição</strong> — clica em qualquer texto ou número para editar.</span>
          </div>
        )}
        <div className="px-4 py-2 rounded-lg text-xs flex items-center gap-2"
          style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
          ⚠️ Revê sempre o conteúdo gerado por IA antes de distribuir aos alunos
        </div>
      </div>

      {/* ── Painel de distribuição ── */}
      <ScoreBreakdown groups={groups} totalPoints={editableTest.totalPoints} subject={editableTest.subject} />

      {/* ── Documento ──────────────────────────────────────────────────────── */}
      <div id="test-document" className="bg-white rounded-2xl overflow-hidden print-area"
        style={{ border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(13,27,42,0.08)' }}>

        {/* Banda de cor topo */}
        <div style={{ height: 5, background: 'linear-gradient(90deg, #0D1B2A 0%, #0D1B2A 65%, #00B4D8 100%)' }} />

        {/* CABEÇALHO ─────────────────────────────────────────────────────── */}
        <div className="px-10 pt-7 pb-5" style={{ borderBottom: '2px solid #0D1B2A' }}>

          {/* Linha topo: escola + classificação */}
          <div className="flex justify-between items-start mb-5">
            <div className="flex-1 flex items-start gap-4">
              {profile.logoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.logoDataUrl} alt="Logótipo"
                  className="h-16 w-16 object-contain shrink-0"
                  style={{ printColorAdjust: 'exact' } as React.CSSProperties} />
              )}
              <div>
                {hasProfile ? (
                  <>
                    {profile.agrupamento && (
                      <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#0D1B2A', letterSpacing: '0.1em' }}>
                        {profile.agrupamento}
                      </p>
                    )}
                    {profile.escola && (
                      <p className="text-xs mt-0.5 font-medium" style={{ color: '#374151' }}>{profile.escola}</p>
                    )}
                    {profile.concelho && (
                      <p className="text-xs" style={{ color: '#6B7280' }}>{profile.concelho}</p>
                    )}
                    <div className="h-px w-40 my-1.5" style={{ background: '#0D1B2A25' }} />
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                      Ano lectivo {profile.anoLetivo || '2025 / 2026'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-widest font-black mb-0.5" style={{ color: '#9CA3AF', letterSpacing: '0.1em' }}>
                      Agrupamento de Escolas
                    </p>
                    <div className="h-px w-56 mb-1.5" style={{ background: '#0D1B2A15' }} />
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>Ano lectivo 2025 / 2026</p>
                    <p className="text-xs mt-0.5 no-print" style={{ color: '#00B4D8' }}>
                      ↑ Clica em &quot;Configurar escola&quot; para personalizar
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Classificação */}
            <div className="shrink-0 ml-8">
              <div className="border-2 rounded-xl overflow-hidden" style={{ borderColor: '#0D1B2A', width: 110 }}>
                <div className="py-1 text-center" style={{ background: '#0D1B2A' }}>
                  <p className="text-xs font-bold tracking-widest text-white" style={{ fontSize: 9, letterSpacing: '0.12em' }}>
                    CLASSIFICAÇÃO
                  </p>
                </div>
                <div className="py-5 text-center" style={{ background: 'white' }}>
                  <p className="text-xs font-medium" style={{ color: '#0D1B2A' }}>
                    _____ / <strong>{editableTest.totalPoints}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Título do teste */}
          <h1 className="text-center mb-1"
            style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A', fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            <EditField
              value={editableTest.title}
              onChange={v => updateRoot('title', v)}
              editing={isEditing}
              style={{ fontFamily: 'Georgia, serif', fontSize: '1.45rem', fontWeight: 800, color: '#0D1B2A', textAlign: 'center' }}
            />
          </h1>
          <p className="text-center text-sm mb-5" style={{ color: '#6B7280' }}>
            {editableTest.subject} · {editableTest.yearLevel}.º ano
            {editableTest.duration ? ` · ${editableTest.duration} min` : ''}
            {' · '}{DIFFICULTY_LABEL[editableTest.difficulty] ?? editableTest.difficulty}
            {' · '}
            {isEditing ? (
              <>
                <input type="number" min={0} max={999} value={editableTest.totalPoints}
                  onChange={e => updateRoot('totalPoints', Number(e.target.value))}
                  style={{ width: 48, borderBottom: '1.5px dashed #00B4D8', background: 'transparent', outline: 'none', textAlign: 'center' }}
                /> pontos
              </>
            ) : `${editableTest.totalPoints} pontos`}
          </p>

          {/* Dados do aluno */}
          <div className="grid grid-cols-12 gap-x-5 gap-y-4">
            {[
              { label: 'Nome completo do aluno', cols: 'col-span-7' },
              { label: 'N.º', cols: 'col-span-2' },
              { label: 'Turma', cols: 'col-span-3' },
              { label: 'Data', cols: 'col-span-3' },
              { label: 'Professor(a)', cols: 'col-span-5' },
              { label: 'Enc. de Educação', cols: 'col-span-4' },
            ].map(f => (
              <div key={f.label} className={f.cols}>
                <p className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#9CA3AF', fontSize: '9px', letterSpacing: '0.08em' }}>
                  {f.label}
                </p>
                <div className="h-7 border-b-2" style={{ borderColor: '#0D1B2A60' }} />
              </div>
            ))}
          </div>

          {/* Instruções */}
          {(editableTest.instructions || isEditing) && (
            <div className="mt-5 px-4 py-3 rounded-xl text-xs leading-relaxed"
              style={{ background: '#F7F3EE', color: '#374151', border: '1px solid #0D1B2A12' }}>
              <span className="font-bold uppercase tracking-wide" style={{ color: '#0D1B2A', fontSize: 10, letterSpacing: '0.08em' }}>
                Instruções:{' '}
              </span>
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
        <div className="px-10 py-7 space-y-10">
          {groups.map((group, gi) => (
            <div key={gi} className="group-block">

              {/* Cabeçalho do grupo */}
              {group.label && (
                <div className="mb-6">
                  <div className="flex items-baseline justify-between py-2.5"
                    style={{ borderTop: '2px solid #0D1B2A', borderBottom: '1px solid #0D1B2A20' }}>
                    <div className="flex items-baseline gap-3">
                      {/* Dot decorativo colorido */}
                      <span className="no-print inline-block w-2 h-2 rounded-full shrink-0 translate-y-[-1px]"
                        style={{ background: GROUP_COLORS[gi % GROUP_COLORS.length] }} />
                      <h2 className="font-black" style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A', fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                        <EditField
                          value={group.label}
                          onChange={v => updateGroup(gi, 'label', v)}
                          editing={isEditing}
                          style={{ fontFamily: 'Georgia, serif', fontWeight: 900, color: '#0D1B2A', fontSize: '0.95rem' }}
                        />
                      </h2>
                      {group.description && (
                        <p className="text-xs italic ml-1" style={{ color: '#6B7280' }}>
                          <EditField
                            value={group.description}
                            onChange={v => updateGroup(gi, 'description', v)}
                            editing={isEditing}
                            style={{ color: '#6B7280', fontSize: '0.75rem' }}
                          />
                        </p>
                      )}
                    </div>
                    {group.totalPoints != null && (
                      <span className="text-sm font-black ml-4 shrink-0 tabular-nums" style={{ color: '#0D1B2A' }}>
                        {group.totalPoints} pontos
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Questões */}
              <div className="space-y-8">
                {group.questions.map((q, qi) => (
                  <QuestionBlock
                    key={qi}
                    q={q}
                    globalIndex={allQuestions.indexOf(q) + 1}
                    editing={isEditing}
                    onChangeText={v => updateQuestion(gi, qi, 'text', v)}
                    onChangeAnswer={v => updateQuestion(gi, qi, 'correctAnswer', v)}
                    onChangePoints={v => { updateQuestion(gi, qi, 'points', v); recalcPoints(gi) }}
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
        <div className="px-10 py-3 flex justify-between items-center"
          style={{ borderTop: '1px solid #0D1B2A10', background: '#fafbfc' }}>
          <span className="text-xs" style={{ color: '#C8A84B', fontWeight: 600, letterSpacing: '0.02em' }}>
            PROF.IA
          </span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>
            Gerado por IA — rever antes de distribuir · {allQuestions.length} questões · {editableTest.totalPoints} pontos
          </span>
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
          }
          .no-print { display: none !important; }
          .group-block { page-break-inside: avoid; }
          .question-block { page-break-inside: avoid; }
          @page { margin: 2cm 2.5cm; size: A4 portrait; }
        }
      `}</style>
    </div>
  )
}

// ── Botões de feedback 👍/👎 ─────────────────────────────────────────────────
function FeedbackButtons({ questionId }: { questionId: string }) {
  const [vote, setVote] = useState<1 | -1 | null>(null)
  const [loading, setLoading] = useState(false)
  const sentRef = useRef(false)

  async function handleVote(v: 1 | -1) {
    if (loading || sentRef.current) return
    setLoading(true)
    try {
      const res = await fetch('/api/questions/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, vote: v }),
      })
      if (res.ok) {
        setVote(v)
        sentRef.current = true  // só um voto por sessão de visualização
      }
    } catch {
      // silencioso — não interrompe o professor
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className="no-print flex items-center gap-1 ml-auto shrink-0">
      {vote !== null ? (
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: vote === 1 ? '#dcfce7' : '#fee2e2', color: vote === 1 ? '#166534' : '#991b1b' }}>
          {vote === 1 ? '👍 Obrigado!' : '👎 Anotado'}
        </span>
      ) : (
        <>
          <button
            onClick={() => handleVote(1)}
            disabled={loading}
            title="Questão de qualidade"
            className="text-sm px-1.5 py-0.5 rounded-md transition-all"
            style={{ background: 'transparent', color: '#6B7280', border: '1px solid transparent',
              cursor: loading ? 'wait' : 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#dcfce7'; (e.currentTarget as HTMLButtonElement).style.color = '#166534' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280' }}>
            👍
          </button>
          <button
            onClick={() => handleVote(-1)}
            disabled={loading}
            title="Questão com problemas"
            className="text-sm px-1.5 py-0.5 rounded-md transition-all"
            style={{ background: 'transparent', color: '#6B7280', border: '1px solid transparent',
              cursor: loading ? 'wait' : 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2'; (e.currentTarget as HTMLButtonElement).style.color = '#991b1b' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280' }}>
            👎
          </button>
        </>
      )}
    </span>
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
      <div className="flex gap-4">

        {/* Número da questão */}
        <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black mt-0.5"
          style={{ background: '#0D1B2A', color: '#F7F3EE', letterSpacing: '-0.02em', boxShadow: '0 1px 3px rgba(13,27,42,0.25)' }}>
          {globalIndex}
        </span>

        <div className="flex-1">
          {/* Cabeçalho da questão */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-md font-medium"
              style={{ background: '#f1f5f9', color: '#64748b' }}>
              {TYPE_LABEL[q.type] ?? q.type}
            </span>
            {q.bloomLevel && (
              <span className="text-xs px-2 py-0.5 rounded-md no-print"
                style={{ background: '#e0f7fc', color: '#0369a1' }}>
                {q.bloomLevel}
              </span>
            )}
            {/* Calculadora */}
            {editing ? (
              <label className="no-print flex items-center gap-1.5 px-2 py-0.5 rounded-md cursor-pointer border"
                style={{
                  borderColor: q.allowCalculator ? '#00B4D8' : '#e2e8f0',
                  background: q.allowCalculator ? '#e0f7fc' : 'transparent',
                  color: q.allowCalculator ? '#0369a1' : '#9CA3AF',
                }}>
                <input type="checkbox" checked={q.allowCalculator ?? false}
                  onChange={e => onChangeCalculator(e.target.checked)}
                  className="w-3 h-3 accent-cyan-500" />
                <span className="text-xs">🧮 calculadora</span>
              </label>
            ) : q.allowCalculator ? (
              <span className="no-print text-xs px-2 py-0.5 rounded-md"
                style={{ background: '#e0f7fc', color: '#0369a1' }}>
                🧮 calculadora
              </span>
            ) : null}

            {/* Pontuação */}
            <span className="text-xs font-black tabular-nums" style={{ color: '#C8A84B' }}>
              {editing ? (
                <span className="flex items-center gap-1">
                  <input type="number" min={0} max={100} value={q.points}
                    onChange={e => onChangePoints(Number(e.target.value))}
                    style={{ width: 40, textAlign: 'center', borderBottom: '1.5px dashed #00B4D8', background: 'transparent', outline: 'none', fontSize: '0.75rem', fontWeight: 900, color: '#C8A84B' }}
                  />
                  <span>pt</span>
                </span>
              ) : (
                <>({q.points} {q.points === 1 ? 'ponto' : 'pontos'})</>
              )}
            </span>

            {/* Feedback 👍/👎 — só visível no ecrã, nunca impresso */}
            {q._bankId && !editing && <FeedbackButtons questionId={q._bankId} />}
          </div>

          {/* Enunciado */}
          <div className="mb-3 leading-relaxed" style={{ color: '#0D1B2A', fontSize: '0.9rem', lineHeight: '1.75', fontWeight: 500 }}>
            <EditArea
              value={q.text} onChange={onChangeText} editing={editing}
              style={{ fontSize: '0.9rem', fontWeight: 500, color: '#0D1B2A', lineHeight: '1.75' }}
            />
          </div>

          {/* Figura */}
          {!!q.figure && <MathFigure figure={q.figure} />}

          {/* ── Escolha múltipla ── */}
          {q.type === 'multiple_choice' && q.options && q.options.length > 0 && (
            <div className="mt-3 space-y-2">
              {q.options.map((opt, j) => {
                const letter = LETTERS[j] ?? String.fromCharCode(65 + j)
                // Remove prefixo de letra se existir (ex: "A. texto" → "texto")
                const optText = editing ? opt : opt.replace(/^[A-E][).]\s*/, '').trim() || opt
                const isCorrect = letter === q.correctAnswer.trim().toUpperCase() ||
                                  opt.trim().charAt(0).toUpperCase() === q.correctAnswer.trim().toUpperCase()
                return (
                  <div key={j} className="flex items-start gap-3">
                    {/* Bolha de resposta */}
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                      style={{ borderColor: '#0D1B2A50', color: '#0D1B2A' }}>
                      {letter}
                    </span>
                    <span className="text-sm flex-1" style={{ color: '#374151', lineHeight: '1.6' }}>
                      {editing ? (
                        <input type="text" value={opt} onChange={e => onChangeOption(j, e.target.value)}
                          style={{ width: '100%', background: 'transparent', outline: 'none', borderBottom: '1.5px dashed #00B4D8', fontSize: '0.875rem', color: '#374151' }}
                        />
                      ) : optText}
                    </span>
                    {isCorrect && !editing && (
                      <span className="ml-auto no-print text-xs font-bold shrink-0 mt-0.5"
                        style={{ color: '#059669' }}>✓</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Verdadeiro / Falso ── */}
          {q.type === 'true_false' && (
            <div className="mt-3 flex gap-8">
              {['Verdadeiro', 'Falso'].map(opt => {
                const val = opt.charAt(0)
                const isCorrect = val === q.correctAnswer.trim().toUpperCase() ||
                  opt.toUpperCase() === q.correctAnswer.trim().toUpperCase() ||
                  (opt === 'Verdadeiro' && ['V', 'VERDADEIRO', 'TRUE', 'T'].includes(q.correctAnswer.trim().toUpperCase())) ||
                  (opt === 'Falso' && ['F', 'FALSO', 'FALSE'].includes(q.correctAnswer.trim().toUpperCase()))
                return (
                  <div key={opt} className="flex items-center gap-2.5">
                    <span className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                      style={{ borderColor: '#0D1B2A50' }} />
                    <span className="text-sm font-medium" style={{ color: '#374151' }}>{opt}</span>
                    {isCorrect && !editing && (
                      <span className="no-print text-xs font-bold" style={{ color: '#059669' }}>✓</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Resposta correcta editável (MCQ/VF em modo edição) */}
          {isMulti && editing && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: '#059669' }}>Correcta:</span>
              <input type="text" value={q.correctAnswer} onChange={e => onChangeAnswer(e.target.value)}
                style={{ width: 40, textAlign: 'center', borderBottom: '1.5px dashed #00B4D8', background: 'transparent', outline: 'none', fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}
              />
              <span className="text-xs" style={{ color: '#9CA3AF' }}>(A, B, C, D, V ou F)</span>
            </div>
          )}

          {/* ── Linhas de resposta (questões abertas) ── */}
          {!isMulti && answerLines > 0 && (
            <div className="mt-5 space-y-0">
              {Array.from({ length: answerLines }).map((_, j) => (
                <div key={j} style={{ height: 32, borderBottom: '1px solid #0D1B2A18' }} />
              ))}
            </div>
          )}

          {/* ── Corrigenda (no-print) ── */}
          <div className="no-print mt-3">
            <details>
              <summary className="text-xs font-semibold cursor-pointer select-none inline-flex items-center gap-1"
                style={{ color: '#00B4D8', listStyle: 'none' }}>
                <span>▸</span> Ver corrigenda
              </summary>
              <div className="mt-2 p-3 rounded-xl text-xs space-y-1.5"
                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                {!isMulti && (
                  <p>
                    <span className="font-bold" style={{ color: '#166534' }}>Resposta: </span>
                    {editing ? (
                      <input type="text" value={q.correctAnswer} onChange={e => onChangeAnswer(e.target.value)}
                        style={{ borderBottom: '1.5px dashed #00B4D8', background: 'transparent', outline: 'none', fontSize: '0.75rem', color: '#166534', width: '80%' }}
                      />
                    ) : <span style={{ color: '#166534' }}>{q.correctAnswer}</span>}
                  </p>
                )}
                {(q.markScheme || editing) && (
                  <p>
                    <span className="font-bold" style={{ color: '#166534' }}>Critérios: </span>
                    {editing ? (
                      <textarea value={q.markScheme ?? ''} onChange={e => onChangeMarkScheme(e.target.value)} rows={3}
                        style={{ width: '100%', resize: 'vertical', border: '1.5px dashed #00B4D8', borderRadius: 4, background: 'transparent', outline: 'none', fontSize: '0.75rem', color: '#374151', padding: '2px 4px' }}
                      />
                    ) : <span style={{ color: '#374151' }}>{q.markScheme}</span>}
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
