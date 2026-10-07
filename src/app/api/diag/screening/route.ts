import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GAME_KEYS = new Set(["working_memory", "attention", "processing_speed"]);

// POST público — o aluno submete os indicadores de rastreio no fim do diagnóstico.
export async function POST(req: NextRequest) {
  const { sessionId, results } = await req.json().catch(() => ({}));
  if (!sessionId || !Array.isArray(results)) {
    return NextResponse.json({ error: "Dados em falta." }, { status: 400 });
  }
  const sb = createAdminClient();

  const { data: session } = await sb.from("diag_sessions").select("id").eq("id", sessionId).single();
  if (!session) return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });

  const rows = results
    .filter((r: { game_key?: string }) => r.game_key && GAME_KEYS.has(r.game_key))
    .map((r: { game_key: string; raw_score?: number; normalized_indicator?: number; notes?: string }) => ({
      session_id: sessionId,
      game_key: r.game_key,
      raw_score: r.raw_score ?? null,
      normalized_indicator: r.normalized_indicator ?? null,
      notes: r.notes ?? null,
    }));

  if (rows.length) {
    const { error } = await sb.from("diag_screening_results").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, saved: rows.length });
}
