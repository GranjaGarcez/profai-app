'use client'

import { useEffect, useState } from 'react'

// ── Mensagens — humor, nunca o processo técnico real (sem nomes de modelos,
//    sem "etapas"/"lotes"/"tier") ────────────────────────────────────────────
const MESSAGES = [
  'A destilar o teu {subject}...',
  'As ideias estão a borbulhar no alambique...',
  'A reduzir conhecimento a fogo brando...',
  'Mais uma gota de sabedoria a cair...',
  'A extrair a essência de {topic}...',
  'O vapor do saber sobe lentamente...',
  'A filtrar só o melhor, gota a gota...',
  'Quase no ponto — só falta repousar um pouco...',
]

interface BrewingLoaderProps {
  subject?: string   // ex: "teste", "plano de aula", "ilustração"
  topic?: string
  className?: string
}

function fillTemplate(msg: string, subject?: string, topic?: string): string {
  return msg
    .replace('{subject}', subject ?? 'conteúdo')
    .replace('{topic}', topic ?? 'tema')
}

export default function BrewingLoader({ subject = 'conteúdo', topic, className }: BrewingLoaderProps) {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length)
    }, 2600)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className={`text-center space-y-3 ${className ?? ''}`}>
      <AlembicSvg />
      <p className="text-sm font-semibold" style={{ color: '#0D1B2A', minHeight: '1.5em' }}>
        {fillTemplate(MESSAGES[msgIndex], subject, topic)}
      </p>
    </div>
  )
}

// ── Ilustração: alambique a pingar, num cenário pequeno e pitoresco ──────────
function AlembicSvg() {
  return (
    <div className="flex justify-center">
      <svg width="140" height="130" viewBox="0 0 140 130" xmlns="http://www.w3.org/2000/svg">
        <style>{`
          @keyframes brewing-drip {
            0%   { opacity: 0; transform: translateY(0); }
            15%  { opacity: 1; }
            70%  { opacity: 1; transform: translateY(26px); }
            85%  { opacity: 0; transform: translateY(30px); }
            100% { opacity: 0; transform: translateY(0); }
          }
          @keyframes brewing-steam {
            0%   { opacity: 0; transform: translateY(0) scale(1); }
            40%  { opacity: 0.6; }
            100% { opacity: 0; transform: translateY(-18px) scale(1.4); }
          }
          @keyframes brewing-bubble {
            0%, 100% { transform: translateY(0); }
            50%      { transform: translateY(-2px); }
          }
          .brew-drop  { animation: brewing-drip 1.8s ease-in infinite; }
          .brew-steam { animation: brewing-steam 2.4s ease-out infinite; }
          .brew-flask { animation: brewing-bubble 2.2s ease-in-out infinite; }
        `}</style>

        {/* Mesa */}
        <line x1="15" y1="112" x2="125" y2="112" stroke="#0D1B2A" strokeWidth="2" />
        {/* Livros pitorescos ao lado */}
        <rect x="18" y="100" width="22" height="12" rx="1" fill="#C8A84B" opacity="0.85" />
        <rect x="20" y="92" width="18" height="9" rx="1" fill="#00B4D8" opacity="0.7" />

        {/* Suporte do alambique */}
        <line x1="62" y1="112" x2="62" y2="92" stroke="#0D1B2A" strokeWidth="2" />
        <line x1="92" y1="112" x2="92" y2="92" stroke="#0D1B2A" strokeWidth="2" />
        <line x1="58" y1="92" x2="96" y2="92" stroke="#0D1B2A" strokeWidth="2.5" />

        {/* Balão do alambique (a "bolbulhar" suavemente) */}
        <g className="brew-flask">
          <circle cx="77" cy="68" r="22" fill="#EBF8FF" stroke="#0D1B2A" strokeWidth="2" />
          <path d="M77 46 V30 Q77 24 84 24 H96" fill="none" stroke="#0D1B2A" strokeWidth="2" strokeLinecap="round" />
          {/* Vapor */}
          <circle className="brew-steam" cx="96" cy="20" r="3" fill="#00B4D8" style={{ animationDelay: '0s' }} />
          <circle className="brew-steam" cx="100" cy="22" r="2.5" fill="#00B4D8" style={{ animationDelay: '0.8s' }} />
          <circle className="brew-steam" cx="92" cy="18" r="2" fill="#00B4D8" style={{ animationDelay: '1.4s' }} />
          {/* Líquido dentro do balão */}
          <path d="M58 74 Q77 84 96 74 V86 Q77 92 58 86 Z" fill="#C8A84B" opacity="0.55" />
        </g>

        {/* Gota a cair para o frasco de recolha */}
        <circle className="brew-drop" cx="62" cy="92" r="2.4" fill="#C8A84B" />

        {/* Frasco de recolha */}
        <path d="M55 112 V104 Q55 100 62 100 Q69 100 69 104 V112 Z" fill="#F7F3EE" stroke="#0D1B2A" strokeWidth="1.8" />
        <path d="M57 110 H67 V112 H57 Z" fill="#C8A84B" opacity="0.6" />
      </svg>
    </div>
  )
}
