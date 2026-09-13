// Rubricas analíticas para correcção automática de qualidade.
// O modelo devolve CAMPOS ESTRUTURADOS (critérios com pontos, resposta esperada, erros
// frequentes, cotação parcial); a rubrica final é montada em código — formato
// determinístico, soma exacta = cotação, escolha múltipla sem cotação parcial — no
// formato "(Npt)" que fixMarkSchemeSum e o corrector já entendem.
import { buildProviders, onCooldown, callOpenAICompat, parseJsonObject, type Provider } from '@/lib/ai/cascade'

export interface RubricInput {
  index: number
  type: string
  text: string
  options?: unknown
  correctAnswer?: unknown
  points: number
  markScheme?: string
}

export interface RubricMeta { subject: string; yearLevel: number; topic: string }

const CLOSED_TYPES = new Set(['multiple_choice', 'true_false'])
const PARCEL_RE = /\(\s*\d+(?:[.,]\d+)?\s*(?:pts?|pontos?)\s*\)/gi

/** Rubrica "substancial": aberta com ≥2 parcelas e corpo; fechada com chave, cotação e "Errada = 0pt". */
export function isRichMarkScheme(ms: unknown): boolean {
  if (typeof ms !== 'string') return false
  const s = ms.trim()
  if (s.length < 90) return false
  const parcels = (s.match(PARCEL_RE) ?? []).length
  const closed = /Resposta:\s*[^.(]{1,40}\(\s*\d+\s*pts?\s*\)/i.test(s) && /Errada\s*=\s*0\s*pt/i.test(s)
  return parcels >= 2 || closed
}

/** Precisa de enriquecimento: rubrica pobre, ou sem resposta esperada / análise de distratores. */
export function needsRubric(ms: unknown): boolean {
  return !isRichMarkScheme(ms) || !/Resposta esperada:|Distratores:/.test(String(ms))
}

function buildRubricPrompt(qs: RubricInput[], meta: RubricMeta): string {
  const list = qs.map(q => {
    const opts = Array.isArray(q.options) && q.options.length ? `\n   Opções: ${q.options.map(String).join(' | ')}` : ''
    return `${q.index}. [${CLOSED_TYPES.has(q.type) ? 'FECHADA' : 'ABERTA'} | ${q.type} | ${q.points} pontos]\n   Enunciado: ${String(q.text).replace(/\s+/g, ' ').slice(0, 700)}${opts}\n   Resposta: ${String(q.correctAnswer ?? '').slice(0, 400)}`
  }).join('\n\n')

  return `És um professor de ${meta.subject} do ${meta.yearLevel}.º ano em Portugal, especialista em avaliação. Para cada questão abaixo (tema: "${meta.topic}") escreve os elementos de uma RUBRICA DE CORRECÇÃO de qualidade excepcional, para correcção automática rigorosa e justa.

Para questões ABERTAS devolve:
• "criterios": 2 a 5 critérios analíticos concretos — o que a resposta TEM de conter — cada um com "p" (pontos inteiros); a soma deve ser a cotação da questão.
• "esperada": os elementos essenciais da resposta modelo, com a terminologia das Aprendizagens Essenciais (1-3 frases).
• "erros": 2-3 erros típicos de alunos deste ano e como se cotam.
• "parcial": o que vale uma resposta incompleta, com um exemplo concreto.
Para questões FECHADAS (escolha múltipla / verdadeiro-falso) devolve:
• "esperada": justificação científica da opção correcta (1-2 frases).
• "erros": o erro conceptual que cada opção errada induz (uma frase por opção).
• "criterios": [] e "parcial": "" (não há cotação parcial).

Regras: Português de Portugal estrito (correcção, actividade, objectivo — nunca formas brasileiras); rigor científico absoluto; nível do ${meta.yearLevel}.º ano; sem markdown; não uses "pt"/"pontos" dentro dos textos.

QUESTÕES:
${list}

Responde APENAS com JSON válido:
{"itens":[{"index":1,"criterios":[{"c":"...","p":2}],"esperada":"...","erros":"...","parcial":"..."}]} — uma entrada por questão, todos os índices.`
}

// Reparte "points" pelos critérios proporcionalmente aos pesos sugeridos, em inteiros
// com soma exacta (maior resto), garantindo ≥1 ponto por critério quando possível.
function allocate(weights: number[], points: number): number[] {
  const n = weights.length
  if (n === 0 || points <= 0) return []
  if (points <= n) return weights.map((_, i) => (i < points ? 1 : 0))
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0) || n
  const w = weights.map(x => (Math.max(0, x) || total / n) / total)
  const raw = w.map(x => Math.max(1, x * points))
  const floors = raw.map(Math.floor)
  let rem = points - floors.reduce((a, b) => a + b, 0)
  const order = raw.map((v, i) => ({ i, frac: v - floors[i] })).sort((a, b) => b.frac - a.frac)
  const out = [...floors]
  for (let k = 0; rem > 0; k = (k + 1) % n, rem--) out[order[k].i] += 1
  while (rem < 0) { const j = out.indexOf(Math.max(...out)); out[j] -= 1; rem++ }
  return out
}

