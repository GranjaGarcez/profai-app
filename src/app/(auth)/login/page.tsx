'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/dashboard` }
      })
      if (error) setError(error.message)
      else setError('Verifica o teu email para confirmar o registo.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1B2A' }}>
      <div className="w-full max-w-md p-8 rounded-2xl" style={{ background: '#F7F3EE' }}>
        
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#0D1B2A' }}>
            PROF.IA
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            A plataforma inteligente para professores
          </p>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 rounded-lg overflow-hidden border" style={{ borderColor: '#0D1B2A20' }}>
          <button
            onClick={() => setMode('login')}
            className="flex-1 py-2 text-sm font-medium transition-colors"
            style={{
              background: mode === 'login' ? '#0D1B2A' : 'transparent',
              color: mode === 'login' ? '#F7F3EE' : '#6B7280'
            }}
          >
            Entrar
          </button>
          <button
            onClick={() => setMode('register')}
            className="flex-1 py-2 text-sm font-medium transition-colors"
            style={{
              background: mode === 'register' ? '#0D1B2A' : 'transparent',
              color: mode === 'register' ? '#F7F3EE' : '#6B7280'
            }}
          >
            Registar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg border text-sm outline-none focus:ring-2"
              style={{ borderColor: '#0D1B2A30', focusRingColor: '#00B4D8' }}
              placeholder="professor@escola.pt"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0D1B2A' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: '#0D1B2A30' }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm p-3 rounded-lg" style={{ background: '#fee2e2', color: '#dc2626' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-medium text-sm transition-opacity"
            style={{ background: '#00B4D8', color: '#fff', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'A processar...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: '#6B7280' }}>
          Ao continuar, aceitas os nossos Termos de Serviço e Política de Privacidade.
        </p>
      </div>
    </div>
  )
}
