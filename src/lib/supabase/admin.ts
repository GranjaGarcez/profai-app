import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase com service role — usa APENAS em API routes server-side.
 * Nunca expor ao cliente. Permite operações sem autenticação (ex: submissão de alunos).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
