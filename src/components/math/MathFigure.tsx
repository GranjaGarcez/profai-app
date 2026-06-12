'use client'

import type { CSSProperties, ReactNode } from 'react'

// ── Paleta e estilos base ─────────────────────────────────────────────────────
const NAVY   = '#0D1B2A'
const BLUE   = '#00B4D8'
const FILL   = '#EBF8FF'
const GOLD   = '#C8A84B'
const T = { fontSize: 13, fontFamily: 'Georgia, serif', fill: NAVY } as CSSProperties

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Fig = { type: string; [k: string]: unknown }

// ── Componente principal ──────────────────────────────────────────────────────
export default function MathFigure({ figure }: { figure: unknown }) {
  if (!figure || typeof figure !== 'object') return null
  const fig = figure as Fig

  switch (fig.type) {
    case 'right_triangle':   return <RightTriangle      f={fig} />
    case 'triangle':         return <IsoscelesTriangle  f={fig} />
    case 'rectangle':        return <RectangleFig       f={fig} />
    case 'square':           return <SquareFig          f={fig} />
    case 'circle':           return <CircleFig          f={fig} />
    case 'angle':            return <AngleFig           f={fig} />
    case 'number_line':      return <NumberLineFig      f={fig} />
    case 'fraction_bar':     return <FractionBarFig     f={fig} />
    case 'bar_chart':        return <BarChartFig        f={fig} />
    case 'pie_chart':        return <PieChartFig        f={fig} />
    // ── Sólidos 3D ──────────────────────────────────────────────────────────
    case 'cuboid':
    case 'rectangular_prism':  return <CuboidFig          f={fig} />
    case 'cube':               return <CubeFig             f={fig} />
    case 'triangular_prism':   return <TriangularPrismFig  f={fig} />
    case 'pyramid':            return <PyramidFig          f={fig} />
    case 'cylinder':           return <CylinderFig         f={fig} />
    case 'cone':               return <ConeFig             f={fig} />
    case 'sphere':             return <SphereFig           f={fig} />
    default:                  return null
  }
}

