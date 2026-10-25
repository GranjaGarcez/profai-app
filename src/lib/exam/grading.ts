import type { Question, GradingDetail, RubricCriterion, TestSnapshot } from './types'
import { getAllQuestions } from './types'
import { fixMarkSchemeSum } from './markScheme'
import { buildProviders, geminiProviders, callOpenAICompat, parseJsonObject, onCooldown, type Provider } from '@/lib/ai/cascade'

// Correcção: chaves Gemini com quota (rotação + cooldown partilhado com a geração),
// depois Groq gpt-oss-20b (o llama-3.3-70b-versatile foi removido do Groq → 404).
function gradingProviders(): Provider[] {
  const groq = buildProviders().find(p => p.id === 'groq-gpt-oss-20b')
  return [...geminiProviders(), ...(groq && !onCooldown(groq) ? [groq] : [])]
}

// ── Correcção automática MCQ / V-F ────────────────────────────────────────────
function gradeObjective(q: Question, rawAnswer: string): GradingDetail {
  const answer = rawAnswer.trim().toUpperCase()
  const correct = q.correctAnswer.trim().toUpperCase()

  // Normaliza opções: aceita "A", "A)", "A. texto", "Verdadeiro", "V", "True"
  let isCorrect = answer === correct

  // Verdadeiro / Falso — variantes aceites
  if (q.type === 'true_false') {
    const truthy = ['V', 'VERDADEIRO', 'TRUE', 'T']
    const falsy  = ['F', 'FALSO', 'FALSE']
    const normAnswer  = truthy.includes(answer) ? 'V' : falsy.includes(answer)  ? 'F' : answer
    const normCorrect = truthy.includes(correct) ? 'V' : falsy.includes(correct) ? 'F' : correct
    isCorrect = normAnswer === normCorrect
  }

  return {
    score:  isCorrect ? q.points : 0,
    max:    q.points,
    feedback: isCorrect ? 'Correcto.' : `Resposta correcta: ${q.correctAnswer}`,
    auto:   true,
  }
}

// Clamp cada critério ao seu max e devolve undefined se input vazio
function clampRubric(rubric: RubricCriterion[] | undefined): RubricCriterion[] | undefined {
  if (!rubric?.length) return undefined
  return rubric.map(r => ({
    criterion: r.criterion,
    max: Number(r.max) || 0,
    score: Math.min(Math.max(0, Number(r.score) || 0), Number(r.max) || 0),
  }))
}

// ── Nota de correcção específica por disciplina ────────────────────────────────
function gradingSubjectNote(subject: string): string {
  const s = subject.toLowerCase()
  if (s.includes('inglês') || s.includes('ingles') || s.includes('espanhol') || s.includes('francês') || s.includes('frances')) {
    const lang = (s.includes('inglês') || s.includes('ingles')) ? 'Inglês'
      : s.includes('espanhol') ? 'Espanhol' : 'Francês'
    return `\nNOTA ESPECÍFICA — LÍNGUA ESTRANGEIRA (${lang}):
- A resposta do aluno DEVE estar escrita em ${lang}. Se estiver em português quando a questão pedia resposta em ${lang}, penaliza fortemente o critério de cumprimento da tarefa, mesmo que o conteúdo em português esteja certo.
- Avalia gramática e ortografia segundo as normas do ${lang}, nunca do português.
- Pequenos erros gramaticais que não comprometem a compreensão → cotação parcial generosa (regra 8, in dubio pro disculpo).
- O "feedback" que escreves continua em Português de Portugal — só a resposta do aluno é avaliada em ${lang}.`
  }
  if (s.includes('educação física') || s.includes('educacao fisica')) {
    return `\nNOTA ESPECÍFICA — EDUCAÇÃO FÍSICA (componente teórica):
- Avalia apenas conhecimento teórico (regras, conceitos, fisiologia do exercício) — esta é a componente escrita, sem execução motora.
- Aceita terminologia desportiva equivalente (ex: "remate" e "finalização" no futebol são intermutáveis).`
  }
  if (s.includes('educação visual') || s.includes('educacao visual')) {
    return `\nNOTA ESPECÍFICA — EDUCAÇÃO VISUAL (componente teórica):
- Avalia conhecimento teórico, análise e justificação estética — esta é a componente escrita, sem produção plástica.
- Aceita terminologia visual equivalente desde que usada correctamente no contexto.`
  }
  if (s.includes('educação tecnológica') || s.includes('educacao tecnologica')) {
    return `\nNOTA ESPECÍFICA — EDUCAÇÃO TECNOLÓGICA (componente teórica):
- Avalia conhecimento teórico de materiais, processos e soluções técnicas — esta é a componente escrita, sem execução prática.
- Aceita soluções técnicas alternativas tecnicamente válidas, mesmo que diferentes da resposta modelo.`
  }
  // ATENÇÃO: 'tic' é substring de "matemática"/"artística" — usa SEMPRE fronteira de palavra.
  if (/\btic\b/.test(s)) {
    return `\nNOTA ESPECÍFICA — TIC (componente teórica):
- Avalia conhecimento teórico de segurança digital, pesquisa, comunicação e pensamento computacional — esta é a componente escrita, sem execução num computador real.
- Em questões de algoritmo/pseudocódigo, aceita qualquer solução logicamente correcta, mesmo que a sintaxe ou notação seja diferente da resposta modelo.
- Aceita terminologia técnica equivalente (ex: "memória RAM" e "memória principal" são intermutáveis).`
  }
  return ''
}

