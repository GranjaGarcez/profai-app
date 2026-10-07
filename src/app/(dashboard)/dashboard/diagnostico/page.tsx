"use client";

import { useEffect, useState, useCallback } from "react";

const NAVY = "#0D1B2A";
const BLUE = "#00B4D8";
const GOLD = "#C8A84B";
const AMBER_BG = "#f6e8c8";
const AMBER = "#8a5a00";

// Janela de reavaliação (resposta à intervenção): 6 semanas.
const RETEST_DAYS = 42;
function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

interface Session {
  id: string;
  student_label: string;
  status: string;
  finished_at: string | null;
  is_retest_of: string | null;
}
interface Assessment {
  id: string;
  access_code: string;
  title: string;
  status: string;
  created_at: string;
  retest_after_days: number;
  domain: string | null;
  diag_sessions: Session[];
}

const DOMAIN_LABEL: Record<string, string> = {
  matematica: "Matemática · Números e Operações",
  portugues: "Português · Leitura e léxico",
};
const DOMAIN_TITLE: Record<string, string> = {
  matematica: "Diagnóstico de Matemática",
  portugues: "Diagnóstico de Português",
};

export default function DiagnosticoLauncher() {
  const [list, setList] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [screening, setScreening] = useState(false);
  const [weeks, setWeeks] = useState(6);
  const [domain, setDomain] = useState<"matematica" | "portugues">("matematica");
  const [err, setErr] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/diag/launch");
      const d = await r.json();
      if (r.ok) setList(d.assessments ?? []);
      else setErr(d.error ?? "Erro");
    } catch {
      setErr("Falha de ligação.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async () => {
    setCreating(true);
    setErr("");
    try {
      const r = await fetch("/api/diag/launch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ includeScreening: screening, retestAfterDays: weeks * 7, domain, title: DOMAIN_TITLE[domain] }) });
      const d = await r.json();
      if (!r.ok) setErr(d.error ?? "Erro ao criar.");
      else await load();
    } catch {
      setErr("Falha de ligação.");
    } finally {
      setCreating(false);
    }
  }, [load, screening, weeks, domain]);

  const dueCount = list.reduce((acc, a) => {
    const retested = new Set(a.diag_sessions.filter((s) => s.is_retest_of).map((s) => s.is_retest_of));
    return (
      acc +
      a.diag_sessions.filter(
        (s) => s.status === "finished" && !retested.has(s.id) && (daysSince(s.finished_at) ?? 0) >= (a.retest_after_days ?? RETEST_DAYS),
      ).length
    );
  }, 0);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl" style={{ fontFamily: "Playfair Display, serif", color: NAVY }}>
          Diagnóstico adaptativo
        </h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-xs" style={{ color: NAVY, opacity: 0.7 }}>
            área
            <select value={domain} onChange={(e) => setDomain(e.target.value as "matematica" | "portugues")} className="rounded px-1 py-0.5" style={{ color: NAVY, border: `1px solid ${NAVY}22` }}>
              <option value="matematica">Matemática</option>
              <option value="portugues">Português</option>
            </select>
          </label>
          <label className="flex items-center gap-1 text-xs" style={{ color: NAVY, opacity: 0.7 }}>
            reavaliar após
            <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="rounded px-1 py-0.5" style={{ color: NAVY, border: `1px solid ${NAVY}22` }}>
              <option value={4}>4 sem.</option>
              <option value={6}>6 sem.</option>
              <option value={8}>8 sem.</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: NAVY, opacity: 0.7 }}>
            <input type="checkbox" checked={screening} onChange={(e) => setScreening(e.target.checked)} />
            mini-jogos de rastreio
          </label>
          <button
            onClick={create}
            disabled={creating}
            className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={{ background: BLUE, color: NAVY }}
          >
            {creating ? "A criar…" : "+ Criar diagnóstico"}
          </button>
        </div>
      </div>
      <p className="text-sm mb-6" style={{ color: NAVY, opacity: 0.6 }}>
        {DOMAIN_LABEL[domain]}. O aluno entra com o código e explora ao seu ritmo; tu lês o retrato.
      </p>

      {dueCount > 0 && (
        <div className="rounded-xl p-3 mb-6 flex items-start gap-2" style={{ background: AMBER_BG }}>
          <span>⏰</span>
          <p className="text-sm" style={{ color: AMBER }}>
            <b>{dueCount} {dueCount === 1 ? "aluno pronto" : "alunos prontos"} para reavaliar.</b> Passou a
            janela de reavaliação definida — volta a partilhar o mesmo código e o aluno repete-o com o mesmo
            nome. O progresso é comparado automaticamente (pré/pós).
          </p>
        </div>
      )}

      {err && <p className="text-sm mb-4" style={{ color: "#b00020" }}>{err}</p>}
      {loading && <p style={{ color: NAVY, opacity: 0.6 }}>A carregar…</p>}

      {!loading && list.length === 0 && (
        <div className="rounded-2xl p-8 text-center" style={{ background: "#fff", border: `1px solid ${NAVY}15` }}>
          <p style={{ color: NAVY, opacity: 0.7 }}>Ainda não há diagnósticos. Cria o primeiro — leva um instante.</p>
        </div>
      )}

      <div className="space-y-4">
        {list.map((a) => {
          const studentUrl = `${origin}/diag/${a.access_code}`;
          const retested = new Set(a.diag_sessions.filter((s) => s.is_retest_of).map((s) => s.is_retest_of));
          return (
            <div key={a.id} className="rounded-2xl p-5" style={{ background: "#fff", border: `1px solid ${NAVY}15` }}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm flex items-center gap-2" style={{ color: NAVY, opacity: 0.6 }}>
                    {a.title}
                    <span className="rounded px-1.5 py-0.5" style={{ background: a.domain === "portugues" ? "#e7d9f5" : "#d8eef6", color: NAVY, fontSize: 11, opacity: 0.9 }}>
                      {a.domain === "portugues" ? "Português" : "Matemática"}
                    </span>
                  </p>
                  <p className="text-2xl font-mono font-bold tracking-widest" style={{ color: NAVY }}>{a.access_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs mb-1" style={{ color: NAVY, opacity: 0.5 }}>ligação para os alunos</p>
                  <button
                    onClick={() => navigator.clipboard?.writeText(studentUrl)}
                    className="text-xs underline"
                    style={{ color: BLUE }}
                    title="copiar"
                  >
                    {studentUrl}
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${NAVY}12` }}>
                {a.diag_sessions.length === 0 ? (
                  <p className="text-sm" style={{ color: NAVY, opacity: 0.5 }}>Sem sessões ainda.</p>
                ) : (
                  <div className="space-y-1">
                    {a.diag_sessions.map((s) => {
                      const due = s.status === "finished" && !retested.has(s.id) && (daysSince(s.finished_at) ?? 0) >= (a.retest_after_days ?? RETEST_DAYS);
                      return (
                        <div key={s.id} className="flex items-center justify-between text-sm py-1 gap-2">
                          <span style={{ color: NAVY }}>
                            {s.student_label}
                            {s.is_retest_of && <span style={{ color: BLUE, fontSize: 11 }}> · reavaliação</span>}
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            {due && (
                              <span className="rounded px-1.5 py-0.5" style={{ background: AMBER_BG, color: AMBER, fontSize: 11 }}>
                                ⏰ reavaliar
                              </span>
                            )}
                            {s.status === "finished" ? (
                              <a href={`/dashboard/diagnostico/${s.id}`} target="_blank" rel="noreferrer"
                                className="font-semibold" style={{ color: GOLD }}>
                                ver relatório →
                              </a>
                            ) : (
                              <span style={{ color: NAVY, opacity: 0.45 }}>em curso…</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
