/**
 * Motor adaptativo de diagnóstico — AGNÓSTICO AO DOMÍNIO.
 *
 * Percorre a rede de pré-requisitos do domínio (DomainGraph) para localizar a
 * FRONTEIRA do aluno e cruza os sinais (precisão, latência, ajudas, padrão de erro).
 * Sem IA, sem BD: opera sobre itens já revistos e sobre o estado da sessão.
 *
 * Começa ao nível do ano (sem presumir a base), desce nos pré-requisitos quando
 * falha, sobe nos dependentes quando domina, e em cada nó que falha a frio corre um
 * item com ajudas graduadas (avaliação dinâmica → potencial de aprendizagem).
 */

import type { DomainGraph } from "./domainTypes";
import { type DiagItem, classifyAnswer } from "./normalize";

export interface NodeStat {
  attempts: number;
  correct: number;
  latencies: number[];
  misconceptions: Record<string, number>;
  dynamicHints: number | null;
  dynamicCorrect: boolean | null;
  // "pending_audio": leitura em voz alta recolhida, à espera da classificação do professor.
  resolved: null | "mastered" | "fragile" | "deficit" | "pending_audio";
}

export interface ResponseRecord {
  itemId: string;
  node: string;
  given: string;
  correct: boolean;
  latencyMs: number;
  hintsUsed: number;
  misconception?: string;
  phase: "probe" | "dynamic";
  /** Leitura em voz alta: não pontuada pelo motor (classificada pelo professor). */
  audio?: boolean;
}

export interface Step {
  done: boolean;
  item?: DiagItem;
  node?: string;
  phase?: "probe" | "dynamic";
  hintsAvailable?: number;
}

export interface NodeEstimate {
  node_code: string;
  mastery: "mastered" | "frontier" | "deficit" | "not_reached";
  fluency_level: "automatizado" | "em_construcao" | "nao_automatizado" | null;
  learning_potential_index: number | null;
  dominant_misconception: string | null;
}

const PROBES_FLUENCY = 1;
const PROBES_DEFAULT = 2;
const DEFAULT_MAX_ITEMS = 24;

export interface Session {
  graph: DomainGraph;
  year: number;
  maxItems: number;
  pool: Map<string, DiagItem[]>;
  stats: Record<string, NodeStat>;
  asked: Set<string>;
  queue: string[];
  enqueued: Set<string>;
  responses: ResponseRecord[];
  pendingDynamic: string | null;
}

function emptyStat(): NodeStat {
  return { attempts: 0, correct: 0, latencies: [], misconceptions: {}, dynamicHints: null, dynamicCorrect: null, resolved: null };
}

/** Cria uma sessão para um domínio, a partir dos itens revistos desse domínio. */
export function createSession(graph: DomainGraph, year: number, items: DiagItem[], maxItems = DEFAULT_MAX_ITEMS): Session {
  const pool = new Map<string, DiagItem[]>();
  for (const it of items) {
    const arr = pool.get(it.node_code) ?? [];
    arr.push(it);
    pool.set(it.node_code, arr);
  }
  const queue: string[] = [];
  const enqueued = new Set<string>();
  const seed = [...graph.startNodesForYear(year), ...graph.BASE_NODES];
  for (const n of seed) {
    if (!enqueued.has(n) && pool.has(n)) {
      queue.push(n);
      enqueued.add(n);
    }
  }
  return { graph, year, maxItems, pool, stats: {}, asked: new Set(), queue, enqueued, responses: [], pendingDynamic: null };
}

function stat(s: Session, node: string): NodeStat {
  return (s.stats[node] ??= emptyStat());
}

function unusedItem(s: Session, node: string): DiagItem | undefined {
  return (s.pool.get(node) ?? []).find((it) => !s.asked.has(it.id));
}

function probesNeeded(node: string, s: Session): number {
  const items = s.pool.get(node) ?? [];
  const fluency = items.some((it) => it.is_fluency);
  return Math.min(fluency ? PROBES_FLUENCY : PROBES_DEFAULT, items.length);
}

/** Próximo passo da sessão. */
export function nextStep(s: Session): Step {
  if (s.pendingDynamic) {
    const node = s.pendingDynamic;
    const item = unusedItem(s, node);
    if (item) return { done: false, item, node, phase: "dynamic", hintsAvailable: item.hints.length };
    s.pendingDynamic = null;
  }

  if (s.responses.length >= s.maxItems) return { done: true };

  for (const node of s.queue) {
    const st = stat(s, node);
    if (st.resolved) continue;
    const item = unusedItem(s, node);
    if (!item) continue;
    if (st.attempts < probesNeeded(node, s) || st.attempts === 0) {
      return { done: false, item, node, phase: "probe", hintsAvailable: 0 };
    }
  }
  return { done: true };
}

function enqueueFront(s: Session, node: string) {
  if (s.enqueued.has(node) || !s.pool.has(node)) return;
  s.queue.unshift(node);
  s.enqueued.add(node);
}
function enqueueBack(s: Session, node: string) {
  if (s.enqueued.has(node) || !s.pool.has(node)) return;
  s.queue.push(node);
  s.enqueued.add(node);
}