// ── Wrapper SVG ───────────────────────────────────────────────────────────────
function Svg({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  return (
    <div className="flex justify-center my-3 no-print-break">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
        xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible', display: 'block' }}>
        {children}
      </svg>
    </div>
  )
}

// ── Triângulo rectângulo ──────────────────────────────────────────────────────
function RightTriangle({ f }: { f: Fig }) {
  const a  = Math.max(1, Number(f.leg1) || 3)
  const b  = Math.max(1, Number(f.leg2) || 4)
  const W = 280, H = 220
  const padL = 55, padB = 55, padR = 50, padT = 40
  const scl = Math.min((W - padL - padR) / a, (H - padT - padB) / b) * 0.85

  const ox = padL,            oy = H - padB          // vértice rectângulo
  const ax = ox + scl * a,    ay = oy                // fim da base
  const bx = ox,              by = oy - scl * b      // fim do cateto vertical
  const ms = 12

  return (
    <Svg w={W} h={H}>
      <polygon points={`${ox},${oy} ${ax},${ay} ${bx},${by}`} fill={FILL} stroke={NAVY} strokeWidth="1.5" />
      {/* Marca de ângulo recto */}
      <polyline points={`${ox},${oy - ms} ${ox + ms},${oy - ms} ${ox + ms},${oy}`}
        fill="none" stroke={NAVY} strokeWidth="1.2" />
      {/* Etiquetas */}
      {!!f.leg1Label && <text x={(ox+ax)/2} y={oy+22} textAnchor="middle" style={T}>{String(f.leg1Label)}</text>}
      {!!f.leg2Label && <text x={ox-10} y={(oy+by)/2} textAnchor="end" dominantBaseline="middle" style={T}>{String(f.leg2Label)}</text>}
      {!!f.hypLabel  && <text x={(ax+bx)/2+16} y={(ay+by)/2} textAnchor="start" dominantBaseline="middle" style={T}>{String(f.hypLabel)}</text>}
      {/* Ângulos */}
      {(f.angleLabels as string[]|undefined)?.map((lbl, i) => {
        const positions = [[ax-28, ay+18], [bx+18, by+18]]
        return i < 2 ? <text key={i} x={positions[i][0]} y={positions[i][1]} textAnchor="middle" style={{ ...T, fontSize: 12 }}>{lbl}</text> : null
      })}
    </Svg>
  )
}

// ── Triângulo genérico (isósceles / equilátero) ───────────────────────────────
function IsoscelesTriangle({ f }: { f: Fig }) {
  const W = 280, H = 220
  const cx = W / 2
  const bW  = (Number(f.base)  || 6)
  const bH  = (Number(f.height) || 5)
  const scl = Math.min(180 / bW, 150 / bH)
  const bScl = bW * scl, hScl = bH * scl
  const bY = H - 55, topY = bY - hScl
  const lx = cx - bScl / 2, rx = cx + bScl / 2

  return (
    <Svg w={W} h={H}>
      <polygon points={`${lx},${bY} ${rx},${bY} ${cx},${topY}`} fill={FILL} stroke={NAVY} strokeWidth="1.5" />
      {!!f.baseLabel   && <text x={cx}    y={bY+22}         textAnchor="middle" style={T}>{String(f.baseLabel)}</text>}
      {!!f.heightLabel && <text x={cx+14} y={(bY+topY)/2}   textAnchor="start"  style={T}>{String(f.heightLabel)}</text>}
      {!!f.sideLabel   && <text x={lx-14} y={(bY+topY)/2}   textAnchor="end"    style={T}>{String(f.sideLabel)}</text>}
    </Svg>
  )
}

// ── Rectângulo ────────────────────────────────────────────────────────────────
function RectangleFig({ f }: { f: Fig }) {
  const ratio = Math.max(0.3, Math.min(Number(f.aspectRatio) || 1.5, 4))
  const W = 280, H = 180, pad = 50
  const aW = W - 2 * pad, aH = H - 2 * pad
  let rW: number, rH: number
  if (ratio >= 1) { rW = Math.min(aW, aH * ratio); rH = rW / ratio }
  else            { rH = Math.min(aH, aW / ratio); rW = rH * ratio }
  const rx = (W - rW) / 2, ry = (H - rH) / 2

  return (
    <Svg w={W} h={H}>
      <rect x={rx} y={ry} width={rW} height={rH} fill={FILL} stroke={NAVY} strokeWidth="1.5" />
      {!!f.widthLabel  && <text x={rx + rW/2} y={ry + rH + 22} textAnchor="middle" style={T}>{String(f.widthLabel)}</text>}
      {!!f.heightLabel && <text x={rx - 12}   y={ry + rH/2}    textAnchor="end"    dominantBaseline="middle" style={T}>{String(f.heightLabel)}</text>}
    </Svg>
  )
}

// ── Quadrado ──────────────────────────────────────────────────────────────────
function SquareFig({ f }: { f: Fig }) {
  const W = 220, H = 220, pad = 50
  const s = Math.min(W, H) - 2 * pad
  const sx = (W - s) / 2, sy = (H - s) / 2

  return (
    <Svg w={W} h={H}>
      <rect x={sx} y={sy} width={s} height={s} fill={FILL} stroke={NAVY} strokeWidth="1.5" />
      {/* Marca de ângulo recto num canto */}
      <polyline points={`${sx},${sy+12} ${sx+12},${sy+12} ${sx+12},${sy}`} fill="none" stroke={NAVY} strokeWidth="1" />
      {!!f.sideLabel && <text x={sx + s/2} y={sy + s + 22} textAnchor="middle" style={T}>{String(f.sideLabel)}</text>}
    </Svg>
  )
}

// ── Círculo ───────────────────────────────────────────────────────────────────
function CircleFig({ f }: { f: Fig }) {
  const W = 240, H = 220
  const cx = W / 2, cy = H / 2
  const r  = Math.min(W, H) / 2 - 45
  const showR = f.showRadius !== false
  const showD = Boolean(f.showDiameter)

  return (
    <Svg w={W} h={H}>
      <circle cx={cx} cy={cy} r={r} fill={FILL} stroke={NAVY} strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={3} fill={NAVY} />
      {showR && <>
        <line x1={cx} y1={cy} x2={cx+r} y2={cy} stroke={NAVY} strokeWidth="1" strokeDasharray="4,3" />
        {!!f.radiusLabel && <text x={cx+r/2} y={cy-10} textAnchor="middle" style={T}>{String(f.radiusLabel)}</text>}
      </>}
      {showD && <>
        <line x1={cx-r} y1={cy} x2={cx+r} y2={cy} stroke={NAVY} strokeWidth="1" strokeDasharray="4,3" />
        {!!f.diameterLabel && <text x={cx} y={cy-10} textAnchor="middle" style={T}>{String(f.diameterLabel)}</text>}
      </>}
    </Svg>
  )
}

// ── Ângulo ────────────────────────────────────────────────────────────────────
function AngleFig({ f }: { f: Fig }) {
  const deg = Math.max(5, Math.min(Number(f.degrees) || 60, 175))
  const W = 220, H = 190
  const ox = 45, oy = H - 35
  const L  = 120
  const rad = (deg * Math.PI) / 180
  const x2  = ox + L * Math.cos(rad), y2 = oy - L * Math.sin(rad)
  const aR  = 38
  const arcX = ox + aR * Math.cos(rad), arcY = oy - aR * Math.sin(rad)

  return (
    <Svg w={W} h={H}>
      {/* Raios */}
      <line x1={ox} y1={oy} x2={ox+L} y2={oy} stroke={NAVY} strokeWidth="1.5" />
      <line x1={ox} y1={oy} x2={x2}   y2={y2}  stroke={NAVY} strokeWidth="1.5" />
      {/* Arco */}
      <path d={`M ${ox+aR} ${oy} A ${aR} ${aR} 0 ${deg > 180 ? 1 : 0} 0 ${arcX} ${arcY}`}
        fill="none" stroke={NAVY} strokeWidth="1" />
      {/* Etiqueta */}
      <text
        x={ox + (aR+18) * Math.cos(rad/2)}
        y={oy - (aR+18) * Math.sin(rad/2)}
        textAnchor="middle" dominantBaseline="middle"
        style={{ ...T, fontSize: 14, fontWeight: 'bold' }}
      >
        {String(f.label || `${deg}°`)}
      </text>
      <circle cx={ox} cy={oy} r={3} fill={NAVY} />
    </Svg>
  )
}

// ── Recta numérica ────────────────────────────────────────────────────────────
function NumberLineFig({ f }: { f: Fig }) {
  const min  = Number(f.min) ?? 0
  const max  = Number(f.max) ?? 10
  const step = Number(f.step) || 1
  const hl   = (f.highlighted as number[]) || []
  const W = 360, H = 80
  const pL = 30, pR = 30, lineY = H / 2
  const lW = W - pL - pR
  const range = max - min || 1
  const toX = (v: number) => pL + ((v - min) / range) * lW

  const ticks: number[] = []
  for (let v = min; v <= max + 1e-9; v = Math.round((v + step) * 1e9) / 1e9) ticks.push(v)

  return (
    <Svg w={W} h={H}>
      <line x1={pL-8} y1={lineY} x2={W-pR+8} y2={lineY} stroke={NAVY} strokeWidth="1.5" />
      <polygon points={`${W-pR+8},${lineY} ${W-pR},${lineY-4} ${W-pR},${lineY+4}`} fill={NAVY} />
      {ticks.map(v => {
        const x = toX(v)
        const isHl = hl.includes(v)
        return (
          <g key={v}>
            {isHl && <circle cx={x} cy={lineY} r={7} fill={BLUE} opacity={0.25} />}
            <line x1={x} y1={lineY-7} x2={x} y2={lineY+7} stroke={NAVY} strokeWidth={isHl ? 2 : 1} />
            <text x={x} y={lineY+22} textAnchor="middle"
              style={{ ...T, fontSize: 11, fontWeight: isHl ? 'bold' : 'normal' } as CSSProperties}>
              {v}
            </text>
          </g>
        )
      })}
    </Svg>
  )
}

// ── Barra de fracção ──────────────────────────────────────────────────────────
function FractionBarFig({ f }: { f: Fig }) {
  const num = Math.max(1, Math.min(Number(f.numerator)   || 1, 12))
  const den = Math.max(num, Math.min(Number(f.denominator) || 4, 12))
  const W = 320, H = 76
  const bX = 20, bY = 16, bW = W - 40, bH = 36
  const pW = bW / den

  return (
    <Svg w={W} h={H}>
      {Array.from({ length: den }, (_, i) => (
        <rect key={i} x={bX + i * pW} y={bY} width={pW} height={bH}
          fill={i < num ? BLUE : '#F7F3EE'} stroke={NAVY} strokeWidth="1" opacity={i < num ? 0.7 : 1} />
      ))}
      <text x={W/2} y={H-2} textAnchor="middle" style={{ ...T, fontSize: 12 }}>
        {String(f.label || `${num}/${den}`)}
      </text>
    </Svg>
  )
}

// ── Gráfico de barras ─────────────────────────────────────────────────────────
function BarChartFig({ f }: { f: Fig }) {
  const bars = (f.bars as Array<{ label: string; value: number }>) || []
  if (bars.length === 0) return null
  const showValues = f.showValues !== false  // false → ocultar valores (aluno tem de os ler)
  const maxV = Math.max(...bars.map(b => b.value), 1)
  const W = 360, H = 240
  const pL = 50, pB = 50, pR = 20, pT = 30
  const cW = W - pL - pR, cH = H - pT - pB
  const bW = (cW / bars.length) * 0.55
  const bGap = cW / bars.length
  const yTicks = 5

  return (
    <Svg w={W} h={H}>
      {!!f.title && <text x={W/2} y={18} textAnchor="middle" style={{ ...T, fontSize: 12, fontWeight: 'bold' } as CSSProperties}>{String(f.title)}</text>}
      <line x1={pL} y1={pT}    x2={pL}      y2={H-pB} stroke={NAVY} strokeWidth="1.5" />
      <line x1={pL} y1={H-pB} x2={W-pR} y2={H-pB}  stroke={NAVY} strokeWidth="1.5" />
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = Math.round(maxV * i / yTicks)
        const y   = H - pB - cH * i / yTicks
        return (
          <g key={i}>
            <line x1={pL-5} y1={y} x2={pL}     y2={y} stroke={NAVY} strokeWidth="1" />
            <line x1={pL}   y1={y} x2={W-pR} y2={y} stroke={NAVY} strokeWidth="0.3" strokeDasharray="3,3" />
            <text x={pL-8} y={y} textAnchor="end" dominantBaseline="middle" style={{ ...T, fontSize: 10 }}>{val}</text>
          </g>
        )
      })}
      {bars.map((bar, i) => {
        const bH2 = (bar.value / maxV) * cH
        const bX  = pL + i * bGap + (bGap - bW) / 2
        const bY  = H - pB - bH2
        return (
          <g key={i}>
            <rect x={bX} y={bY} width={bW} height={bH2} fill={BLUE} opacity={0.75} rx={2} />
            {showValues && <text x={bX+bW/2} y={bY-5} textAnchor="middle" style={{ ...T, fontSize: 11 }}>{bar.value}</text>}
            <text x={bX+bW/2} y={H-pB+16} textAnchor="middle" style={{ ...T, fontSize: 10 }}>{bar.label}</text>
          </g>
        )
      })}
      {!!f.yLabel && (
        <text x={13} y={H/2} textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(-90, 13, ${H/2})`} style={{ ...T, fontSize: 11 }}>
          {String(f.yLabel)}
        </text>
      )}
    </Svg>
  )
}

// ── Gráfico circular ──────────────────────────────────────────────────────────
const PIE_COLORS = [BLUE, GOLD, '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899']

function PieChartFig({ f }: { f: Fig }) {
  const slices = (f.slices as Array<{ label: string; value: number }>) || []
  if (slices.length === 0) return null
  const showValues = f.showValues !== false  // false → ocultar percentagens (aluno calcula)
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1
  const W = 310, H = 260
  const cx = 130, cy = 120, r = 90

  let angle = -Math.PI / 2
  const paths = slices.map((sl, i) => {
    const sweep = (sl.value / total) * 2 * Math.PI
    const start = angle
    angle += sweep
    const x1 = cx + r * Math.cos(start),   y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(angle),   y2 = cy + r * Math.sin(angle)
    const mid = start + sweep / 2
    const lR = r * 0.65  // label interior ao sector
    return {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`,
      color: PIE_COLORS[i % PIE_COLORS.length],
      label: sl.label,
      value: sl.value,
      lx: cx + lR * Math.cos(mid),
      ly: cy + lR * Math.sin(mid),
      pct: Math.round(sl.value / total * 100),
    }
  })

  return (
    <Svg w={W} h={H}>
      {!!f.title && <text x={cx} y={16} textAnchor="middle" style={{ ...T, fontSize: 12, fontWeight: 'bold' } as CSSProperties}>{String(f.title)}</text>}
      {paths.map((p, i) => (
        <g key={i}>
          <path d={p.d} fill={p.color} stroke="white" strokeWidth="2" opacity={0.85} />
          {showValues && (
            <text x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle"
              style={{ ...T, fontSize: 10, fontWeight: 'bold', fill: 'white' } as CSSProperties}>
              {p.pct}%
            </text>
          )}
        </g>
      ))}
      {/* Legenda — mostra sempre os nomes, nunca os valores */}
      {paths.map((p, i) => (
        <g key={`l${i}`}>
          <rect x={230} y={30 + i * 22} width={12} height={12} fill={p.color} opacity={0.85} rx={2} />
          <text x={248} y={30 + i * 22 + 6} dominantBaseline="middle" style={{ ...T, fontSize: 10 }}>{p.label}</text>
        </g>
      ))}
    </Svg>
  )
}

