/**
 * Mini-jogos de RASTREIO — indicadores, NÃO diagnóstico cognitivo.
 *
 * ⚠️ INVIOLÁVEL: estes jogos produzem INDICADORES para ponderar encaminhamento ao
 * SPO. Não são avaliação psicológica e não substituem instrumentos aferidos para a
 * população portuguesa. As normas abaixo são grosseiras, apenas para situar o
 * indicador em bandas largas (baixo/médio/alto) para ~10–12 anos. O relatório di-lo
 * sempre de forma explícita.
 *
 * Lógica pura (configuração + pontuação). A interação vive no componente do player.
 */

export type GameKey = "working_memory" | "attention" | "processing_speed";

export interface ScreeningResult {
  game_key: GameKey;
  raw_score: number;
  normalized_indicator: number; // 0..1 (relativo, só indicador)
  band: "baixo" | "medio" | "alto";
  notes?: string;
}

export const GAME_META: Record<GameKey, { title: string; instruction: string }> = {
  working_memory: {
    title: "Memória de trabalho",
    instruction: "Vais ver uma sequência de números, um a um. Quando terminar, escreve-os pela mesma ordem.",
  },
  attention: {
    title: "Atenção",
    instruction: "Carrega SÓ quando aparecer o alvo 🔵. Ignora os outros. Sê rápido, mas não te enganes.",
  },
  processing_speed: {
    title: "Velocidade",
    instruction: "Cada símbolo vale um número (vê a legenda). Escreve o número certo o mais depressa que conseguires.",
  },
};

// ── Parâmetros ────────────────────────────────────────────────────────────────
export const WM_START_SPAN = 3; // começa em 3 dígitos
export const WM_MAX_SPAN = 8;
export const WM_DIGIT_MS = 900; // tempo por dígito mostrado

export const ATT_TRIALS = 24; // total de estímulos
export const ATT_TARGET_RATIO = 0.4; // proporção de alvos
export const ATT_STIM_MS = 1100; // janela por estímulo

export const PS_DURATION_S = 45; // duração da prova de velocidade
export const PS_SYMBOLS = ["▲", "●", "■", "★", "♦"]; // legenda símbolo→índice+1

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
function band(n: number): "baixo" | "medio" | "alto" {
  return n < 0.34 ? "baixo" : n < 0.67 ? "medio" : "alto";
}

/** Amplitude de dígitos: raw = maior sequência correcta. */
export function scoreWorkingMemory(maxSpan: number): ScreeningResult {
  const norm = clamp01((maxSpan - 2) / 5); // span 2→0, 7→1
  return { game_key: "working_memory", raw_score: maxSpan, normalized_indicator: norm, band: band(norm), notes: `amplitude ${maxSpan}` };
}

/** Go/no-go: precisão combinada (acertos + inibições correctas). */
export function scoreAttention(p: {
  hits: number; targets: number; falseAlarms: number; nonTargets: number;
}): ScreeningResult {
  const correctInhibitions = p.nonTargets - p.falseAlarms;
  const total = p.targets + p.nonTargets;
  const acc = total ? (p.hits + correctInhibitions) / total : 0;
  return {
    game_key: "attention",
    raw_score: Math.round(acc * 100),
    normalized_indicator: clamp01(acc),
    band: band(acc),
    notes: `acertos ${p.hits}/${p.targets}, falsos alarmes ${p.falseAlarms}`,
  };
}

/** Velocidade: correctos em PS_DURATION_S; ~30/min ≈ típico para a idade (grosseiro). */
export function scoreProcessingSpeed(correct: number, durationS = PS_DURATION_S): ScreeningResult {
  const perMin = correct / (durationS / 60);
  const norm = clamp01(perMin / 40); // 40/min → topo da banda indicativa
  return { game_key: "processing_speed", raw_score: correct, normalized_indicator: norm, band: band(norm), notes: `${correct} em ${durationS}s (~${perMin.toFixed(0)}/min)` };
}

export function bandOf(n: number): "baixo" | "medio" | "alto" {
  return band(n);
}

export const BAND_LABEL: Record<string, string> = {
  baixo: "abaixo do indicativo",
  medio: "dentro do indicativo",
  alto: "acima do indicativo",
};
