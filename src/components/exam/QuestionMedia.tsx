'use client'

// Mostra a média de uma pergunta: a figura geométrica/gráfico (MathFigure) e/ou a
// ilustração/imagem (data URL base64 ou URL). Reutilizado nas correções do professor
// e do aluno. Não mostra nada se a pergunta não tiver imagem.
import MathFigure from '@/components/math/MathFigure'

export default function QuestionMedia({
  figure, illustration, credit,
}: {
  figure?: unknown
  illustration?: string
  credit?: string
}) {
  if ((figure == null || typeof figure !== 'object') && !illustration) return null
  return (
    <div className="space-y-2 my-2">
      {figure != null && typeof figure === 'object' && (
        <div className="rounded-xl overflow-hidden border inline-block" style={{ borderColor: '#e2e8f0', background: '#fafafa' }}>
          <MathFigure figure={figure as Record<string, unknown>} />
        </div>
      )}
      {illustration && (
        <div>
          <img src={illustration} alt="Imagem da pergunta" className="rounded-xl max-h-56 object-contain" style={{ border: '1px solid #e2e8f0' }} />
          {credit && <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{credit}</p>}
        </div>
      )}
    </div>
  )
}
