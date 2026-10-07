/**
 * Normalização e classificação de respostas — Diagnóstico
 *
 * Em resposta aberta, o aluno escreve livremente ("2,0", "2", "8,25 €", "9 400 m").
 * Aqui reduzimos a uma forma canónica para comparar com a chave, e classificamos
 * a resposta (correcta? que concepção errada?). Determinístico — sem IA.
 */

export type ResponseType = "mcq" | "open_numeric" | "open_fraction" | "open_text" | "audio_reading";

export interface DiagItem {
  id: string;
  node_code: string;
  stem: string;
  response_type: ResponseType;
  // MCQ
  options?: string[] | null;
  correct_index?: number | null;
  option_misconceptions?: Record<string, string> | null;
  // Abertos
  answer?: string | null;
  wrong_answers?: Record<string, string> | null;
  // open_text: chave de palavras-âncora. Cada grupo = sinónimos/raízes aceites;
  // correcto se forem apanhados ≥ `min` grupos (por omissão, todos).
  anchors?: { groups: string[][]; min?: number } | null;
  // Comuns
  hints: string[];
  difficulty: string;
  is_fluency: boolean;
  target_latency_ms?: number | null;
  allow_calculator?: boolean;
  // Compreensão leitora: texto-base associado (diag_texts.id)
  text_id?: string | null;
}

export interface AnswerResult {
  correct: boolean;
  /** Código de concepção errada, se a resposta dada corresponder a um erro conhecido. */
  misconception?: string;
}

/** Forma canónica de um número escrito por um aluno; null se não parecer número. */
export function canonNumber(raw: string): string | null {
  if (raw == null) return null;
  // minúsculas, sem espaços (incl. inquebráveis), vírgula → ponto
  let s = String(raw)
    .toLowerCase()
    .replace(/[\s  ]/g, "")
    .replace(",", ".");
  // remover tudo o que não seja dígito, ponto ou sinal (tira €, m, km, etc.)
  s = s.replace(/[^0-9.\-]/g, "");
  if (s === "" || s === "-" || s === ".") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return String(n); // Number() colapsa "2.0"→"2", "9350"→"9350"
}

/** Forma canónica de uma fração "a/b" reduzida; null se não for fração. */
export function canonFraction(raw: string): string | null {
  if (raw == null) return null;
  const s = String(raw).replace(/[\s  ]/g, "");
  const m = s.match(/^(-?\d+)\/(\d+)$/);
  if (!m) return null;
  let a = parseInt(m[1], 10);
  let b = parseInt(m[2], 10);
  if (b === 0) return null;
  const sign = a < 0 ? -1 : 1;
  a = Math.abs(a);
  const g = gcd(a, b) || 1;
  return `${sign * (a / g)}/${b / g}`;
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

/** Texto canónico: minúsculas, sem acentos, pontuação → espaço, espaços colapsados. */
export function canonText(raw: string): string {
  return String(raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Um termo (raiz) é apanhado se alguma palavra do texto começa por ele (apanha flexões). */
function termHit(normText: string, term: string): boolean {
  const t = canonText(term);
  if (!t) return false;
  // fronteira de palavra à esquerda + prefixo (ex.: "opini" apanha opinião/opiniões/opinar)
  return new RegExp(`(^|\\s)${t.replace(/\s+/g, "\\s+")}`).test(normText);
}

/** Conta quantos grupos de âncoras foram apanhados na resposta. */
export function matchAnchors(given: string, anchors: { groups: string[][]; min?: number }): { matched: number; need: number } {
  const norm = canonText(given);
  let matched = 0;
  for (const group of anchors.groups ?? []) {
    if (group.some((term) => termHit(norm, term))) matched++;
  }
  const need = anchors.min ?? (anchors.groups?.length ?? 0);
  return { matched, need };
}

/** Compara uma resposta aberta à chave, conforme o tipo. */
function openMatches(rt: ResponseType, given: string, key: string): boolean {
  if (rt === "open_fraction") {
    const g = canonFraction(given);
    const k = canonFraction(key);
    return g != null && k != null && g === k;
  }
  const g = canonNumber(given);
  const k = canonNumber(key);
  return g != null && k != null && g === k;
}

/**
 * Classifica a resposta do aluno a um item.
 * - MCQ: `given` é o valor da opção escolhida (ou o seu índice em texto).
 * - Abertos: `given` é o texto escrito.
 */
export function classifyAnswer(item: DiagItem, given: string): AnswerResult {
  if (item.response_type === "mcq") {
    const opts = item.options ?? [];
    let idx = opts.indexOf(given);
    if (idx === -1 && /^\d+$/.test(given.trim())) idx = Number(given.trim()); // aceita índice
    const correct = idx === item.correct_index;
    const misc =
      !correct && idx >= 0 ? item.option_misconceptions?.[String(idx)] : undefined;
    return { correct, misconception: misc ?? undefined };
  }

  // Resposta escrita (open_text): correcção por palavras-âncora (determinística).
  // O texto do aluno fica guardado para o professor ler — a âncora é o sinal automático.
  if (item.response_type === "open_text") {
    const anchors = item.anchors;
    if (!anchors || !(anchors.groups?.length)) return { correct: false };
    const { matched, need } = matchAnchors(given, anchors);
    return { correct: matched >= need };
  }

  // Abertos numéricos
  const correct = item.answer != null && openMatches(item.response_type, given, item.answer);
  if (correct) return { correct: true };
  for (const [wrong, code] of Object.entries(item.wrong_answers ?? {})) {
    if (openMatches(item.response_type, given, wrong)) return { correct: false, misconception: code };
  }
  return { correct: false };
}