// ── Correcção por IA (resposta aberta) ────────────────────────────────────────
async function gradeOpenWithAI(
  q: Question,
  rawAnswer: string,
  subject: string,
  calcHistory?: string,   // formatted calc log, e.g. "1. sin(30) = 0.5 | 2. 3 × 4 = 12"
): Promise<GradingDetail> {
  const trimmed = rawAnswer.trim()
  if (!trimmed && !calcHistory) {
    return { score: 0, max: q.points, feedback: 'Sem resposta.', auto: true, ai_confidence: 1 }
  }

  const calcSection = calcHistory
    ? `\nCÁLCULOS EFECTUADOS NA CALCULADORA (registo cronológico bruto):
${calcHistory}

COMO INTERPRETAR ESTE REGISTO:
- O registo é bruto: pode conter teclas erradas, tentativas canceladas ou cálculos mentais verificados.
- Procura a sequência coerente que conduz ao resultado — ignora entradas isoladas ou sem relação com a questão.
- Se um passo intermédio não aparece (ex: o aluno escreve "16" sem mostrar "4×4"), trata-o como cálculo mental legítimo.
- Só penalizes cálculos da calculadora se forem claramente contraditórios com a resolução apresentada.`
    : ''

  const isLong = q.type === 'long_answer'

  // Defesa final antes da IA corrigir: garante que os critérios somam sempre
  // q.points, mesmo que a questão venha de geração antiga, edição manual do
  // professor, ou importação — um markScheme inconsistente confunde o modelo
  // e pode impedir a correcção automática de devolver uma rubrica coerente.
  const markScheme = fixMarkSchemeSum(q.markScheme, q.points)

  const rubricInstruction = isLong ? `
RUBRICA OBRIGATÓRIA: O markScheme contém critérios com pontuação máxima (ex: "Tese (7pt) + Argumentação (16pt)...").
Identifica cada critério e avalia-o individualmente. Devolve o array "rubric" com todos os critérios encontrados.
A soma dos "score" da rubrica DEVE ser igual ao "score" total.` : ''

  // Completar espaços: avaliar pelo SIGNIFICADO, não por correspondência exacta —
  // sinónimos/equivalentes contam; só se exige o termo exacto se for técnico/científico.
  const fillBlankInstruction = q.type === 'fill_blank' ? `
COMPLETAR ESPAÇOS — avalia ESPAÇO A ESPAÇO, pelo SIGNIFICADO:
• A "Resposta certa" lista as palavras esperadas pela ORDEM dos espaços (separadas por vírgula); a resposta do aluno vem na mesma ordem. Associa cada preenchimento ao seu espaço.
• Reparte a cotação igualmente pelos espaços (cotação total ÷ n.º de espaços) e soma o que cada espaço merece — NUNCA "tudo ou nada" no conjunto.
• Dá a cotação de um espaço quando o aluno escreve um SINÓNIMO ou expressão SEMANTICAMENTE EQUIVALENTE no contexto da frase (ex.: "elevadas"="altas"; "escassez"="falta de"/"pouca"/"ausência"; "baixas"="frias"/"geladas"). Ignora maiúsculas/minúsculas, acentos e pequenos erros ortográficos.
• EXIGE o termo EXACTO só quando a palavra esperada é um termo técnico/científico preciso sem sinónimo aceitável (ex.: "fototropismo", "mitose", "fotossíntese", "isósceles") — aí, uma palavra diferente, ainda que relacionada, não conta.
• NÃO dês pontos a um espaço com significado errado ou oposto (ex.: "quantidade" quando se pede "escassez"; "quente" quando se pede "terrestre").` : ''

  const responseFormat = isLong
    ? `{"score": <total 0–${q.points}>, "rubric": [{"criterion": "<nome>", "score": <pontos>, "max": <máximo>}], "feedback": "<frase curta PT-PT>", "confidence": <0.0–1.0>}`
    : `{"score": <0–${q.points}>, "feedback": "<frase curta PT-PT>", "confidence": <0.0–1.0>}`

  const prompt = `És um professor experiente de ${subject} a corrigir a resposta de um aluno.

QUESTÃO: ${q.text}
TIPO: ${q.type}
COTAÇÃO MÁXIMA: ${q.points} pontos
CRITÉRIOS DE CORRECÇÃO: ${markScheme ?? q.correctAnswer}

RESPOSTA DO ALUNO: ${trimmed || '(sem texto)'}
${calcSection}
${gradingSubjectNote(subject)}
REGRAS DE CORRECÇÃO — aplica todas sem excepção:
1. Avalia o TRABALHO RELEVANTE, não a apresentação: o que conta é a estratégia correcta e o resultado, não a formatação ou a existência de todos os passos escritos.
2. Passos intermédios omitidos (ex: escrever "16" sem mostrar "4×4") são cálculo mental legítimo — não penalizes.
3. Aceita qualquer notação matematicamente equivalente: 3/4 = 0,75 = ¾ = 75% são todas correctas.
4. Não penalizes a ausência de fórmula explícita se o desenvolvimento evidencia o processo.
5. Penaliza APENAS o que a questão pede explicitamente — não inventes requisitos.
6. Erro de cálculo menor com raciocínio correcto → cotação parcial (≥ 50%).
7. Resultado correcto com método diferente do esperado → cotação máxima.
8. IN DUBIO PRO DISCIPULUM: em caso de dúvida genuína sobre se a resposta é correcta ou parcialmente correcta, decide sempre a favor do aluno. A confiança deve reflectir essa dúvida (valor baixo).
9. O histórico da calculadora mostra a estratégia usada, não um rascunho limpo — procura a linha coerente e ignora ruído.
10. O feedback deve ser uma frase curta, construtiva e em Português de Portugal.
${rubricInstruction}${fillBlankInstruction}

Responde APENAS com JSON válido (sem texto extra, sem markdown):
${responseFormat}`

  for (const p of gradingProviders()) {
    const text = await callOpenAICompat(
      p.url, p.key, p.model, prompt, 20_000, `Correcção:${p.label}`, p.headers ?? {},
      'Responde APENAS com JSON válido. Nunca adiciones texto extra.', 900, p.extraBody
    )
    const parsed = text ? parseJsonObject(text) as { score?: number; feedback?: string; confidence?: number; rubric?: RubricCriterion[] } | null : null
    if (!parsed) continue
    const rubric = clampRubric(parsed.rubric)
    const score  = rubric ? Math.min(rubric.reduce((s, r) => s + r.score, 0), q.points) : Math.min(Math.max(0, Number(parsed.score) || 0), q.points)
    return {
      score,
      max: q.points,
      feedback: parsed.feedback ?? '',
      rubric,
      auto: true,
      ai_confidence: p.id.startsWith('gemini') ? (parsed.confidence ?? 0.8) : Math.min(parsed.confidence ?? 0.7, 0.7),
    }
  }
  // Falha total — marcar para revisão manual
  return {
    score: 0,
    max: q.points,
    feedback: '⚠️ Não foi possível avaliar automaticamente. Revê manualmente.',
    auto: false,
    ai_confidence: 0,
  }
}

