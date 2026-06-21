import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const FIGURE_SYNTAX_MATH = `Tipos disponíveis e sintaxe exacta:
  {"type":"right_triangle","leg1":3,"leg2":4,"leg1Label":"3 cm","leg2Label":"4 cm","hypLabel":"5 cm"}
  {"type":"triangle","base":6,"height":4,"baseLabel":"6 cm","heightLabel":"4 cm","sideLabel":"5 cm"}
  {"type":"rectangle","aspectRatio":1.5,"widthLabel":"6 cm","heightLabel":"4 cm"}
  {"type":"square","sideLabel":"5 cm"}
  {"type":"circle","showRadius":true,"radiusLabel":"5 cm"}
  {"type":"angle","degrees":60,"label":"60°"}
  {"type":"number_line","min":0,"max":10,"step":1,"highlighted":[3,7]}
  {"type":"fraction_bar","numerator":3,"denominator":4,"label":"3/4"}
  {"type":"bar_chart","title":"Título","yLabel":"Unidade","bars":[{"label":"A","value":5},{"label":"B","value":8}]}
  {"type":"pie_chart","title":"Título","slices":[{"label":"A","value":60},{"label":"B","value":40}]}
  {"type":"cuboid","widthLabel":"8 cm","heightLabel":"5 cm","depthLabel":"3 cm"}
  {"type":"cube","sideLabel":"4 cm"}
  {"type":"cylinder","radiusLabel":"3 cm","heightLabel":"10 cm"}
  {"type":"cone","radiusLabel":"4 cm","heightLabel":"9 cm"}
  {"type":"sphere","radiusLabel":"5 cm"}`

const FIGURE_SYNTAX_CHART = `O sistema só sabe desenhar DOIS tipos de figura: "bar_chart" e "pie_chart". Nunca inventes outro tipo (gráfico de linha, circuito, esquema, diagrama) — se não encaixar nestes dois, responde com "figure": null.
  {"type":"bar_chart","title":"Título","yLabel":"Unidade","bars":[{"label":"A","value":5},{"label":"B","value":8}]}
  {"type":"pie_chart","title":"Título","slices":[{"label":"A","value":60},{"label":"B","value":40}]}`

function isMathSubject(subject: string) {
  return ['Matemática', 'Matemática A'].includes(subject)
}

function hasChartSupport(subject: string) {
  const s = subject.toLowerCase()
  return !isMathSubject(subject) && ['geograf', 'ciência', 'ciencia', 'natural', 'biolog', 'físic', 'fisic', 'quím', 'quim']
    .some(k => s.includes(k))
}

function buildPrompt(subject: string, yearLevel: number, questionText: string): string {
  const isMath = isMathSubject(subject)
  const syntax = isMath ? FIGURE_SYNTAX_MATH : hasChartSupport(subject) ? FIGURE_SYNTAX_CHART : null

  if (!syntax) {
    return `A disciplina "${subject}" não tem suporte a figuras geométricas nem gráficos de dados. Responde APENAS com: {"figure": null}`
  }

  return `És professor de ${subject} do ${yearLevel}.º ano em Portugal. Esta questão precisa de uma figura/gráfico que represente correctamente os dados ou a forma geométrica que o enunciado descreve:

ENUNCIADO DA QUESTÃO:
"${questionText}"

${syntax}

REGRAS OBRIGATÓRIAS:
1. "value" em bar_chart/pie_chart é SEMPRE um número, nunca uma string nem omitido.
2. Os valores devem ser coerentes com o que o enunciado pede — se o enunciado pede para calcular um valor em falta, usa "hideValueFor":"NomeExacto" para o ocultar (mostra "?").
3. Se o enunciado não precisar genuinamente de figura, ou pedir algo fora dos tipos listados, responde com "figure": null — nunca inventes um tipo novo.

Responde APENAS com este JSON válido (sem texto extra, sem markdown):
{"figure": <objecto do tipo exacto, ou null>}`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { subject, yearLevel, questionText } = await request.json()
  if (!subject || !yearLevel || !questionText) {
    return NextResponse.json({ error: 'Parâmetros incompletos' }, { status: 400 })
  }

  const prompt = buildPrompt(String(subject), Number(yearLevel), String(questionText))

  const geminiKey = process.env.GEMINI_API_KEY
  const groqKey   = process.env.GROQ_API_KEY

  async function tryGemini(): Promise<string | null> {
    if (!geminiKey) return null
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const ai    = new GoogleGenerativeAI(geminiKey)
      const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' })
      const res   = await model.generateContent(prompt)
      return res.response.text()
    } catch { return null }
  }

  async function tryGroq(): Promise<string | null> {
    if (!groqKey) return null
    try {
      const Groq = (await import('groq-sdk')).default
      const groq = new Groq({ apiKey: groqKey })
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 500,
      })
      return completion.choices[0]?.message?.content ?? null
    } catch { return null }
  }

  const raw = await tryGemini() ?? await tryGroq()
  if (!raw) return NextResponse.json({ error: 'Não foi possível gerar a figura. Tenta novamente.' }, { status: 503 })

  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ error: 'Resposta da IA inválida. Tenta novamente.' }, { status: 502 })

  try {
    const parsed = JSON.parse(match[0]) as { figure: unknown }
    return NextResponse.json({ figure: parsed.figure ?? null })
  } catch {
    return NextResponse.json({ error: 'JSON inválido da IA. Tenta novamente.' }, { status: 502 })
  }
}
