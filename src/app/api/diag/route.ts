import { NextResponse } from 'next/server'

// Diagnóstico de env vars — sem expor valores, apenas presença
export async function GET() {
  const vars = [
    'GEMINI_API_KEY', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3',
    'GROQ_API_KEY',
    'OPENROUTER_API_KEY', 'GITHUB_API_KEY',
    'NIM_API_KEY', 'NIM_API_KEY_2',
    'SAMBANOVA_API_KEY', 'MISTRAL_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
  ]
  const result: Record<string, boolean> = {}
  for (const v of vars) result[v] = !!process.env[v]
  return NextResponse.json(result)
}
