import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function ownsClass(admin: ReturnType<typeof createAdminClient>, classId: string, userId: string) {
  const { data } = await admin.from("classes").select("teacher_id").eq("id", classId).single();
  return !!data && data.teacher_id === userId;
}

// POST — adicionar alunos em bloco { names: ["Ana", "Rui", ...] } (ou texto com um nome por linha).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  if (!(await ownsClass(admin, id, user.id))) return NextResponse.json({ error: "Turma não encontrada." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const raw: string[] = Array.isArray(body.names) ? body.names : String(body.text ?? "").split("\n");
  const names = Array.from(new Set(raw.map((n) => String(n).trim()).filter((n) => n.length > 0 && n.length <= 80)));
  if (!names.length) return NextResponse.json({ error: "Sem nomes para adicionar." }, { status: 400 });

  // Não duplicar nomes já existentes na turma.
  const { data: existing } = await admin.from("class_members").select("name").eq("class_id", id);
  const have = new Set((existing ?? []).map((m) => m.name));
  const toInsert = names.filter((n) => !have.has(n)).map((name) => ({ class_id: id, name }));
  if (!toInsert.length) return NextResponse.json({ added: 0 });

  const { error } = await admin.from("class_members").insert(toInsert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ added: toInsert.length });
}

// DELETE — remover um aluno: ?memberId=...
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = req.nextUrl.searchParams.get("memberId");
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!memberId) return NextResponse.json({ error: "memberId em falta." }, { status: 400 });

  const admin = createAdminClient();
  if (!(await ownsClass(admin, id, user.id))) return NextResponse.json({ error: "Turma não encontrada." }, { status: 404 });

  const { error } = await admin.from("class_members").delete().eq("id", memberId).eq("class_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
