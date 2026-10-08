"use client";

import { useCallback, useEffect, useState } from "react";

const NAVY = "#0D1B2A";
const BLUE = "#00B4D8";
const GOLD = "#C8A84B";

interface ClassOpt { id: string; name: string; year_level: number; member_count: number }
interface Member { id: string; name: string; email: string | null }

export default function TurmasPage() {
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string; year_level: number } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [newName, setNewName] = useState("");
  const [newYear, setNewYear] = useState(6);
  const [addText, setAddText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const loadClasses = useCallback(async () => {
    try {
      const d = await (await fetch("/api/classes")).json();
      setClasses(d.classes ?? []);
    } catch { setErr("Falha de ligação."); }
  }, []);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  const openClass = useCallback(async (id: string) => {
    setErr("");
    const d = await (await fetch(`/api/classes/${id}`)).json();
    if (d.class) { setSelected(d.class); setMembers(d.members ?? []); }
  }, []);

  const createClass = useCallback(async () => {
    if (!newName.trim()) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim(), yearLevel: newYear }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "Erro ao criar."); return; }
      setNewName("");
      await loadClasses();
      if (d.class?.id) await openClass(d.class.id);
    } finally { setBusy(false); }
  }, [newName, newYear, loadClasses, openClass]);

  const addMembers = useCallback(async () => {
    if (!selected || !addText.trim()) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/classes/${selected.id}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: addText }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "Erro ao adicionar."); return; }
      setAddText("");
      await openClass(selected.id);
      await loadClasses();
    } finally { setBusy(false); }
  }, [selected, addText, openClass, loadClasses]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!selected) return;
    await fetch(`/api/classes/${selected.id}/members?memberId=${memberId}`, { method: "DELETE" });
    await openClass(selected.id);
    await loadClasses();
  }, [selected, openClass, loadClasses]);

  const deleteClass = useCallback(async (id: string) => {
    if (!confirm("Apagar esta turma e todos os seus alunos?")) return;
    await fetch(`/api/classes/${id}`, { method: "DELETE" });
    if (selected?.id === id) { setSelected(null); setMembers([]); }
    await loadClasses();
  }, [selected, loadClasses]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl mb-1" style={{ fontFamily: "Playfair Display, serif", color: NAVY }}>Turmas</h1>
      <p className="text-sm mb-6" style={{ color: NAVY, opacity: 0.6 }}>
        Cria turmas e adiciona os alunos. Depois, ao criar um diagnóstico, escolhes a turma — e o aluno identifica-se escolhendo o nome da lista.
      </p>

      {err && <p className="text-sm mb-4" style={{ color: "#b00020" }}>{err}</p>}

      {/* Criar turma */}
      <div className="rounded-2xl p-4 mb-6 flex flex-wrap items-end gap-3" style={{ background: "#fff", border: `1px solid ${NAVY}15` }}>
        <label className="text-xs" style={{ color: NAVY, opacity: 0.7 }}>
          <span className="block mb-1">Nome da turma</span>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createClass()} placeholder="ex.: 6.º B"
            className="rounded-lg px-3 py-2 text-sm outline-none" style={{ border: `1px solid ${NAVY}22`, color: NAVY, minWidth: 180 }} />
        </label>
        <label className="text-xs" style={{ color: NAVY, opacity: 0.7 }}>
          <span className="block mb-1">Ano</span>
          <select value={newYear} onChange={(e) => setNewYear(Number(e.target.value))} className="rounded-lg px-3 py-2 text-sm" style={{ border: `1px solid ${NAVY}22`, color: NAVY }}>
            {[5, 6, 1, 2, 3, 4, 7, 8, 9].map((y) => <option key={y} value={y}>{y}.º ano</option>)}
          </select>
        </label>
        <button onClick={createClass} disabled={busy || !newName.trim()} className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50" style={{ background: BLUE, color: NAVY }}>
          + Criar turma
        </button>
      </div>

      {/* Lista de turmas */}
      {classes.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "#fff", border: `1px solid ${NAVY}15` }}>
          <p style={{ color: NAVY, opacity: 0.7 }}>Ainda não há turmas. Cria a primeira acima.</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {classes.map((c) => (
            <div key={c.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#fff", border: `1px solid ${selected?.id === c.id ? BLUE : NAVY + "15"}` }}>
              <button onClick={() => openClass(c.id)} className="text-left">
                <span className="font-semibold" style={{ color: NAVY }}>{c.name}</span>
                <span className="text-xs ml-2" style={{ color: NAVY, opacity: 0.5 }}>{c.year_level}.º ano · {c.member_count} aluno(s)</span>
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => openClass(c.id)} className="text-xs underline" style={{ color: BLUE }}>abrir</button>
                <button onClick={() => deleteClass(c.id)} className="text-xs underline" style={{ color: "#b00020" }}>apagar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Turma selecionada: alunos */}
      {selected && (
        <div className="rounded-2xl p-5" style={{ background: "#fff", border: `1px solid ${NAVY}15` }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg" style={{ fontFamily: "Playfair Display, serif", color: NAVY }}>{selected.name} · {selected.year_level}.º</h2>
            <span className="text-xs" style={{ color: NAVY, opacity: 0.5 }}>{members.length} aluno(s)</span>
          </div>

          {members.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {members.map((m) => (
                <span key={m.id} className="rounded-full px-3 py-1 text-sm flex items-center gap-2" style={{ background: "#f6f4f0", color: NAVY }}>
                  {m.name}
                  <button onClick={() => removeMember(m.id)} title="remover" style={{ color: "#b00020", fontWeight: 700 }}>×</button>
                </span>
              ))}
            </div>
          )}

          <label className="text-xs" style={{ color: NAVY, opacity: 0.7 }}>
            <span className="block mb-1">Adicionar alunos (um nome por linha)</span>
            <textarea value={addText} onChange={(e) => setAddText(e.target.value)} rows={4} placeholder={"Ana Silva\nRui Costa\nMariana Lopes"}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y" style={{ border: `1px solid ${NAVY}22`, color: NAVY }} />
          </label>
          <button onClick={addMembers} disabled={busy || !addText.trim()} className="mt-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50" style={{ background: GOLD, color: NAVY }}>
            {busy ? "A adicionar…" : "Adicionar à turma"}
          </button>
        </div>
      )}
    </div>
  );
}
