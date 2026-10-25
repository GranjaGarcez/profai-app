import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { fixMarkSchemeSum } from '@/lib/exam/markScheme'
import { callJsonCascade } from '@/lib/ai/singleCall'
import { describeFigure } from '@/lib/exam/figureText'

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
  figureDesc: string | null,
  currentAnswer: string | null,
  currentMarkScheme: string | null,
): string {
  const typeDesc = TYPE_PT[qtype] ?? qtype
  const optionsBlock = options && options.length
    ? `\nOPÇÕES (imutáveis, usa-as tal como estão):\n${options.map(o => `• ${o}`).join('\n')}`
    : ''
  const figureBlock = figureDesc
    ? `\nFIGURA/GRÁFICO DA QUESTÃO (fonte de verdade — lê DAQUI os valores):\n${figureDesc}\nA resposta e os critérios TÊM de corresponder EXACTAMENTE a estes dados. NÃO inventes valores, categorias ou unidades que não estejam na figura.`
    : ''

  // Âncora: quando o professor já tem uma resposta certa, MANTÉM-NA e constrói os
  // critérios à volta dela — não a reinventes (era este o problema: regenerava do
  // zero e divergia do que o professor queria).
  const anchorBlock = currentAnswer && currentAnswer.trim()
    ? `\nRESPOSTA CERTA DO PROFESSOR (ÂNCORA — é esta a referência):\n${currentAnswer.trim()}${currentMarkScheme && currentMarkScheme.trim() ? `\nCRITÉRIOS ACTUAIS (melhora, não deites fora o que está bom):\n${currentMarkScheme.trim()}` : ''}`
    : ''

  let answerRule = currentAnswer && currentAnswer.trim()
    ? '• correctAnswer: MANTÉM a resposta certa do professor acima (podes afiná-la na forma, mas não mudes o conteúdo). Só a corriges se estiver CLARAMENTE errada face ao enunciado — e, nesse caso, explica a correcção no feedback dos critérios.'
    : '• correctAnswer: resposta-modelo completa e inequívoca.'
  if (qtype === 'multiple_choice') {
    answerRule = '• correctAnswer: APENAS a letra da opção correcta (A, B, C ou D). Lê as opções acima e confirma qual está certa face ao enunciado.'
  } else if (qtype === 'true_false') {
    answerRule = '• correctAnswer: "Verdadeiro" ou "Falso".'
  } else if (qtype === 'fill_blank') {
    answerRule = currentAnswer && currentAnswer.trim()
      ? '• correctAnswer: MANTÉM a palavra/expressão esperada pelo professor acima; só a corriges se estiver claramente errada.'
      : '• correctAnswer: a palavra ou expressão exacta que preenche o espaço.'
  }

  return `És professor especialista de ${subject} do ${yearLevel}.º ano em Portugal.

O professor editou esta questão. O ENUNCIADO e as OPÇÕES são DEFINITIVOS — NÃO os reescrevas. A tua única tarefa é produzir a CORRIGENDA adequada à questão tal como está agora.

CONTEXTO: ${subject} · ${yearLevel}.º ano · Tema: "${topic}"
TIPO: ${typeDesc} · Cotação: ${points} pontos

ENUNCIADO (imutável):
${text}${optionsBlock}${figureBlock}${anchorBlock}

O QUE DEVES PRODUZIR:
${answerRule}
• markScheme: critérios de cotação com pontos parciais cuja SOMA = ${points}pt exactamente. Rubrica analítica (cada parcela com "(Npt)"), não um mero gabarito.

REGRAS OBRIGATÓRIAS:
1. Português de Portugal estrito (actividade, óptimo, facto, fórmula, rectângulo, fracção).
2. Se a questão envolver números/cálculos, refaz o cálculo do zero a partir DESTE enunciado antes de dar a resposta — nunca assumas valores.
3. A corrigenda tem de corresponder EXACTAMENTE a este enunciado editado, não a uma versão anterior.
4. Não inventes dados nem alteres o sentido da questão.
5. NÍVEL/ANO: o que se EXIGE ao aluno e a linguagem dos critérios têm de ser adequados ao ${yearLevel}.º ano (2.º ciclo, 10-12 anos). NÃO exijas termos científicos, conceitos ou vocabulário acima do ano; aceita como correcta uma resposta certa expressa em linguagem simples e própria da idade. Não inventes exigências que o enunciado não faz.

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

  const { subject, yearLevel, topic, type, points, text, options, figure, currentAnswer, currentMarkScheme } = await request.json()
  if (!subject || !yearLevel || !topic || !type || !points || !text) {
    return NextResponse.json({ error: 'Parâmetros incompletos' }, { status: 400 })
  }

  const prompt = buildPrompt(
    subject, Number(yearLevel), topic, String(type), Number(points), String(text),
    Array.isArray(options) ? options.map(String) : null,
    describeFigure(figure),
    typeof currentAnswer === 'string' ? currentAnswer : null,
    typeof currentMarkScheme === 'string' ? currentMarkScheme : null,
  )

  // Cascata validada (Gemini thinking-off → Groq gpt-oss → CF → reservas).
  const c = await callJsonCascade(prompt, { maxTokens: 2_500 })
  if (!c) {
    return NextResponse.json({ error: 'Não foi possível actualizar os critérios. Tenta novamente.' }, { status: 503 })
  }
  if (!c.correctAnswer || !c.markScheme) {
    return NextResponse.json({ error: 'A IA devolveu uma corrigenda incompleta. Tenta novamente.' }, { status: 502 })
  }
  const criteria = {
    correctAnswer: String(c.correctAnswer).trim(),
    markScheme:    fixMarkSchemeSum(String(c.markScheme), Number(points)),
    bloomLevel:    c.bloomLevel ? String(c.bloomLevel).trim() : undefined,
  }
  return NextResponse.json({ criteria })
}