// ── Sólidos 3D (projecção oblíqua) ────────────────────────────────────────────
// Utilitário: converter array de pontos para string SVG
function pts(pairs: number[][]): string { return pairs.map(p => p.join(',')).join(' ') }

// ── Prisma triangular ─────────────────────────────────────────────────────────
function TriangularPrismFig({ f }: { f: Fig }) {
  const W = 300, H = 210
  const dx = 55, dy = 32   // profundidade em perspectiva
  // Face triangular frontal: triângulo isósceles
  const bw = 120, bh = 90
  const fx = 55, fy = 115  // base frontal esquerda
  const Af = [fx,        fy]           // base esquerda
  const Bf = [fx + bw,   fy]           // base direita
  const Cf = [fx + bw/2, fy - bh]      // vértice superior
  // Face traseira (offset)
  const Ab = [fx + dx,        fy - dy]
  const Bb = [fx + bw + dx,   fy - dy]
  const Cb = [fx + bw/2 + dx, fy - bh - dy]

  return (
    <Svg w={W} h={H}>
      {/* Arestas ocultas */}
      <line x1={Af[0]} y1={Af[1]} x2={Ab[0]} y2={Ab[1]} stroke={NAVY} strokeWidth="0.8" strokeDasharray="5,3" opacity={0.35}/>
      {/* Face traseira */}
      <polygon points={pts([Ab, Bb, Cb])} fill={FILL} stroke={NAVY} strokeWidth="1.2" opacity={0.6}/>
      {/* Face superior (entre C frontal e C traseiro) */}
      <polygon points={pts([Cf, Cb, Bb, Bf])} fill={FILL} stroke={NAVY} strokeWidth="1.5"/>
      {/* Face lateral direita */}
      <polygon points={pts([Bf, Bb, Ab, Af])} fill="#D5EEF7" stroke={NAVY} strokeWidth="1.5"/>
      {/* Face frontal */}
      <polygon points={pts([Af, Bf, Cf])} fill="white" stroke={NAVY} strokeWidth="1.5"/>
      {/* Etiquetas */}
      {!!f.baseLabel   && <text x={(Af[0]+Bf[0])/2} y={Af[1]+20} textAnchor="middle" style={T}>{String(f.baseLabel)}</text>}
      {!!f.heightLabel && <text x={Cf[0]-12} y={(Af[1]+Cf[1])/2} textAnchor="end" dominantBaseline="middle" style={T}>{String(f.heightLabel)}</text>}
      {!!f.depthLabel  && <text x={(Bf[0]+Bb[0])/2+6} y={(Bf[1]+Bb[1])/2+14} textAnchor="start" style={T}>{String(f.depthLabel)}</text>}
    </Svg>
  )
}

