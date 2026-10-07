import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPool, itemForClient, withText } from "@/lib/diagnostic/session";
import { createSession, nextStep } from "@/lib/diagnostic/engine";
import { getDomainGraph } from "@/lib/diagnostic/domains";

// POST público — o aluno arranca o diagnóstico com o código e um rótulo (pseudónimo).
export async function POST(req: NextRequest) {
  const { code, label } = await req.json().catch(() => ({}));
  if (!code || !label) {
    return NextResponse.json({ error: "Código e nome em falta." }, { status: 400 });
  }
  const sb = createAdminClient();

  const { data: assessment, error } = await sb
    .from("diag_assessments")
    .select("id, status, class_id, include_screening, domain")
    .eq("access_code", String(code).toUpperCase())
    .single();
  if (error || !assessment) {
    return NextResponse.json({ error: "Código inválido." }, { status: 404 });
  }
  if (assessment.status !== "active") {
    return NextResponse.json({ error: "Este diagnóstico não está disponível." }, { status: 410 });
  }

  // Ano da turma (para escolher o ponto de arranque); 6.º por omissão.
  let year = 6;
  if (assessment.class_id) {
    const { data: cls } = await sb.from("classes").select("year_level").eq("id", assessment.class_id).single();
    if (cls?.year_level) year = cls.year_level;
  }

  const label80 = String(label).slice(0, 80);

  // Reavaliação (RTI): se já houve uma sessão concluída com o mesmo nome neste
  // diagnóstico, liga esta à anterior (pré → pós) para comparação no relatório.
  const { data: prior } = await sb
    .from("diag_sessions")
    .select("id")
    .eq("assessment_id", assessment.id)
    .eq("student_label", label80)
    .eq("status", "finished")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: session, error: sErr } = await sb
    .from("diag_sessions")
    .insert({
      assessment_id: assessment.id,
      student_label: label80,
      status: "active",
      started_at: new Date().toISOString(),
      is_retest_of: prior?.id ?? null,
    })
    .select("id")
    .single();
  if (sErr || !session) {
    return NextResponse.json({ error: "Não foi possível iniciar a sessão." }, { status: 500 });
  }

  const graph = getDomainGraph(assessment.domain);
  const pool = await loadPool(sb, graph);
  const s = createSession(graph, year, pool);
  const step = nextStep(s);
  const payload = await withText(sb, itemForClient(step));

  return NextResponse.json({
    sessionId: session.id,
    year,
    domain: graph.domain,
    includeScreening: !!assessment.include_screening,
    ...payload,
  });
}
