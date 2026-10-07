"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { GAME_META, bandOf, BAND_LABEL, type GameKey } from "@/lib/diagnostic/screening";

const NAVY = "#0D1B2A";
const CHALK = "#F7F3EE";
const BLUE = "#00B4D8";
const GOLD = "#C8A84B";
const AMBER = "#8a5a00";

interface ReportNode { node_code: string; label: string; minYear: number; maxYear: number; mastery: string; fluency_level: string | null; learning_potential_index: number | null }
interface ReportMisc { code: string; label: string; remediation: string; count: number; nodes: string[] }
interface AxisInfo { score: number | null; level: "frágil" | "em desenvolvimento" | "sólido" | "não medido" }
interface ReadingProfile {
  decoding: AxisInfo;
  languageComprehension: AxisInfo;
  axis: "descodificacao" | "linguagem" | "ambos" | "equilibrado" | "indeterminado";
  note: string;
}
interface Report {
  frontier: ReportNode[]; frontierYear: number | null;
  mastered: ReportNode[]; deficits: ReportNode[];
  misconceptions: ReportMisc[];
  fluency: { node_code: string; label: string; level: string }[];
  potential: { mean: number | null; reading: "subestimulacao" | "estrutural" | "misto" | "indeterminado" };
  readingProfile?: ReadingProfile;
  plan: string[]; summary: string;
}

const DOMAIN_SUBTITLE: Record<string, string> = {
  matematica: "Matemática · Números e Operações",
  portugues: "Português · Leitura e léxico",
};
const AXIS_META: Record<string, { label: string; color: string; bg: string }> = {
  descodificacao: { label: "Estrangulamento na descodificação", color: "#8a5a00", bg: "#f6e8c8" },
  linguagem: { label: "Défice de compreensão da linguagem", color: "#7a3a00", bg: "#f6ddc8" },
  ambos: { label: "Ambos os factores frágeis", color: "#8a5a00", bg: "#f6e8c8" },
  equilibrado: { label: "Factores equilibrados", color: "#0a6c4a", bg: "#d8f0e4" },
  indeterminado: { label: "Descodificação por medir", color: "#555", bg: "#e9e9e9" },
};
const LEVEL_COLOR: Record<string, string> = {
  "sólido": "#0a6c4a",
  "em desenvolvimento": "#8a5a00",
  "frágil": "#b00020",
  "não medido": "#777",
};

const READING_META: Record<string, { label: string; color: string; bg: string }> = {
  subestimulacao: { label: "Subestimulação funcional", color: "#0a6c4a", bg: "#d8f0e4" },
  estrutural: { label: "Hipótese estrutural", color: "#8a5a00", bg: "#f6e8c8" },
  misto: { label: "Resposta mista", color: "#7a5b00", bg: "#f5ecd0" },
  indeterminado: { label: "Indeterminado", color: "#555", bg: "#e9e9e9" },
};

interface ScreeningItem { game_key: GameKey; raw_score: number; normalized_indicator: number; notes?: string }

interface NodeChange { node_code: string; label: string; from: string; to: string }
interface Comparison { preFrontierYear: number | null; posFrontierYear: number | null; improved: NodeChange[]; regressed: NodeChange[]; summary: string }

interface AudioReviewVal { accuracy: number | null; speed: number | null; prosody: number | null; notes: string | null }
interface AudioEntry { item_id: string; node_code: string; signedUrl: string | null; review: AudioReviewVal | null }
interface WrittenAnswer { item_id: string; node_code: string; stem: string; text: string; autoCorrect: boolean | null; teacherCorrect: boolean | null }

const DIM_LABEL: { key: "accuracy" | "speed" | "prosody"; label: string; hint: string }[] = [
  { key: "accuracy", label: "Exatidão", hint: "lê as palavras certas, sem trocas/omissões" },
  { key: "speed", label: "Velocidade", hint: "ritmo adequado, sem silabar nem arrastar" },
  { key: "prosody", label: "Prosódia", hint: "expressão, pausas e entoação (pontos, vírgulas)" },
];
const SCORE_LABEL: Record<number, string> = { 1: "Fraco", 2: "Médio", 3: "Bom" };

const MAST_LABEL: Record<string, string> = { deficit: "défice", frontier: "fronteira", mastered: "dominado", not_reached: "não testado" };

