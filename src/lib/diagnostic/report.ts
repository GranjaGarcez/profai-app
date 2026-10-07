/**
 * Gerador de relatório de diagnóstico — AGNÓSTICO AO DOMÍNIO.
 *
 * Transforma as estimativas do motor (por nó) e as respostas nos sinais num retrato:
 * fronteira real, concepções erradas, fluência, e — o mais importante — a leitura do
 * potencial de aprendizagem que distingue SUBESTIMULAÇÃO de DÉFICE ESTRUTURAL.
 * Puro, sem IA. PT-PT. Recebe o DomainGraph (rótulos, ordem) do domínio em causa.
 */

import { MISCONCEPTIONS } from "./misconceptions";
import type { NodeEstimate } from "./engine";
import type { DomainGraph } from "./domainTypes";

export interface ReportNode {
  node_code: string;
  label: string;
  minYear: number;
  maxYear: number;
  mastery: NodeEstimate["mastery"];
  fluency_level: NodeEstimate["fluency_level"];
  learning_potential_index: number | null;
}

export interface ReportMisconception {
  code: string;
  label: string;
  remediation: string;
  count: number;
  nodes: string[];
}

export type PotentialReading = "subestimulacao" | "estrutural" | "misto" | "indeterminado";

// ── Visão Simples da Leitura (Gough & Tunmer): Compreensão = Descodificação × Linguagem ──
// Só para o domínio Português. Separa o sinal em dois factores para distinguir
// um estrangulamento de DESCODIFICAÇÃO (mecânica da leitura) de um défice de
// COMPREENSÃO DA LINGUAGEM (vocabulário/experiência — o marcador de subestimulação).
export type ReadingAxis = "descodificacao" | "linguagem" | "ambos" | "equilibrado" | "indeterminado";
export type AxisLevel = "frágil" | "em desenvolvimento" | "sólido" | "não medido";

export interface ReadingProfile {
  decoding: { score: number | null; level: AxisLevel };
  languageComprehension: { score: number | null; level: AxisLevel };
  axis: ReadingAxis;
  note: string;
}

export interface DiagnosticReport {
  frontier: ReportNode[];
  frontierYear: number | null;
  mastered: ReportNode[];
  deficits: ReportNode[];
  misconceptions: ReportMisconception[];
  fluency: { node_code: string; label: string; level: string }[];
  potential: { mean: number | null; reading: PotentialReading };
  readingProfile?: ReadingProfile;
  plan: string[];
  summary: string;
}

// Membros de cada factor da Visão Simples (códigos estáveis do grafo de Português).
const DECODING_NODES = new Set(["PT.FLUENCIA_LEITORA"]);
const LANGUAGE_NODES = new Set(["PT.LEXICO", "PT.COMP_LITERAL", "PT.COMP_INFERENCIAL", "PT.COMP_CRITICA"]);

function masteryScore(m: NodeEstimate["mastery"]): number | null {
  if (m === "mastered") return 1;
  if (m === "frontier") return 0.55;
  if (m === "deficit") return 0.2;
  return null; // not_reached → não avaliado
}
function axisLevel(score: number | null): AxisLevel {
  if (score == null) return "não medido";
  if (score >= 0.7) return "sólido";
  if (score >= 0.45) return "em desenvolvimento";
  return "frágil";
}

