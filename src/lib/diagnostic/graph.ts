/**
 * Rede de pré-requisitos — Diagnóstico de Matemática (v1)
 * Estrutura: Números e Operações, 1.º→6.º ano.
 *
 * FONTE DE VERDADE da rede. O motor de diagnóstico percorre esta estrutura
 * diretamente (sem ida à base de dados). As respostas e estimativas na BD
 * referenciam os nós por `code` (texto), não por chave estrangeira.
 *
 * Validado pelo Tiago (2026-09-30): espinha correcta; `PROPRIEDADES_OPERACOES`
 * acrescentado como base do cálculo mental ágil; números relativos ficam fora (7.º).
 * Ver docs/diagnostico-espec.md §7.
 */

import type { DomainGraph, SkillNodeG } from "./domainTypes";

export type Strand = "numeros_operacoes";

export type NodeCode =
  | "CONTAGEM"
  | "VALOR_POSICIONAL"
  | "ADICAO_SUBTRACAO"
  | "FACTOS_ADICAO"
  | "SENTIDO_MULTIPLICATIVO"
  | "PROPRIEDADES_OPERACOES"
  | "TABUADA"
  | "DIVISAO"
  | "FRACAO_CONCEITO"
  | "FRACAO_EQUIVALENCIA"
  | "FRACAO_OPERACOES"
  | "DECIMAL_CONCEITO"
  | "DECIMAL_OPERACOES"
  | "EXPRESSOES"
  | "RACIONAL_RELACOES"
  | "PROPORCIONALIDADE"
  | "POTENCIAS";

export interface SkillNode {
  code: NodeCode;
  label: string;
  strand: Strand;
  minYear: number;
  maxYear: number;
  description: string;
  /** Códigos dos nós que são pré-requisito directo deste. */
  prereqs: NodeCode[];
  /**
   * Nó de base: NUNCA se presume dominado pelo ano do aluno.
   * Recebe sempre ≥1 sonda de confirmação (a fronteira real está a descer).
   */
  isBase?: boolean;
}

