/**
 * Abstração de DOMÍNIO para o diagnóstico (Matemática | Português | …).
 * O motor é agnóstico: recebe um DomainGraph e opera sobre ele.
 * Códigos de nó são `string` (genéricos entre domínios).
 */

export interface SkillNodeG {
  code: string;
  label: string;
  strand: string;
  minYear: number;
  maxYear: number;
  description: string;
  prereqs: string[];
  isBase?: boolean;
}

export interface DomainGraph {
  domain: string; // "matematica" | "portugues"
  NODES: Record<string, SkillNodeG>;
  ALL_CODES: string[];
  BASE_NODES: string[];
  MAP_VERSION: string;
  topologicalOrder(): string[];
  prereqsOf(code: string): string[];
  dependentsOf(code: string): string[];
  startNodesForYear(year: number): string[];
}

/** Constrói um DomainGraph a partir dos nós (helpers genéricos). */
export function makeDomainGraph(
  domain: string,
  nodes: Record<string, SkillNodeG>,
  startByYear: Record<number, string[]>,
  mapVersion = "v1",
): DomainGraph {
  const ALL_CODES = Object.keys(nodes);
  const prereqsOf = (c: string) => nodes[c]?.prereqs ?? [];
  const dependentsOf = (c: string) => ALL_CODES.filter((x) => nodes[x].prereqs.includes(c));
  const BASE_NODES = ALL_CODES.filter((c) => nodes[c].isBase);
  const topologicalOrder = () => {
    const indeg: Record<string, number> = {};
    for (const c of ALL_CODES) indeg[c] = nodes[c].prereqs.length;
    const queue = ALL_CODES.filter((c) => indeg[c] === 0);
    const order: string[] = [];
    while (queue.length) {
      const cur = queue.shift()!;
      order.push(cur);
      for (const dep of dependentsOf(cur)) {
        indeg[dep] -= 1;
        if (indeg[dep] === 0) queue.push(dep);
      }
    }
    return order;
  };
  const years = Object.keys(startByYear).map(Number);
  const maxYear = years.length ? Math.max(...years) : 0;
  const startNodesForYear = (y: number) =>
    startByYear[y] ?? startByYear[maxYear] ?? ALL_CODES.filter((c) => nodes[c].prereqs.length === 0);
  return { domain, NODES: nodes, ALL_CODES, BASE_NODES, MAP_VERSION: mapVersion, topologicalOrder, prereqsOf, dependentsOf, startNodesForYear };
}
