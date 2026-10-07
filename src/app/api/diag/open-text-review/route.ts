import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPool, rebuildSession } from "@/lib/diagnostic/session";
import { finalize } from "@/lib/diagnostic/engine";
import { getDomainGraph } from "@/lib/diagnostic/domains";

// POST autenticado — o professor VERIFICA uma resposta escrita (open_text):
// confirma ou corrige a correção automática por âncoras. A estimativa do nó é
// recalculada por replay com o veredicto do professor. A avaliação automática
// não é eliminada — fica como ponto de partida sujeito a esta validação.
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { sessionId, itemId, teacherCorrect, note } = body;
  if (!sessionId || !itemId || typeof teacherCorrect !== "boolean") {
    return NextResponse.json({ error: "Dados em falta (sessionId, itemId, teacherCorrect)." }, { status: 400 });
  }

  // Ownership: o RLS só devolve a sessão deste professor.
  const { data: session } = await sb
    .from("diag_sessions")
    .select("id, assessment_id")
    .eq("id", sessionId)
    .single();
  if (!session) return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });

  const admin = createAdminClient();

  // 1) Guarda o veredicto do professor na resposta.
  const { error: upErr } = await admin
    .from("diag_responses")
    .update({ teacher_correct: teacherCorrect, teacher_note: note ?? null })
    .eq("session_id", sessionId)
    .eq("item_id", itemId);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // 2) Recalcula as estimativas por replay (rebuildSession já aplica teacher_correct).
  let year = 6;
  const { data: assess } = await admin.from("diag_assessments").select("class_id, domain").eq("id", session.assessment_id).single();
  if (assess?.class_id) {
    const { data: cls } = await admin.from("classes").select("year_level").eq("id", assess.class_id).single();
    if (cls?.year_level) year = cls.year_level;
  }
  const graph = getDomainGraph(assess?.domain);
  const pool = await loadPool(admin, graph);
  const { session: s } = await rebuildSession(admin, sessionId, graph, year, pool);
  const estimates = finalize(s);

  // Não sobrescrever nós cuja estimativa pertence ao professor por outra via (áudio → descodificação).
  const { data: audioRev } = await admin.from("diag_audio_reviews").select("node_code").eq("session_id", sessionId);
  const audioNodes = new Set((audioRev ?? []).map((a) => a.node_code));
  const toUpsert = estimates.filter((e) => !audioNodes.has(e.node_code));
  if (toUpsert.length) {
    await admin.from("diag_node_estimates").upsert(
      toUpsert.map((e) => ({ session_id: sessionId, ...e })),
      { onConflict: "session_id,node_code" },
    );
  }

  return NextResponse.json({ ok: true });
}
