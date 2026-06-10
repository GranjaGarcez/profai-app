import { NextResponse } from 'next/server'

export async function GET() {
  const vars = [
    'GEMINI_API_KEY', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3',
    'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'GITHUB_API_KEY',
    'NIM_API_KEY', 'NIM_API_KEY_2', 'SAMBANOVA_API_KEY', 'MISTRAL_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
  ]
  const envStatus: Record<string, boolean> = {}
  for (const v of vars) envStatus[v] = !!process.env[v]

  // Teste de conectividade: Gemini key 1 com prompt mínimo
  let geminiStatus = 'unknown'
  let groqStatus = 'unknown'

  try {
    const ctrl = new AbortController()
    setTimeout(() => ctrl.abort(), 8000)
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gemini-2.5-flash', messages: [{ role: 'user', content: 'Gera uma pergunta de matemática para o 5.º ano sobre frações. Responde em JSON: {"text":"...","answer":"..."}' }], max_tokens: 4096 }),
      signal: ctrl.signal,
    })
    const t0g = Date.now()
    const bodyG = await r.text()
    const elG = Date.now() - t0g
    geminiStatus = `HTTP ${r.status} (${elG}ms) | ${bodyG.slice(0, 120)}`
  } catch (e) { geminiStatus = `ERRO: ${String(e).slice(0, 120)}` }

  try {
    const ctrl = new AbortController()
    setTimeout(() => ctrl.abort(), 12_000)
    const t0gr = Date.now()
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: 'Gera uma pergunta de matemática para o 5.º ano sobre frações. Responde em JSON: {"text":"...","answer":"..."}' }], max_tokens: 4096 }),
      signal: ctrl.signal,
    })
    const bodyGr = await r.text()
    const elGr = Date.now() - t0gr
    groqStatus = `HTTP ${r.status} (${elGr}ms) | ${bodyGr.slice(0, 120)}`
  } catch (e) { groqStatus = `ERRO: ${String(e).slice(0, 120)}` }

  return NextResponse.json({ envStatus, geminiStatus, groqStatus })
}
