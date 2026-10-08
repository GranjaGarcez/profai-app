import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function ownedClass(admin: ReturnType<typeof createAdminClient>, classId: string, userId: string) {
  const { data } = await admin.from("classes").select("id, teacher_id, name, year_level").eq("id", classId).single();
  return data && data.teacher_id === userId ? data : null;
}

// GET — uma turma com os seus alunos.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const cls = await ownedClass(admin, id, user.id);
  if (!cls) return NextResponse.json({ error: "Turma não encontrada." }, { status: 404 });

  const { data: members } = await admin
    .from("class_members")
    .select("id, name, email")
    .eq("class_id", id)
    .order("name", { ascending: true });
  return NextResponse.json({ class: { id: cls.id, name: cls.name, year_level: cls.year_level }, members: members ?? [] });
}

// DELETE — apagar a turma (e, por cascata/limpeza, os seus alunos).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const cls = await ownedClass(admin, id, user.id);
  if (!cls) return NextResponse.json({ error: "Turma não encontrada." }, { status: 404 });

  await admin.from("class_members").delete().eq("class_id", id);
  const { error } = await admin.from("classes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
