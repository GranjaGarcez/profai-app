/**
 * Rede de camadas — Diagnóstico de Português (língua materna), v1.
 * Foco: INTERPRETAÇÃO — compreensão leitora (literal→inferencial→crítica) + léxico,
 * com a fluência leitora (leitura oral gravada) na base.
 *
 * Ancorada na ciência da leitura (Visão Simples) e nas Aprendizagens Essenciais.
 * ⚠️ A validar por docente de Português. Ver docs/diagnostico-lingua-espec.md.
 */

import { makeDomainGraph, type SkillNodeG } from "../domainTypes";

const NODES: Record<string, SkillNodeG> = {
  "PT.FLUENCIA_LEITORA": {
    code: "PT.FLUENCIA_LEITORA",
    label: "Fluência leitora (descodificação)",
    strand: "leitura",
    minYear: 2,
    maxYear: 4,
    description:
      "Ler em voz alta com exatidão, velocidade e prosódia; descodificação automatizada que liberta a memória de trabalho para compreender.",
    prereqs: [],
    isBase: true,
  },
  "PT.LEXICO": {
    code: "PT.LEXICO",
    label: "Léxico (vocabulário)",
    strand: "leitura",
    minYear: 2,
    maxYear: 6,
    description:
      "Conhecer o significado de palavras; inferir sentido pelo contexto; sinónimos e antónimos. Marcador forte de exposição à língua.",
    prereqs: [],
    isBase: true,
  },
  "PT.COMP_LITERAL": {
    code: "PT.COMP_LITERAL",
    label: "Compreensão literal",
    strand: "leitura",
    minYear: 3,
    maxYear: 5,
    description: "Localizar e identificar informação explícita no texto.",
    prereqs: ["PT.FLUENCIA_LEITORA", "PT.LEXICO"],
  },
  "PT.COMP_INFERENCIAL": {
    code: "PT.COMP_INFERENCIAL",
    label: "Compreensão inferencial",
    strand: "leitura",
    minYear: 4,
    maxYear: 6,
    description:
      "Inferir o implícito: relações de causa-efeito, intenções, sentido de pronomes e conectores, ideias não ditas mas sustentadas no texto.",
    prereqs: ["PT.COMP_LITERAL", "PT.LEXICO"],
  },
  "PT.COMP_CRITICA": {
    code: "PT.COMP_CRITICA",
    label: "Compreensão crítica",
    strand: "leitura",
    minYear: 5,
    maxYear: 6,
    description:
      "Avaliar e julgar o texto; distinguir facto de opinião; relacionar com conhecimento e experiência; fundamentar um ponto de vista.",
    prereqs: ["PT.COMP_INFERENCIAL"],
  },
};

const START_BY_YEAR: Record<number, string[]> = {
  5: ["PT.COMP_INFERENCIAL", "PT.LEXICO"],
  6: ["PT.COMP_CRITICA", "PT.COMP_INFERENCIAL", "PT.LEXICO"],
};

export const portuguesGraph = makeDomainGraph("portugues", NODES, START_BY_YEAR, "v1");
