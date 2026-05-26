import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurriculumConstraint } from '@/lib/curriculum'

// Inicialização lazy — evita falha de build quando env vars não estão disponíveis em build time
function getGenAI() { return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!) }
function getGroq()  { return new Groq({ apiKey: process.env.GROQ_API_KEY! }) }

// ── Perfis disciplinares de estrutura e cotação ────────────────────────────────
function yearContext(yearLevel: number): string {
  if (yearLevel <= 4) return `NÍVEL: ${yearLevel}.º ano (1.º ciclo) — linguagem muito simples e concreta; problemas de 1–2 passos; contextos familiares; apoio visual; Bloom predominante: Recordar/Compreender. Seleção pode ter até 40% do total; respostas longas formais são raras.`
  if (yearLevel <= 6) return `NÍVEL: ${yearLevel}.º ano (2.º ciclo) — linguagem clara (10–12 anos); 2–3 passos; contextos quotidianos e naturais; equilíbrio concreto-abstracto. Bloom: 20% Recordar · 35% Compreender/Aplicar · 45% Analisar/Avaliar.`
  if (yearLevel <= 9) return `NÍVEL: ${yearLevel}.º ano (3.º ciclo) — linguagem formal crescente; multi-passo com abstracção; contextos científicos e sociais. Bloom: 10% Recordar · 30% Compreender/Aplicar · 60% Analisar/Avaliar/Criar. Seleção máximo 20%; resolução/desenvolvimento mínimo 50%.`
  return `NÍVEL: ${yearLevel}.º ano (Secundário) — linguagem rigorosa; problemas complexos multi-passo; nível próximo do exame nacional (IAVE). Bloom: 5% Recordar · 20% Compreender/Aplicar · 75% Analisar/Avaliar/Criar. Seleção máximo 15%; resolução/desenvolvimento mínimo 60%.`
}