type Item = { index?: unknown; criterios?: unknown; esperada?: unknown; erros?: unknown; parcial?: unknown }
const str = (v: unknown, max = 600) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const sentence = (s: string) => (s && !/[.!?]$/.test(s) ? `${s}.` : s)

function assemble(q: RubricInput, it: Item): string | null {
  const esperada = str(it.esperada)
  const erros = str(it.erros)
  if (esperada.length < 20) return null
  if (CLOSED_TYPES.has(q.type)) {
    const key = str(q.correctAnswer, 40) || '?'
    return `Resposta: ${key} (${q.points}pt). ${sentence(esperada)} Distratores: ${sentence(erros) || 'as restantes opções contrariam o conceito avaliado.'} Errada = 0pt.`
  }
  const crit = (Array.isArray(it.criterios) ? it.criterios : [])
    .map(c => ({ c: str((c as { c?: unknown })?.c, 160).replace(/[.;:,\s]+$/, ''), p: Number((c as { p?: unknown })?.p) || 0 }))
    .filter(c => c.c.length >= 4)
    .slice(0, 5)
  if (crit.length < 2) return null
  const pts = allocate(crit.map(c => c.p), q.points)
  const parcial = str(it.parcial)
  return `${crit.map((c, i) => `${c.c} (${pts[i]}pt)`).join(' + ')}. Resposta esperada: ${sentence(esperada)} Erros frequentes: ${sentence(erros) || 'respostas vagas sem terminologia científica (0pt nesse critério).'}${parcial ? ` Cotação parcial: ${sentence(parcial)}` : ''}`
}

/**
 * Gera rubricas para as questões dadas. Gemini (qualidade) e Groq 20b (2 s) arrancam em
 * PARALELO: usa-se o Gemini se responder dentro do prazo; senão o resultado do Groq já
 * está pronto — sem somar timeouts. Devolve Map index → markScheme montado.
 */
export async function enrichMarkSchemes(qs: RubricInput[], meta: RubricMeta, timeoutMs: number): Promise<Map<number, string>> {
  const empty = new Map<number, string>()
  if (qs.length === 0) return empty
  const all = buildProviders().filter(p => !onCooldown(p))
  const gemini = ['gemini-1', 'gemini-2', 'gemini-3'].map(id => all.find(p => p.id === id)).find((p): p is Provider => !!p)
  const groq = all.find(p => p.id === 'groq-gpt-oss-20b')
  if (!gemini && !groq) return empty

  const prompt = buildRubricPrompt(qs, meta)
  const maxTokens = Math.min(6_000, 300 + qs.length * 320)
  const byIndex = new Map(qs.map(q => [q.index, q]))

  const attempt = async (p: Provider): Promise<Map<number, string>> => {
    const text = await callOpenAICompat(p.url, p.key, p.model, prompt, timeoutMs, `${p.label} [rubricas]`, p.headers ?? {}, null, maxTokens, p.extraBody)
    const obj = text ? parseJsonObject(text) as { itens?: unknown } | null : null
    const itens = Array.isArray(obj?.itens) ? (obj.itens as Item[]) : []
    const m = new Map<number, string>()
    for (const it of itens) {
      const q = byIndex.get(Number(it.index))
      if (!q) continue
      const ms = assemble(q, it)
      if (ms && isRichMarkScheme(ms)) m.set(q.index, ms)
    }
    return m
  }
  const enough = (m: Map<number, string>) => m.size >= Math.ceil(qs.length / 2)

  const gemP = gemini ? attempt(gemini) : Promise.resolve(empty)
  const groqP = groq ? attempt(groq) : Promise.resolve(empty)
  const g = await gemP
  if (enough(g)) return g
  const r = await groqP
  if (enough(r)) return r
  return g.size >= r.size ? g : r
}
