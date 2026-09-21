// ── Análise de erros de escrita (aditivo, NÃO-pontuável) ───────────────────────
// A partir das respostas escritas transcritas, deteta e conta erros ortográficos
// e de expressão para construir um perfil de escrita do aluno. NÃO afecta a
// cotação — serve para correção ortográfica futura significativa.
import type { TestSnapshot } from './types'
import { getAllQuestions } from './types'
import { geminiProviders, callOpenAICompat, parseJsonObject } from '@/lib/ai/cascade'

export type WritingErrorType =
  | 'ortografia' | 'acentuação' | 'pontuação' | 'concordância' | 'sintaxe' | 'vocabulário' | 'outro'

export interface WritingError {
  questionIndex: number
  wrong: string       // trecho como o aluno escreveu
  correct: string     // forma correcta
  type: WritingErrorType
}

export interface WritingAnalysis {
  errors: WritingError[]
  counts: Record<string, number>   // { ortografia: n, acentuação: n, ... }
  total: number
  summary: string                  // frase curta PT-PT sobre o perfil de escrita
}

/**
 * Analisa apenas as respostas ESCRITAS (short/long/fill) já transcritas.
 * Não pontua; devolve lista e contagem de erros por tipo.
 */
export async function analyzeWriting(
  snapshot: TestSnapshot,
  answers: Record<string, string>,
): Promise<WritingAnalysis | null> {
  const open = getAllQuestions(snapshot).filter(
    q => q.type === 'short_answer' || q.type === 'long_answer' || q.type === 'fill_blank',
  )
  const samples = open
    .map(q => ({ index: q.index, text: (answers[String(q.index)] ?? '').trim() }))
    .filter(s => s.text.length >= 3 && !/\[\?\]/.test(s.text))   // ignora vazios e ilegíveis

  if (!samples.length) {
    return { errors: [], counts: {}, total: 0, summary: 'Sem texto escrito suficiente para analisar.' }
  }

  const block = samples.map(s => `Q${s.index}: ${s.text}`).join('\n')
  const prompt = `És um professor de Português a analisar a ESCRITA de um aluno (norma do português europeu, ensino básico). Recebes as respostas ESCRITAS do aluno (já transcritas do papel). A tua tarefa NÃO é pontuar nem avaliar o conteúdo — é apenas identificar erros de escrita (ortografia, acentuação, pontuação, concordância, sintaxe, vocabulário), para um perfil de escrita.

RESPOSTAS DO ALUNO:
${block}

REGRAS:
- Lista cada erro claro: o trecho como o aluno escreveu ("wrong") e a forma correcta ("correct"), com o tipo.
- NÃO assinales como erro: notação matemática, símbolos, abreviaturas legítimas, ou opções de estilo aceitáveis.
- Não inventes erros; se a escrita estiver correcta, devolve lista vazia.
- Ignora respostas marcadas com [?] (ilegíveis).
- "summary": uma frase curta, construtiva, em Português de Portugal, sobre o perfil de escrita (pontos a melhorar).

Responde APENAS com JSON válido (sem markdown):
{"errors":[{"questionIndex":0,"wrong":"","correct":"","type":"ortografia"}],"summary":""}`

  for (const p of geminiProviders()) {
    const text = await callOpenAICompat(
      p.url, p.key, p.model, prompt, 20_000, `Escrita:${p.label}`, p.headers ?? {},
      'Analista de escrita rigoroso. Só JSON válido. Não inventes erros.', 1200, p.extraBody,
    )
    const parsed = text ? parseJsonObject(text) as { errors?: WritingError[]; summary?: string } | null : null
    if (!parsed) continue
    const errors = (Array.isArray(parsed.errors) ? parsed.errors : [])
      .filter(e => e && e.wrong && e.correct)
      .map(e => ({
        questionIndex: Number(e.questionIndex) || 0,
        wrong: String(e.wrong),
        correct: String(e.correct),
        type: (['ortografia', 'acentuação', 'pontuação', 'concordância', 'sintaxe', 'vocabulário', 'outro'] as WritingErrorType[])
          .includes(e.type as WritingErrorType) ? e.type as WritingErrorType : 'outro',
      }))
    const counts: Record<string, number> = {}
    for (const e of errors) counts[e.type] = (counts[e.type] ?? 0) + 1
    return { errors, counts, total: errors.length, summary: String(parsed.summary ?? '').trim() }
  }
  return null
}