/** Perfil de leitura pela Visão Simples; só faz sentido no domínio Português. */
function buildReadingProfile(estimates: NodeEstimate[], potential: PotentialReading): ReadingProfile {
  const avg = (codes: Set<string>) => {
    const vals = estimates.filter((e) => codes.has(e.node_code)).map((e) => masteryScore(e.mastery)).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const dScore = avg(DECODING_NODES);
  const lScore = avg(LANGUAGE_NODES);
  const dLow = dScore != null && dScore < 0.45;
  const lLow = lScore != null && lScore < 0.45;

  // Só se classifica um eixo definido quando AMBOS os factores foram medidos.
  // Sem leitura em voz alta, a descodificação fica por medir → indeterminado (nunca
  // se afirma que a descodificação está preservada sem a ter medido).
  let axis: ReadingAxis = "indeterminado";
  if (dScore != null && lScore != null) {
    axis = dLow && lLow ? "ambos" : dLow ? "descodificacao" : lLow ? "linguagem" : "equilibrado";
  }

  const definedNotes: Record<Exclude<ReadingAxis, "indeterminado">, string> = {
    descodificacao:
      "O estrangulamento está na DESCODIFICAÇÃO (mecânica da leitura), com a compreensão da linguagem mais preservada. A memória de trabalho gasta-se a decifrar e sobra pouca para compreender — prioridade à fluência leitora; se persistir apesar do treino, ponderar rastreio de dislexia.",
    linguagem:
      "A descodificação está preservada mas a COMPREENSÃO DA LINGUAGEM (vocabulário, inferência) está abaixo — o perfil de «mau compreendedor». É o padrão mais consistente com exposição insuficiente à língua (subestimulação) e tem elevada margem de recuperação por enriquecimento lexical e de leitura dialogada.",
    ambos:
      "Ambos os factores estão frágeis (descodificação e linguagem). Convém tratar a fluência em paralelo com o vocabulário/compreensão e reavaliar antes de qualquer conclusão estrutural.",
    equilibrado: "Descodificação e compreensão da linguagem equilibradas no nível avaliado.",
  };

  let note: string;
  if (axis !== "indeterminado") {
    note = definedNotes[axis];
  } else if (lScore == null) {
    note =
      "Dados insuficientes para o perfil de leitura nesta sessão.";
  } else if (lLow) {
    // Linguagem fraca mas descodificação POR MEDIR — não se pode fechar o diferencial.
    note =
      "A COMPREENSÃO DA LINGUAGEM (vocabulário, inferência) está abaixo do esperado. Se a descodificação estiver intacta, é o perfil de «mau compreendedor» (exposição insuficiente à língua, muito recuperável); mas um défice de descodificação não tratado dá o mesmo resultado. Falta medir a descodificação com leitura em voz alta para fechar o diagnóstico diferencial.";
  } else {
    note =
      "A compreensão da linguagem está no nível esperado. Falta medir a descodificação (leitura em voz alta) para completar a Visão Simples da Leitura.";
  }
  // Cruzamento com a avaliação dinâmica: linguagem frágil + alto potencial = sinal forte de falta de estímulo.
  if ((axis === "linguagem" || (axis === "indeterminado" && lLow)) && potential === "subestimulacao") {
    note += " O potencial de aprendizagem medido com mediação reforça a leitura de subestimulação funcional.";
  }

  return {
    decoding: { score: dScore, level: axisLevel(dScore) },
    languageComprehension: { score: lScore, level: axisLevel(lScore) },
    axis,
    note,
  };
}

interface ResponseLike {
  node_code: string;
  misconception?: string | null;
}

function toReportNode(e: NodeEstimate, graph: DomainGraph): ReportNode {
  const n = graph.NODES[e.node_code];
  return {
    node_code: e.node_code,
    label: n?.label ?? e.node_code,
    minYear: n?.minYear ?? 0,
    maxYear: n?.maxYear ?? 0,
    mastery: e.mastery,
    fluency_level: e.fluency_level,
    learning_potential_index: e.learning_potential_index,
  };
}

export function generateReport(
  estimates: NodeEstimate[],
  responses: ResponseLike[] = [],
  opts: { studentLabel?: string; classYear?: number } = {},
  graph?: DomainGraph,
): DiagnosticReport {
  if (!graph) throw new Error("generateReport requer o DomainGraph do domínio.");
  const ORDER = graph.topologicalOrder();
  const orderIndex = (c: string) => ORDER.indexOf(c);

  const nodes = estimates.map((e) => toReportNode(e, graph));
  const frontier = nodes.filter((n) => n.mastery === "frontier").sort((a, b) => orderIndex(a.node_code) - orderIndex(b.node_code));
  const mastered = nodes.filter((n) => n.mastery === "mastered");
  const deficits = nodes.filter((n) => n.mastery === "deficit").sort((a, b) => orderIndex(a.node_code) - orderIndex(b.node_code));

  const lowest = frontier[0] ?? deficits[0] ?? null;
  const frontierYear = lowest ? lowest.minYear : null;

  const miscMap = new Map<string, ReportMisconception>();
  const addMisc = (code: string, node: string) => {
    const def = MISCONCEPTIONS[code];
    if (!def) return;
    const cur = miscMap.get(code) ?? { code, label: def.label, remediation: def.remediation, count: 0, nodes: [] };
    cur.count += 1;
    if (!cur.nodes.includes(node)) cur.nodes.push(node);
    miscMap.set(code, cur);
  };
  if (responses.length) {
    for (const r of responses) if (r.misconception) addMisc(r.misconception, r.node_code);
  } else {
    for (const e of estimates) if (e.dominant_misconception) addMisc(e.dominant_misconception, e.node_code);
  }
  const misconceptions = [...miscMap.values()].sort((a, b) => b.count - a.count);

  const fluency = nodes
    .filter((n) => n.fluency_level)
    .map((n) => ({ node_code: n.node_code, label: n.label, level: n.fluency_level as string }));

  const pots = [...frontier, ...deficits].map((n) => n.learning_potential_index).filter((v): v is number => v != null);
  const mean = pots.length ? pots.reduce((a, b) => a + b, 0) / pots.length : null;
  let reading: PotentialReading = "indeterminado";
  if (mean != null) reading = mean >= 0.6 ? "subestimulacao" : mean <= 0.3 ? "estrutural" : "misto";

  const plan: string[] = [];
  const targets = [...frontier, ...deficits].sort((a, b) => orderIndex(a.node_code) - orderIndex(b.node_code)).slice(0, 4);
  for (const t of targets) {
    const misc = misconceptions.find((m) => m.nodes.includes(t.node_code));
    let step = `Consolidar «${t.label}» (nível ~${t.minYear}.º ano).`;
    if (misc) step += ` Trabalhar a concepção «${misc.label}»: ${misc.remediation}`;
    plan.push(step);
  }
  const slowFluency = fluency.filter((f) => f.level !== "automatizado");
  if (slowFluency.length) {
    plan.push(`Treinar a automatização: ${slowFluency.map((f) => f.label.toLowerCase()).join(", ")} (a memória de trabalho está a gastar-se no que devia ser automático).`);
  }

  const who = opts.studentLabel ? `O(A) ${opts.studentLabel}` : "O aluno";
  const cy = opts.classYear;
  const parts: string[] = [];
  if (lowest && frontierYear != null) {
    const gap = cy ? ` — muito abaixo do ${cy}.º ano` : "";
    parts.push(`${who} domina as bases até à fronteira, que está em «${lowest.label}», ao nível de ~${frontierYear}.º ano${gap}.`);
  } else if (mastered.length && !frontier.length && !deficits.length) {
    parts.push(`${who} dominou todos os nós avaliados — sem fronteira detectada nesta sessão.`);
  } else {
    parts.push(`${who}: não foi possível localizar uma fronteira clara nesta sessão.`);
  }
  const readingText: Record<PotentialReading, string> = {
    subestimulacao:
      "Aprendeu depressa com mediação (pouca ajuda até acertar) — o perfil aponta para SUBESTIMULAÇÃO funcional, com grande margem de recuperação por intervenção pedagógica dirigida.",
    estrutural:
      "Mesmo com mediação teve dificuldade em consolidar — reforça a hipótese de limitação mais estrutural; fundamenta encaminhamento ao SPO para avaliação especializada.",
    misto: "Resposta à mediação mista — recomenda-se um ciclo de intervenção de 6–8 semanas e reavaliação antes de qualquer conclusão.",
    indeterminado: "Sem dados de avaliação dinâmica suficientes para ler o potencial de aprendizagem nesta sessão.",
  };
  parts.push(readingText[reading]);
  if (misconceptions.length) parts.push(`Concepção errada dominante: «${misconceptions[0].label}».`);

  // Perfil pela Visão Simples da Leitura — só no domínio Português.
  const readingProfile = graph.domain === "portugues" ? buildReadingProfile(estimates, reading) : undefined;
  if (readingProfile) {
    const hasFinding =
      ["descodificacao", "linguagem", "ambos"].includes(readingProfile.axis) ||
      (readingProfile.axis === "indeterminado" && readingProfile.languageComprehension.level === "frágil");
    if (hasFinding) parts.push(readingProfile.note);
  }
  const summary = parts.join(" ");

  return { frontier, frontierYear, mastered, deficits, misconceptions, fluency, potential: { mean, reading }, readingProfile, plan, summary };
}

// ── Comparação pré/pós (resposta à intervenção) ────────────────────────────────

const MASTERY_RANK: Record<string, number> = { not_reached: 0, deficit: 1, frontier: 2, mastered: 3 };

function frontierYearOf(estimates: NodeEstimate[], graph: DomainGraph, orderIndex: (c: string) => number): number | null {
  const fr = estimates.filter((e) => e.mastery === "frontier").sort((a, b) => orderIndex(a.node_code) - orderIndex(b.node_code));
  const df = estimates.filter((e) => e.mastery === "deficit").sort((a, b) => orderIndex(a.node_code) - orderIndex(b.node_code));
  const lowest = fr[0] ?? df[0];
  return lowest ? graph.NODES[lowest.node_code]?.minYear ?? null : null;
}

export interface NodeChange {
  node_code: string;
  label: string;
  from: string;
  to: string;
}

export interface DiagnosticComparison {
  preFrontierYear: number | null;
  posFrontierYear: number | null;
  improved: NodeChange[];
  regressed: NodeChange[];
  summary: string;
}

/** Compara um momento anterior (pré) com o actual (pós). */
export function generateComparison(pre: NodeEstimate[], pos: NodeEstimate[], graph: DomainGraph): DiagnosticComparison {
  const ORDER = graph.topologicalOrder();
  const orderIndex = (c: string) => ORDER.indexOf(c);
  const preBy = new Map(pre.map((e) => [e.node_code, e]));
  const improved: NodeChange[] = [];
  const regressed: NodeChange[] = [];

  for (const p of pos) {
    const before = preBy.get(p.node_code);
    if (!before) continue;
    const rb = MASTERY_RANK[before.mastery] ?? 0;
    const ra = MASTERY_RANK[p.mastery] ?? 0;
    if (rb === 0 || ra === 0) continue;
    if (ra === rb) continue;
    const ch: NodeChange = { node_code: p.node_code, label: graph.NODES[p.node_code]?.label ?? p.node_code, from: before.mastery, to: p.mastery };
    (ra > rb ? improved : regressed).push(ch);
  }
  improved.sort((a, b) => orderIndex(a.node_code) - orderIndex(b.node_code));
  regressed.sort((a, b) => orderIndex(a.node_code) - orderIndex(b.node_code));

  const preY = frontierYearOf(pre, graph, orderIndex);
  const posY = frontierYearOf(pos, graph, orderIndex);

  const parts: string[] = [];
  if (preY != null && posY != null && posY !== preY) {
    parts.push(posY > preY ? `A fronteira subiu de ~${preY}.º para ~${posY}.º ano.` : `A fronteira recuou de ~${preY}.º para ~${posY}.º ano.`);
  } else if (preY != null && posY != null) {
    parts.push(`A fronteira manteve-se em ~${posY}.º ano.`);
  }
  if (improved.length) parts.push(`${improved.length} ${improved.length === 1 ? "competência melhorou" : "competências melhoraram"}.`);
  if (regressed.length) parts.push(`${regressed.length} ${regressed.length === 1 ? "regrediu" : "regrediram"}.`);
  if (!improved.length && !regressed.length) parts.push("Sem alterações de nível entre os dois momentos.");

  return { preFrontierYear: preY, posFrontierYear: posY, improved, regressed, summary: parts.join(" ") };
}
