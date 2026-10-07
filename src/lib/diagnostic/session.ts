/**
 * Ponte servidor entre o motor (engine.ts) e a base de dados.
 * O motor é reconstruído por REPLAY determinístico das respostas — sem guardar
 * estado do motor na BD. Só service role (usar em API routes).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSession, nextStep, submit, finalize, type Session, type Step } from "./engine";
import type { DiagItem } from "./normalize";
import type { DomainGraph } from "./domainTypes";

const ITEM_COLS =
  "id,node_code,stem,response_type,options,correct_index,option_misconceptions,answer,wrong_answers,anchors,hints,difficulty,is_fluency,target_latency_ms,allow_calculator,text_id";

/**
 * Itens revistos do DOMÍNIO (filtrados pelos códigos de nó do grafo — os de
 * Português começam por PT., os de Matemática não, logo os domínios não se misturam).
 */
export async function loadPool(sb: SupabaseClient, graph: DomainGraph): Promise<DiagItem[]> {
  const { data, error } = await sb
    .from("diag_items")
    .select(ITEM_COLS)
    .eq("reviewed_by_human", true)
    .in("node_code", graph.ALL_CODES);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DiagItem[];
}

function givenFromResponse(
  item: DiagItem,
  r: { selected_index: number | null; answer_value: string | null },
): string {
  if (item.response_type === "mcq") {
    const opts = item.options ?? [];
    return r.selected_index != null ? (opts[r.selected_index] ?? String(r.selected_index)) : "";
  }
  return r.answer_value ?? "";
}

/** Reconstrói o estado do motor para uma sessão, aplicando as respostas por ordem. */
export async function rebuildSession(
  sb: SupabaseClient,
  sessionId: string,
  graph: DomainGraph,
  year: number,
  pool: DiagItem[],
): Promise<{ session: Session; count: number }> {
  const s = createSession(graph, year, pool);
  const { data: responses } = await sb
    .from("diag_responses")
    .select("item_id, node_code, selected_index, answer_value, latency_ms, hints_used, sequence, teacher_correct")
    .eq("session_id", sessionId)
    .order("sequence", { ascending: true });

  for (const r of responses ?? []) {
    const step = nextStep(s);
    // Item que o motor serviria agora; em replay determinístico coincide com o guardado.
    const item = step.item && step.item.id === r.item_id ? step.item : pool.find((p) => p.id === r.item_id);
    if (!item) break;
    const phase = step.phase ?? "probe";
    // Veredicto do professor (open_text verificado) tem prioridade sobre a correção automática.
    submit(s, item, givenFromResponse(item, r), r.latency_ms ?? 0, r.hints_used ?? 0, phase, r.teacher_correct ?? null);
  }
  return { session: s, count: (responses ?? []).length };
}

/**
 * Baralha uma CÓPIA do array (Fisher–Yates). Nunca muta o original — a ordem
 * guardada do item (correct_index, option_misconceptions) tem de ficar intacta.
 */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Empacota um item para o cliente (sem revelar a chave). */
export function itemForClient(step: Step) {
  if (step.done || !step.item) return { done: true as const };
  const it = step.item;
  return {
    done: false as const,
    phase: step.phase,
    hintsAvailable: step.hintsAvailable ?? 0,
    item: {
      id: it.id,
      node_code: it.node_code,
      stem: it.stem,
      response_type: it.response_type,
      // Ordem baralhada só na apresentação (a chave vive no VALOR da opção, não na posição).
      // O servidor pontua por valor e o selected_index guardado usa a ordem original → replay intacto.
      options: it.response_type === "mcq" ? shuffled(it.options ?? []) : undefined,
      // Ajudas só na fase dinâmica (na sondagem revelariam a resposta).
      hints: step.phase === "dynamic" ? it.hints : [],
      is_fluency: it.is_fluency,
      allow_calculator: !!it.allow_calculator,
      text_id: it.text_id ?? null,
    },
  };
}

/**
 * Enriquece o payload do cliente com a passagem de leitura, quando o item
 * de compreensão tem `text_id`. O texto é obrigatório para a pergunta fazer
 * sentido (sem ele, o aluno veria «Qual é a mensagem?» sem história).
 */
export async function withText<T extends { item?: { text_id?: string | null } }>(
  sb: SupabaseClient,
  payload: T,
): Promise<T & { text?: { id: string; title: string; body: string; genre: string | null } }> {
  const textId = payload.item?.text_id;
  if (!textId) return payload;
  const { data } = await sb
    .from("diag_texts")
    .select("id, title, body, genre")
    .eq("id", textId)
    .single();
  if (!data) return payload;
  return { ...payload, text: data as { id: string; title: string; body: string; genre: string | null } };
}

export { nextStep, submit, finalize };