// ── Pirâmide quadrangular ─────────────────────────────────────────────────────
function PyramidFig({ f }: { f: Fig }) {
  const W = 280, H = 220
  const dx = 45, dy = 26   // offset perspectiva
  const bw = 120, bh = 50  // base em perspectiva (parece um losango)
  const cx = W / 2, by = 160   // centro da base, y base frontal

  // Base: losango em perspectiva
  const BL = [cx - bw/2,      by]
  const BR = [cx + bw/2,      by]
  const BT = [cx + bw/2 - dx, by - bh]
  const BLb = [cx - bw/2 - dx + bw/2 - bw/2, by - bh]  // simplificado:
  const BLT = [cx - bw/2 - dx + dx, by - bh]

  // Apex
  const apex: [number, number] = [cx - dx/2, by - bh - Number(f.heightLabel ? 100 : 100)]

  // Vértices base correctos (losango)
  const v1: [number,number] = [cx - bw/2,       by]         // esq
  const v2: [number,number] = [cx + bw/2,       by]         // dir
  const v3: [number,number] = [cx + bw/2 - dx,  by - bh]   // trás dir
  const v4: [number,number] = [cx - bw/2 - dx,  by - bh]   // trás esq
  const ap: [number,number] = [cx - dx/2,        by - bh - 95]

  return (
    <Svg w={W} h={H}>
      {/* Arestas ocultas da base */}
      <line x1={v4[0]} y1={v4[1]} x2={v1[0]} y2={v1[1]} stroke={NAVY} strokeWidth="0.8" strokeDasharray="5,3" opacity={0.4}/>
      <line x1={v4[0]} y1={v4[1]} x2={v3[0]} y2={v3[1]} stroke={NAVY} strokeWidth="0.8" strokeDasharray="5,3" opacity={0.4}/>
      <line x1={v4[0]} y1={v4[1]} x2={ap[0]} y2={ap[1]} stroke={NAVY} strokeWidth="0.8" strokeDasharray="5,3" opacity={0.4}/>
      {/* Base visível */}
      <polygon points={pts([v1, v2, v3, v4])} fill={FILL} stroke={NAVY} strokeWidth="1.5"/>
      {/* Faces laterais */}
      <polygon points={pts([v1, v2, ap])} fill="white"   stroke={NAVY} strokeWidth="1.5"/>
      <polygon points={pts([v2, v3, ap])} fill="#D5EEF7" stroke={NAVY} strokeWidth="1.5"/>
      <polygon points={pts([v3, ap, v4])} fill={FILL}    stroke={NAVY} strokeWidth="1.2" opacity={0.7}/>
      {/* Eixo altura (tracejado) */}
      <line x1={ap[0]} y1={ap[1]} x2={ap[0]} y2={by - bh/2} stroke={GOLD} strokeWidth="1" strokeDasharray="4,3"/>
      {/* Etiquetas */}
      {!!f.baseLabel   && <text x={(v1[0]+v2[0])/2} y={by+20} textAnchor="middle" style={T}>{String(f.baseLabel)}</text>}
      {!!f.heightLabel && <text x={ap[0]+10} y={(ap[1]+(by-bh/2))/2} textAnchor="start" dominantBaseline="middle" style={T}>{String(f.heightLabel)}</text>}
    </Svg>
  )
}

