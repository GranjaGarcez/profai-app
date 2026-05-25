'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Submission {
  id: string
  status: string
}

interface Session {
  id: string
  title: string
  access_code: string
  status: string
  duration_minutes: number | null
  created_at: string
  closed_at: string | null
  exam_submissions: Submission[]
}

export default function ExamSessionList({ sessions }: { sessions: Session[] }) {
  const router = useRouter()
  const [closingId, setClosingId] = useState<string | null>(null)
  const [localSessions, setLocalSessions] = useState(sessions)

  async function handleToggleStatus(session: Session) {
    const newStatus = session.status === 'active' ? 'closed' : 'active'
    setClosingId(session.id)
    try {
      const res = await fetch(`/api/exam/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setLocalSessions(prev =>
          prev.map(s => s.id === session.id ? { ...s, status: newStatus } : s)
        )
        router.refresh()
      }
    } finally {
      setClosingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {localSessions.map(session => {
        const total = session.exam_submissions?.length ?? 0
        const graded = session.exam_submissions?.filter(
          s => s.status === 'graded' || s.status === 'reviewed'
        ).length ?? 0
        const isActive = session.status === 'active'

        return (
          <div
            key={session.id}
            className="bg-white rounded-2xl border p-5 flex items-center gap-4"
            style={{ borderColor: '#0D1B2A10' }}
          >
            {/* Status dot */}
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: isActive ? '#22c55e' : '#9CA3AF' }}
              title={isActive ? 'Activo' : 'Encerrado'}
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm truncate" style={{ color: '#0D1B2A' }}>
                  {session.title}
                </h3>
                <span
                  className="text-xs px-2 py-0.5 rounded font-mono font-bold"
                  style={{
                    background: isActive ? '#dcfce7' : '#f3f4f6',
                    color: isActive ? '#166534' : '#6B7280',
                  }}
                >
                  {session.access_code}
                </span>
                {session.duration_minutes && (
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>
                    ⏱ {session.duration_minutes}min
                  </span>
                )}
              </div>
              <div className="flex gap-4 mt-1 text-xs" style={{ color: '#9CA3AF' }}>
                <span>
                  📅 {new Date(session.created_at).toLocaleDateString('pt-PT', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </span>
                <span>
                  👥 {total} {total === 1 ? 'submissão' : 'submissões'}
                  {total > 0 && ` · ${graded} corrigida${graded !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>

            {/* Acções */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/dashboard/exams/${session.id}`}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                style={{ borderColor: '#0D1B2A20', color: '#0D1B2A' }}
              >
                Ver detalhes
              </Link>
              <button
                onClick={() => handleToggleStatus(session)}
                disabled={closingId === session.id}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50"
                style={{
                  borderColor: isActive ? '#fca5a5' : '#bbf7d0',
                  color: isActive ? '#dc2626' : '#166534',
                  background: isActive ? '#fef2f2' : '#f0fdf4',
                }}
              >
                {closingId === session.id
                  ? '...'
                  : isActive
                    ? '⏹ Encerrar'
                    : '▶ Reabrir'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