// ── Correcção de "completar espaços" — determinística primeiro ─────────────────
// Compara ESPAÇO A ESPAÇO de forma determinística (minúsculas, sem acentos) e só
// recorre à IA para os espaços que não batem exactamente (pode ser sinónimo). Isto
// elimina a aleatoriedade do modelo no caso comum: branco = 0, acerto exacto/caso =
// cotação cheia, tudo sem IA. Se não conseguir alinhar os espaços, cai na IA (não
// perde o comportamento anterior).
function normBlank(s: string): string {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[.,;:!?"'()«»]/g, '')
    .replace(/\s+/g, ' ')
}
const round2 = (n: number) => Math.round(n * 100) / 100

export async function gradeFillBlank(q: Question, rawAnswer: string, subject: string): Promise<GradingDetail> {
  const points = q.points
  const correct = String(q.correctAnswer ?? '').trim()
  if (!correct) return gradeOpenWithAI(q, rawAnswer, subject)   // sem gabarito → IA

  // Nº de espaços: conta os "____" do enunciado; alinha com o gabarito separado por vírgulas.
  const blanksInText = (String(q.text ?? '').match(/_{2,}/g) || []).length
  const expTokens = correct.split(/[,;]/).map(t => t.trim()).filter(Boolean)
  let expected: string[]
  if (blanksInText <= 1) expected = [correct]
  else if (expTokens.length === blanksInText) expected = expTokens
  else expected = expTokens.length > 1 ? expTokens : [correct]
  const n = expected.length

  // Divide a resposta do aluno em n tokens; se não alinhar, usa a IA (preserva tudo).
  const ans = String(rawAnswer ?? '')
  let given: string[] | null = null
  if (n === 1) given = [ans.trim()]
  else {
    const byComma = ans.split(/[,;]/).map(t => t.trim())
    if (byComma.length === n) given = byComma
    else {
      const byCommaE = ans.split(/[,;]|\s+e\s+/i).map(t => t.trim())
      if (byCommaE.length === n) given = byCommaE
    }
  }
  if (!given) return gradeOpenWithAI(q, rawAnswer, subject)

  const per = points / n
  let score = 0, exactCorrect = 0, empty = 0
  const ambiguous: Array<{ j: number; exp: string; got: string }> = []
  for (let i = 0; i < n; i++) {
    const got = (given[i] ?? '').trim()
    if (!got) { empty++; continue }                              // branco → 0 (determinístico)
    if (normBlank(got) === normBlank(expected[i])) { score += per; exactCorrect++; continue }
    ambiguous.push({ j: ambiguous.length + 1, exp: expected[i], got })
  }

  // Sem ambíguos → 100% determinístico (sem IA, sem aleatoriedade).
  if (ambiguous.length === 0) {
    return {
      score: round2(Math.min(points, score)), max: points,
      feedback: `${exactCorrect}/${n} espaços certos${empty ? `, ${empty} em branco` : ''}.`,
      auto: true, ai_confidence: 1,
    }
  }

  // Ambíguos → pergunta à IA SÓ por estes: são sinónimos aceitáveis no contexto?
  const prompt = `Questão de "completar espaços" de ${subject}. Frase: "${q.text}".
Para cada par [esperado → resposta do aluno], diz se a resposta do aluno é um SINÓNIMO ou equivalente ACEITÁVEL no contexto da frase (não exijas o termo exacto, salvo se for termo técnico/científico preciso sem sinónimo). Ignora maiúsculas e acentos.
Pares:
${ambiguous.map(a => `${a.j}. "${a.exp}" → "${a.got}"`).join('\n')}
Responde APENAS com JSON: {"aceites": [<números dos pares aceites>]}`
  let aiOk = false, accepted = 0
  for (const p of gradingProviders()) {
    const text = await callOpenAICompat(
      p.url, p.key, p.model, prompt, 15_000, `FillSyn:${p.label}`, p.headers ?? {},
      'Responde APENAS com JSON válido.', 300, p.extraBody,
    )
    const parsed = text ? parseJsonObject(text) as { aceites?: unknown } | null : null
    if (parsed && Array.isArray(parsed.aceites)) {
      const ok = new Set((parsed.aceites as unknown[]).map(x => Number(x)))
      for (const a of ambiguous) if (ok.has(a.j)) { score += per; accepted++ }
      aiOk = true
      break
    }
  }
  return {
    score: round2(Math.min(points, score)), max: points,
    feedback: aiOk
      ? `${exactCorrect + accepted}/${n} espaços válidos (sinónimos aceites quando aplicável)${empty ? `, ${empty} em branco` : ''}.`
      : `${exactCorrect}/${n} espaços certos; ${ambiguous.length} por confirmar (sinónimos) — revê.`,
    // Se a IA não respondeu, fica por rever (não penaliza injustamente os sinónimos).
    auto: aiOk, ai_confidence: aiOk ? 0.85 : 0,
  }
}

// ── Limitador global de concorrência da correção por IA ────────────────────────
// Protege a quota quando uma turma inteira submete quase ao mesmo tempo: em vez de
// disparar dezenas de chamadas Gemini em paralelo (→ 429 em cadeia → notas a 0),
// limita as chamadas simultâneas. Partilhado por todas as correções da instância.
const GRADING_CONCURRENCY = 4
let activeGrading = 0
const gradingQueue: Array<() => void> = []
function acquireGradingSlot(): Promise<void> {
  if (activeGrading < GRADING_CONCURRENCY) { activeGrading++; return Promise.resolve() }
  return new Promise(resolve => gradingQueue.push(resolve))
}
function releaseGradingSlot(): void {
  activeGrading = Math.max(0, activeGrading - 1)
  const next = gradingQueue.shift()
  if (next) { activeGrading++; next() }
}

// ── Correcção completa de uma submissão ───────────────────────────────────────
export async function gradeSubmission(
  snapshot: TestSnapshot,
  answers: Record<string, string>,
): Promise<{
  details: Record<string, GradingDetail>
  totalScore: number
  maxScore: number
  pending: number   // questões abertas que a IA NÃO conseguiu corrigir (quota/falha)
}> {
  const questions = getAllQuestions(snapshot)
  const details: Record<string, GradingDetail> = {}

  const tasks = questions.map(async q => {
    const key = String(q.index)
    const raw = answers[key] ?? ''
    const calcKey = `calc_${key}`
    const calcHistory = answers[calcKey] ?? undefined

    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      details[key] = gradeObjective(q, raw)
    } else {
      await acquireGradingSlot()
      try {
        details[key] = q.type === 'fill_blank'
          ? await gradeFillBlank(q, raw, snapshot.subject)
          : await gradeOpenWithAI(q, raw, snapshot.subject, calcHistory)
      } finally {
        releaseGradingSlot()
      }
    }
  })

  await Promise.all(tasks)

  const totalScore = Object.values(details).reduce((s, d) => s + d.score, 0)
  const maxScore   = questions.reduce((s, q) => s + q.points, 0)
  // "pending" = abertas marcadas auto:false (a IA não as conseguiu avaliar) →
  // a submissão NÃO deve ficar como "corrigida"; fica "por_corrigir" para re-tentar.
  const pending = Object.values(details).filter(d => d.auto === false).length

  return { details, totalScore, maxScore, pending }
}

