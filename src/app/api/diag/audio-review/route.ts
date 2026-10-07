import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST autenticado — o professor classifica uma leitura em voz alta (3 dimensões).
// Guarda a classificação e deriva a estimativa de DESCODIFICAÇÃO do nó (Visão Simples).
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { sessionId, itemId, nodeCode, accuracy, speed, prosody, notes } = body;
  if (!sessionId || !itemId || !nodeCode) {
    return NextResponse.json({ error: "Dados em falta." }, { status: 400 });
  }
  const score = (v: unknown): number | null => {
    const n = Number(v);
    return n >= 1 && n <= 3 ? Math.round(n) : null;
  };
  const a = score(accuracy), s = score(speed), p = score(prosody);
  if (a == null && s == null && p == null) {
    return NextResponse.json({ error: "Classifica pelo menos uma dimensão (1 a 3)." }, { status: 400 });
  }

  // Ownership: o RLS só devolve a sessão se for deste professor.
  const { data: session } = await sb
    .from("diag_sessions")
    .select("id, assessment_id")
    .eq("id", sessionId)
    .single();
  if (!session) return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });

  const admin = createAdminClient();

  // 1) Guarda a classificação (reter, para comparação pré/pós).
  const { error: revErr } = await admin.from("diag_audio_reviews").upsert(
    { session_id: sessionId, item_id: itemId, node_code: nodeCode, accuracy: a, speed: s, prosody: p, notes: notes ?? null, rater: user.id },
    { onConflict: "session_id,item_id" },
  );
  if (revErr) return NextResponse.json({ error: revErr.message }, { status: 500 });

  // 2) Deriva a estimativa de descodificação do nó (média das dimensões classificadas).
  const vals = [a, s, p].filter((v): v is number => v != null);
  const mean = vals.reduce((x, y) => x + y, 0) / vals.length; // 1..3
  const mastery = mean >= 2.5 ? "mastered" : mean >= 1.8 ? "frontier" : "deficit";
  const fluency_level = s == null ? null : s >= 3 ? "automatizado" : s === 2 ? "em_construcao" : "nao_automatizado";

  const { error: estErr } = await admin.from("diag_node_estimates").upsert(
    { session_id: sessionId, node_code: nodeCode, mastery, fluency_level, learning_potential_index: null, dominant_misconception: null },
    { onConflict: "session_id,node_code" },
  );
  if (estErr) return NextResponse.json({ error: estErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, mastery, fluency_level });
}
