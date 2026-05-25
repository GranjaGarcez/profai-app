import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurriculumConstraint } from '@/lib/curriculum'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

// Tenta gerar com Gemini; se falhar por rate-limit ou quota, usa Groq como fallback
async function generateWithFallback(prompt: string): Promise<string> {
  // 1ª tentativa: Gemini 2.5 Flash
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (geminiError) {
    const msg = geminiError instanceof Error ? geminiError.message : ''
    const isQuotaOrRate = msg.includes('429') || msg.includes('quota') || msg.includes('rate')
    if (!isQuotaOrRate) throw geminiError // erro inesperado — propaga
    console.warn('Gemini indisponível, a usar Groq como fallback...')
  }

  // 2ª tentativa: Groq (llama-3.3-70b — rápido e gratuito)
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'És um assistente especializado em educação portuguesa. Responde SEMPRE em Português de Portugal estrito. Responde APENAS com o JSON pedido, sem texto adicional, sem markdown, sem ```json.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  })
  return completion.choices[0]?.message?.content ?? ''
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()
  const { tool, inputs } = body

  let prompt = ''

  if (tool === 'test') {
    const { subject, yearLevel, topic, difficulty, questionTypes, numQuestions, duration, country } = inputs
    const countryLabel = country === 'PT' ? 'Portugal (Aprendizagens Essenciais DGE)' : country
    const isMath = ['Matemática', 'Matemática A'].includes(subject)
    const diffLabel = difficulty === 'easy' ? 'Fácil' : difficulty === 'medium' ? 'Média' : 'Difícil'
    const testDuration = duration ?? 50

    // ── Directrizes por disciplina ──────────────────────────────────────────
    const subjectGuidelines: Record<string, string> = {
      'Matemática':         'Inclui problemas com contexto real e significativo. Equilibra cálculo, raciocínio e resolução de problemas. Distratores baseados em erros conceptuais típicos (ex: confundir perímetro com área). Exige apresentação de cálculos nas respostas longas.',
      'Matemática A':       'Inclui problemas com contexto real. Exige demonstração de raciocínio matemático formal. Distratores rigorosos. Problemas multi-passo.',
      'Português':          'Inclui pelo menos um excerto textual (100-150 palavras, adequado ao nível) com questões de compreensão leitora. Avalia gramática em contexto, não isolada. Questão de expressão escrita orientada.',
      'Ciências Naturais':  'Baseia-te em situações observáveis do mundo natural. Inclui interpretação de dados, esquemas ou situações-problema científicas. Promove o raciocínio científico e o método experimental.',
      'Físico-Química':     'Inclui situações experimentais ou problemas com dados reais. Exige aplicação de fórmulas com unidades correctas. Contextualiza com fenómenos do quotidiano.',
      'História':           'Inclui fontes primárias ou secundárias curtas (excerto, imagem descrita) para análise. Avalia compreensão de causalidade, mudança e continuidade. Questões de desenvolvimento com tese.',
      'Geografia':          'Inclui análise de dados geográficos (descrição de gráfico, tabela, mapa simples). Avalia localização, distribuição e relações espaciais.',
      'História e Geografia de Portugal': 'Inclui fontes e dados histórico-geográficos. Avalia compreensão de processos históricos e características geográficas de Portugal.',
    }
    const subjectNote = subjectGuidelines[subject] ?? 'Cria questões rigorosas, contextualizadas e curricularmente alinhadas com as Aprendizagens Essenciais DGE.'

    // ── Restrições curriculares — biblioteca AE DGE ────────────────────────
    const curriculumConstraint = getCurriculumConstraint(subject, yearLevel)

    // ── Figuras matemáticas ─────────────────────────────────────────────────
    const minFigures = Math.max(2, Math.floor(numQuestions / 3))
    const figureNote = isMath ? `
FIGURAS SVG — REGRA OBRIGATÓRIA:
Num teste de ${numQuestions} questões TENS DE incluir pelo menos ${minFigures} questões com "figure" diferente de null.
Analisa o tópico e aplica a seguinte lógica:

MAPEAMENTO TÓPICO → FIGURA (usa SEMPRE que o tópico for relevante):
• Triângulos, quadriláteros, polígonos, perímetro, área 2D → right_triangle / triangle / rectangle / square
• Círculo, circunferência, raio, diâmetro → circle
• Ângulos, amplitude → angle
• Frações, numerador, denominador, números racionais → fraction_bar
• Recta numérica, ordenar números, inteiros, decimais → number_line
• Gráficos, estatística, dados, frequência, percentagens → bar_chart ou pie_chart
• Cubo, cuboide, paralelepípedo → cuboid ou cube  (todos os anos)
• Prisma triangular → triangular_prism  (5.º ano: identificação; 7.º+: volume)
• Pirâmide → pyramid  (5.º ano: identificação; 9.º+: volume — NUNCA volume no 6.º)
• Cilindro → cylinder  (5.º ano: identificação; 6.º+: volume V=πr²h)
• Cone → cone  (APENAS 9.º ano — PROIBIDO no ${yearLevel}.º ano${yearLevel < 9 ? ' ✗' : ' ✓'})
• Esfera → sphere  (APENAS 9.º ano — PROIBIDO no ${yearLevel}.º ano${yearLevel < 9 ? ' ✗' : ' ✓'})

Para questões de cálculo puro sem componente visual → "figure": null

SINTAXE EXACTA dos tipos disponíveis (copia e adapta com valores reais para o ${yearLevel}.º ano):
  {"type":"right_triangle","leg1":3,"leg2":4,"leg1Label":"3 cm","leg2Label":"4 cm","hypLabel":"5 cm"}
  {"type":"triangle","base":6,"height":4,"baseLabel":"6 cm","heightLabel":"4 cm","sideLabel":"5 cm"}
  {"type":"rectangle","aspectRatio":1.5,"widthLabel":"6 cm","heightLabel":"4 cm"}
  {"type":"square","sideLabel":"5 cm"}
  {"type":"circle","showRadius":true,"radiusLabel":"5 cm"}
  {"type":"circle","showDiameter":true,"diameterLabel":"10 cm"}
  {"type":"angle","degrees":60,"label":"60°"}
  {"type":"number_line","min":0,"max":10,"step":1,"highlighted":[3,7]}
  {"type":"fraction_bar","numerator":3,"denominator":4,"label":"3/4"}
  {"type":"bar_chart","title":"Título","yLabel":"N.º alunos","bars":[{"label":"Jan","value":5},{"label":"Fev","value":8},{"label":"Mar","value":3}]}
  {"type":"pie_chart","title":"Título","slices":[{"label":"Categoria A","value":60},{"label":"Categoria B","value":40}]}
  {"type":"cuboid","widthLabel":"8 cm","heightLabel":"5 cm","depthLabel":"3 cm"}
  {"type":"cube","sideLabel":"4 cm"}
  {"type":"triangular_prism","baseLabel":"6 cm","heightLabel":"4 cm","depthLabel":"10 cm"}
  {"type":"pyramid","baseLabel":"6 cm","heightLabel":"8 cm"}
  {"type":"cylinder","radiusLabel":"3 cm","heightLabel":"10 cm"}
  {"type":"cone","radiusLabel":"4 cm","heightLabel":"9 cm"}
  {"type":"sphere","radiusLabel":"5 cm"}

VERIFICAÇÃO FINAL: Antes de fechar o JSON, conta quantas questões têm figure != null. Se for menos de ${minFigures}, adiciona figuras às questões que mais se adequam.` : ''

    // ── Organização em grupos ───────────────────────────────────────────────
    const hasMultipleTypes = questionTypes.length > 1
    const groupNote = hasMultipleTypes
      ? `ORGANIZAÇÃO: Agrupa as questões em Grupos por tipo (Grupo I, Grupo II, etc.). Cada grupo deve ter um label romano, uma descrição do tipo de questão e a cotação total do grupo.`
      : `ORGANIZAÇÃO: Todas as questões são do mesmo tipo — usa um único grupo.`

    prompt = `És um professor especialista de ${subject} do ${yearLevel}.º ano em ${countryLabel}, com mais de 15 anos de experiência em avaliação formativa e sumativa. Conheces em profundidade as Aprendizagens Essenciais da DGE e os perfis dos alunos do ${yearLevel}.º ano.

TAREFA: Cria uma ficha de avaliação EXCELENTE sobre "${topic}".
Duração: ${testDuration} minutos | Dificuldade: ${diffLabel} | Total: ${numQuestions} questões | 100 pontos

${groupNote}
${figureNote}

${curriculumConstraint}DIRECTRIZES PEDAGÓGICAS OBRIGATÓRIAS:
1. BLOOM: Distribui por níveis cognitivos — 20% Recordar, 35% Compreender/Aplicar, 45% Analisar/Avaliar/Criar
2. CONTEXTO: Questões de desenvolvimento devem ter contexto real e significativo para alunos de ${yearLevel}.º ano
3. DISTRATORES (escolha múltipla): Cada opção errada deve corresponder a um erro conceptual real e plausível — nunca opções obviamente absurdas
4. LINGUAGEM: Clara, precisa, Português de Portugal estrito. Usa "rectângulo", "fórmula", "efeito", "facto", "óptimo", "actividade" (nunca formas brasileiras)
5. CURRÍCULO: Alinhamento estrito com as AE da DGE — respeita SEMPRE a secção CURRÍCULO OBRIGATÓRIO acima
6. COTAÇÃO: totalPoints = 100; questões de resolução/análise valem mais que memorização; distribuição proporcional e justificável
7. CRITÉRIOS: markScheme detalhado com critérios parciais quando aplicável (ex: "1pt pela equação + 1pt pelo cálculo + 1pt pela resposta com unidade")
8. CALCULADORA: Para cada questão, define allowCalculator:true APENAS se o objectivo é avaliar raciocínio/estratégia com cálculos complexos onde o cálculo não é o alvo (ex: problemas de optimização, geometria analítica, probabilidade composta). Define false para memorização, conceitos, ou quando o cálculo simples é parte essencial do que se avalia.

DISCIPLINA ESPECÍFICA: ${subjectNote}

Responde APENAS com este JSON válido (sem texto, sem markdown, sem \`\`\`):
{
  "title": "Ficha de Avaliação de ${subject} — ${topic}",
  "subject": "${subject}",
  "yearLevel": ${yearLevel},
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "totalPoints": 100,
  "duration": ${testDuration},
  "instructions": "Lê atentamente cada questão antes de responder. Apresenta todos os cálculos/justificações. Não é permitido o uso de corretor — risca e reescreve com clareza.",
  "groups": [
    {
      "label": "Grupo I",
      "description": "Escolha múltipla — selecciona a única opção correcta. (20 pontos)",
      "totalPoints": 20,
      "questions": [
        {
          "index": 1,
          "type": "multiple_choice",
          "bloomLevel": "Compreender",
          "text": "Enunciado da pergunta com contexto real",
          "figure": null,
          "options": ["A) opção correcta", "B) distrator plausível 1", "C) distrator plausível 2", "D) distrator plausível 3"],
          "correctAnswer": "A",
          "points": 5,
          "allowCalculator": false,
          "markScheme": "Resposta: A. A opção B induz o erro de [...]. A opção C confunde [...]. A opção D [...]. Critério: resposta correcta e completa (5 pontos)."
        }
      ]
    },
    {
      "label": "Grupo II",
      "description": "Resolução de problemas — apresenta todos os cálculos. (80 pontos)",
      "totalPoints": 80,
      "questions": [
        {
          "index": 5,
          "type": "short_answer",
          "bloomLevel": "Aplicar",
          "text": "Enunciado com contexto real exigindo aplicação de conhecimentos",
          "figure": null,
          "correctAnswer": "Resposta completa com unidades",
          "points": 20,
          "allowCalculator": true,
          "markScheme": "5pt — identificação correcta dos dados; 5pt — equação/método correcto; 5pt — cálculo sem erro; 5pt — resposta com unidade e conclusão."
        }
      ]
    }
  ]
}`
  } else if (tool === 'lesson_plan') {
    const { subject, yearLevel, topic, duration, country } = inputs
    const countryLabel = country === 'PT' ? 'Portugal (Aprendizagens Essenciais DGE)' : country
    prompt = `Cria uma planificação de aula de ${subject} para o ${yearLevel}.º ano sobre "${topic}" com duração de ${duration} minutos em ${countryLabel}.

Responde APENAS com este JSON:
{
  "title": "Planificação — ${topic}",
  "subject": "${subject}",
  "yearLevel": ${yearLevel},
  "duration": ${duration},
  "objectives": ["objetivo 1", "objetivo 2"],
  "materials": ["material 1", "material 2"],
  "phases": [
    {"name": "Introdução", "duration": 10, "teacherActivity": "...", "studentActivity": "...", "notes": "..."},
    {"name": "Desenvolvimento", "duration": 30, "teacherActivity": "...", "studentActivity": "...", "notes": "..."},
    {"name": "Consolidação", "duration": 10, "teacherActivity": "...", "studentActivity": "...", "notes": "..."}
  ],
  "assessment": "Descrição do momento de avaliação",
  "differentiation": "Notas de diferenciação pedagógica",
  "homework": "Trabalho de casa"
}`
  } else if (tool === 'rubric') {
    const { subject, yearLevel, taskType, numCriteria, numLevels } = inputs
    prompt = `Cria uma rubrica de avaliação para ${taskType} de ${subject} do ${yearLevel}.º ano com ${numCriteria} critérios e ${numLevels} níveis de desempenho.

Responde APENAS com este JSON:
{
  "title": "Rubrica — ${taskType}",
  "subject": "${subject}",
  "yearLevel": ${yearLevel},
  "criteria": [
    {
      "name": "Nome do critério",
      "weight": 25,
      "levels": [
        {"level": "Excelente", "score": 4, "descriptor": "Descrição detalhada"},
        {"level": "Bom", "score": 3, "descriptor": "Descrição detalhada"},
        {"level": "Suficiente", "score": 2, "descriptor": "Descrição detalhada"},
        {"level": "Insuficiente", "score": 1, "descriptor": "Descrição detalhada"}
      ]
    }
  ]
}`
  } else {
    return NextResponse.json({ error: 'Ferramenta desconhecida' }, { status: 400 })
  }

  try {
    const text = await generateWithFallback(prompt)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta inválida da IA')
    const content = JSON.parse(jsonMatch[0])

    // ── Normalização de pontos (garante soma = 100) ──────────────────────────
    if (tool === 'test') {
      type QRaw = { index: number; figure: unknown; points?: number }
      type GRaw = { label: string; questions: QRaw[]; totalPoints?: number }
      const groups = (content.groups ?? []) as GRaw[]
      const allQs  = groups.flatMap(g => g.questions ?? [])

      const currentTotal = allQs.reduce((s, q) => s + (Number(q.points) || 0), 0)
      if (currentTotal > 0 && currentTotal !== 100) {
        const diff = 100 - currentTotal
        // Aplica a diferença à questão com mais pontos (menos impacto percentual)
        const heaviest = allQs.reduce((max, q) =>
          (Number(q.points) || 0) > (Number(max.points) || 0) ? q : max, allQs[0])
        if (heaviest) heaviest.points = (Number(heaviest.points) || 0) + diff

        // Recalcula totalPoints dos grupos
        for (const g of groups) {
          g.totalPoints = g.questions.reduce((s, q) => s + (Number(q.points) || 0), 0)
        }
        content.totalPoints = 100
        console.log(`[PROFAI] Pontos normalizados: ${currentTotal} → 100 (diff ${diff > 0 ? '+' : ''}${diff} em Q${heaviest?.index})`)
      }

      // Debug: auditar figuras geradas
      const withFig = allQs.filter(q => q.figure !== null && q.figure !== undefined)
      console.log(`[PROFAI] Test gerado: ${allQs.length} questões, ${withFig.length} com figura`)
      if (withFig.length > 0) {
        console.log('[PROFAI] Figuras:', JSON.stringify(withFig.map(q => ({ idx: q.index, fig: q.figure })), null, 2))
      } else {
        console.warn('[PROFAI] ⚠️  Nenhuma figura gerada — verificar prompt')
      }
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Erro na geração:', error)
    return NextResponse.json({ error: 'Erro ao gerar conteúdo. Tenta novamente.' }, { status: 500 })
  }
}