// ── Paralelepípedo / Cuboide ──────────────────────────────────────────────────
function CuboidFig({ f }: { f: Fig }) {
  const W = 300, H = 210
  const fw = 130, fh = 85, dx = 52, dy = 30
  const x0 = 50, y0 = 75   // vértice frontal inferior esquerdo

  // 8 vértices — frente: A B C D; trás offset: A' B' C' D'
  const A = [x0,        y0 + fh]
  const B = [x0 + fw,   y0 + fh]
  const C = [x0 + fw,   y0]
  const D = [x0,        y0]
  const Ap = [x0 + dx,       y0 + fh - dy]
  const Bp = [x0 + fw + dx,  y0 + fh - dy]
  const Cp = [x0 + fw + dx,  y0 - dy]
  const Dp = [x0 + dx,       y0 - dy]

  return (
    <Svg w={W} h={H}>
      {/* Arestas ocultas (tracejado) */}
      <polyline points={pts([Ap, Dp])} fill="none" stroke={NAVY} strokeWidth="0.8" strokeDasharray="5,3" opacity={0.4}/>
      <polyline points={pts([Ap, Bp])} fill="none" stroke={NAVY} strokeWidth="0.8" strokeDasharray="5,3" opacity={0.4}/>
      <polyline points={pts([Ap, A])}  fill="none" stroke={NAVY} strokeWidth="0.8" strokeDasharray="5,3" opacity={0.4}/>
      {/* Face superior */}
      <polygon points={pts([D, C, Cp, Dp])} fill={FILL} stroke={NAVY} strokeWidth="1.5"/>
      {/* Face lateral direita */}
      <polygon points={pts([C, B, Bp, Cp])} fill="#D5EEF7" stroke={NAVY} strokeWidth="1.5"/>
      {/* Face frontal */}
      <polygon points={pts([A, B, C, D])} fill="white" stroke={NAVY} strokeWidth="1.5"/>
      {/* Etiquetas */}
      {!!f.widthLabel  && <text x={(A[0]+B[0])/2} y={A[1]+20} textAnchor="middle" style={T}>{String(f.widthLabel)}</text>}
      {!!f.heightLabel && <text x={A[0]-12} y={(A[1]+D[1])/2} textAnchor="end" dominantBaseline="middle" style={T}>{String(f.heightLabel)}</text>}
      {!!f.depthLabel  && <text x={B[0]+dx/2+8} y={B[1]-dy/2+10} textAnchor="start" style={T}>{String(f.depthLabel)}</text>}
    </Svg>
  )
}

