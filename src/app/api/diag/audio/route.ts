import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "diag-audio";
const MAX_BYTES = 12 * 1024 * 1024; // ~12 MB — uma leitura curta cabe de sobra

function extFromType(t: string): string {
  if (t.includes("webm")) return "webm";
  if (t.includes("mp4") || t.includes("m4a") || t.includes("aac")) return "m4a";
  if (t.includes("ogg")) return "ogg";
  if (t.includes("wav")) return "wav";
  if (t.includes("mpeg") || t.includes("mp3")) return "mp3";
  return "webm";
}

// POST público (player do aluno): recebe a gravação da leitura em voz alta.
// Devolve o caminho no bucket privado; o áudio nunca é servido sem autenticação.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Formulário inválido." }, { status: 400 });

  const sessionId = String(form.get("sessionId") ?? "");
  const itemId = String(form.get("itemId") ?? "");
  const file = form.get("audio");
  if (!sessionId || !itemId || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Dados em falta." }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ error: "Gravação vazia." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Gravação demasiado grande." }, { status: 413 });

  const sb = createAdminClient();

  // A sessão tem de existir e estar activa (evita uploads avulsos).
  const { data: session } = await sb.from("diag_sessions").select("id, status").eq("id", sessionId).single();
  if (!session) return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
  if (session.status === "finished") return NextResponse.json({ error: "Sessão concluída." }, { status: 410 });

  // Garante o bucket privado (criado na 1.ª gravação).
  const { data: buckets } = await sb.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await sb.storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_BYTES });
  }

  const type = file.type || "audio/webm";
  const path = `sessions/${sessionId}/${itemId}-${Date.now()}.${extFromType(type)}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: false });
  if (upErr) return NextResponse.json({ error: "Falha ao guardar a gravação." }, { status: 500 });

  return NextResponse.json({ audioPath: path });
}
