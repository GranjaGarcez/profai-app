import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET público — dado o código do diagnóstico, se este estiver ligado a uma turma,
// devolve a lista de alunos (id + nome) para o aluno se escolher. Sem turma → vazio.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Código em falta." }, { status: 400 });

  const sb = createAdminClient();
  const { data: assessment } = await sb
    .from("diag_assessments")
    .select("id, status, class_id")
    .eq("access_code", String(code).toUpperCase())
    .single();
  if (!assessment) return NextResponse.json({ error: "Código inválido." }, { status: 404 });
  if (assessment.status !== "active") return NextResponse.json({ error: "Este diagnóstico não está disponível." }, { status: 410 });

  if (!assessment.class_id) return NextResponse.json({ hasClass: false, members: [] });

  const { data: members } = await sb
    .from("class_members")
    .select("id, name")
    .eq("class_id", assessment.class_id)
    .order("name", { ascending: true });
  return NextResponse.json({ hasClass: true, members: members ?? [] });
}