// ── Cubo ──────────────────────────────────────────────────────────────────────
function CubeFig({ f }: { f: Fig }) {
  const W = 240, H = 200
  const s = 100, dx = 44, dy = 28
  const x0 = 48, y0 = 68

  const A = [x0,      y0 + s]; const B = [x0 + s, y0 + s]
  const C = [x0 + s,  y0];     const D = [x0,      y0]
  const Ap = [x0 + dx,     y0 + s - dy]; const Bp = [x0 + s + dx, y0 + s - dy]
  const Cp = [x0 + s + dx, y0 - dy];     const Dp = [x0 + dx,     y0 - dy]

  return (
    <Svg w={W} h={H}>
      <polyline points={pts([Ap, Dp])} fill="none" stroke={NAVY} strokeWidth="0.8" strokeDasharray="5,3" opacity={0.4}/>
      <polyline points={pts([Ap, Bp])} fill="none" stroke={NAVY} strokeWidth="0.8" strokeDasharray="5,3" opacity={0.4}/>
      <polyline points={pts([Ap, A])}  fill="none" stroke={NAVY} strokeWidth="0.8" strokeDasharray="5,3" opacity={0.4}/>
      <polygon points={pts([D, C, Cp, Dp])} fill={FILL}    stroke={NAVY} strokeWidth="1.5"/>
      <polygon points={pts([C, B, Bp, Cp])} fill="#D5EEF7" stroke={NAVY} strokeWidth="1.5"/>
      <polygon points={pts([A, B, C, D])}   fill="white"   stroke={NAVY} strokeWidth="1.5"/>
      {!!f.sideLabel && <text x={(A[0]+B[0])/2} y={A[1]+20} textAnchor="middle" style={T}>{String(f.sideLabel)}</text>}
    </Svg>
  )
}

