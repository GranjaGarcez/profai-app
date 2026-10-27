// PROF.IA — Dividir uma questão (resposta aberta) em ALÍNEAS a), b), c)… (versão A).
// Mantém o TEMA e o objectivo da questão, mas reescreve o enunciado estruturado em
// alíneas coerentes e progressivas, e devolve a corrigenda completa: markScheme com
// cotação parcelar POR ALÍNEA a somar a cotação total, e uma resposta-modelo que
// cobre cada alínea. NÃO cria subperguntas independentes — continua a ser UMA questão
// (uma cotação, uma resposta). Distinto de "regenerar" (troca a questão).
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { fixMarkSchemeSum } from '@/lib/exam/markScheme'
import { callJsonCascade } from '@/lib/ai/singleCall'
import { describeFigure } from '@/lib/exam/figureText'

export const runtime = 'nodejs'

// Nº de alíneas proporcional à cotação (2 a 4), para não fragmentar de mais.
function suggestCount(points: number): string {
  if (points <= 4) return '2'
  if (points <= 8) return '2 a 3'
  return '3 a 4'
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { subject, yearLevel, topic, type, points, text, figure } = await request.json()
  if (!subject || !yearLevel || !type || !points || !text) {
    return NextResponse.json({ error: 'Parâmetros incompletos' }, { status: 400 })
  }
  if (type !== 'long_answer' && type !== 'short_answer') {
    return NextResponse.json({ error: 'Só faz sentido dividir em alíneas uma questão de resposta aberta.' }, { status: 400 })
  }

  const figureDesc = describeFigure(figure)
  const figureBlock = figureDesc
    ? `\nFIGURA/GRÁFICO DA QUESTÃO (fonte de verdade — lê DAQUI os valores):\n${figureDesc}\nAs alíneas e a corrigenda TÊM de corresponder a estes dados; não inventes valores.`
    : ''

  const prompt = `És professor especialista de ${subject} do ${yearLevel}.º ano em Portugal (2.º ciclo, 10-12 anos).

Tens esta questão de resposta aberta e vais DIVIDI-LA EM ALÍNEAS a), b), c)… — mantendo o mesmo TEMA e objectivo, sem lhe mudar o assunto nem a dificuldade global. Continua a ser UMA questão (uma cotação total), apenas mais estruturada.

CONTEXTO: ${subject} · ${yearLevel}.º ano${topic ? ` · Tema: "${topic}"` : ''}
Cotação total: ${points} pontos.

ENUNCIADO ACTUAL:
${text}${figureBlock}

O QUE DEVES PRODUZIR:
• text: o MESMO enunciado, reescrito com uma breve introdução (se fizer falta) seguida das alíneas, cada uma numa linha, no formato "a) …", "b) …", "c) …". Usa ${suggestCount(Number(points))} alíneas. As alíneas devem ser COERENTES e PROGRESSIVAS (ex.: identificar → explicar → aplicar/dar exemplo), cada uma clara e respondível por si, adequada ao ${yearLevel}.º ano. NÃO acrescentes matéria nova nem alíneas artificiais só para encher.
• markScheme: critérios de cotação com uma parcela POR ALÍNEA, cada uma com "(Npt)", a somar EXACTAMENTE ${points}pt (ex.: "a) identifica… (3pt) + b) justifica… (2pt)"). Reparte a cotação de forma pedagogicamente justa.
• correctAnswer: resposta-modelo que responde a CADA alínea, rotulada "a) … b) … c) …".

REGRAS OBRIGATÓRIAS:
1. Português de Portugal estrito (actividade, óptimo, facto, fórmula, fracção).
2. Nível e linguagem do 2.º ciclo — nada acima do ${yearLevel}.º ano.
3. Se envolver cálculo, refá-lo do zero antes de dar a resposta.
4. Não mudes o sentido da questão nem inventes dados.

Responde APENAS com este JSON válido (sem texto extra, sem markdown):
{
  "text": "<enunciado com alíneas a) b) c)>",
  "markScheme": "<critérios com parcela por alínea a somar ${points}>",
  "correctAnswer": "<resposta-modelo a) … b) … c) …>",
  "bloomLevel": "<nível Bloom em PT-PT: Recordar/Compreender/Aplicar/Analisar/Avaliar/Criar>"
}`

  const c = await callJsonCascade(prompt, { maxTokens: 2_500 })
  if (!c) return NextResponse.json({ error: 'Não foi possível dividir em alíneas. Tenta novamente.' }, { status: 503 })
  if (!c.text || !c.markScheme) {
    return NextResponse.json({ error: 'A IA devolveu um resultado incompleto. Tenta novamente.' }, { status: 502 })
  }

  return NextResponse.json({
    question: {
      text:          String(c.text).trim(),
      markScheme:    fixMarkSchemeSum(String(c.markScheme), Number(points)),
      correctAnswer: c.correctAnswer ? String(c.correctAnswer).trim() : undefined,
      bloomLevel:    c.bloomLevel ? String(c.bloomLevel).trim() : undefined,
    },
  })
}
