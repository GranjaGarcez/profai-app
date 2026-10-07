import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPool } from "@/lib/diagnostic/session";
import { classifyAnswer } from "@/lib/diagnostic/normalize";
import { generateReport, generateComparison } from "@/lib/diagnostic/report";
import { getDomainGraph } from "@/lib/diagnostic/domains";
import type { NodeEstimate } from "@/lib/diagnostic/engine";

// GET — relatório de uma sessão (fronteira, concepções, potencial, plano).
// Autenticado: o RLS só devolve a sessão se pertencer a um diagnóstico deste professor.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const sb = await createClient();

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: session, error } = await sb
    .from("diag_sessions")
    .select("id, student_label, status, assessment_id, finished_at, is_retest_of")
    .eq("id", sessionId)
    .single();
  if (error || !session) return NextResponse.json({ error: "Relatório não encontrado." }, { status: 404 });

  let classYear: number | undefined;
  const { data: assess } = await sb.from("diag_assessments").select("class_id, domain").eq("id", session.assessment_id).single();
  if (assess?.class_id) {
    const { data: cls } = await sb.from("classes").select("year_level").eq("id", assess.class_id).single();
    if (cls?.year_level) classYear = cls.year_level;
  }
  const graph = getDomainGraph(assess?.domain);

  const { data: estimates } = await sb
    .from("diag_node_estimates")
    .select("node_code, mastery, fluency_level, learning_potential_index, dominant_misconception")
    .eq("session_id", sessionId);

  // Re-deriva a concepção de cada resposta (sem guardar coluna extra).
  const pool = await loadPool(sb, graph);
  const byId = new Map(pool.map((p) => [p.id, p]));
  const { data: resp } = await sb
    .from("diag_responses")
    .select("item_id, node_code, selected_index, answer_value, is_correct, teacher_correct")
    .eq("session_id", sessionId);
  const responses = (resp ?? []).map((r) => {
    const it = byId.get(r.item_id);
    if (!it) return { node_code: r.node_code };
    const given =
      it.response_type === "mcq"
        ? (it.options ?? [])[r.selected_index ?? -1] ?? ""
        : r.answer_value ?? "";
    return { node_code: r.node_code, misconception: classifyAnswer(it, given).misconception };
  });

  // Respostas escritas (open_text) — o professor lê o texto, vê a âncora e valida.
  const written = (resp ?? [])
    .map((r) => {
      const it = byId.get(r.item_id);
      if (!it || it.response_type !== "open_text") return null;
      return {
        item_id: r.item_id as string,
        node_code: r.node_code,
        stem: it.stem,
        text: r.answer_value ?? "",
        autoCorrect: r.is_correct, // veredicto automático por âncoras
        teacherCorrect: r.teacher_correct as boolean | null, // null = por verificar
      };
    })
    .filter((w): w is { item_id: string; node_code: string; stem: string; text: string; autoCorrect: boolean | null; teacherCorrect: boolean | null } => w != null);
  const criticalPendingVerification = written.some((w) => w.teacherCorrect == null);

  const report = generateReport((estimates ?? []) as NodeEstimate[], responses, {
    studentLabel: session.student_label,
    classYear,
  }, graph);

  const { data: screening } = await sb
    .from("diag_screening_results")
    .select("game_key, raw_score, normalized_indicator, notes")
    .eq("session_id", sessionId);

  // Leituras em voz alta: gravações desta sessão + classificação já feita (se houver).
  // Ownership já confirmada acima (o RLS só devolve a sessão deste professor) → pode usar admin p/ URLs assinadas.
  type AudioEntry = { item_id: string; node_code: string; signedUrl: string | null; review: { accuracy: number | null; speed: number | null; prosody: number | null; notes: string | null } | null };
  const audio: AudioEntry[] = [];
  const { data: audioResp } = await sb
    .from("diag_responses")
    .select("item_id, node_code, audio_path")
    .eq("session_id", sessionId)
    .not("audio_path", "is", null);
  if (audioResp && audioResp.length) {
    const admin = createAdminClient();
    const { data: reviews } = await sb
      .from("diag_audio_reviews")
      .select("item_id, accuracy, speed, prosody, notes")
      .eq("session_id", sessionId);
    const revByItem = new Map((reviews ?? []).map((r) => [r.item_id, r]));
    for (const ar of audioResp) {
      let signedUrl: string | null = null;
      if (ar.audio_path) {
        const { data: signed } = await admin.storage.from("diag-audio").createSignedUrl(ar.audio_path, 3600);
        signedUrl = signed?.signedUrl ?? null;
      }
      const rev = ar.item_id ? revByItem.get(ar.item_id) : undefined;
      audio.push({
        item_id: ar.item_id as string,
        node_code: ar.node_code,
        signedUrl,
        review: rev ? { accuracy: rev.accuracy, speed: rev.speed, prosody: rev.prosody, notes: rev.notes } : null,
      });
    }
  }

  // Comparação pré/pós, se esta sessão for uma reavaliação.
  let comparison = null;
  if (session.is_retest_of) {
    const { data: preEst } = await sb
      .from("diag_node_estimates")
      .select("node_code, mastery, fluency_level, learning_potential_index, dominant_misconception")
      .eq("session_id", session.is_retest_of);
    if (preEst && preEst.length) {
      comparison = generateComparison(preEst as NodeEstimate[], (estimates ?? []) as NodeEstimate[], graph);
    }
  }

  return NextResponse.json({
    studentLabel: session.student_label,
    status: session.status,
    finishedAt: session.finished_at,
    domain: graph.domain,
    report,
    screening: screening ?? [],
    comparison,
    audio,
    written,
    criticalPendingVerification,
  });
}
