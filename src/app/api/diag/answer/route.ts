import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPool, rebuildSession, itemForClient, withText, nextStep, submit, finalize } from "@/lib/diagnostic/session";
import { getDomainGraph } from "@/lib/diagnostic/domains";

// POST público — o aluno responde a um item; devolve o próximo ou o fim.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { sessionId, itemId, given, latencyMs, hintsUsed, calcTrail, audioPath } = body;
  if (!sessionId || !itemId || given == null) {
    return NextResponse.json({ error: "Dados em falta." }, { status: 400 });
  }
  const sb = createAdminClient();

  const { data: session, error } = await sb
    .from("diag_sessions")
    .select("id, status, assessment_id")
    .eq("id", sessionId)
    .single();
  if (error || !session) return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
  if (session.status === "finished") return NextResponse.json({ done: true, alreadyFinished: true });

  // Ano da turma.
  let year = 6;
  const { data: assess } = await sb.from("diag_assessments").select("class_id, domain").eq("id", session.assessment_id).single();
  if (assess?.class_id) {
    const { data: cls } = await sb.from("classes").select("year_level").eq("id", assess.class_id).single();
    if (cls?.year_level) year = cls.year_level;
  }
  const graph = getDomainGraph(assess?.domain);

  const pool = await loadPool(sb, graph);
  const { session: s, count } = await rebuildSession(sb, sessionId, graph, year, pool);

  // Item corrente segundo o motor; confirma que é o que o cliente respondeu.
  const cur = nextStep(s);
  const item = cur.item && cur.item.id === itemId ? cur.item : pool.find((p) => p.id === itemId);
  if (!item || cur.done) return NextResponse.json({ error: "Item fora de sequência." }, { status: 409 });

  const { result } = submit(s, item, String(given), Number(latencyMs) || 0, Number(hintsUsed) || 0, cur.phase ?? "probe");

  const isAudio = item.response_type === "audio_reading";
  const selected_index =
    item.response_type === "mcq" ? (item.options ?? []).indexOf(String(given)) : null;
  await sb.from("diag_responses").insert({
    session_id: sessionId,
    item_id: item.id,
    node_code: item.node_code,
    selected_index: selected_index != null && selected_index >= 0 ? selected_index : null,
    answer_value: item.response_type === "mcq" || isAudio ? null : String(given),
    // Leitura em voz alta: não pontuada aqui (is_correct fica em aberto até o professor classificar).
    is_correct: isAudio ? null : result.correct,
    latency_ms: Number(latencyMs) || null,
    hints_used: Number(hintsUsed) || 0,
    sequence: count,
    calc_trail: calcTrail ?? null,
    audio_path: isAudio ? (audioPath ?? null) : null,
  });

  const next = nextStep(s);
  if (!next.done) {
    const payload = await withText(sb, itemForClient(next));
    return NextResponse.json({ correct: result.correct, ...payload });
  }

  // Fim: calcular e guardar estimativas, fechar sessão.
  const estimates = finalize(s);
  if (estimates.length) {
    await sb.from("diag_node_estimates").upsert(
      estimates.map((e) => ({ session_id: sessionId, ...e })),
      { onConflict: "session_id,node_code" },
    );
  }
  await sb.from("diag_sessions").update({ status: "finished", finished_at: new Date().toISOString() }).eq("id", sessionId);

  return NextResponse.json({ done: true, correct: result.correct, estimates });
}
