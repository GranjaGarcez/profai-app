'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { turmaLabel as turmaLabelOf } from '@/lib/exam/turma'

interface Slip {
  id: string
  student_name: string
  student_number: string | null
  student_class: string | null
  student_year?: number | null
}

export default function ResultSlips({
  title, submissions, fallbackYear,
}: {
  title: string
  submissions: Slip[]
  fallbackYear: number | null
}) {
  const [origin, setOrigin] = useState('')
  useEffect(() => { setOrigin(window.location.origin) }, [])

  const sorted = [...submissions].sort((a, b) => {
    const ka = turmaLabelOf(a.student_year, a.student_class, fallbackYear)
    const kb = turmaLabelOf(b.student_year, b.student_class, fallbackYear)
    if (ka !== kb) return ka.localeCompare(kb, 'pt')
    return (a.student_name ?? '').localeCompare(b.student_name ?? '', 'pt')
  })

  return (
    <div>
      {/* Barra (não impressa) */}
      <div className="no-print flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold" style={{ color: '#0D1B2A' }}>Folha de resultados — {title}</h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Um talão por aluno com o QR da sua correcção. Imprime, corta e entrega como quem devolve a prova.
            Cada aluno só acede ao seu; a correcção abre depois de divulgares.
          </p>
        </div>
        <button onClick={() => window.print()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white shrink-0"
          style={{ background: '#0D1B2A' }}>
          🖨️ Imprimir
        </button>
      </div>

      {/* Grelha de talões */}
      <div className="slips-grid">
        {sorted.map(s => {
          const tl = turmaLabelOf(s.student_year, s.student_class, fallbackYear)
          const url = origin ? `${origin}/exam/resultado/${s.id}` : ''
          return (
            <div key={s.id} className="slip">
              <div className="slip-info">
                <p className="slip-name">{s.student_name}</p>
                <p className="slip-meta">{tl}{s.student_number ? ` · N.º ${s.student_number}` : ''}</p>
                <p className="slip-hint">Aponta a câmara do telemóvel ao QR para veres a tua correcção.</p>
              </div>
              <div className="slip-qr">
                {url && <QRCodeSVG value={url} size={96} level="M" marginSize={0} />}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        .slips-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .slip {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          border: 1px dashed #94a3b8; border-radius: 10px; padding: 12px 14px;
          page-break-inside: avoid; break-inside: avoid; background: #fff;
        }
        .slip-info { min-width: 0; }
        .slip-name { font-weight: 700; color: #0D1B2A; font-size: 14px; }
        .slip-meta { color: #475569; font-size: 12px; margin-top: 2px; }
        .slip-hint { color: #94a3b8; font-size: 10px; margin-top: 6px; max-width: 190px; line-height: 1.3; }
        .slip-qr { flex-shrink: 0; }
        @media print {
          .no-print { display: none !important; }
          .slips-grid { gap: 8px; }
          .slip { border-color: #94a3b8; }
          @page { margin: 12mm; }
        }
      `}</style>
    </div>
  )
}