/** Regista a resposta e actualiza o estado (decide descer/subir/mediar). */
export function submit(
  s: Session,
  item: DiagItem,
  given: string,
  latencyMs: number,
  hintsUsed: number,
  phase: "probe" | "dynamic",
  // Veredicto do professor que substitui a correção automática (open_text verificado).
  overrideCorrect?: boolean | null,
): { result: ReturnType<typeof classifyAnswer> } {
  // Leitura em voz alta: recolhida como sonda, mas NÃO pontuada pelo motor.
  // Não desce aos pré-requisitos nem dispara mediação; a descodificação é
  // classificada pelo professor (ouvindo a gravação) e entra no relatório à parte.
  if (item.response_type === "audio_reading") {
    const st = stat(s, item.node_code);
    s.asked.add(item.id);
    s.responses.push({ itemId: item.id, node: item.node_code, given, correct: false, latencyMs, hintsUsed, phase: "probe", audio: true });
    st.resolved = "pending_audio"; // pára de sondar este nó; não altera dependentes/pré-requisitos
    return { result: { correct: false } };
  }

  const base = classifyAnswer(item, given);
  const correct = overrideCorrect == null ? base.correct : overrideCorrect;
  const result = { correct, misconception: correct ? undefined : base.misconception };
  const st = stat(s, item.node_code);
  s.asked.add(item.id);
  s.responses.push({
    itemId: item.id,
    node: item.node_code,
    given,
    correct: result.correct,
    latencyMs,
    hintsUsed,
    misconception: result.misconception,
    phase,
  });

  if (phase === "dynamic") {
    st.dynamicHints = hintsUsed;
    st.dynamicCorrect = result.correct;
    if (s.pendingDynamic === item.node_code) s.pendingDynamic = null;
    return { result };
  }

  st.attempts += 1;
  if (result.correct) st.correct += 1;
  st.latencies.push(latencyMs);
  if (result.misconception) st.misconceptions[result.misconception] = (st.misconceptions[result.misconception] ?? 0) + 1;

  maybeResolve(s, item.node_code);
  return { result };
}

function maybeResolve(s: Session, node: string) {
  const st = stat(s, node);
  if (st.resolved) return;
  const need = probesNeeded(node, s);
  const noMore = !unusedItem(s, node);
  if (st.attempts < need && !noMore) return;

  const acc = st.attempts ? st.correct / st.attempts : 0;

  if (acc >= 0.5) {
    // Precisão e automatização são sinais SEPARADOS: uma resposta certa domina o
    // conteúdo, independentemente da velocidade. A lentidão (mesmo em nós de fluência)
    // não define a fronteira — é reportada à parte como fluency_level no finalize.
    st.resolved = "mastered";
    for (const dep of s.graph.dependentsOf(node)) enqueueBack(s, dep);
  } else {
    st.resolved = "deficit";
    if (unusedItem(s, node)) s.pendingDynamic = node;
    for (const pre of s.graph.prereqsOf(node)) enqueueFront(s, pre);
  }
}

function potentialFromHints(hints: number | null, correct: boolean | null): number | null {
  if (hints == null || correct == null) return null;
  if (!correct) return 0.1;
  if (hints <= 0) return 1.0;
  if (hints === 1) return 0.7;
  if (hints === 2) return 0.4;
  return 0.25;
}

/** Estimativas por nó — o substrato do relatório. */
export function finalize(s: Session): NodeEstimate[] {
  const out: NodeEstimate[] = [];
  const masteredSet = new Set<string>(
    Object.entries(s.stats).filter(([, st]) => st.resolved === "mastered").map(([n]) => n),
  );

  for (const [node, st] of Object.entries(s.stats)) {
    if (st.attempts === 0 && st.dynamicHints == null) {
      out.push({ node_code: node, mastery: "not_reached", fluency_level: null, learning_potential_index: null, dominant_misconception: null });
      continue;
    }

    let mastery: NodeEstimate["mastery"];
    if (st.resolved === "mastered") mastery = "mastered";
    else if (st.resolved === "fragile") mastery = "frontier";
    else {
      const pres = s.graph.prereqsOf(node);
      const preMastered = pres.length === 0 || pres.every((p) => masteredSet.has(p));
      mastery = preMastered ? "frontier" : "deficit";
    }

    const items = s.pool.get(node) ?? [];
    const target = items.find((it) => it.target_latency_ms)?.target_latency_ms ?? null;
    let fluency_level: NodeEstimate["fluency_level"] = null;
    if (target && st.latencies.length) {
      const avg = st.latencies.reduce((a, b) => a + b, 0) / st.latencies.length;
      fluency_level = avg <= target ? "automatizado" : avg <= target * 2 ? "em_construcao" : "nao_automatizado";
    }

    const misc = Object.entries(st.misconceptions).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    out.push({
      node_code: node,
      mastery,
      fluency_level,
      learning_potential_index: potentialFromHints(st.dynamicHints, st.dynamicCorrect),
      dominant_misconception: misc,
    });
  }
  return out;
}