export const NODES: Record<NodeCode, SkillNode> = {
  CONTAGEM: {
    code: "CONTAGEM",
    label: "Contagem e cardinalidade",
    strand: "numeros_operacoes",
    minYear: 1,
    maxYear: 1,
    description:
      "Contar, ordenar e comparar quantidades; correspondência termo a termo; cardinal de um conjunto.",
    prereqs: [],
    isBase: true,
  },
  VALOR_POSICIONAL: {
    code: "VALOR_POSICIONAL",
    label: "Valor posicional (sistema decimal)",
    strand: "numeros_operacoes",
    minYear: 1,
    maxYear: 2,
    description:
      "Sistema de numeração decimal; valor de posição do algarismo; composição e decomposição de números.",
    prereqs: ["CONTAGEM"],
    isBase: true,
  },
  ADICAO_SUBTRACAO: {
    code: "ADICAO_SUBTRACAO",
    label: "Adição e subtração (sentido e algoritmo)",
    strand: "numeros_operacoes",
    minYear: 1,
    maxYear: 2,
    description:
      "Sentido aditivo e subtractivo; algoritmos com transporte e empréstimo; relação inversa adição/subtração.",
    prereqs: ["VALOR_POSICIONAL"],
    isBase: true,
  },
  FACTOS_ADICAO: {
    code: "FACTOS_ADICAO",
    label: "Factos básicos da adição (automatizados)",
    strand: "numeros_operacoes",
    minYear: 2,
    maxYear: 2,
    description:
      "Factos aditivos até 20 recuperados de memória, sem contagem — base da fluência de cálculo.",
    prereqs: ["ADICAO_SUBTRACAO"],
    isBase: true,
  },
  SENTIDO_MULTIPLICATIVO: {
    code: "SENTIDO_MULTIPLICATIVO",
    label: "Sentido multiplicativo",
    strand: "numeros_operacoes",
    minYear: 2,
    maxYear: 3,
    description:
      "Multiplicação como adição repetida, disposição rectangular e combinatória; sentido de razão.",
    prereqs: ["FACTOS_ADICAO", "VALOR_POSICIONAL"],
  },
  PROPRIEDADES_OPERACOES: {
    code: "PROPRIEDADES_OPERACOES",
    label: "Propriedades das operações",
    strand: "numeros_operacoes",
    minYear: 2,
    maxYear: 4,
    description:
      "Comutativa, associativa e distributiva; decomposição para cálculo mental ágil. Base das estratégias de fluência.",
    prereqs: ["FACTOS_ADICAO", "SENTIDO_MULTIPLICATIVO"],
  },
  TABUADA: {
    code: "TABUADA",
    label: "Factos multiplicativos (tabuada automatizada)",
    strand: "numeros_operacoes",
    minYear: 3,
    maxYear: 3,
    description:
      "Factos multiplicativos recuperados de memória, sem recontagem — pré-requisito crítico de tudo a jusante.",
    prereqs: ["SENTIDO_MULTIPLICATIVO"],
  },
  DIVISAO: {
    code: "DIVISAO",
    label: "Divisão (sentido e algoritmo)",
    strand: "numeros_operacoes",
    minYear: 3,
    maxYear: 4,
    description:
      "Divisão como partilha e como medida; relação com a multiplicação; algoritmo; quociente e resto.",
    prereqs: ["TABUADA", "SENTIDO_MULTIPLICATIVO", "PROPRIEDADES_OPERACOES"],
  },
  FRACAO_CONCEITO: {
    code: "FRACAO_CONCEITO",
    label: "Conceito de fração (parte-todo)",
    strand: "numeros_operacoes",
    minYear: 3,
    maxYear: 4,
    description:
      "Fração como parte de um todo e como quociente; representação, leitura e comparação simples.",
    prereqs: ["DIVISAO"],
  },
  FRACAO_EQUIVALENCIA: {
    code: "FRACAO_EQUIVALENCIA",
    label: "Equivalência e comparação de frações",
    strand: "numeros_operacoes",
    minYear: 4,
    maxYear: 5,
    description:
      "Frações equivalentes; simplificação; comparação e ordenação com denominadores diferentes.",
    prereqs: ["FRACAO_CONCEITO"],
  },
  FRACAO_OPERACOES: {
    code: "FRACAO_OPERACOES",
    label: "Operações com frações",
    strand: "numeros_operacoes",
    minYear: 5,
    maxYear: 6,
    description:
      "Adição, subtração e multiplicação de frações; fração de uma quantidade.",
    prereqs: ["FRACAO_EQUIVALENCIA"],
  },
  DECIMAL_CONCEITO: {
    code: "DECIMAL_CONCEITO",
    label: "Conceito de numeral decimal",
    strand: "numeros_operacoes",
    minYear: 4,
    maxYear: 5,
    description:
      "Numeral decimal; valor posicional na parte decimal; leitura, comparação e ordenação de decimais.",
    prereqs: ["VALOR_POSICIONAL", "FRACAO_CONCEITO"],
    isBase: true,
  },
  DECIMAL_OPERACOES: {
    code: "DECIMAL_OPERACOES",
    label: "Operações com decimais",
    strand: "numeros_operacoes",
    minYear: 5,
    maxYear: 6,
    description:
      "Adição, subtração, multiplicação e divisão de decimais; alinhamento da vírgula.",
    prereqs: ["DECIMAL_CONCEITO"],
  },
  EXPRESSOES: {
    code: "EXPRESSOES",
    label: "Expressões numéricas (prioridade das operações)",
    strand: "numeros_operacoes",
    minYear: 5,
    maxYear: 6,
    description:
      "Prioridade das operações e uso de parênteses em expressões numéricas.",
    prereqs: ["TABUADA", "PROPRIEDADES_OPERACOES"],
  },
  RACIONAL_RELACOES: {
    code: "RACIONAL_RELACOES",
    label: "Relações fração ↔ decimal ↔ percentagem",
    strand: "numeros_operacoes",
    minYear: 6,
    maxYear: 6,
    description:
      "Representações equivalentes de um número racional não negativo: fração, decimal e percentagem.",
    prereqs: ["FRACAO_EQUIVALENCIA", "DECIMAL_CONCEITO"],
  },
  PROPORCIONALIDADE: {
    code: "PROPORCIONALIDADE",
    label: "Proporcionalidade directa",
    strand: "numeros_operacoes",
    minYear: 6,
    maxYear: 6,
    description:
      "Razão e proporção; constante de proporcionalidade directa; resolução de problemas.",
    prereqs: ["RACIONAL_RELACOES", "DIVISAO"],
  },
  POTENCIAS: {
    code: "POTENCIAS",
    label: "Potências de base natural",
    strand: "numeros_operacoes",
    minYear: 6,
    maxYear: 6,
    description:
      "Potência como produto de factores iguais; base e expoente; quadrado e cubo.",
    prereqs: ["TABUADA"],
  },
};

