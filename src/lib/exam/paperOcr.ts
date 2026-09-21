// ── OCR de provas em papel (aditivo — não altera o fluxo digital existente) ────
// Reconstrói as RESPOSTAS de um aluno a partir de fotos da prova em papel.
// Como o teste já é conhecido (test_snapshot), o modelo de visão só transcreve
// as respostas por índice de questão — nunca as perguntas. Devolve confiança e
// sinalização de ilegibilidade por questão para revisão humana obrigatória.
import type { TestSnapshot } from './types'
import { getAllQuestions } from './types'
import { geminiProviders, callVisionCompat, parseJsonObject } from '@/lib/ai/cascade'

export interface OcrAnswer {
  text: string          // resposta transcrita (letra para MCQ/VF; texto para abertas)
  confidence: number    // 0..1 — confiança do reconhecimento
  illegible: boolean     // true se há palavras/trechos não reconhecidos
  notes?: string         // observações do OCR (ex.: "rasura", "resposta cortada na foto")
}

export interface OcrResult {
  answers: Record<string, OcrAnswer>   // { "1": {...}, "2": {...} }
  student: { name?: string; number?: string; class?: string }
  /** true se alguma questão ficou abaixo do limiar de confiança ou ilegível. */
  needsReview: boolean
  /** índices que exigem revisão do professor. */
  flagged: string[]
}

export const OCR_REVIEW_THRESHOLD = 0.85

function buildOcrPrompt(snapshot: TestSnapshot): string {
  const qs = getAllQuestions(snapshot)
  const list = qs.map(q => {
    const opts = q.options?.length ? ` | Opções: ${q.options.join(' ')}` : ''
    const kind =
      q.type === 'multiple_choice' ? 'escolha múltipla (transcreve APENAS a letra assinalada: A/B/C/D)'
      : q.type === 'true_false' ? 'verdadeiro/falso (transcreve APENAS V ou F)'
      : q.type === 'fill_blank' ? 'preenchimento de espaços (transcreve o que o aluno escreveu)'
      : 'resposta escrita (transcreve fielmente, à letra, o que o aluno escreveu)'
    return `Q${q.index} [${kind}]: ${q.text.slice(0, 160)}${opts}`
  }).join('\n')

  return `És um assistente de transcrição rigoroso. Recebes FOTOGRAFIAS de uma prova em papel já preenchida por um aluno. O teste é CONHECIDO (lista abaixo) — a tua tarefa é transcrever APENAS as RESPOSTAS do aluno, questão a questão, tal como estão escritas no papel. NUNCA inventes, completes ou corrijas a resposta do aluno; transcreve exactamente o que vês, erros incluídos.

QUESTÕES DO TESTE (não as transcrevas — servem só para localizares cada resposta):
${list}

REGRAS:
- Para escolha múltipla e V/F: identifica a opção assinalada (bolha preenchida, círculo, X, ou letra escrita) e devolve só a letra (A/B/C/D) ou V/F. Se nada estiver assinalado, devolve "" com confidence baixa.
- Para respostas escritas: transcreve à letra, mantendo a ortografia do aluno (mesmo com erros). Onde não conseguires ler uma palavra, escreve [?] no lugar e marca illegible:true.
- confidence (0.0–1.0): quão seguro estás da transcrição dessa resposta. Manuscrito difícil, rasuras ou foto tremida → confiança baixa.
- Lê também o cabeçalho para o nome/número/turma do aluno, se visíveis.
- É melhor marcar illegible/confiança baixa do que adivinhar.

Responde APENAS com JSON válido (sem markdown):
{"student":{"name":"","number":"","class":""},"answers":{"<índice>":{"text":"","confidence":0.0,"illegible":false,"notes":""}}}`
}

/** Transcreve as respostas de uma prova em papel a partir de fotos (data-URIs). */
export async function transcribePaper(
  snapshot: TestSnapshot,
  images: string[],
): Promise<OcrResult | null> {
  if (!images.length) return null
  const prompt = buildOcrPrompt(snapshot)
  const providers = geminiProviders()
  if (!providers.length) return null

  for (const p of providers) {
    const text = await callVisionCompat(p.url, p.key, p.model, prompt, images, {
      label: `OCR:${p.label}`,
      systemPrompt: 'Transcritor fiel de provas manuscritas. Só JSON válido. Nunca inventes respostas.',
      maxTokens: 4096,
      timeoutMs: 60_000,
    })
    const parsed = text ? parseJsonObject(text) as {
      student?: { name?: string; number?: string; class?: string }
      answers?: Record<string, { text?: string; confidence?: number; illegible?: boolean; notes?: string }>
    } | null : null
    if (!parsed?.answers) continue

    const answers: Record<string, OcrAnswer> = {}
    const flagged: string[] = []
    for (const q of getAllQuestions(snapshot)) {
      const key = String(q.index)
      const a = parsed.answers[key] ?? {}
      const conf = Math.min(Math.max(0, Number(a.confidence) ?? 0), 1)
      const illegible = Boolean(a.illegible) || /\[\?\]/.test(String(a.text ?? ''))
      answers[key] = {
        text: String(a.text ?? '').trim(),
        confidence: conf,
        illegible,
        notes: a.notes ? String(a.notes) : undefined,
      }
      if (illegible || conf < OCR_REVIEW_THRESHOLD) flagged.push(key)
    }
    return {
      answers,
      student: {
        name: parsed.student?.name?.trim() || undefined,
        number: parsed.student?.number?.trim() || undefined,
        class: parsed.student?.class?.trim() || undefined,
      },
      needsReview: flagged.length > 0,
      flagged,
    }
  }
  return null
}
