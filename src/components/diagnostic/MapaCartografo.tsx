"use client";

/**
 * Mapa do cartógrafo — visual-herói do player.
 * Movido a dados (a rede de graph.ts). Mostra o território a revelar-se: os nós
 * visitados acendem-se, o actual pulsa a ouro, os por explorar ficam na névoa.
 * Sem desempenho visível ao aluno (isso é do relatório) — só a jornada.
 */

import { topologicalOrder } from "@/lib/diagnostic/graph";

const NAVY = "#0D1B2A";
const BLUE = "#00B4D8";
const GOLD = "#C8A84B";
const FOG = "#24364a";

const MATH_ORDER = topologicalOrder(); // 17 nós, dos pré-requisitos para os dependentes

// Serpentina (boustrophedon) para caber em largura de telemóvel.
const COLS = 5;
const X0 = 30, DX = 70, Y0 = 34, DY = 52;
function posOf(i: number) {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  const c = row % 2 === 0 ? col : COLS - 1 - col;
  return { x: X0 + c * DX, y: Y0 + row * DY };
}

export default function MapaCartografo({
  visited,
  current,
  order,
}: {
  visited: string[];
  current?: string;
  // Ordem topológica do domínio activo; por omissão, Matemática (retrocompatível).
  order?: string[];
}) {
  const ORDER = order && order.length ? order : MATH_ORDER;
  const PTS = ORDER.map((_, i) => posOf(i));
  const TRAIL = PTS.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const H = Y0 + Math.ceil(ORDER.length / COLS) * DY; // altura do viewBox
  const seen = new Set(visited);
  return (
    <svg viewBox={`0 0 ${X0 * 2 + (COLS - 1) * DX} ${H}`} width="100%" style={{ maxHeight: 190, display: "block" }} role="img" aria-label="mapa da exploração">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={BLUE} stopOpacity="0.5" />
          <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Trilho */}
      <path d={TRAIL} fill="none" stroke={FOG} strokeWidth="2.5" strokeDasharray="1 6" strokeLinecap="round" />

      {/* Lugares */}
      {ORDER.map((code, i) => {
        const p = PTS[i];
        const isCurrent = code === current;
        const isSeen = seen.has(code);
        const fill = isCurrent ? GOLD : isSeen ? BLUE : NAVY;
        const stroke = isCurrent ? GOLD : isSeen ? BLUE : FOG;
        return (
          <g key={code}>
            {isCurrent && <circle cx={p.x} cy={p.y} r="16" fill="url(#glow)" />}
            {isCurrent && (
              <circle cx={p.x} cy={p.y} r="9" fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.8">
                <animate attributeName="r" values="7;13;7" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0;0.8" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={p.x} cy={p.y} r={isCurrent ? 6 : isSeen ? 5 : 3.5} fill={fill} stroke={stroke} strokeWidth="1.5" />
          </g>
        );
      })}

      {/* Rosa-dos-ventos */}
      <g transform={`translate(${X0 * 2 + (COLS - 1) * DX - 22} ${H - 20})`} opacity="0.5">
        <circle r="9" fill="none" stroke={GOLD} strokeWidth="1" />
        <path d="M0,-9 L2,0 L0,9 L-2,0 Z" fill={GOLD} />
        <text y="-11" textAnchor="middle" fontSize="6" fill={GOLD}>N</text>
      </g>
    </svg>
  );
}
