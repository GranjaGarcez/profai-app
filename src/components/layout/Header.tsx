'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export default function Header({ user }: { user: User }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b bg-white" style={{ borderColor: '#0D1B2A15' }}>
      <div />
      <div className="flex items-center gap-3">
        <span className="text-sm" style={{ color: '#6B7280' }}>{user.email}</span>
        <button
          onClick={handleLogout}
          className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
          style={{ borderColor: '#0D1B2A30', color: '#0D1B2A' }}
        >
          Sair
        </button>
      </div>
    </header>
  )
}
