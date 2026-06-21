'use client'

import MathFigure from '@/components/math/MathFigure'

interface ExternalTool {
  tool: string
  mode: 'conteudo_pronto' | 'prompt_pesquisa' | 'conceito'
  content: string
}

interface Phase {
  name: string
  duration: number
  objective?: string
  teacherScript?: string
  guidingQuestions?: string[]
  expectedAnswers?: string[]
  studentActivity?: string
  transition?: string
  externalTool?: ExternalTool | null
}

interface LessonPlanContent {
  title: string
  subject: string
  yearLevel: number
  duration: number
  methodology?: string
  objectives: string[]
  materials: string[]
  phases: Phase[]
  differentiation: string
  formativeAssessment?: string
  homework?: string | null
  mindMap?: { type: string; topic: string; branches: Array<{ label: string; children?: string[] }> } | null
}

const TOOL_MODE_LABEL: Record<string, string> = {
  conteudo_pronto: '📋 Conteúdo pronto a colar',
  prompt_pesquisa: '🔎 Prompt / termo a pesquisar',
  conceito: '💡 Conceito a desenvolver',
}

export default function LessonPlanPreview({ content }: { content: unknown }) {
  const plan = content as LessonPlanContent

  return (
    <div>
      <div className="no-print mb-5 flex justify-end">
        <button onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 14 }}>🖨️</span> Imprimir
        </button>
      </div>

      <div id="lesson-plan-document" className="bg-white rounded-2xl overflow-hidden print-area"
        style={{ border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(13,27,42,0.08)' }}>
        <div style={{ height: 5, background: 'linear-gradient(90deg, #C8A84B 0%, #C8A84B 65%, #00B4D8 100%)' }} />

        <div className="px-10 pt-7 pb-5" style={{ borderBottom: '2px solid #0D1B2A' }}>
          <h1 className="text-center mb-1"
            style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A', fontSize: '1.45rem', fontWeight: 800 }}>
            {plan.title}
          </h1>
          <p className="text-center text-sm" style={{ color: '#6B7280' }}>
            {plan.subject} · {plan.yearLevel}.º ano · {plan.duration} min
            {plan.methodology ? ` · ${plan.methodology}` : ''}
          </p>
        </div>

        <div className="px-10 py-7 space-y-8">

          {plan.objectives?.length > 0 && (
            <section>
              <h2 className="font-black mb-2.5" style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A', fontSize: '0.95rem' }}>
                Objectivos
              </h2>
              <ul className="space-y-1">
                {plan.objectives.map((o, i) => (
                  <li key={i} className="text-sm" style={{ color: '#374151' }}>• {o}</li>
                ))}
              </ul>
            </section>
          )}

          {plan.materials?.length > 0 && (
            <section>
              <h2 className="font-black mb-2.5" style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A', fontSize: '0.95rem' }}>
                Materiais
              </h2>
              <p className="text-sm" style={{ color: '#374151' }}>{plan.materials.join(' · ')}</p>
            </section>
          )}

          <section className="space-y-5">
            <h2 className="font-black" style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A', fontSize: '0.95rem' }}>
              Guião da aula
            </h2>
            {plan.phases?.map((p, i) => (
              <div key={i} className="question-block pl-4" style={{ borderLeft: '3px solid #C8A84B' }}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <h3 className="font-bold text-sm" style={{ color: '#0D1B2A' }}>{p.name}</h3>
                  <span className="text-xs font-mono" style={{ color: '#9CA3AF' }}>{p.duration} min</span>
                </div>
                {p.objective && (
                  <p className="text-xs italic mb-2" style={{ color: '#6B7280' }}>{p.objective}</p>
                )}
                {p.teacherScript && (
                  <p className="text-sm mb-2 leading-relaxed" style={{ color: '#0D1B2A' }}>
                    <strong style={{ color: '#6B7280', fontSize: '0.75rem' }}>PROFESSOR: </strong>
                    &ldquo;{p.teacherScript}&rdquo;
                  </p>
                )}
                {!!p.guidingQuestions?.length && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>Perguntas orientadoras:</p>
                    <ul>
                      {p.guidingQuestions.map((q, j) => (
                        <li key={j} className="text-sm" style={{ color: '#374151' }}>— {q}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {!!p.expectedAnswers?.length && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>Respostas esperadas:</p>
                    <ul>
                      {p.expectedAnswers.map((a, j) => (
                        <li key={j} className="text-sm" style={{ color: '#059669' }}>— {a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {p.studentActivity && (
                  <p className="text-sm mb-2" style={{ color: '#374151' }}>
                    <strong style={{ color: '#6B7280', fontSize: '0.75rem' }}>ALUNOS: </strong>{p.studentActivity}
                  </p>
                )}
                {p.externalTool && (
                  <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                    <p className="font-semibold mb-1" style={{ color: '#0369a1' }}>
                      {p.externalTool.tool} — {TOOL_MODE_LABEL[p.externalTool.mode]}
                    </p>
                    <p style={{ color: '#374151', whiteSpace: 'pre-wrap' }}>{p.externalTool.content}</p>
                  </div>
                )}
                {p.transition && (
                  <p className="text-xs italic mt-2" style={{ color: '#9CA3AF' }}>→ {p.transition}</p>
                )}
              </div>
            ))}
          </section>

          {plan.differentiation && (
            <section>
              <h2 className="font-black mb-2" style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A', fontSize: '0.95rem' }}>
                Diferenciação pedagógica
              </h2>
              <p className="text-sm" style={{ color: '#374151' }}>{plan.differentiation}</p>
            </section>
          )}

          {plan.formativeAssessment && (
            <section>
              <h2 className="font-black mb-2" style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A', fontSize: '0.95rem' }}>
                Avaliação formativa
              </h2>
              <p className="text-sm" style={{ color: '#374151' }}>{plan.formativeAssessment}</p>
            </section>
          )}

          {plan.homework && (
            <section>
              <h2 className="font-black mb-2" style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A', fontSize: '0.95rem' }}>
                Trabalho de casa
              </h2>
              <p className="text-sm" style={{ color: '#374151' }}>{plan.homework}</p>
            </section>
          )}

          {plan.mindMap && (
            <section>
              <h2 className="font-black mb-2" style={{ fontFamily: 'Georgia, serif', color: '#0D1B2A', fontSize: '0.95rem' }}>
                Mapa mental
              </h2>
              <MathFigure figure={plan.mindMap} />
            </section>
          )}
        </div>

        <div className="px-10 py-3 flex justify-between items-center"
          style={{ borderTop: '1px solid #0D1B2A10', background: '#fafbfc' }}>
          <span className="text-xs" style={{ color: '#C8A84B', fontWeight: 600 }}>PROF.IA</span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>Gerado por IA — rever antes de usar</span>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          /* Ver nota equivalente em TestPreview.tsx — Sidebar/Header escondidos
             directamente (classe no-print neles), não via body > * + override. */
          #lesson-plan-document { border: none !important; border-radius: 0 !important; box-shadow: none !important; }
          .no-print { display: none !important; }
          .question-block { page-break-inside: avoid; }
          @page { margin: 2cm 2.5cm; size: A4 portrait; }
        }
      `}</style>
    </div>
  )
}
