import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Código de acesso: 6 caracteres sem ambíguos (como no exame).
function generateCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// GET — lista os diagnósticos do professor com as suas sessões.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("diag_assessments")
    .select("id, access_code, title, status, created_at, retest_after_days, domain, diag_sessions(id, student_label, status, finished_at, is_retest_of)")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assessments: data ?? [] });
}

// POST — cria um diagnóstico novo e devolve o código.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title: string = (body.title ?? "Diagnóstico de Matemática").toString().slice(0, 120);
  const includeScreening = !!body.includeScreening;
  const classId: string | null = body.classId ?? null;
  // Janela de reavaliação (dias); limitada a 14–120 para evitar valores absurdos.
  const retestAfterDays = Math.min(120, Math.max(14, Number(body.retestAfterDays) || 42));
  const domain = body.domain === "portugues" ? "portugues" : "matematica";

  let code = "";
  for (let i = 0; i < 5; i++) {
    code = generateCode();
    const { data: existing } = await supabase
      .from("diag_assessments")
      .select("id")
      .eq("access_code", code)
      .maybeSingle();
    if (!existing) break;
  }

  const { data, error } = await supabase
    .from("diag_assessments")
    .insert({
      teacher_id: user.id,
      class_id: classId,
      title,
      access_code: code,
      status: "active",
      mode: "solo",
      include_screening: includeScreening,
      retest_after_days: retestAfterDays,
      domain,
    })
    .select("id, access_code")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id, code: data.access_code });
}