/** Arco dirigido: `from` é pré-requisito de `to`. */
export interface SkillEdge {
  from: NodeCode;
  to: NodeCode;
}

/** Todos os arcos, derivados dos `prereqs` de cada nó. */
export const EDGES: SkillEdge[] = Object.values(NODES).flatMap((node) =>
  node.prereqs.map((from) => ({ from, to: node.code })),
);

export const ALL_CODES = Object.keys(NODES) as NodeCode[];

export function getNode(code: NodeCode): SkillNode {
  return NODES[code];
}

/** Pré-requisitos directos de um nó. */
export function prereqsOf(code: NodeCode): NodeCode[] {
  return NODES[code].prereqs;
}

/** Nós que dependem directamente de um dado nó. */
export function dependentsOf(code: NodeCode): NodeCode[] {
  return ALL_CODES.filter((c) => NODES[c].prereqs.includes(code));
}

/** Fecho transitivo para trás: todos os pré-requisitos (directos e indirectos). */
export function ancestorsOf(code: NodeCode): Set<NodeCode> {
  const seen = new Set<NodeCode>();
  const stack = [...NODES[code].prereqs];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...NODES[cur].prereqs);
  }
  return seen;
}

/** Ordenação topológica (pré-requisitos antes dos dependentes). */
export function topologicalOrder(): NodeCode[] {
  const indeg: Record<string, number> = {};
  for (const c of ALL_CODES) indeg[c] = NODES[c].prereqs.length;
  const queue = ALL_CODES.filter((c) => indeg[c] === 0);
  const order: NodeCode[] = [];
  while (queue.length) {
    const cur = queue.shift()!;
    order.push(cur);
    for (const dep of dependentsOf(cur)) {
      indeg[dep] -= 1;
      if (indeg[dep] === 0) queue.push(dep);
    }
  }
  return order;
}

/** Nós de base — nunca presumidos dominados pelo ano do aluno. */
export const BASE_NODES: NodeCode[] = ALL_CODES.filter((c) => NODES[c].isBase);

/**
 * Nós de arranque por ano declarado da turma. O motor começa aqui e desce
 * na rede assim que falha, sem presumir a base (ver BASE_NODES).
 */
export const START_NODES_BY_YEAR: Record<number, NodeCode[]> = {
  5: ["FRACAO_EQUIVALENCIA", "DECIMAL_CONCEITO", "DIVISAO"],
  6: ["FRACAO_OPERACOES", "DECIMAL_OPERACOES", "RACIONAL_RELACOES"],
};

export function startNodesForYear(year: number): NodeCode[] {
  return START_NODES_BY_YEAR[year] ?? START_NODES_BY_YEAR[6];
}

export const MAP_VERSION = "v1";

// Matemática empacotada como DomainGraph (ponte para o motor agnóstico ao domínio).
export const matematicaGraph: DomainGraph = {
  domain: "matematica",
  NODES: NODES as unknown as Record<string, SkillNodeG>,
  ALL_CODES: ALL_CODES as unknown as string[],
  BASE_NODES: BASE_NODES as unknown as string[],
  MAP_VERSION,
  topologicalOrder: topologicalOrder as unknown as () => string[],
  prereqsOf: prereqsOf as unknown as (c: string) => string[],
  dependentsOf: dependentsOf as unknown as (c: string) => string[],
  startNodesForYear: startNodesForYear as unknown as (y: number) => string[],
};
