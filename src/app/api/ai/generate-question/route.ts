import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const TYPE_PT: Record<string, string> = {
  multiple_choice: 'escolha múltipla (4 opções A/B/C/D, apenas uma correcta)',
  true_false:      'verdadeiro/falso (resposta: "Verdadeiro" ou "Falso")',
  short_answer:    'resposta curta (1–3 frases)',
  long_answer:     'resposta longa / desenvolvimento (parágrafo completo ou ensaio curto)',
  fill_blank:      'completar espaços (indicar a palavra ou expressão correcta)',
}

const SUBJECT_NOTES: Record<string, string> = {
  'Matemática':       'Inclui contexto real português. Apresentação de cálculos obrigatória. Distratores baseados em erros conceptuais reais.',
  'Matemática A':     'Raciocínio matemático formal. Distratores rigorosos. Multi-passo.',
  'Português':        'Géneros textuais adequados ao ano. Gramática em contexto. Expressão escrita orientada.',
  'Ciências Naturais':'Situações observáveis do mundo natural. Terminologia científica rigorosa. Ecossistemas portugueses quando relevante.',
  'Físico-Química':   'Unidades SI obrigatórias. Dados explícitos. Contextos reais portugueses.',
  'História':         'Fontes históricas reais ou claramente identificadas. Causalidade histórica. Vocabulário histórico rigoroso.',
  'Geografia':        'Dados geográficos reais actuais (IPMA, INE). Relações espaciais explícitas.',
  'História e Geografia de Portugal': 'Linguagem simples (10–12 anos). Identificar/localizar/descrever. Documentos acessíveis.',
  'Filosofia':        'Conceito filosófico exacto com autor do programa DGE. PROIBIDO inventar autores ou teses.',
  'Inglês':           'Nível QECR adequado ao ano. Enunciado, excerto e resposta esperada EM Inglês (instruções de gestão podem ser em português).',
  'Espanhol':         'Nível MCER adequado ao ano. Enunciado, excerto e resposta esperada EM Espanhol.',
  'Francês':          'Nível CECR adequado ao ano. Enunciado, excerto e resposta esperada EM Francês.',
  'Educação Física':  'Componente teórica escrita — regras, modalidades, aptidão física e saúde. PROIBIDO exigir execução motora.',
  'Educação Visual':  'Componente teórica escrita — elementos visuais, composição, análise de imagem descrita em texto. PROIBIDO pedir desenho/execução prática.',
  'Educação Tecnológica': 'Componente teórica escrita — materiais, processos, análise de objectos técnicos. PROIBIDO pedir execução prática/manual.',
  'TIC':              '4 domínios AE DGE: segurança digital, investigar/pesquisar, colaborar/comunicar, criar/inovar (pensamento computacional). PROIBIDO pedir execução prática num computador real.',
}

function buildPrompt(
  subject: string,
  yearLevel: number,
  topic: string,
  qtype: string,
  points: number,
  existing: string[],
): string {
  const typeDesc = TYPE_PT[qtype] ?? qtype
  const subjNote = SUBJECT_NOTES[subject] ?? 'Questão rigorosa, contextualizada, curricularmente alinhada com as AE DGE.'

  const avoidSection = existing.length > 0
    ? `\nJÁ EXISTE NO TESTE (não repitas conceito, contexto nem formulação):\n${existing.slice(0, 8).map((t, i) => `${i + 1}. ${t.slice(0, 120)}`).join('\n')}`
    : ''

  return `És professor especialista de ${subject} do ${yearLevel}.º ano em Portugal. Cria UMA questão de avaliação EXCELENTE.

PARÂMETROS:
• Disciplina: ${subject} · Ano: ${yearLevel}.º ano
• Tema: "${topic}"
• Tipo: ${typeDesc}
• Cotação: ${points} pontos (exactamente)

DIRECTRIZES DISCIPLINARES: ${subjNote}
${avoidSection}

REGRAS OBRIGATÓRIAS:
1. Linguagem: Português de Portugal estrito (actividade, óptimo, facto, fórmula, rectângulo, etc.)
2. Alinhamento: Aprendizagens Essenciais DGE para o ${yearLevel}.º ano de ${subject}
3. Qualidade: questão específica ao tema, com distratores plausíveis (se EM) ou contexto real
4. markScheme: critérios com pontos parciais cuja SOMA = ${points}pt exactamente
5. correctAnswer: obrigatório e completo
${qtype === 'multiple_choice' ? '6. options: array de exactamente 4 strings ["A) ...", "B) ...", "C) ...", "D) ..."]\n7. correctAnswer: só a letra (A, B, C ou D)' : ''}
${qtype === 'true_false' ? '6. options: null\n7. correctAnswer: "Verdadeiro" ou "Falso"' : ''}

Responde APENAS com este JSON válido (sem texto extra, sem markdown):
{
  "type": "${qtype}",
  "text": "<enunciado completo>",
  "options": ${qtype === 'multiple_choice' ? '["A) ...", "B) ...", "C) ...", "D) ..."]' : 'null'},
  "correctAnswer": "<resposta>",
  "points": ${points},
  "markScheme": "<critérios com pontos parciais>",
  "bloomLevel": "<nível Bloom em PT-PT>"
}`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { subject, yearLevel, topic, questionType, points, existingTexts } = await request.json()
  if (!subject || !yearLevel || !topic || !questionType || !points) {
    return NextResponse.json({ error: 'Parâmetros incompletos' }, { status: 400 })
  }

  const prompt = buildPrompt(subject, yearLevel, topic, questionType, points, existingTexts ?? [])

  // Tenta Gemini, fallback Groq
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
        temperature: 0.6,
        max_tokens: 800,
      })
      return completion.choices[0]?.message?.content ?? null
    } catch { return null }
  }

  const raw = await tryGemini() ?? await tryGroq()
  if (!raw) return NextResponse.json({ error: 'Não foi possível gerar a questão. Tenta novamente.' }, { status: 503 })

  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ error: 'Resposta da IA inválida. Tenta novamente.' }, { status: 502 })

  try {
    const q = JSON.parse(match[0])
    // Garantias mínimas
    if (!q.text || !q.correctAnswer) throw new Error('campos em falta')
    q.type   = questionType
    q.points = Number(points)
    return NextResponse.json({ question: q })
  } catch {
    return NextResponse.json({ error: 'JSON inválido da IA. Tenta novamente.' }, { status: 502 })
  }
}
