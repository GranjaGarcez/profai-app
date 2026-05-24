import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()
  const { tool, inputs } = body

  let prompt = ''

  if (tool === 'test') {
    const { subject, yearLevel, topic, difficulty, questionTypes, numQuestions, country } = inputs
    const countryLabel = country === 'PT' ? 'Portugal (Aprendizagens Essenciais DGE)' : country
    prompt = `És um professor experiente de ${subject} do ${yearLevel}.º ano em ${countryLabel}.
Cria um teste de avaliação sobre "${topic}" com EXACTAMENTE ${numQuestions} perguntas.
Dificuldade: ${difficulty === 'easy' ? 'Fácil' : difficulty === 'medium' ? 'Média' : 'Difícil'}
Tipos de pergunta: ${questionTypes.join(', ')}

REGRAS:
- Português de Portugal estrito
- Perguntas pedagogicamente sólidas e curricularmente alinhadas
- Escolha múltipla: 4 opções (A, B, C, D)
- Distribui os ${numQuestions} perguntas pelos tipos seleccionados
- totalPoints deve ser sempre 100

Responde APENAS com este JSON (sem texto antes ou depois):
{
  "title": "Avaliação de ${subject} — ${topic}",
  "subject": "${subject}",
  "yearLevel": ${yearLevel},
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "totalPoints": 100,
  "questions": [
    {
      "index": 1,
      "type": "multiple_choice",
      "text": "Enunciado da pergunta",
      "options": ["A) opção", "B) opção", "C) opção", "D) opção"],
      "correctAnswer": "A",
      "points": 10,
      "markScheme": "Critérios de correcção"
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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' })
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta inválida da IA')

    const content = JSON.parse(jsonMatch[0])
    return NextResponse.json({ content })
  } catch (error) {
    console.error('Erro na geração:', error)
    return NextResponse.json({ error: 'Erro ao gerar conteúdo. Tenta novamente.' }, { status: 500 })
  }
}