export default function ReportView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<{ studentLabel: string; status: string; domain?: string; report: Report; screening?: ScreeningItem[]; comparison?: Comparison | null; audio?: AudioEntry[]; written?: WrittenAnswer[]; criticalPendingVerification?: boolean } | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    fetch(`/api/diag/report/${sessionId}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => (ok ? setData(j) : setErr(j.error ?? "Erro")))
      .catch(() => setErr("Falha de ligação."));
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const back = (
    <Link href="/dashboard/diagnostico" className="text-sm mb-4 inline-block" style={{ color: BLUE }}>
      ← Diagnósticos
    </Link>
  );

  if (err) return <Shell>{back}<p style={{ color: NAVY }}>{err}</p></Shell>;
  if (!data) return <Shell>{back}<p style={{ color: NAVY, opacity: 0.6 }}>A carregar o relatório…</p></Shell>;

  const r = data.report;
  const rm = READING_META[r.potential.reading] ?? READING_META.indeterminado;

  return (
    <Shell>
      {back}
      <p style={{ color: GOLD, letterSpacing: 3 }} className="text-xs uppercase mb-1">Relatório de diagnóstico</p>
      <h1 className="text-3xl mb-1" style={{ fontFamily: "Playfair Display, serif", color: NAVY }}>{data.studentLabel}</h1>
      <p className="text-sm mb-6" style={{ color: NAVY, opacity: 0.6 }}>
        {DOMAIN_SUBTITLE[data.domain ?? "matematica"] ?? DOMAIN_SUBTITLE.matematica} {data.status === "finished" ? "· concluído" : "· em curso"}
      </p>

      {/* Retrato */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: NAVY, color: CHALK }}>
        <p className="leading-relaxed">{r.summary}</p>
      </div>

      {/* Linha-chave */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Nível real" value={r.frontierYear != null ? `~${r.frontierYear}.º ano` : "—"} />
        <Stat label="Fronteira" value={r.frontier[0]?.label ?? r.deficits[0]?.label ?? "—"} />
        <div className="rounded-xl p-3 text-center" style={{ background: rm.bg }}>
          <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: rm.color, opacity: 0.8 }}>Leitura</p>
          <p className="text-sm font-semibold" style={{ color: rm.color }}>{rm.label}</p>
          {r.potential.mean != null && <p className="text-[11px] mt-0.5" style={{ color: rm.color, opacity: 0.8 }}>potencial {r.potential.mean.toFixed(2)}</p>}
        </div>
      </div>

      {/* Visão Simples da Leitura (Português) */}
      {r.readingProfile && (() => {
        const rp = r.readingProfile!;
        const am = AXIS_META[rp.axis] ?? AXIS_META.indeterminado;
        return (
          <div className="rounded-2xl p-5 mb-6" style={{ background: am.bg }}>
            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: am.color }}>
              Visão Simples da Leitura · {am.label}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <AxisCard title="Descodificação" info={rp.decoding} />
              <AxisCard title="Compreensão da linguagem" info={rp.languageComprehension} />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: NAVY }}>{rp.note}</p>
          </div>
        );
      })()}

      {/* Leitura em voz alta — classificação do professor */}
      {(data.audio?.length ?? 0) > 0 && (
        <Section title="Leitura em voz alta (classificar)">
          <p className="text-xs mb-3" style={{ color: NAVY, opacity: 0.6 }}>
            Ouve a gravação e classifica cada dimensão. Isto mede a <b>descodificação</b> e completa a Visão Simples da Leitura.
          </p>
          {data.audio!.map((a) => (
            <AudioReview key={a.item_id} entry={a} sessionId={sessionId} onSaved={load} />
          ))}
        </Section>
      )}

      {/* Respostas escritas (open_text) — correcção automática sujeita à verificação do professor */}
      {(data.written?.length ?? 0) > 0 && (
        <Section title="Respostas escritas (nível crítico) · validar">
          <p className="text-xs mb-3" style={{ color: NAVY, opacity: 0.6 }}>
            A correcção automática por âncoras é um <b>ponto de partida</b> — lê o texto e <b>confirma ou corrige</b>. A tua decisão recalcula a estimativa do nível crítico.
          </p>
          {data.written!.map((w) => (
            <OpenTextReview key={w.item_id} entry={w} sessionId={sessionId} onSaved={load} />
          ))}
        </Section>
      )}

      {/* Progresso pré/pós */}
      {data.comparison && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: "#d8f0e4" }}>
          <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "#0a6c4a" }}>Progresso · reavaliação (pré → pós)</p>
          <p className="text-sm mb-3 font-semibold" style={{ color: "#0a6c4a" }}>{data.comparison.summary}</p>
          {data.comparison.improved.length > 0 && (
            <p className="text-sm mb-1" style={{ color: NAVY }}>
              <b>Melhorou:</b>{" "}
              {data.comparison.improved.map((c) => `${c.label} (${MAST_LABEL[c.from] ?? c.from} → ${MAST_LABEL[c.to] ?? c.to})`).join("; ")}
            </p>
          )}
          {data.comparison.regressed.length > 0 && (
            <p className="text-sm" style={{ color: AMBER }}>
              <b>A vigiar:</b> {data.comparison.regressed.map((c) => c.label).join("; ")}
            </p>
          )}
        </div>
      )}

      {/* Concepções */}
      {r.misconceptions.length > 0 && (
        <Section title="Concepções erradas detectadas">
          {r.misconceptions.map((m) => (
            <div key={m.code} className="mb-3">
              <p className="font-semibold" style={{ color: NAVY }}>{m.label} <span style={{ color: GOLD }}>×{m.count}</span></p>
              <p className="text-sm" style={{ color: NAVY, opacity: 0.75 }}>{m.remediation}</p>
            </div>
          ))}
        </Section>
      )}

      {/* Fluência */}
      {r.fluency.length > 0 && (
        <Section title="Fluência (automatização)">
          {r.fluency.map((f) => (
            <p key={f.node_code} className="text-sm mb-1" style={{ color: NAVY }}>
              {f.label}: <b>{f.level.replace("_", " ")}</b>
            </p>
          ))}
        </Section>
      )}

      {/* Plano */}
      {r.plan.length > 0 && (
        <Section title="Plano de intervenção">
          <ol className="list-decimal pl-5">
            {r.plan.map((p, i) => (
              <li key={i} className="text-sm mb-2" style={{ color: NAVY }}>{p}</li>
            ))}
          </ol>
        </Section>
      )}

      {(data.screening?.length ?? 0) > 0 && (
        <Section title="Indicadores de rastreio (não diagnóstico)">
          <div className="rounded-xl p-3 mb-3" style={{ background: "#f6e8c8" }}>
            <p className="text-xs" style={{ color: "#8a5a00" }}>
              Indicadores para ponderar encaminhamento ao SPO. Não são avaliação psicológica nem
              substituem instrumentos aferidos para a população portuguesa. Interpretar com cautela.
            </p>
          </div>
          {data.screening!.map((g) => (
            <p key={g.game_key} className="text-sm mb-1" style={{ color: NAVY }}>
              {GAME_META[g.game_key].title}: <b>{BAND_LABEL[bandOf(g.normalized_indicator)]}</b>
              {g.notes ? <span style={{ opacity: 0.55 }}> · {g.notes}</span> : null}
            </p>
          ))}
        </Section>
      )}

      <p className="text-xs mt-8" style={{ color: NAVY, opacity: 0.5 }}>
        Indicador pedagógico, não avaliação psicológica. Para distinguir subestimulação de limitação
        estrutural com rigor, combinar com 6–8 semanas de intervenção e reavaliação (resposta à intervenção).
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="max-w-2xl mx-auto">{children}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "#fff", border: `1px solid ${NAVY}15` }}>
      <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: NAVY, opacity: 0.5 }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: NAVY }}>{value}</p>
    </div>
  );
}

function OpenTextReview({ entry, sessionId, onSaved }: { entry: WrittenAnswer; sessionId: string; onSaved: () => void }) {
  // Veredicto a aplicar: o do professor, se já existir; senão, a âncora como ponto de partida.
  const [verdict, setVerdict] = useState<boolean | null>(entry.teacherCorrect ?? entry.autoCorrect ?? null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const verified = entry.teacherCorrect != null;

  const save = async (val: boolean) => {
    setVerdict(val);
    setSaving(true);
    try {
      const r = await fetch("/api/diag/open-text-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, itemId: entry.item_id, teacherCorrect: val, note: note || null }),
      });
      if (r.ok) onSaved();
    } finally {
      setSaving(false);
    }
  };

  const btn = (val: boolean, label: string, good: boolean) => {
    const active = verdict === val;
    return (
      <button
        onClick={() => save(val)}
        disabled={saving}
        className="rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
        style={{
          background: active ? (good ? "#0a6c4a" : "#8a2a00") : "#f0f0f0",
          color: active ? "#fff" : "#555",
          border: `1px solid ${active ? (good ? "#0a6c4a" : "#8a2a00") : "#ddd"}`,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: "#fff", border: `1px solid ${NAVY}15` }}>
      <p className="text-sm font-semibold mb-2" style={{ color: NAVY }}>{entry.stem}</p>
      <p className="text-sm mb-2 rounded-lg px-3 py-2" style={{ background: "#f6f4f0", color: NAVY, whiteSpace: "pre-wrap" }}>
        {entry.text || <span style={{ opacity: 0.5 }}>(sem resposta)</span>}
      </p>
      <p className="text-xs mb-2" style={{ color: NAVY, opacity: 0.6 }}>
        Âncoras (automático): <b style={{ color: entry.autoCorrect ? "#0a6c4a" : "#8a2a00" }}>{entry.autoCorrect ? "cumpre" : "não cumpre"}</b>
        {" · "}
        {verified ? <span style={{ color: "#0a6c4a" }}>validado por ti</span> : <span style={{ color: AMBER }}>por verificar</span>}
      </p>
      <div className="flex items-center gap-2 mb-2">
        {btn(true, "✓ Correcto", true)}
        {btn(false, "✗ Incorrecto", false)}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (opcional)…"
        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
        style={{ border: `1px solid ${NAVY}22`, color: NAVY }}
      />
    </div>
  );
}

function AudioReview({ entry, sessionId, onSaved }: { entry: AudioEntry; sessionId: string; onSaved: () => void }) {
  const [vals, setVals] = useState<{ accuracy: number | null; speed: number | null; prosody: number | null }>({
    accuracy: entry.review?.accuracy ?? null,
    speed: entry.review?.speed ?? null,
    prosody: entry.review?.prosody ?? null,
  });
  const [notes, setNotes] = useState(entry.review?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!entry.review);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/diag/audio-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, itemId: entry.item_id, nodeCode: entry.node_code, ...vals, notes }),
      });
      if (r.ok) { setSaved(true); onSaved(); }
    } finally {
      setSaving(false);
    }
  };

  const canSave = vals.accuracy != null || vals.speed != null || vals.prosody != null;

  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: "#fff", border: `1px solid ${NAVY}15` }}>
      {entry.signedUrl ? (
        <audio src={entry.signedUrl} controls className="w-full mb-3" />
      ) : (
        <p className="text-sm mb-3" style={{ color: AMBER }}>Gravação indisponível (não foi guardada).</p>
      )}
      <div className="space-y-2 mb-3">
        {DIM_LABEL.map((d) => (
          <div key={d.key} className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: NAVY }}>{d.label}</p>
              <p className="text-[11px]" style={{ color: NAVY, opacity: 0.5 }}>{d.hint}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              {[1, 2, 3].map((n) => {
                const active = vals[d.key] === n;
                return (
                  <button
                    key={n}
                    onClick={() => setVals((v) => ({ ...v, [d.key]: n }))}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{ background: active ? BLUE : "#f0f0f0", color: active ? NAVY : "#555", border: `1px solid ${active ? BLUE : "#ddd"}` }}
                  >
                    {SCORE_LABEL[n]}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Nota (opcional): trocas, hesitações, o que notaste…"
        className="w-full rounded-lg px-3 py-2 text-sm mb-3 outline-none"
        style={{ border: `1px solid ${NAVY}22`, color: NAVY }}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || !canSave}
          className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40"
          style={{ background: GOLD, color: NAVY }}
        >
          {saving ? "A guardar…" : saved ? "Atualizar classificação" : "Guardar classificação"}
        </button>
        {saved && <span className="text-xs" style={{ color: "#0a6c4a" }}>✓ guardado · descodificação atualizada</span>}
      </div>
    </div>
  );
}

function AxisCard({ title, info }: { title: string; info: AxisInfo }) {
  const color = LEVEL_COLOR[info.level] ?? NAVY;
  return (
    <div className="rounded-xl p-3" style={{ background: "#fff", border: `1px solid ${NAVY}15` }}>
      <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: NAVY, opacity: 0.5 }}>{title}</p>
      <p className="text-sm font-semibold" style={{ color }}>{info.level}</p>
      {info.score != null && (
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: `${NAVY}12` }}>
          <div style={{ width: `${Math.round(info.score * 100)}%`, height: "100%", background: color }} />
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs uppercase tracking-wide mb-3" style={{ color: GOLD }}>{title}</h2>
      {children}
    </div>
  );
}
