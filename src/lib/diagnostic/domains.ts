/**
 * Registo de domínios do diagnóstico. O motor escolhe o grafo pelo domínio.
 */

import { matematicaGraph } from "./graph";
import { portuguesGraph } from "./graphs/portugues";
import type { DomainGraph } from "./domainTypes";

export const DOMAINS: Record<string, DomainGraph> = {
  matematica: matematicaGraph,
  portugues: portuguesGraph,
};

export const DEFAULT_DOMAIN = "matematica";

export function getDomainGraph(domain?: string | null): DomainGraph {
  return DOMAINS[domain ?? DEFAULT_DOMAIN] ?? matematicaGraph;
}