function getSubjectProfile(subject: string, hasMultipleTypes: boolean, yearLevel: number): {
  structureNote: string
  scoringRule: string
} {
  const s = subject.toLowerCase()
  const ctx = yearContext(yearLevel)

  // ── Português / Língua Portuguesa ──────────────────────────────────────────
  if (s.includes('português') || s.includes('portugues') || s.includes('língua')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Português (${yearLevel}.º ano):
• Grupo I — Compreensão do texto (25–35 pts): transcreve um excerto literário ou não-literário no campo "text" de uma questão, seguido de questões de interpretação (escolha múltipla, V/F, resposta curta). O texto é parte do enunciado, não da resposta.
• Grupo II — Gramática / Educação Literária (20–30 pts): conhecimento explícito da língua — classificação morfossintáctica, transformação frásica, coerência e coesão textual. Completar espaços e resposta curta.
• Grupo III — Expressão Escrita (35–45 pts): produção de texto orientada. PESO DOMINANTE obrigatório. markScheme: conteúdo/pertinência 40% + organização/coesão 30% + correcção linguística 30%.
REGRA: nunca menos de 35 pts na Expressão Escrita.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100, pontos sempre inteiros):
   • Compreensão (EM/VF): 3–5 pts/questão
   • Interpretação/Gramática (resposta curta/completar): 4–8 pts/questão
   • Expressão Escrita: MÍNIMO 35 pts — com critérios parciais no markScheme (conteúdo + estrutura + correcção linguística)
   • Distribuição típica: Compreensão ~30 pts | Gramática ~25 pts | Escrita ~45 pts`,
    }
  }

  // ── História ────────────────────────────────────────────────────────────────
  if (s.includes('história') || s.includes('historia')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — História (${yearLevel}.º ano):
• Grupo I — Seleção (máx. 20 pts): escolha múltipla e/ou V/F sobre factos, cronologia e conceitos históricos. 3–4 pts/questão.
• Grupo II — Análise de fontes / Resposta curta (30–40 pts): inclui OBRIGATORIAMENTE pelo menos uma fonte histórica (primária ou secundária) ou descrição de imagem histórica. Questões de interpretação, contextualização e causa-efeito. 5–10 pts/questão.
• Grupo III — Resposta de desenvolvimento (35–50 pts): síntese com tese, argumentação com evidências históricas e conclusão. Discurso histórico coerente. 20–30 pts/questão.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100, pontos sempre inteiros):
   • Seleção (EM/VF): 3–4 pts/questão, máximo 20 pts no grupo
   • Análise de fontes / Resposta curta: 5–10 pts/questão
   • Resposta de desenvolvimento: 20–30 pts — nunca menos de 35% do total; markScheme com critérios de conteúdo histórico + qualidade do discurso
   • Distribuição típica: Seleção ~15% | Fontes/Curta ~35% | Desenvolvimento ~50%`,
    }
  }

  // ── Geografia ───────────────────────────────────────────────────────────────
  if (s.includes('geograf')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Geografia (${yearLevel}.º ano):
• Grupo I — Seleção (máx. 20 pts): escolha múltipla e/ou V/F sobre conceitos, localizações e fenómenos geográficos. 3–4 pts/questão.
• Grupo II — Interpretação de documentos / Resposta curta (30–40 pts): análise de gráficos, tabelas ou mapas com dados reais e actuais. 5–10 pts/questão.
• Grupo III — Resposta de desenvolvimento (35–50 pts): síntese sobre fenómenos geográficos com exemplos concretos actuais. 15–25 pts/questão.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100, pontos sempre inteiros):
   • Seleção: 3–4 pts/questão, máximo 20 pts
   • Interpretação / Curta: 5–10 pts/questão
   • Desenvolvimento: 15–25 pts/questão — mínimo 35 pts no grupo
   • Distribuição típica: Seleção ~15% | Interpretação ~35% | Desenvolvimento ~50%`,
    }
  }

  // ── Ciências Naturais ────────────────────────────────────────────────────────
  if (s.includes('ciência') || s.includes('ciencia') || s.includes('natural') || s.includes('biolog')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Ciências Naturais (${yearLevel}.º ano):
• Grupo I — Seleção (20–25 pts): escolha múltipla e/ou V/F sobre conceitos, classificações e nomenclatura científica. 3–5 pts/questão.
• Grupo II — Interpretação de dados / Resposta curta (25–35 pts): inclui OBRIGATORIAMENTE análise de gráfico, tabela, esquema anatómico ou protocolo experimental. Observação, identificação e relação de variáveis. 5–10 pts/questão.
• Grupo III — Situação-problema / Resposta longa (40–50 pts): método científico, explicação de fenómenos naturais, formulação de hipóteses. Justificação científica obrigatória. 10–20 pts/questão.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100, pontos sempre inteiros):
   • Seleção (EM/VF): 3–5 pts/questão, máximo 25 pts no grupo
   • Interpretação/Resposta curta: 5–10 pts/questão
   • Situação-problema/Longa: 10–20 pts/questão — mínimo 40 pts no grupo
   • Distribuição típica: Seleção ~20% | Interpretação ~30% | Situação-problema ~50%`,
    }
  }

  // ── Físico-Química ───────────────────────────────────────────────────────────
  if (s.includes('físic') || s.includes('fisic') || s.includes('quím') || s.includes('quim')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Físico-Química (${yearLevel}.º ano):
• Grupo I — Seleção (20–25 pts): escolha múltipla e/ou V/F sobre conceitos, definições e grandezas. 3–5 pts/questão.
• Grupo II — Interpretação experimental / Resposta curta (25–35 pts): dados laboratoriais, gráficos ou tabelas com unidades obrigatórias. Variáveis, procedimento, conclusões. 5–10 pts/questão.
• Grupo III — Resolução de problemas (40–50 pts): fórmulas em contexto real; estrutura obrigatória: dados → fórmula → cálculo → resposta com unidade. Multi-passo. 10–20 pts/questão.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100, pontos sempre inteiros):
   • Seleção: 3–5 pts/questão, máximo 25 pts
   • Interpretação experimental: 5–10 pts/questão; unidades obrigatórias nas respostas
   • Resolução de problemas: 10–20 pts/questão — mínimo 40 pts no grupo; markScheme detalha pontos por dados + fórmula + cálculo + unidade
   • Distribuição típica: Seleção ~20% | Interpretação ~30% | Resolução ~50%`,
    }
  }

  // ── Matemática / STEM (default) ──────────────────────────────────────────────
  if (hasMultipleTypes) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Matemática (${yearLevel}.º ano):
• Grupo I — Seleção (20–25 pts): escolha múltipla e/ou V/F. Distratores baseados em erros conceptuais típicos. 3–5 pts (EM), 2–3 pts (VF).
• Grupo II — Cálculo e resposta curta (25–30 pts): aplicação directa com apresentação de cálculos obrigatória. 5–10 pts/questão.
• Grupo III — Resolução de problemas (45–55 pts): multi-passo com contexto real; modelação matemática, estratégia e raciocínio; cálculos e justificação obrigatórios. 10–20 pts/questão.
${ctx}`,
      scoringRule: `6. COTAÇÃO — segue RIGOROSAMENTE esta matriz (totalPoints = 100 exactamente, pontos sempre inteiros):
   • Escolha múltipla: 3–5 pts/questão (total do grupo ≤ 25 pts)
   • Verdadeiro/Falso: 2–3 pts/questão (total do grupo ≤ 15 pts)
   • Resposta curta / Cálculo: 5–10 pts/questão (total do grupo 25–35 pts)
   • Resolução / Resposta longa: 10–20 pts/questão (total do grupo ≥ 45 pts)`,
    }
  }

  // Tipo único — sem estrutura obrigatória de grupos
  return {
    structureNote: `ORGANIZAÇÃO: Todas as questões são do mesmo tipo — usa um único grupo com label e descrição adequados ao tipo pedido.`,
    scoringRule: `6. COTAÇÃO: totalPoints = 100 exactamente; pontos sempre inteiros; distribuição proporcional à complexidade cognitiva (questões de Bloom 4–6 valem mais).`,
  }
}

