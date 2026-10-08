"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import Calculator from "@/components/exam/Calculator";
import Screening from "@/components/diagnostic/Screening";
import MapaCartografo from "@/components/diagnostic/MapaCartografo";
import { getDomainGraph } from "@/lib/diagnostic/domains";
import type { CalcEntry } from "@/lib/exam/types";
import type { ScreeningResult } from "@/lib/diagnostic/screening";

// Paleta (tokens do projecto)
const NAVY = "#0D1B2A";
const CHALK = "#F7F3EE";
const BLUE = "#00B4D8";
const GOLD = "#C8A84B";

type Phase = "identify" | "play" | "screening" | "done" | "error";

interface ClientItem {
  id: string;
  node_code: string;
  stem: string;
  response_type: "mcq" | "open_numeric" | "open_fraction" | "open_text" | "audio_reading";
  options?: string[];
  hints: string[];
  is_fluency: boolean;
  allow_calculator: boolean;
  text_id?: string | null;
}

interface Passage {
  id: string;
  title: string;
  body: string;
  genre: string | null;
}

export default function DiagPlayer() {
  const { code } = useParams<{ code: string }>();
  const [phase, setPhase] = useState<Phase>("identify");
  const [label, setLabel] = useState("");
  const [roster, setRoster] = useState<{ hasClass: boolean; members: { id: string; name: string }[] }>({ hasClass: false, members: [] });
  const [memberId, setMemberId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [domain, setDomain] = useState<string>("matematica");
  const [item, setItem] = useState<ClientItem | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [phaseKind, setPhaseKind] = useState<"probe" | "dynamic">("probe");
  const [hintsAvailable, setHintsAvailable] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [visited, setVisited] = useState(0);
  const [regions, setRegions] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [choice, setChoice] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [num, setNum] = useState("");
  const [den, setDen] = useState("");
  const [showCalc, setShowCalc] = useState(false);

  // Leitura em voz alta (audio_reading)
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState("");
  const audioBlobRef = useRef<Blob | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const calcTrail = useRef<CalcEntry[]>([]);
  const shownAt = useRef(0);
  const includeScreeningRef = useRef(false);

  // Se o diagnóstico estiver ligado a uma turma, carrega a lista de alunos para escolher.
  useEffect(() => {
    if (!code) return;
    fetch(`/api/diag/roster?code=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((d) => { if (d.hasClass) setRoster({ hasClass: true, members: d.members ?? [] }); })
      .catch(() => {});
  }, [code]);

  const graph = useMemo(() => getDomainGraph(domain), [domain]);
  const mapOrder = useMemo(() => graph.topologicalOrder(), [graph]);
  const regionLabel = item ? graph.NODES[item.node_code]?.label ?? "" : "";

  const applyStep = useCallback((data: Record<string, unknown>) => {
    if (data.done) {
      setItem(null);
      setPhase(includeScreeningRef.current ? "screening" : "done");
      return;
    }
    const it = data.item as ClientItem;
    setItem(it);
    // Passagem de leitura: o servidor envia `text` sempre que o item tem text_id.
    // Mantém-se visível entre itens do mesmo texto; desaparece quando o item não tem texto.
    if (data.text) setPassage(data.text as Passage);
    else if (!it.text_id) setPassage(null);
    setPhaseKind((data.phase as "probe" | "dynamic") ?? "probe");
    setHintsAvailable((data.hintsAvailable as number) ?? 0);
    setRevealed(0);
    setChoice(null);
    setText("");
    setNum("");
    setDen("");
    setShowCalc(false);
    // limpar estado de gravação anterior
    setRecording(false);
    setMicError("");
    audioBlobRef.current = null;
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    calcTrail.current = [];
    shownAt.current = Date.now();
    setVisited((v) => v + 1);
    setRegions((r) => (r.includes(it.node_code) ? r : [...r, it.node_code]));
  }, []);

  const startRec = useCallback(async () => {
    setMicError("");
    audioBlobRef.current = null;
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        audioBlobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setMicError("Não consegui aceder ao microfone. Verifica as permissões — ou continua sem gravar.");
    }
  }, []);

  const stopRec = useCallback(() => {
    recorderRef.current?.stop();
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    // Com turma: é preciso escolher o aluno da lista. Sem turma: escrever o nome.
    if (roster.hasClass ? !memberId : !label.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/diag/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roster.hasClass ? { code, classMemberId: memberId } : { code, label: label.trim() }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErr(data.error ?? "Não foi possível começar.");
        setPhase("error");
        return;
      }
      setSessionId(data.sessionId);
      if (data.domain) setDomain(String(data.domain));
      includeScreeningRef.current = !!data.includeScreening;
      setPhase("play");
      applyStep(data);
    } catch {
      setErr("Falha de ligação.");
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [code, label, roster.hasClass, memberId, applyStep]);

  const currentGiven = (): string | null => {
    if (!item) return null;
    if (item.response_type === "mcq") return choice;
    if (item.response_type === "open_fraction") return num && den ? `${num}/${den}` : null;
    if (item.response_type === "audio_reading") {
      // pronto a avançar quando há gravação feita (ou o micro falhou → segue sem áudio)
      return audioUrl || micError ? "audio" : null;
    }
    return text.trim() || null;
  };

  const answer = useCallback(async () => {
    const given = currentGiven();
    if (given == null || !item) return;
    setBusy(true);
    try {
      // Leitura em voz alta: enviar a gravação primeiro (se existir), obter o caminho.
      let audioPath: string | null = null;
      if (item.response_type === "audio_reading" && audioBlobRef.current) {
        try {
          const fd = new FormData();
          fd.append("sessionId", sessionId);
          fd.append("itemId", item.id);
          fd.append("audio", audioBlobRef.current, "leitura.webm");
          const up = await fetch("/api/diag/audio", { method: "POST", body: fd });
          const uj = await up.json();
          if (up.ok) audioPath = uj.audioPath ?? null;
        } catch {
          /* se o upload falhar, segue sem áudio — o nó fica por medir */
        }
      }
      const r = await fetch("/api/diag/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          itemId: item.id,
          given,
          latencyMs: Date.now() - shownAt.current,
          hintsUsed: revealed,
          calcTrail: calcTrail.current.length ? calcTrail.current : null,
          audioPath,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErr(data.error ?? "Erro ao registar a resposta.");
        setPhase("error");
        return;
      }
      applyStep(data);
    } catch {
      setErr("Falha de ligação.");
      setPhase("error");
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, sessionId, revealed, choice, text, num, den, audioUrl, micError, applyStep]);

  const submitScreening = useCallback(async (res: ScreeningResult[]) => {
    try {
      await fetch("/api/diag/screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, results: res }),
      });
    } catch {
      /* não bloqueia o fim */
    }
    setPhase("done");
  }, [sessionId]);

  // ── Ecrãs ──────────────────────────────────────────────────────────────────
  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: "100dvh", background: NAVY, color: CHALK }} className="flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-xl">{children}</div>
    </div>
  );

  if (phase === "identify") {
    return shell(
      <div className="text-center">
        <p style={{ color: GOLD, letterSpacing: 3 }} className="text-xs uppercase mb-2">Cartógrafo</p>
        <h1 className="text-3xl font-serif mb-3" style={{ fontFamily: "Playfair Display, serif" }}>
          Vamos traçar o teu mapa
        </h1>
        <p className="opacity-80 mb-8 text-sm leading-relaxed">
          Não há tempo a contar nem respostas erradas — cada resposta revela um pedaço de território.
          Responde com calma, ao teu ritmo.
        </p>
        {roster.hasClass ? (
          <div className="mb-4">
            <p className="opacity-70 text-xs mb-3">Escolhe o teu nome na lista:</p>
            <div className="grid gap-2 max-h-[46vh] overflow-y-auto pr-1">
              {roster.members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMemberId(m.id)}
                  className="rounded-xl px-4 py-3 text-center transition-all"
                  style={{
                    background: memberId === m.id ? BLUE : "#12263a",
                    color: memberId === m.id ? NAVY : CHALK,
                    border: `1px solid ${memberId === m.id ? BLUE : BLUE + "33"}`,
                  }}
                >
                  {m.name}
                </button>
              ))}
              {roster.members.length === 0 && (
                <p className="opacity-60 text-sm">Esta turma ainda não tem alunos. Avisa o teu professor.</p>
              )}
            </div>
          </div>
        ) : (
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && start()}
            placeholder="O teu nome"
            className="w-full rounded-xl px-4 py-3 mb-4 text-center outline-none"
            style={{ background: "#12263a", color: CHALK, border: `1px solid ${BLUE}44` }}
          />
        )}
        <button
          onClick={start}
          disabled={busy || (roster.hasClass ? !memberId : !label.trim())}
          className="w-full rounded-xl px-4 py-3 font-semibold transition-opacity disabled:opacity-40"
          style={{ background: BLUE, color: NAVY }}
        >
          {busy ? "A preparar…" : "Começar a explorar"}
        </button>
      </div>,
    );
  }

  if (phase === "error") {
    return shell(
      <div className="text-center">
        <p className="text-lg mb-2">Ups.</p>
        <p className="opacity-80">{err}</p>
      </div>,
    );
  }

  if (phase === "done") {
    return shell(
      <div className="text-center">
        <div className="text-5xl mb-4">🗺️</div>
        <h1 className="text-2xl font-serif mb-3" style={{ fontFamily: "Playfair Display, serif" }}>
          Mapa traçado!
        </h1>
        <p className="opacity-85 mb-2">Exploraste {regions.length} regiões em {visited} passos.</p>
        <p className="opacity-70 text-sm">Obrigado. O teu professor vai receber o mapa.</p>
      </div>,
    );
  }

  if (phase === "screening") {
    return shell(
      <div className="text-center">
        <p className="opacity-80 text-sm mb-6">Boa! Agora três mini-jogos rápidos, só para conhecer-te melhor.</p>
        <Screening onComplete={submitScreening} />
      </div>,
    );
  }

  // phase === "play"
  return shell(
    <div>
      {/* Mapa do cartógrafo (sem cronómetro, sem pontos) */}
      <div className="mb-5">
        <p style={{ color: GOLD, letterSpacing: 2 }} className="text-[10px] uppercase">
          {phaseKind === "dynamic" ? "Vamos com calma" : "A explorar"}
        </p>
        <p className="text-sm font-semibold mb-2">{regionLabel}</p>
        <MapaCartografo visited={regions} current={item?.node_code} order={mapOrder} />
      </div>

      {/* Passagem de leitura — para itens de compreensão (sem ela a pergunta não faz sentido) */}
      {passage && item?.text_id && (
        <div
          className="rounded-2xl p-5 mb-4"
          style={{ background: CHALK, color: NAVY, border: `1px solid ${GOLD}` }}
        >
          <p style={{ color: GOLD, letterSpacing: 2 }} className="text-[10px] uppercase mb-1">
            Lê com atenção
          </p>
          <h2 className="font-serif text-lg mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
            {passage.title}
          </h2>
          <div className="text-[15px] leading-relaxed" style={{ maxHeight: "40vh", overflowY: "auto" }}>
            {passage.body.split(/\n+/).map((p, i) => (
              <p key={i} className="mb-3">{p}</p>
            ))}
          </div>
        </div>
      )}

      {item && (
        <div className="rounded-2xl p-6 mb-5" style={{ background: "#12263a", border: `1px solid ${BLUE}33` }}>
          <p className="text-xl leading-relaxed mb-5">{item.stem}</p>

          {item.response_type === "mcq" && (
            <div className="grid gap-2">
              {(item.options ?? []).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setChoice(opt)}
                  className="text-left rounded-xl px-4 py-3 transition-all"
                  style={{
                    background: choice === opt ? BLUE : "#0d1b2a",
                    color: choice === opt ? NAVY : CHALK,
                    border: `1px solid ${choice === opt ? BLUE : "#ffffff22"}`,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {item.response_type === "open_numeric" && (
            <input
              inputMode="decimal"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && answer()}
              placeholder="A tua resposta"
              autoFocus
              className="w-full rounded-xl px-4 py-3 text-lg outline-none"
              style={{ background: "#0d1b2a", color: CHALK, border: `1px solid ${BLUE}44` }}
            />
          )}

          {item.response_type === "open_text" && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreve a tua resposta e explica porquê…"
              autoFocus
              rows={4}
              className="w-full rounded-xl px-4 py-3 text-base outline-none resize-y"
              style={{ background: "#0d1b2a", color: CHALK, border: `1px solid ${BLUE}44`, minHeight: 96 }}
            />
          )}

          {item.response_type === "open_fraction" && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <input value={num} onChange={(e) => setNum(e.target.value)} inputMode="numeric" placeholder="num"
                  className="w-20 rounded-lg px-3 py-2 text-center outline-none" style={{ background: "#0d1b2a", color: CHALK, border: `1px solid ${BLUE}44` }} />
                <div style={{ height: 2, width: 64, background: CHALK, margin: "6px 0" }} />
                <input value={den} onChange={(e) => setDen(e.target.value)} inputMode="numeric" placeholder="den"
                  className="w-20 rounded-lg px-3 py-2 text-center outline-none" style={{ background: "#0d1b2a", color: CHALK, border: `1px solid ${BLUE}44` }} />
              </div>
            </div>
          )}

          {item.response_type === "audio_reading" && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm opacity-80 text-center">Lê o texto acima em voz alta, com calma. Quando terminares, carrega em parar.</p>
              {!recording && !audioUrl && (
                <button
                  onClick={startRec}
                  className="rounded-full px-6 py-3 font-semibold flex items-center gap-2"
                  style={{ background: BLUE, color: NAVY }}
                >
                  <span style={{ fontSize: 18 }}>●</span> Gravar a minha leitura
                </button>
              )}
              {recording && (
                <button
                  onClick={stopRec}
                  className="rounded-full px-6 py-3 font-semibold flex items-center gap-2"
                  style={{ background: "#e23", color: CHALK }}
                >
                  <span className="animate-pulse" style={{ fontSize: 18 }}>■</span> A gravar… parar
                </button>
              )}
              {audioUrl && !recording && (
                <div className="w-full flex flex-col items-center gap-2">
                  <audio src={audioUrl} controls className="w-full" />
                  <button onClick={startRec} className="text-sm underline opacity-80">Gravar outra vez</button>
                </div>
              )}
              {micError && <p className="text-sm text-center" style={{ color: GOLD }}>{micError}</p>}
            </div>
          )}

          {/* Ajudas graduadas — só na fase dinâmica */}
          {phaseKind === "dynamic" && hintsAvailable > 0 && (
            <div className="mt-5">
              {item.hints.slice(0, revealed).map((h, i) => (
                <p key={i} className="text-sm mb-2 rounded-lg px-3 py-2" style={{ background: "#0d1b2a", color: GOLD }}>
                  💡 {h}
                </p>
              ))}
              {revealed < hintsAvailable && (
                <button onClick={() => setRevealed((r) => r + 1)} className="text-sm underline opacity-80">
                  Preciso de uma pista
                </button>
              )}
            </div>
          )}

          {/* Calculadora (regista os passos) */}
          {item.allow_calculator && (
            <div className="mt-5">
              <button onClick={() => setShowCalc((v) => !v)} className="text-sm underline opacity-80">
                {showCalc ? "Fechar calculadora" : "Abrir calculadora"}
              </button>
              {showCalc && (
                <div className="mt-3">
                  <Calculator inline onEntry={(e) => calcTrail.current.push(e)} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={answer}
        disabled={busy || currentGiven() == null}
        className="w-full rounded-xl px-4 py-3 font-semibold transition-opacity disabled:opacity-40"
        style={{ background: GOLD, color: NAVY }}
      >
        {busy ? "…" : "Seguinte"}
      </button>
    </div>,
  );
}
