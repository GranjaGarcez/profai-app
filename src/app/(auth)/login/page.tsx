'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'info' | 'success'; text: string } | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [slowWarning, setSlowWarning] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Aviso de cold start: se a página demorou a carregar, informar o utilizador
  useEffect(() => {
    const timer = setTimeout(() => setSlowWarning(true), 8000)
    return () => clearTimeout(timer)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setMessage({ type: 'error', text: 'Email ainda não confirmado. Verifica a caixa de entrada (incluindo spam) ou pede ao administrador para activar a conta.' })
        } else if (error.message.includes('Invalid login credentials')) {
          setMessage({ type: 'error', text: 'Email ou password incorrectos.' })
        } else {
          setMessage({ type: 'error', text: error.message })
        }
      } else {
        router.push('/dashboard')
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/dashboard` }
      })
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'info', text: 'Registo enviado! Verifica o teu email para confirmar a conta. Se não receberes nada em 5 minutos, verifica o spam.' })
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1B2A' }}>
      <div className="w-full max-w-md p-8 rounded-2xl" style={{ background: '#F7F3EE' }}>

        {/* Cold start warning */}
        {slowWarning && (
          <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: '#FEF3C7', color: '#92400E' }}>
            ⏳ O servidor pode estar a iniciar (modo gratuito). Se a página não respondeu ainda, aguarda 30–60 segundos e tenta novamente.
          </div>
        )}

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
            onClick={() => { setMode('login'); setMessage(null) }}
            className="flex-1 py-2 text-sm font-medium transition-colors"
            style={{
              background: mode === 'login' ? '#0D1B2A' : 'transparent',
              color: mode === 'login' ? '#F7F3EE' : '#6B7280'
            }}
          >
            Entrar
          </button>
          <button
            onClick={() => { setMode('register'); setMessage(null) }}
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
              autoComplete="email"
              className="w-full px-4 py-2 rounded-lg border text-sm outline-none focus:ring-2"
              style={{ borderColor: '#0D1B2A30' }}
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
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full px-4 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: '#0D1B2A30' }}
              placeholder="••••••••"
            />
          </div>

          {message && (
            <p className="text-sm p-3 rounded-lg" style={{
              background: message.type === 'error' ? '#fee2e2' : message.type === 'success' ? '#dcfce7' : '#dbeafe',
              color: message.type === 'error' ? '#dc2626' : message.type === 'success' ? '#16a34a' : '#1d4ed8'
            }}>
              {message.text}
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
