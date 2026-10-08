import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPool, itemForClient, withText } from "@/lib/diagnostic/session";
import { createSession, nextStep } from "@/lib/diagnostic/engine";
import { getDomainGraph } from "@/lib/diagnostic/domains";

// POST público — o aluno arranca o diagnóstico com o código e um rótulo (pseudónimo).
export async function POST(req: NextRequest) {
  const { code, label, classMemberId } = await req.json().catch(() => ({}));
  if (!code || (!label && !classMemberId)) {
    return NextResponse.json({ error: "Código e identificação em falta." }, { status: 400 });
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

  // Identificação: aluno escolhido da turma (nome real + id) OU nome escrito à mão.
  let memberId: string | null = null;
  let label80 = String(label ?? "").slice(0, 80);
  if (classMemberId && assessment.class_id) {
    const { data: member } = await sb
      .from("class_members")
      .select("id, name")
      .eq("id", classMemberId)
      .eq("class_id", assessment.class_id)
      .single();
    if (!member) return NextResponse.json({ error: "Aluno não encontrado nesta turma." }, { status: 400 });
    memberId = member.id;
    label80 = String(member.name).slice(0, 80);
  }
  if (!label80) return NextResponse.json({ error: "Identificação em falta." }, { status: 400 });

  // Reavaliação (RTI): liga esta sessão à anterior concluída do MESMO aluno
  // (pelo id do aluno da turma quando existe; senão pelo nome escrito).
  let priorQuery = sb
    .from("diag_sessions")
    .select("id")
    .eq("assessment_id", assessment.id)
    .eq("status", "finished");
  priorQuery = memberId ? priorQuery.eq("class_member_id", memberId) : priorQuery.eq("student_label", label80);
  const { data: prior } = await priorQuery.order("finished_at", { ascending: false }).limit(1).maybeSingle();

  const { data: session, error: sErr } = await sb
    .from("diag_sessions")
    .insert({
      assessment_id: assessment.id,
      student_label: label80,
      class_member_id: memberId,
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
