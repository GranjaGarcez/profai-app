import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET — turmas do professor (com contagem de alunos).
export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("classes")
    .select("id, name, year_level, created_at, class_members(count)")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const classes = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    year_level: c.year_level,
    member_count: Array.isArray(c.class_members) ? (c.class_members[0] as { count?: number })?.count ?? 0 : 0,
  }));
  return NextResponse.json({ classes });
}

// POST — criar turma { name, yearLevel }.
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 80);
  const yearLevel = Number(body.yearLevel);
  if (!name) return NextResponse.json({ error: "Nome da turma em falta." }, { status: 400 });
  const year = yearLevel >= 1 && yearLevel <= 9 ? yearLevel : 6;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("classes")
    .insert({ teacher_id: user.id, name, year_level: year })
    .select("id, name, year_level")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ class: data });
}
