'use client'

import { generateTestDocx } from '@/lib/export/testDocx'
import MathFigure from '@/components/math/MathFigure'

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
  questions?: Question[]   // formato antigo — compatibilidade
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

// ── Componente principal ──────────────────────────────────────────────────────
export default function TestPreview({ content }: { content: unknown }) {
  const test = content as TestContent
  const groups = normaliseGroups(test)
  const allQuestions = groups.flatMap(g => g.questions)

  async function handleDocx() { await generateTestDocx(test as Parameters<typeof generateTestDocx>[0]) }
  function handlePrint() { window.print() }

  return (
    <div>
      {/* ── Barra de acções (ecrã apenas) ── */}
      <div className="flex flex-wrap gap-3 mb-6 no-print">
        <button onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: '#0D1B2A' }}>
          🖨️ Imprimir / PDF
        </button>
        <button onClick={handleDocx}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: '#00B4D8' }}>
          📄 Download Word (.docx)
        </button>
        <div className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d60' }}>
          ⚠️ Revê sempre o conteúdo gerado por IA antes de distribuir
        </div>
      </div>

      {/* ── Documento ── */}
      <div id="test-document" className="bg-white rounded-xl shadow-sm border print-area"
        style={{ borderColor: '#0D1B2A10' }}>

        {/* CABEÇALHO ─────────────────────────────────────────────────────── */}
        <div className="px-10 pt-8 pb-6" style={{ borderBottom: '2px solid #0D1B2A' }}>

          {/* Linha topo: escola + classificação */}
          <div className="flex justify-between items-start mb-5">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest font-semibold mb-0.5" style={{ color: '#6B7280' }}>
                Agrupamento de Escolas
              </p>
              <div className="h-px w-56 mb-1" style={{ background: '#0D1B2A20' }} />
              <p className="text-xs" style={{ color: '#9CA3AF' }}>Ano lectivo 2025 / 2026</p>
            </div>
            <div className="text-center ml-8">
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>CLASSIFICAÇÃO</p>
              <div className="w-24 h-16 border-2 rounded flex items-center justify-center"
                style={{ borderColor: '#0D1B2A40' }}>
                <p className="text-xs" style={{ color: '#D1D5DB' }}>___ / {test.totalPoints}</p>
              </div>
            </div>
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-center mb-1"
            style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A', letterSpacing: '-0.01em' }}>
            {test.title}
          </h1>
          <p className="text-center text-sm mb-5" style={{ color: '#374151' }}>
            {test.subject} · {test.yearLevel}.º ano
            {test.duration ? ` · Duração: ${test.duration} minutos` : ''}
            {' · '} Cotação total: {test.totalPoints} pontos
            {' · '} {DIFFICULTY_LABEL[test.difficulty] ?? test.difficulty}
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
          {test.instructions && (
            <div className="mt-4 px-4 py-3 rounded-lg text-xs leading-relaxed"
              style={{ background: '#F7F3EE', color: '#374151', border: '1px solid #0D1B2A15' }}>
              <span className="font-bold" style={{ color: '#0D1B2A' }}>Instruções: </span>
              {test.instructions}
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
                  <h2 className="text-base font-bold" style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A' }}>
                    {group.label}
                  </h2>
                  {group.description && (
                    <p className="text-xs ml-4 flex-1" style={{ color: '#6B7280' }}>
                      {group.description}
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
                  <QuestionBlock key={qi} q={q} globalIndex={allQuestions.indexOf(q) + 1} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* RODAPÉ ─────────────────────────────────────────────────────────── */}
        <div className="px-10 py-4 flex justify-between items-center text-xs"
          style={{ borderTop: '1px solid #0D1B2A15', color: '#9CA3AF' }}>
          <span>PROF.IA · Gerado por IA — rever antes de distribuir</span>
          <span>{allQuestions.length} questões · {test.totalPoints} pontos</span>
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
function QuestionBlock({ q, globalIndex }: { q: Question; globalIndex: number }) {
  const answerLines = ANSWER_LINES[q.type] ?? 0
  const isMulti = q.type === 'multiple_choice' || q.type === 'true_false'

  // Debug — remover após confirmação
  if (typeof window !== 'undefined' && q.figure !== undefined) {
    console.log(`[PROFAI] Q${globalIndex} figure:`, q.figure)
  }

  return (
    <div className="question-block">
      {/* Enunciado */}
      <div className="flex gap-3">
        <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: '#0D1B2A', color: '#F7F3EE' }}>
          {globalIndex}
        </span>
        <div className="flex-1">
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
            <span className="ml-auto text-xs font-bold" style={{ color: '#6B7280' }}>
              {q.points} {q.points === 1 ? 'ponto' : 'pontos'}
            </span>
          </div>

          <p className="text-sm leading-relaxed font-medium" style={{ color: '#0D1B2A', lineHeight: '1.7' }}>
            {q.text}
          </p>

          {/* Figura matemática */}
          {!!q.figure && <MathFigure figure={q.figure} />}

          {/* Opções */}
          {isMulti && q.options && q.options.length > 0 && (
            <div className="mt-3 space-y-2.5">
              {q.options.map((opt, j) => {
                const letter = opt.trim().charAt(0)
                const isCorrect = letter === q.correctAnswer || opt === q.correctAnswer
                return (
                  <label key={j} className="flex items-start gap-3 cursor-pointer group/opt">
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: '#0D1B2A30' }} />
                    <span className="text-sm" style={{ color: '#374151' }}>{opt}</span>
                    {/* Resposta correcta — só no ecrã */}
                    {isCorrect && (
                      <span className="ml-auto text-xs font-semibold no-print shrink-0"
                        style={{ color: '#059669' }}>✓ correcta</span>
                    )}
                  </label>
                )
              })}
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

          {/* Corrigenda — só no ecrã */}
          <div className="no-print mt-3">
            <details>
              <summary className="text-xs font-semibold cursor-pointer select-none"
                style={{ color: '#00B4D8' }}>
                Ver corrigenda
              </summary>
              <div className="mt-2 p-3 rounded-lg text-xs space-y-1.5"
                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                {!isMulti && (
                  <p><span className="font-bold" style={{ color: '#166534' }}>Resposta: </span>
                    <span style={{ color: '#166534' }}>{q.correctAnswer}</span>
                  </p>
                )}
                {q.markScheme && (
                  <p><span className="font-bold" style={{ color: '#166534' }}>Critérios: </span>
                    <span style={{ color: '#374151' }}>{q.markScheme}</span>
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
