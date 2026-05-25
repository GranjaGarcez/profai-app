'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/dashboard', label: 'Início', icon: '⊞' },
  { href: '/dashboard/content', label: 'Conteúdos', icon: '📄' },
  { href: '/dashboard/classes', label: 'Turmas', icon: '👥' },
  { href: '/dashboard/exams', label: 'Exames', icon: '✏️' },
  { href: '/dashboard/analytics', label: 'Resultados', icon: '📊' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex flex-col shadow-sm" style={{ background: '#0D1B2A' }}>
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: '#ffffff15' }}>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#F7F3EE' }}>
          PROF.IA
        </h1>
        <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Para professores</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(item => {
          const active = item.href === '/dashboard'
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: active ? '#00B4D820' : 'transparent',
                color: active ? '#00B4D8' : '#94A3B8',
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t" style={{ borderColor: '#ffffff15' }}>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
          style={{ color: '#94A3B8' }}
        >
          <span>⚙️</span> Definições
        </Link>
      </div>
    </aside>
  )
}