// ── Cilindro ──────────────────────────────────────────────────────────────────
function CylinderFig({ f }: { f: Fig }) {
  const W = 240, H = 230
  const cx = W / 2, rx = 65, ry = 20
  const y0 = 40, bodyH = 140

  return (
    <Svg w={W} h={H}>
      {/* Elipse inferior */}
      <ellipse cx={cx} cy={y0 + bodyH} rx={rx} ry={ry} fill={FILL} stroke={NAVY} strokeWidth="1.5"/>
      {/* Corpo — preenchimento entre as duas elipses */}
      <rect x={cx - rx} y={y0} width={rx * 2} height={bodyH} fill={FILL} stroke="none"/>
      <line x1={cx - rx} y1={y0} x2={cx - rx} y2={y0 + bodyH} stroke={NAVY} strokeWidth="1.5"/>
      <line x1={cx + rx} y1={y0} x2={cx + rx} y2={y0 + bodyH} stroke={NAVY} strokeWidth="1.5"/>
      {/* Elipse superior (por cima do corpo) */}
      <ellipse cx={cx} cy={y0} rx={rx} ry={ry} fill={FILL} stroke={NAVY} strokeWidth="1.5"/>
      {/* Linha do raio */}
      <line x1={cx} y1={y0} x2={cx + rx} y2={y0} stroke={NAVY} strokeWidth="1" strokeDasharray="4,3"/>
      <circle cx={cx} cy={y0} r={2.5} fill={NAVY}/>
      {/* Seta de altura */}
      <line x1={cx + rx + 18} y1={y0} x2={cx + rx + 18} y2={y0 + bodyH} stroke={GOLD} strokeWidth="1.2"/>
      <line x1={cx + rx + 12} y1={y0}       x2={cx + rx + 24} y2={y0}       stroke={GOLD} strokeWidth="1.2"/>
      <line x1={cx + rx + 12} y1={y0+bodyH} x2={cx + rx + 24} y2={y0+bodyH} stroke={GOLD} strokeWidth="1.2"/>
      {/* Etiquetas */}
      {!!f.radiusLabel   && <text x={cx + rx/2 + 4} y={y0 - 9} textAnchor="middle" style={T}>{String(f.radiusLabel)}</text>}
      {!!f.diameterLabel && <text x={cx}             y={y0 - 9} textAnchor="middle" style={T}>{String(f.diameterLabel)}</text>}
      {!!f.heightLabel   && <text x={cx + rx + 32} y={y0 + bodyH/2} dominantBaseline="middle" textAnchor="start" style={T}>{String(f.heightLabel)}</text>}
    </Svg>
  )
}

