"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  GAME_META, WM_START_SPAN, WM_MAX_SPAN, WM_DIGIT_MS,
  ATT_TRIALS, ATT_TARGET_RATIO, ATT_STIM_MS,
  PS_DURATION_S, PS_SYMBOLS,
  scoreWorkingMemory, scoreAttention, scoreProcessingSpeed,
  type ScreeningResult, type GameKey,
} from "@/lib/diagnostic/screening";

const NAVY = "#0D1B2A";
const CHALK = "#F7F3EE";
const BLUE = "#00B4D8";
const GOLD = "#C8A84B";

const rInt = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

export default function Screening({ onComplete }: { onComplete: (r: ScreeningResult[]) => void }) {
  const [idx, setIdx] = useState(0); // 0=WM, 1=ATT, 2=PS
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const order: GameKey[] = ["working_memory", "attention", "processing_speed"];

  const done = useCallback((r: ScreeningResult) => {
    const all = [...results, r];
    setResults(all);
    if (idx < order.length - 1) setIdx(idx + 1);
    else onComplete(all);
  }, [results, idx, onComplete, order.length]);

  const key = order[idx];
  return (
    <div className="text-center">
      <p style={{ color: GOLD, letterSpacing: 2 }} className="text-[10px] uppercase mb-1">
        Jogo {idx + 1} de 3 · rastreio
      </p>
      {key === "working_memory" && <WorkingMemory onDone={done} />}
      {key === "attention" && <Attention onDone={done} />}
      {key === "processing_speed" && <ProcessingSpeed onDone={done} />}
    </div>
  );
}

