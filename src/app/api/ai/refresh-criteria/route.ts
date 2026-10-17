import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { fixMarkSchemeSum } from '@/lib/exam/markScheme'

/**
 * PROF.IA — Actualizar critérios de correcção de UMA questão editada
 *
 * Distinto de /api/ai/generate-question (que gera uma questão NOVA de raiz).
 * Aqui o enunciado e as opções do professor são INTOCÁVEIS: a IA apenas lê a
 * questão tal como está e produz a corrigenda adequada — resposta correcta +
 * critérios de cotação (markScheme) analíticos cuja soma = cotação.
 *
 * Usado quando o professor edita o enunciado/opções/resposta e a corrigenda
 * antiga deixa de corresponder (ver _criteriaStale em TestPreview).
 */

const TYPE_PT: Record<string, string> = {
  multiple_choice: 'escolha múltipla (4 opções A/B/C/D, apenas uma correcta)',
  true_false:      'verdadeiro/falso',
  short_answer:    'resposta curta (1–3 frases)',
  long_answer:     'resposta longa / desenvolvimento',
  fill_blank:      'completar espaços',
}

function buildPrompt(
  subject: string,
  yearLevel: number,
  topic: string,
  qtype: string,
  points: number,
  text: string,
  options: string[] | null,
): string {
  const typeDesc = TYPE_PT[qtype] ?? qtype
  const optionsBlock = options && options.length
    ? `\nOPÇÕES (imutáveis, usa-as tal como estão):\n${options.map(o => `• ${o}`).join('\n')}`
    : ''

  let answerRule = '• correctAnswer: resposta-modelo completa e inequívoca.'
  if (qtype === 'multiple_choice') {
    answerRule = '• correctAnswer: APENAS a letra da opção correcta (A, B, C ou D). Lê as opções acima e confirma qual está certa face ao enunciado.'
  } else if (qtype === 'true_false') {
    answerRule = '• correctAnswer: "Verdadeiro" ou "Falso".'
  } else if (qtype === 'fill_blank') {
    answerRule = '• correctAnswer: a palavra ou expressão exacta que preenche o espaço.'
  }

  return `És professor especialista de ${subject} do ${yearLevel}.º ano em Portugal.

O professor editou esta questão. O ENUNCIADO e as OPÇÕES são DEFINITIVOS — NÃO os reescrevas. A tua única tarefa é produzir a CORRIGENDA adequada à questão tal como está agora.

CONTEXTO: ${subject} · ${yearLevel}.º ano · Tema: "${topic}"
TIPO: ${typeDesc} · Cotação: ${points} pontos

ENUNCIADO (imutável):
${text}${optionsBlock}

O QUE DEVES PRODUZIR:
${answerRule}
• markScheme: critérios de cotação com pontos parciais cuja SOMA = ${points}pt exactamente. Rubrica analítica (cada parcela com "(Npt)"), não um mero gabarito.

REGRAS OBRIGATÓRIAS:
1. Português de Portugal estrito (actividade, óptimo, facto, fórmula, rectângulo, fracção).
2. Se a questão envolver números/cálculos, refaz o cálculo do zero a partir DESTE enunciado antes de dar a resposta — nunca assumas valores.
3. A corrigenda tem de corresponder EXACTAMENTE a este enunciado editado, não a uma versão anterior.
4. Não inventes dados nem alteres o sentido da questão.

Responde APENAS com este JSON válido (sem texto extra, sem markdown):
{
  "correctAnswer": "<resposta>",
  "markScheme": "<critérios com pontos parciais a somar ${points}>",
  "bloomLevel": "<nível Bloom em PT-PT: Recordar/Compreender/Aplicar/Analisar/Avaliar/Criar>"
}`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { subject, yearLevel, topic, type, points, text, options } = await request.json()
  if (!subject || !yearLevel || !topic || !type || !points || !text) {
    return NextResponse.json({ error: 'Parâmetros incompletos' }, { status: 400 })
  }

  const prompt = buildPrompt(
    subject, Number(yearLevel), topic, String(type), Number(points), String(text),
    Array.isArray(options) ? options.map(String) : null,
  )

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
        max_tokens: 800,
      })
      return completion.choices[0]?.message?.content ?? null
    } catch { return null }
  }

  const raw = await tryGemini() ?? await tryGroq()
  if (!raw) return NextResponse.json({ error: 'Não foi possível actualizar os critérios. Tenta novamente.' }, { status: 503 })

  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ error: 'Resposta da IA inválida. Tenta novamente.' }, { status: 502 })

  try {
    const c = JSON.parse(match[0])
    if (!c.correctAnswer || !c.markScheme) throw new Error('campos em falta')
    const criteria = {
      correctAnswer: String(c.correctAnswer).trim(),
      markScheme:    fixMarkSchemeSum(String(c.markScheme), Number(points)),
      bloomLevel:    c.bloomLevel ? String(c.bloomLevel).trim() : undefined,
    }
    return NextResponse.json({ criteria })
  } catch {
    return NextResponse.json({ error: 'JSON inválido da IA. Tenta novamente.' }, { status: 502 })
  }
}