// ── Cone ──────────────────────────────────────────────────────────────────────
function ConeFig({ f }: { f: Fig }) {
  const W = 240, H = 230
  const cx = W / 2, rx = 65, ry = 18
  const apexY = 38, bodyH = 148

  return (
    <Svg w={W} h={H}>
      {/* Elipse da base */}
      <ellipse cx={cx} cy={apexY + bodyH} rx={rx} ry={ry} fill={FILL} stroke={NAVY} strokeWidth="1.5"/>
      {/* Lados do cone (preenchimento) */}
      <polygon points={`${cx},${apexY} ${cx - rx},${apexY + bodyH} ${cx + rx},${apexY + bodyH}`}
        fill={FILL} stroke="none"/>
      {/* Arestas laterais */}
      <line x1={cx} y1={apexY} x2={cx - rx} y2={apexY + bodyH} stroke={NAVY} strokeWidth="1.5"/>
      <line x1={cx} y1={apexY} x2={cx + rx} y2={apexY + bodyH} stroke={NAVY} strokeWidth="1.5"/>
      {/* Eixo de altura (tracejado) */}
      <line x1={cx} y1={apexY} x2={cx} y2={apexY + bodyH} stroke={GOLD} strokeWidth="1" strokeDasharray="5,3"/>
      {/* Raio da base */}
      <line x1={cx} y1={apexY + bodyH} x2={cx + rx} y2={apexY + bodyH} stroke={NAVY} strokeWidth="1" strokeDasharray="4,3"/>
      <circle cx={cx} cy={apexY} r={3} fill={NAVY}/>
      {/* Etiquetas */}
      {!!f.heightLabel && <text x={cx + 10} y={(apexY + apexY + bodyH) / 2} dominantBaseline="middle" textAnchor="start" style={T}>{String(f.heightLabel)}</text>}
      {!!f.radiusLabel && <text x={cx + rx/2 + 4} y={apexY + bodyH + ry + 18} textAnchor="middle" style={T}>{String(f.radiusLabel)}</text>}
    </Svg>
  )
}

// ── Esfera ────────────────────────────────────────────────────────────────────
function SphereFig({ f }: { f: Fig }) {
  const W = 240, H = 220
  const cx = W / 2, cy = H / 2 - 5, r = 82

  return (
    <Svg w={W} h={H}>
      {/* Sombra suave */}
      <ellipse cx={cx} cy={cy + r + 12} rx={r * 0.65} ry={8} fill="#00000015"/>
      {/* Esfera */}
      <circle cx={cx} cy={cy} r={r} fill={FILL} stroke={NAVY} strokeWidth="1.5"/>
      {/* Equador (tracejado) */}
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.28} fill="none" stroke={NAVY} strokeWidth="1" strokeDasharray="5,3" opacity={0.5}/>
      {/* Meridiano vertical */}
      <ellipse cx={cx} cy={cy} rx={r * 0.28} ry={r} fill="none" stroke={NAVY} strokeWidth="1" strokeDasharray="5,3" opacity={0.3}/>
      {/* Raio */}
      <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke={NAVY} strokeWidth="1.2" strokeDasharray="4,3"/>
      <circle cx={cx} cy={cy} r={3} fill={NAVY}/>
      {/* Etiquetas */}
      {!!f.radiusLabel   && <text x={cx + r/2} y={cy - 10} textAnchor="middle" style={T}>{String(f.radiusLabel)}</text>}
      {!!f.diameterLabel && <text x={cx}        y={cy - r - 12} textAnchor="middle" style={T}>{String(f.diameterLabel)}</text>}
    </Svg>
  )
}