// ── Re-correcção SELECTIVA ─────────────────────────────────────────────────────
// Re-corrige apenas as perguntas para as quais shouldRegrade() devolve true
// (ex.: só as afectadas por uma melhoria do motor) e PRESERVA tal como estavam as
// restantes — poupa tokens e não arrisca mexer no que já estava bem. Devolve a
// submissão inteira (perguntas re-corrigidas + preservadas) com o total recalculado.
export async function regradeSubmissionSelective(
  snapshot: TestSnapshot,
  answers: Record<string, string>,
  existing: Record<string, GradingDetail>,
  shouldRegrade: (q: Question) => boolean,
): Promise<{ details: Record<string, GradingDetail>; totalScore: number; maxScore: number; pending: number; regradedCount: number }> {
  const questions = getAllQuestions(snapshot)
  const details: Record<string, GradingDetail> = {}
  let regradedCount = 0

  const tasks = questions.map(async q => {
    const key = String(q.index)
    // Preserva se não é para re-corrigir E já existe correcção para a pergunta.
    if (!shouldRegrade(q) && existing[key]) { details[key] = existing[key]; return }
    regradedCount++
    const raw = answers[key] ?? ''
    const calcHistory = answers[`calc_${key}`] ?? undefined
    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      details[key] = gradeObjective(q, raw)
    } else {
      await acquireGradingSlot()
      try {
        details[key] = q.type === 'fill_blank'
          ? await gradeFillBlank(q, raw, snapshot.subject)
          : await gradeOpenWithAI(q, raw, snapshot.subject, calcHistory)
      } finally {
        releaseGradingSlot()
      }
    }
  })
  await Promise.all(tasks)

  const totalScore = Object.values(details).reduce((s, d) => s + d.score, 0)
  const maxScore   = questions.reduce((s, q) => s + q.points, 0)
  const pending    = Object.values(details).filter(d => d.auto === false).length
  return { details, totalScore, maxScore, pending, regradedCount }
}