// Tenta gerar com Gemini; se falhar por qualquer razão, usa Groq como fallback
async function generateWithFallback(prompt: string): Promise<string> {
  // 1ª tentativa: Gemini 2.0 Flash
  try {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (geminiError) {
    console.warn('Gemini falhou, a usar Groq como fallback:', geminiError instanceof Error ? geminiError.message : geminiError)
  }

  // 2ª tentativa: Groq (llama-3.3-70b — rápido e gratuito)
  const completion = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'És um assistente especializado em educação portuguesa. Responde SEMPRE em Português de Portugal estrito. Responde APENAS com o JSON pedido, sem texto adicional, sem markdown, sem ```json.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 8192,
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

    // ── Perfil disciplinar (estrutura + cotação) ────────────────────────────
    const hasMultipleTypes = questionTypes.length > 1
    const { structureNote, scoringRule } = getSubjectProfile(subject, hasMultipleTypes, yearLevel)

    prompt = `És um professor especialista de ${subject} do ${yearLevel}.º ano em ${countryLabel}, com mais de 15 anos de experiência em avaliação formativa e sumativa. Conheces em profundidade as Aprendizagens Essenciais da DGE e os perfis dos alunos do ${yearLevel}.º ano.

TAREFA: Cria uma ficha de avaliação EXCELENTE sobre "${topic}".
Duração: ${testDuration} minutos | Dificuldade: ${diffLabel} | Total: ${numQuestions} questões | 100 pontos

${structureNote}
${figureNote}

${curriculumConstraint}DIRECTRIZES PEDAGÓGICAS OBRIGATÓRIAS:
1. BLOOM: Distribui por níveis cognitivos adaptados à disciplina — questões de Bloom 4–6 (análise/síntese/avaliação) têm sempre peso proporcionalmente maior.
2. CONTEXTO: Questões de desenvolvimento têm sempre contexto real e significativo para alunos de ${yearLevel}.º ano
3. DISTRATORES (escolha múltipla): Cada opção errada corresponde a um erro conceptual real e plausível — nunca opções obviamente absurdas
4. LINGUAGEM: Clara, precisa, Português de Portugal estrito. Usa "rectângulo", "fórmula", "efeito", "facto", "óptimo", "actividade" (nunca formas brasileiras)
5. CURRÍCULO: Alinhamento estrito com as AE da DGE — respeita SEMPRE a secção CURRÍCULO OBRIGATÓRIO acima
${scoringRule}
7. CRITÉRIOS: markScheme detalhado com critérios parciais quando aplicável (ex: "2pt identificação de dados + 3pt método + 3pt cálculo + 2pt resposta com unidade")
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
          "points": 4,
          "allowCalculator": false,
          "markScheme": "Resposta: A. A opção B induz o erro de [...]. A opção C confunde [...]. A opção D [...]. Critério: resposta correcta e completa (4 pontos)."
        }
      ]
    },
    {
      "label": "Grupo II",
      "description": "Resposta curta — responde de forma precisa e justificada. (30 pontos)",
      "totalPoints": 30,
      "questions": [
        {
          "index": 6,
          "type": "short_answer",
          "bloomLevel": "Aplicar",
          "text": "Enunciado com contexto real exigindo aplicação de conhecimentos",
          "figure": null,
          "correctAnswer": "Resposta completa",
          "points": 10,
          "allowCalculator": false,
          "markScheme": "3pt — identificação do conceito; 4pt — desenvolvimento correcto; 3pt — resposta completa e precisa."
        }
      ]
    },
    {
      "label": "Grupo III",
      "description": "Resolução de problemas — apresenta todos os cálculos e justificações. (50 pontos)",
      "totalPoints": 50,
      "questions": [
        {
          "index": 9,
          "type": "long_answer",
          "bloomLevel": "Analisar",
          "text": "Enunciado com contexto real exigindo análise e resolução multi-passo",
          "figure": null,
          "correctAnswer": "Resposta completa com unidades e conclusão",
          "points": 20,
          "allowCalculator": true,
          "markScheme": "4pt — identificação correcta dos dados; 6pt — método/equação correcta; 6pt — cálculo sem erro; 4pt — resposta com unidade e conclusão."
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
    if (!jsonMatch) {
      console.error('[PROFAI] Sem JSON na resposta. Texto recebido (500 chars):', text.slice(0, 500))
      throw new Error('Resposta inválida da IA')
    }
    let content: Record<string, unknown>
    try {
      content = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      console.error('[PROFAI] JSON inválido (primeiros 1000 chars):', jsonMatch[0].slice(0, 1000))
      throw new Error('JSON malformado — a IA devolveu uma resposta incompleta. Tenta novamente.')
    }

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