// ── Casca comum: intro → jogo ──────────────────────────────────────────────────
function GameShell({ k, started, onStart, children }: {
  k: GameKey; started: boolean; onStart: () => void; children: React.ReactNode;
}) {
  const m = GAME_META[k];
  if (!started) {
    return (
      <div>
        <h2 className="text-2xl mb-3" style={{ fontFamily: "Playfair Display, serif", color: CHALK }}>{m.title}</h2>
        <p className="opacity-80 text-sm mb-8 leading-relaxed max-w-sm mx-auto">{m.instruction}</p>
        <button onClick={onStart} className="rounded-xl px-6 py-3 font-semibold" style={{ background: BLUE, color: NAVY }}>
          Começar
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

// ── 1. Memória de trabalho (amplitude de dígitos) ──────────────────────────────
function WorkingMemory({ onDone }: { onDone: (r: ScreeningResult) => void }) {
  const [started, setStarted] = useState(false);
  const [span, setSpan] = useState(WM_START_SPAN);
  const [seq, setSeq] = useState<number[]>([]);
  const [showing, setShowing] = useState(-1); // índice do dígito a mostrar; -1 = input
  const [entry, setEntry] = useState<number[]>([]);

  const newRound = useCallback((n: number) => {
    const s = Array.from({ length: n }, () => rInt(0, 9));
    setSeq(s); setEntry([]); setShowing(0);
  }, []);

  useEffect(() => { if (started && seq.length === 0) newRound(WM_START_SPAN); }, [started, seq.length, newRound]);

  useEffect(() => {
    if (showing < 0 || seq.length === 0) return;
    if (showing >= seq.length) { const t = setTimeout(() => setShowing(-1), 400); return () => clearTimeout(t); }
    const t = setTimeout(() => setShowing((i) => i + 1), WM_DIGIT_MS);
    return () => clearTimeout(t);
  }, [showing, seq]);

  const confirm = () => {
    const correct = entry.length === seq.length && entry.every((d, i) => d === seq[i]);
    if (correct && span < WM_MAX_SPAN) { const n = span + 1; setSpan(n); newRound(n); }
    else { onDone(scoreWorkingMemory(correct ? span : span - 1)); }
  };

  return (
    <GameShell k="working_memory" started={started} onStart={() => setStarted(true)}>
      {showing >= 0 ? (
        <div style={{ minHeight: 160 }} className="flex items-center justify-center">
          <span style={{ fontSize: 80, color: GOLD, fontFamily: "JetBrains Mono, monospace" }}>
            {showing < seq.length ? seq[showing] : ""}
          </span>
        </div>
      ) : (
        <div>
          <p className="opacity-80 text-sm mb-3">Escreve a sequência ({seq.length} dígitos):</p>
          <p style={{ fontSize: 28, letterSpacing: 6, minHeight: 40, color: CHALK, fontFamily: "JetBrains Mono, monospace" }}>
            {entry.join("")}
          </p>
          <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto my-4">
            {Array.from({ length: 10 }, (_, d) => (
              <button key={d} onClick={() => entry.length < seq.length && setEntry([...entry, d])}
                className="rounded-lg py-3 text-lg font-semibold" style={{ background: "#12263a", color: CHALK }}>{d}</button>
            ))}
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={() => setEntry(entry.slice(0, -1))} className="rounded-lg px-4 py-2 text-sm" style={{ background: "#12263a", color: CHALK }}>⌫</button>
            <button onClick={confirm} disabled={entry.length !== seq.length} className="rounded-lg px-6 py-2 text-sm font-semibold disabled:opacity-40" style={{ background: BLUE, color: NAVY }}>Confirmar</button>
          </div>
        </div>
      )}
    </GameShell>
  );
}

// ── 2. Atenção (go/no-go) ──────────────────────────────────────────────────────
function Attention({ onDone }: { onDone: (r: ScreeningResult) => void }) {
  const [started, setStarted] = useState(false);
  const [trial, setTrial] = useState(-1);
  const [stim, setStim] = useState<"target" | "non" | null>(null);
  const plan = useRef<boolean[]>([]); // true = alvo
  const counts = useRef({ hits: 0, targets: 0, falseAlarms: 0, nonTargets: 0 });
  const responded = useRef(false);

  useEffect(() => {
    if (!started) return;
    plan.current = Array.from({ length: ATT_TRIALS }, () => Math.random() < ATT_TARGET_RATIO);
    counts.current = { hits: 0, targets: 0, falseAlarms: 0, nonTargets: 0 };
    setTrial(0);
  }, [started]);

  useEffect(() => {
    if (trial < 0) return;
    if (trial >= ATT_TRIALS) {
      onDone(scoreAttention(counts.current));
      return;
    }
    const isTarget = plan.current[trial];
    responded.current = false;
    setStim(isTarget ? "target" : "non");
    if (isTarget) counts.current.targets++; else counts.current.nonTargets++;
    const t = setTimeout(() => {
      setStim(null);
      setTimeout(() => setTrial((x) => x + 1), 250);
    }, ATT_STIM_MS);
    return () => clearTimeout(t);
  }, [trial, onDone]);

  const tap = () => {
    if (responded.current || !stim) return;
    responded.current = true;
    if (stim === "target") counts.current.hits++;
    else counts.current.falseAlarms++;
  };

  return (
    <GameShell k="attention" started={started} onStart={() => setStarted(true)}>
      <div style={{ minHeight: 160 }} className="flex items-center justify-center">
        <span style={{ fontSize: 90 }}>{stim === "target" ? "🔵" : stim === "non" ? "🟠" : "·"}</span>
      </div>
      <button onClick={tap} className="rounded-2xl px-10 py-5 text-lg font-semibold" style={{ background: GOLD, color: NAVY }}>
        Agora!
      </button>
      <p className="opacity-50 text-xs mt-4">só no 🔵</p>
    </GameShell>
  );
}

// ── 3. Velocidade de processamento (símbolo → número) ──────────────────────────
function ProcessingSpeed({ onDone }: { onDone: (r: ScreeningResult) => void }) {
  const [started, setStarted] = useState(false);
  const [sym, setSym] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [left, setLeft] = useState(PS_DURATION_S);
  const correctRef = useRef(0);

  useEffect(() => { if (started) setSym(rInt(0, PS_SYMBOLS.length - 1)); }, [started]);

  useEffect(() => {
    if (!started) return;
    if (left <= 0) { onDone(scoreProcessingSpeed(correctRef.current)); return; }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [started, left, onDone]);

  const answer = (n: number) => {
    if (n === sym + 1) { correctRef.current++; setCorrect(correctRef.current); }
    setSym(rInt(0, PS_SYMBOLS.length - 1));
  };

  return (
    <GameShell k="processing_speed" started={started} onStart={() => setStarted(true)}>
      {/* Legenda */}
      <div className="flex gap-3 justify-center mb-6 flex-wrap">
        {PS_SYMBOLS.map((s, i) => (
          <span key={s} className="rounded-lg px-2 py-1 text-sm" style={{ background: "#12263a", color: CHALK }}>
            <span style={{ fontSize: 18 }}>{s}</span> = {i + 1}
          </span>
        ))}
      </div>
      <div style={{ minHeight: 120 }} className="flex items-center justify-center">
        <span style={{ fontSize: 80, color: GOLD }}>{PS_SYMBOLS[sym]}</span>
      </div>
      <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto mb-4">
        {PS_SYMBOLS.map((_, i) => (
          <button key={i} onClick={() => answer(i + 1)} className="rounded-lg py-3 text-lg font-semibold" style={{ background: "#12263a", color: CHALK }}>{i + 1}</button>
        ))}
      </div>
      <p className="opacity-60 text-xs">⏳ {left}s · ✓ {correct}</p>
    </GameShell>
  );
}
