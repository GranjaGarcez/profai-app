import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurriculumConstraint } from '@/lib/curriculum'
import { findQuestions, saveQuestions, markUsed, bankToExamQuestion, updateQualityScores } from '@/lib/exam/questionBank'
import { fixMarkSchemeSum } from '@/lib/exam/markScheme'

// Netlify/Vercel: duração máxima da função (segundos)
export const maxDuration = 60

// ── Taxonomia de Bloom — validação determinística (validator.py port) ─────────
const BLOOM_LEVELS = ['Lembrar', 'Compreender', 'Aplicar', 'Analisar', 'Avaliar', 'Criar'] as const
type BloomLevel = typeof BLOOM_LEVELS[number]

// Mapeamento de variantes em inglês e PT-BR para PT-PT canónico
const BLOOM_ALIASES: Record<string, BloomLevel> = {
  'Recordar': 'Lembrar',  'Remember': 'Lembrar',   'Knowledge': 'Lembrar',
  'Compreender': 'Compreender', 'Understand': 'Compreender', 'Comprehension': 'Compreender',
  'Aplicar': 'Aplicar',   'Apply': 'Aplicar',       'Application': 'Aplicar',
  'Analisar': 'Analisar', 'Analyse': 'Analisar',    'Analyze': 'Analisar',   'Analysis': 'Analisar',
  'Avaliar': 'Avaliar',   'Evaluate': 'Avaliar',    'Evaluation': 'Avaliar',
  'Criar': 'Criar',       'Create': 'Criar',        'Synthesis': 'Criar',    'Sintetizar': 'Criar',
}

// ── Corrector determinístico PT-BR → PT-PT (pré-acordo, norma editorial do projecto).
// Rede de segurança: mesmo com o prompt a exigir PT-PT, modelos Tier 2 (Mistral, etc.)
// deslizam em texto longo ("aspetos", "correto"). Só pares INEQUÍVOCOS — a forma da
// esquerda nunca é válida em PT-PT — com fronteiras Unicode para não tocar em palavras
// que os contenham (ex.: "informação" nunca se torna "informacção"). "fato" fica de
// fora de propósito (é válido em PT-PT = "vestuário"). Desligável: PROFAI_PTPT_CORRECTOR=off.
const PT_BR_TO_PT: ReadonlyArray<readonly [string, string]> = [
  ['atividade', 'actividade'], ['atividades', 'actividades'],
  ['ótimo', 'óptimo'], ['ótima', 'óptima'], ['ótimos', 'óptimos'], ['ótimas', 'óptimas'],
  ['aspeto', 'aspecto'], ['aspetos', 'aspectos'],
  ['correto', 'correcto'], ['correta', 'correcta'], ['corretos', 'correctos'], ['corretas', 'correctas'], ['corretamente', 'correctamente'],
  ['incorreto', 'incorrecto'], ['incorreta', 'incorrecta'], ['incorretos', 'incorrectos'],
  ['direto', 'directo'], ['direta', 'directa'], ['diretamente', 'directamente'],
  ['objeto', 'objecto'], ['objetos', 'objectos'],
  ['ação', 'acção'], ['ações', 'acções'],
  ['fração', 'fracção'], ['frações', 'fracções'],
  ['retângulo', 'rectângulo'], ['retângulos', 'rectângulos'],
  ['exato', 'exacto'], ['exata', 'exacta'], ['exatamente', 'exactamente'],
  ['efetivo', 'efectivo'], ['efetiva', 'efectiva'],
  ['seleção', 'selecção'], ['coleção', 'colecção'],
  ['adjetivo', 'adjectivo'], ['adjetivos', 'adjectivos'],
  ['contato', 'contacto'], ['contatos', 'contactos'],
  ['porcentagem', 'percentagem'], ['caráter', 'carácter'],
]
// Tokeniza por PALAVRA INTEIRA (regex literal /\p{L}+/gu — só literais preservam a
// propriedade Unicode; new Regexp("\\p{L}") perde a barra e corromperia substrings) e
// substitui apenas a palavra exacta via Map. Assim "informação"/"educação" nunca são
// tocadas, mesmo contendo "ação" — só "ação" isolada é corrigida para "acção".
const PT_BR_MAP = new Map<string, string>(PT_BR_TO_PT.map(([br, pt]) => [br, pt]))
function toPtPt(text: string): string {
  return text.replace(/\p{L}+/gu, (word) => {
    const repl = PT_BR_MAP.get(word.toLowerCase())
    if (!repl) return word
    if (word === word.toUpperCase() && word !== word.toLowerCase()) return repl.toUpperCase()
    const first = word.charAt(0)
    return first === first.toUpperCase() && first !== first.toLowerCase()
      ? repl.charAt(0).toUpperCase() + repl.slice(1)
      : repl
  })
}
const PTPT_CORRECTOR_ON = process.env.PROFAI_PTPT_CORRECTOR !== 'off'

function normalizeBloom(raw: string | undefined): BloomLevel | undefined {
  if (!raw) return undefined
  const s = raw.trim()
  if (BLOOM_LEVELS.includes(s as BloomLevel)) return s as BloomLevel
  if (s in BLOOM_ALIASES) return BLOOM_ALIASES[s]
  // Tentativa por prefixo (ex: "Anali" → "Analisar")
  return BLOOM_LEVELS.find(l => s.toLowerCase().startsWith(l.toLowerCase().slice(0, 4)))
}

// Prompt do crítico adversarial (adaptado de prompts.py::prompt_critico)
// Usa modelo DIFERENTE do gerador para diversidade de perspectiva
function buildCriticPrompt(subject: string, yearLevel: number, topic: string,
                            questions: Array<Record<string, unknown>>): string {
  const sample = questions.slice(0, 10).map((q, i) =>
    `Q${i + 1} [${q.type}|${q.bloomLevel}|${q.points}pt]
Enunciado: ${String(q.text ?? '')}
Resposta: ${String(q.correctAnswer ?? '')}
Critérios: ${String(q.markScheme ?? '')}`
  ).join('\n\n')
  return `És revisor crítico independente de fichas de avaliação. A tua função é DESCOBRIR falhas — não elogiar. Parte do princípio de que a ficha tem defeitos e procura-os.

FICHA: ${subject} · ${yearLevel}.º ano · Tópico: "${topic}"
AMOSTRA DE QUESTÕES (máx. 10, com enunciado, resposta e critérios completos):
${sample}

AUDITA sem complacência — verifica CADA questão da amostra:
1. alinhamento_topico: cada questão avalia realmente "${topic}"? Ou é genérica?
2. nivel_cognitivo_real: o bloom declarado corresponde ao que é realmente exigido? Um "Analisar" não pode resolver-se por evocação simples.
3. ambiguidade: há enunciados com mais de uma leitura razoável? Dupla negação? Distratores absurdos?
4. adequacao_ano: linguagem e exigência são próprias do ${yearLevel}.º ano (${yearLevel <= 6 ? '10-12 anos' : yearLevel <= 9 ? '12-15 anos' : '15-18 anos'})?
5. markScheme: os critérios são específicos (com pontos parcelares) ou vagos ("resposta correcta")?
6. correcção_aritmética: em questões com números/cálculos, REFAZ o cálculo do zero de forma independente — não confies na "Resposta" dada, verifica-a. Se a questão pedir um valor "óptimo"/"máximo"/"mínimo" sob uma restrição, confirma que o enunciado tem restrições suficientes para uma resposta única E que essa resposta está matematicamente correcta (ex: confirma sempre uma lista de divisores antes de aceitar "o maior divisor"). Reporta QUALQUER divergência aritmética como gravidade "alta" — é o tipo de erro mais grave possível numa ficha de avaliação.

Devolve EXCLUSIVAMENTE este JSON (sem texto antes ou depois):
{"aprovado": bool, "score": 0-10, "problemas": [{"tipo": str, "gravidade": "alta|media|baixa", "descricao": str, "questao": int}]}`
}

// ── Perfis disciplinares de estrutura e cotação ────────────────────────────────
function yearContext(yearLevel: number): string {
  if (yearLevel <= 4) return `NÍVEL: ${yearLevel}.º ano (1.º ciclo) — linguagem muito simples e concreta; problemas de 1–2 passos; contextos familiares; apoio visual; Bloom predominante: Recordar/Compreender. Seleção pode ter até 40% do total; respostas longas formais são raras.`
  if (yearLevel <= 6) return `NÍVEL: ${yearLevel}.º ano (2.º ciclo) — linguagem clara (10–12 anos); 2–3 passos; contextos quotidianos e naturais; equilíbrio concreto-abstracto. Bloom: 20% Recordar · 35% Compreender/Aplicar · 45% Analisar/Avaliar.`
  if (yearLevel <= 9) return `NÍVEL: ${yearLevel}.º ano (3.º ciclo) — linguagem formal crescente; multi-passo com abstracção; contextos científicos e sociais. Bloom: 10% Recordar · 30% Compreender/Aplicar · 60% Analisar/Avaliar/Criar. Seleção máximo 20%; resolução/desenvolvimento mínimo 50%.`
  return `NÍVEL: ${yearLevel}.º ano (Secundário) — linguagem rigorosa; problemas complexos multi-passo; nível próximo do exame nacional (IAVE). Bloom: 5% Recordar · 20% Compreender/Aplicar · 75% Analisar/Avaliar/Criar. Seleção máximo 15%; resolução/desenvolvimento mínimo 60%.`
}

function getSubjectProfile(subject: string, hasMultipleTypes: boolean, yearLevel: number): {
  structureNote: string
  scoringRule: string
} {
  const s = subject.toLowerCase()
  const ctx = yearContext(yearLevel)

  // ── Português / Língua Portuguesa ──────────────────────────────────────────
  if (s.includes('português') || s.includes('portugues') || s.includes('língua')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Português (${yearLevel}.º ano):
• Grupo I — Compreensão do texto (20–30 pts): CADA questão de interpretação incorpora o excerto no seu próprio campo "text", usando o formato:
  "text": "[Título da obra / tipo de texto]\\n«[excerto literário ou não-literário, 80–180 palavras]»\\n\\n[pergunta de compreensão]"
  Tipos: multiple_choice (4 pts), true_false (4 pts), short_answer (5 pts). NÃO crias questões type='text' separadas. O excerto é parte do enunciado.
• Grupo II — Gramática / Educação Literária (25–30 pts): conhecimento explícito da língua — classificação morfossintáctica, transformação frásica, coerência e coesão textual. Tipos: short_answer (5 pts), fill_blank (5 pts). Questões independentes, sem excerto obrigatório.
• Grupo III — Expressão Escrita (40 pts, 1 questão): long_answer com produção de texto orientada. markScheme obrigatório com 3 parcelas: Conteúdo e pertinência (16pt) + Organização e coesão com introdução/desenvolvimento/conclusão (12pt) + Correcção linguística, ortográfica e pontuação (12pt).
PROIBIDO ABSOLUTO: type='text', points=0 ou questões sem pergunta real.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100 exactamente, pontos sempre inteiros):
   • EM/VF (compreensão): 4 pts/questão (valor fixo)
   • Resposta curta / completar (compreensão e gramática): 5 pts/questão (valor fixo)
   • Expressão Escrita (long_answer, 1 questão): 40 pts fixos — markScheme: Conteúdo (16pt) + Organização (12pt) + Correcção linguística (12pt) = 40pt
   • Distribuição exemplo: 5 EM/VF × 4pt = 20pt | 8 curtas × 5pt = 40pt | 1 escrita × 40pt = 40pt → 100pt
   • REGRA: "points" tem sempre valor inteiro concreto — nunca null, nunca 0, nunca omitido`,
    }
  }

  // ── História e Geografia de Portugal (2.º ciclo) — DEVE VIR ANTES DE História
  if (s.includes('história e geograf') || s.includes('hgp') || s.includes('h.g.p')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — HGP (${yearLevel}.º ano — 2.º ciclo, 10–12 anos):
• Grupo I — Identificação e selecção (20 pts): EM/VF sobre factos, datas, personagens e localizações. 4 pts/questão (valor fixo). 5 questões. Linguagem simples, directa, adequada a 10–12 anos.
• Grupo II — Análise de documentos (40 pts): mapa, imagem histórica ou excerto simples INCORPORADO no campo "text" da questão que o analisa:
  "text": "Documento [n.º]: [tipo e breve identificação]\\n[transcrição breve ou descrição do documento]\\n\\nQuestão: [pergunta de análise acessível]"
  Questões de identificação, localização, observação e relação simples. 8 pts/questão (valor fixo). 5 questões. NÃO crias questões type='text'.
• Grupo III — Desenvolvimento breve (40 pts, 1–2 questões): descrição ou explicação com máximo 2 parágrafos. Bloom: Compreender/Aplicar — NÃO exiges síntese historiográfica ou análise multicausal complexa. markScheme: Conteúdo factual correcto (20pt) + Organização com ideia central e desenvolvimento (12pt) + Vocabulário histórico/geográfico adequado ao 2.º ciclo (8pt).
PROIBIDO ABSOLUTO: type='text', points=0, questões sem pergunta real, linguagem de secundário, conceitos historiográficos fora do programa do 2.º ciclo.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100 exactamente, pontos sempre inteiros):
   • Seleção (EM/VF): 4 pts/questão (valor fixo); 5 questões = 20 pts
   • Análise de documentos: 8 pts/questão (valor fixo); 5 questões = 40 pts
   • Desenvolvimento breve: 40 pts total (1 × 40pt ou 2 × 20pt); markScheme: Conteúdo factual (20pt) + Organização (12pt) + Vocabulário 2.º ciclo (8pt)
   • Distribuição: 20 + 40 + 40 = 100 pts exactamente
   • REGRA: "points" tem sempre valor inteiro concreto — nunca null, nunca 0`,
    }
  }

  // ── História (3.º ciclo e Secundário) ────────────────────────────────────────
  if (s.includes('história') || s.includes('historia')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — História (${yearLevel}.º ano):
• Grupo I — Seleção (20 pts): escolha múltipla e/ou V/F sobre factos, cronologia e conceitos históricos. 4 pts/questão (valor fixo). 5 questões.
• Grupo II — Análise de fontes / Resposta curta (40 pts): inclui OBRIGATORIAMENTE pelo menos uma fonte histórica incorporada no campo "text" da questão que a analisa:
  "text": "Fonte [número]: [título, autor, data]\\n«[texto da fonte, 60–150 palavras]»\\n\\n[pergunta de análise/interpretação]"
  Questões de interpretação, contextualização e causa-efeito. 6 pts/questão (valor fixo). NÃO crias questões type='text'.
• Grupo III — Resposta de desenvolvimento (40 pts, 1–2 questões): síntese com tese, argumentação com evidências históricas e conclusão. markScheme obrigatório: Conteúdo histórico (20pt) + Organização do discurso (12pt) + Vocabulário histórico específico (8pt).
PROIBIDO ABSOLUTO: type='text', points=0 ou questões sem pergunta real.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100 exactamente, pontos sempre inteiros):
   • Seleção (EM/VF): 4 pts/questão (valor fixo); 5 questões = 20 pts
   • Análise de fontes / Resposta curta: 6 pts/questão (valor fixo); exactamente 40 pts no grupo (ex: 6×6=36+1×4=40, ou 5×6=30+2×5=40, ou outra combinação que some 40)
   • Resposta de desenvolvimento: 40 pts total (1 × 40pt ou 2 × 20pt); markScheme: Conteúdo histórico (20pt) + Organização do discurso (12pt) + Vocabulário histórico específico (8pt)
   • Distribuição: 20 + 40 + 40 = 100 pts exactamente
   • REGRA: "points" tem sempre valor inteiro concreto — nunca null, nunca 0`,
    }
  }

  // ── Geografia ───────────────────────────────────────────────────────────────
  if (s.includes('geograf')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Geografia (${yearLevel}.º ano):
• Grupo I — Seleção (20 pts): escolha múltipla e/ou V/F sobre conceitos, localizações e fenómenos geográficos. 4 pts/questão (valor fixo). 5 questões.
• Grupo II — Interpretação de documentos / Resposta curta (40 pts): análise de dados geográficos reais — usa o campo "figure" para gráficos/tabelas (bar_chart, pie_chart) quando aplicável, ou incorpora dados no campo "text". Questões de observação, identificação e relação espacial. 8 pts/questão (valor fixo). 5 questões.
• Grupo III — Resposta de desenvolvimento (40 pts, 1–2 questões): síntese sobre fenómenos geográficos com exemplos concretos actuais. markScheme: Conteúdo geográfico (20pt) + Organização e coesão (12pt) + Vocabulário geográfico específico (8pt).
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100 exactamente, pontos sempre inteiros):
   • Seleção (EM/VF): 4 pts/questão (valor fixo); 5 questões = 20 pts
   • Interpretação / Resposta curta: 8 pts/questão (valor fixo); 5 questões = 40 pts
   • Desenvolvimento: 40 pts total; markScheme com parcelas de conteúdo + organização + vocabulário específico
   • REGRA: "points" tem sempre valor inteiro concreto`,
    }
  }

  // ── Ciências Naturais ────────────────────────────────────────────────────────
  if (s.includes('ciência') || s.includes('ciencia') || s.includes('natural') || s.includes('biolog')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Ciências Naturais (${yearLevel}.º ano):
• Grupo I — Seleção (20 pts): escolha múltipla e/ou V/F sobre conceitos, classificações e nomenclatura científica. 4 pts/questão (valor fixo). 5 questões. Distratores baseados em erros conceptuais reais.
• Grupo II — Interpretação de dados / Resposta curta (36 pts): análise de dados científicos. Usa o campo "figure" (bar_chart, pie_chart, etc.) para gráficos; incorpora protocolos ou esquemas no campo "text". Questões de observação, identificação e relação de variáveis. 6 pts/questão (valor fixo). 6 questões.
• Grupo III — Situação-problema / Resposta longa (44 pts): método científico, explicação de fenómenos, formulação de hipóteses e conclusões. Justificação científica obrigatória. markScheme: identificação do fenómeno + explicação fundamentada + terminologia + conclusão. 11 pts/questão (4 questões) ou outra combinação que some 44 pts.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100 exactamente, pontos sempre inteiros):
   • Seleção (EM/VF): 4 pts/questão (valor fixo); 5 questões = 20 pts
   • Interpretação / Resposta curta: 6 pts/questão (valor fixo); 6 questões = 36 pts
   • Situação-problema / Resposta longa: 11 pts/questão (valor fixo); 4 questões = 44 pts → 20+36+44 = 100 pts
   • markScheme das longas (11pt): Identificação do fenómeno/conceito (3pt) + Explicação científica fundamentada (4pt) + Terminologia científica adequada (2pt) + Conclusão ou proposta de solução (2pt) = 11pt
   • REGRA: "points" tem sempre valor inteiro concreto — nunca null, nunca 0`,
    }
  }

  // ── Físico-Química ───────────────────────────────────────────────────────────
  if (s.includes('físic') || s.includes('fisic') || s.includes('quím') || s.includes('quim')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Físico-Química (${yearLevel}.º ano):
• Grupo I — Seleção (20 pts): escolha múltipla e/ou V/F sobre conceitos, definições e grandezas. 4 pts/questão (valor fixo). 5 questões.
• Grupo II — Interpretação experimental / Resposta curta (30 pts): dados laboratoriais, gráficos (usar campo "figure") ou tabelas com unidades obrigatórias. Variáveis, procedimento, conclusões. 6 pts/questão (valor fixo). 5 questões.
• Grupo III — Resolução de problemas (50 pts): fórmulas em contexto real. Estrutura de resposta OBRIGATÓRIA: Dados → Fórmula → Desenvolvimento do cálculo → Resposta com unidade. Multi-passo. 10 pts/questão (valor fixo). 5 questões.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100 exactamente, pontos sempre inteiros):
   • Seleção (EM/VF): 4 pts/questão (valor fixo); 5 questões = 20 pts
   • Interpretação experimental: 6 pts/questão (valor fixo); 5 questões = 30 pts
   • Resolução de problemas: 10 pts/questão (valor fixo); 5 questões = 50 pts
   • markScheme de problemas: Dados (2pt) + Fórmula/método (3pt) + Cálculo sem erro (3pt) + Resposta com unidade (2pt) = 10pt
   • REGRA: "points" tem sempre valor inteiro concreto — nunca null, nunca 0`,
    }
  }

  // ── Filosofia ────────────────────────────────────────────────────────────────
  if (s.includes('filosof')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Filosofia (${yearLevel}.º ano) — alinhada com a Prova 714 (IAVE):
• Grupo I — Questões objectivas (20–25 pts): escolha múltipla e/ou V/F sobre conceitos filosóficos, teses dos autores e distinções conceptuais. 5 pts/questão. Distratores baseados em confusões conceptuais típicas dos alunos.
• Grupo II — Análise de texto filosófico (30–40 pts): questões de tipo short_answer com 8 pts cada. CADA QUESTÃO DO GRUPO II contém o excerto filosófico incorporado no seu próprio campo "text", usando este formato exacto:
  "text": "Excerto de [Autor, Obra]:\\n«[texto do excerto, 80–200 palavras]»\\n\\n[pergunta de interpretação]"
  O excerto é parte do enunciado da questão — NÃO crias questões separadas para o texto. NÃO uses type='text' nem points=0.
• Grupo III — Resposta de desenvolvimento (35 pts, 1 questão): long_answer. Exige tese, argumentação, contra-argumento e conclusão. Rubrica IAVE: Tese/Problematização (7pt) + Argumentação (16pt) + Adequação conceptual e teórica (9pt) + Comunicação (3pt).
PROIBIDO ABSOLUTO: type='text', points=0 ou questões sem pergunta real. Cada item é uma questão com cotação e resposta esperada.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100 exactamente, pontos sempre inteiros):
   • Questões objectivas (EM/VF): 5 pts/questão (valor fixo); máximo 25 pts no Grupo I
   • Análise de texto / Conceptualização (resposta curta): 8 pts/questão (valor fixo); máximo 40 pts no Grupo II
   • Desenvolvimento filosófico (1 questão): 35 pts (valor fixo); markScheme OBRIGATÓRIO com 4 parcelas exactas: Tese/Problematização (7pt) + Argumentação (16pt) + Adequação conceptual e teórica (9pt) + Comunicação (3pt) = 35pt
   • Distribuição para 16 questões: 5 EM/VF × 5pt = 25pt | ~4–5 questões curtas × 8pt = 32–40pt | 1 desenvolvimento = 35pt → total = 100pt
   • REGRA: "points" de cada questão tem sempre um valor inteiro concreto — nunca null, nunca 0, nunca omitido`,
    }
  }

  // ── Línguas estrangeiras: Inglês, Espanhol, Francês ─────────────────────────
  const languageMap: Record<string, string> = {
    'inglês': 'Inglês', 'ingles': 'Inglês', 'english': 'Inglês',
    'espanhol': 'Espanhol', 'castelhano': 'Espanhol', 'spanish': 'Espanhol',
    'francês': 'Francês', 'frances': 'Francês', 'french': 'Francês',
  }
  const languageMatch = Object.keys(languageMap).find(k => s.includes(k))
  if (languageMatch) {
    const lang = languageMap[languageMatch]
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — ${lang} (${yearLevel}.º ano) — língua estrangeira:
• Grupo I — Compreensão escrita / Reading comprehension (35 pts): CADA questão de compreensão incorpora um excerto em ${lang} (60–150 palavras, nível adequado ao ano) no seu próprio campo "text", seguido da pergunta. Formato:
  "text": "[Título ou contexto do texto]\\n[excerto em ${lang}]\\n\\n[pergunta de compreensão]"
  Tipos: multiple_choice (5pt), true_false (5pt), short_answer (5pt) — perguntas e respostas esperadas EM ${lang}. NÃO crias questões type='text' separadas — o excerto é parte do enunciado.
• Grupo II — Gramática e vocabulário / Grammar & vocabulary (30 pts): fill_blank e short_answer sobre estruturas gramaticais e vocabulário do nível — enunciado e resposta esperada em ${lang}. Questões independentes, sem excerto obrigatório.
• Grupo III — Produção escrita / Writing (35 pts, 1 questão): long_answer — produção de texto curto em ${lang} (carta, e-mail ou parágrafo de opinião, conforme o ano e o tema). markScheme com 3 parcelas: Cumprimento da tarefa e conteúdo (14pt) + Vocabulário e estruturas gramaticais (12pt) + Correcção ortográfica e coesão (9pt).
PROIBIDO ABSOLUTO: type='text', points=0, questões sem pergunta real, ou respostas esperadas em português quando a tarefa pede produção em ${lang}.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100 exactamente, pontos sempre inteiros):
   • Compreensão escrita (EM/VF/curta): 5 pts/questão (valor fixo); 7 questões = 35 pts
   • Gramática e vocabulário (curta/completar): 5 pts/questão (valor fixo); 6 questões = 30 pts
   • Produção escrita (long_answer, 1 questão): 35 pts fixos — markScheme: Cumprimento da tarefa (14pt) + Vocabulário/gramática (12pt) + Ortografia e coesão (9pt) = 35pt
   • Distribuição: 35 + 30 + 35 = 100 pts exactamente
   • REGRA: enunciados de compreensão e produção sempre em ${lang}; instruções de gestão do teste podem ser em português`,
    }
  }

  // ── Educação Física (componente teórica escrita) ────────────────────────────
  if (s.includes('educação física') || s.includes('educacao fisica') || s.includes('ed. física') || s.includes('ed física')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Educação Física (${yearLevel}.º ano) — componente teórica escrita:
• Grupo I — Regras e modalidades desportivas (30 pts): EM/VF sobre regras de jogo, terminologia desportiva, modalidades do programa (jogos colectivos, ginástica, atletismo, dança, raquetas). 5 pts/questão (valor fixo). 6 questões.
• Grupo II — Aptidão física e saúde (35 pts): short_answer sobre capacidades motoras (força, resistência, velocidade, flexibilidade), sistema cardiorrespiratório e exercício, aquecimento/retorno à calma, hábitos de vida saudável. 7 pts/questão (valor fixo). 5 questões.
• Grupo III — Situação de jogo ou treino aplicada (35 pts, 1–2 questões): descrição de uma situação de jogo ou plano de treino INCORPORADA no campo "text" da questão que a analisa — pergunta de aplicação (decisão táctica, correcção de erro, adaptação de treino). short_answer ou long_answer.
PROIBIDO ABSOLUTO: type='text', points=0, questões sem pergunta real, ou pedidos de execução motora (este é um teste escrito, não uma avaliação prática).
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100 exactamente, pontos sempre inteiros):
   • Regras e modalidades (EM/VF): 5 pts/questão (valor fixo); 6 questões = 30 pts
   • Aptidão física e saúde (resposta curta): 7 pts/questão (valor fixo); 5 questões = 35 pts
   • Situação aplicada: 35 pts total (1 × 35pt ou 2 × 17–18pt); markScheme: Identificação correcta da questão táctica/fisiológica (15pt) + Justificação fundamentada (12pt) + Vocabulário técnico-desportivo adequado (8pt)
   • Distribuição: 30 + 35 + 35 = 100 pts exactamente`,
    }
  }

  // ── Educação Visual (componente teórica escrita) ────────────────────────────
  if (s.includes('educação visual') || s.includes('educacao visual') || s.includes('ed. visual') || s.includes('ed visual')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Educação Visual (${yearLevel}.º ano) — componente teórica escrita:
• Grupo I — Elementos e linguagem visual (25 pts): EM/VF sobre elementos visuais (ponto, linha, forma, cor, textura, valor, espaço) e princípios de composição. 5 pts/questão (valor fixo). 5 questões.
• Grupo II — Análise de imagem ou objecto visual (35 pts): CADA questão incorpora a descrição textual detalhada de uma imagem, obra ou objecto visual no seu próprio campo "text" (já que não há imagem real disponível), seguida da pergunta de análise. short_answer, 7 pts/questão. 5 questões.
• Grupo III — Justificação de processo ou escolha estética (40 pts, 1 questão): long_answer — descreve e justifica um processo de concepção ou escolha técnica/estética (ex: porquê determinada técnica ou material para um efeito pretendido). markScheme: Conhecimento técnico e conceptual (16pt) + Justificação estética fundamentada (16pt) + Vocabulário visual específico (8pt).
PROIBIDO ABSOLUTO: type='text', points=0, questões sem pergunta real, ou pedidos de desenho/execução prática (este é um teste escrito teórico).
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100 exactamente, pontos sempre inteiros):
   • Elementos e linguagem visual (EM/VF): 5 pts/questão (valor fixo); 5 questões = 25 pts
   • Análise de imagem/objecto (resposta curta): 7 pts/questão (valor fixo); 5 questões = 35 pts
   • Justificação de processo (long_answer, 1 questão): 40 pts fixos — markScheme: Conhecimento técnico (16pt) + Justificação estética (16pt) + Vocabulário visual (8pt) = 40pt
   • Distribuição: 25 + 35 + 40 = 100 pts exactamente`,
    }
  }

  // ── Educação Tecnológica (componente teórica escrita) ───────────────────────
  if (s.includes('educação tecnológica') || s.includes('educacao tecnologica') || s.includes('ed. tecnológica') || s.includes('ed tecnologica')) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Educação Tecnológica (${yearLevel}.º ano) — componente teórica escrita:
• Grupo I — Materiais, ferramentas e processos (25 pts): EM/VF sobre propriedades de materiais, ferramentas, processos de fabrico e regras de segurança. 5 pts/questão (valor fixo). 5 questões.
• Grupo II — Análise de objectos e sistemas técnicos (35 pts): CADA questão incorpora a descrição de um objecto ou sistema técnico no seu próprio campo "text", seguida da pergunta de análise (função, estrutura, mecanismo, materiais usados). short_answer, 7 pts/questão. 5 questões.
• Grupo III — Resolução de problema técnico (40 pts, 1 questão): long_answer — situação-problema de concepção (propõe uma solução técnica viável, com materiais e processo adequados). markScheme: Identificação correcta do problema e requisitos (12pt) + Proposta de solução tecnicamente viável (16pt) + Justificação com vocabulário técnico adequado (12pt).
PROIBIDO ABSOLUTO: type='text', points=0, questões sem pergunta real, ou pedidos de execução prática/manual (este é um teste escrito teórico).
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100 exactamente, pontos sempre inteiros):
   • Materiais, ferramentas e processos (EM/VF): 5 pts/questão (valor fixo); 5 questões = 25 pts
   • Análise de objectos técnicos (resposta curta): 7 pts/questão (valor fixo); 5 questões = 35 pts
   • Resolução de problema técnico (long_answer, 1 questão): 40 pts fixos — markScheme: Identificação do problema (12pt) + Proposta de solução (16pt) + Justificação técnica (12pt) = 40pt
   • Distribuição: 25 + 35 + 40 = 100 pts exactamente`,
    }
  }

  // ── TIC — Tecnologias de Informação e Comunicação (3.º ciclo, AE DGE) ────────
  // ATENÇÃO: 'tic' é substring de "matemática"/"artística" — usa SEMPRE fronteira de palavra.
  if (/\btic\b/.test(s)) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — TIC (${yearLevel}.º ano) — alinhada com os 4 domínios AE DGE:
• Grupo I — Segurança digital e hardware/software (25 pts): EM/VF sobre cibersegurança, identificação de hardware/software, netiqueta, licenciamento e direitos de autor de conteúdo digital. 5 pts/questão (valor fixo). 5 questões.
• Grupo II — Investigar, comunicar e colaborar (35 pts): short_answer sobre pesquisa e avaliação crítica de fontes online, ferramentas de comunicação digital (e-mail, videoconferência, mensageiros), colaboração em documentos partilhados. 7 pts/questão (valor fixo). 5 questões.
• Grupo III — Criar e inovar / pensamento computacional (40 pts, 1–2 questões): situação-problema com um algoritmo simples DESCRITO em texto no próprio campo "text" da questão (sequência de passos, pseudocódigo ou bloco de programação por blocos tipo Scratch descrito verbalmente) — pergunta de tracing, depuração ou completar o algoritmo. short_answer ou long_answer.
PROIBIDO ABSOLUTO: type='text', points=0, questões sem pergunta real, ou pedidos de execução prática num computador real (este é um teste escrito).
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100 exactamente, pontos sempre inteiros):
   • Segurança digital e hardware/software (EM/VF): 5 pts/questão (valor fixo); 5 questões = 25 pts
   • Investigar/comunicar/colaborar (resposta curta): 7 pts/questão (valor fixo); 5 questões = 35 pts
   • Criar e inovar / pensamento computacional: 40 pts total (1 × 40pt ou 2 × 20pt); markScheme: Identificação correcta da lógica/erro do algoritmo (16pt) + Proposta ou correcção válida (16pt) + Vocabulário técnico adequado (8pt)
   • Distribuição: 25 + 35 + 40 = 100 pts exactamente`,
    }
  }

  // ── Matemática / STEM (default) ──────────────────────────────────────────────
  if (hasMultipleTypes) {
    return {
      structureNote: `ESTRUTURA OBRIGATÓRIA — Matemática (${yearLevel}.º ano):
• Grupo I — Seleção (20 pts): escolha múltipla e/ou V/F. Distratores baseados em erros conceptuais típicos. EM: 4 pts/questão; VF: 2 pts/questão.
• Grupo II — Cálculo e resposta curta (30 pts): aplicação directa com apresentação de cálculos obrigatória. 6 pts/questão. 5 questões.
• Grupo III — Resolução de problemas (50 pts): multi-passo com contexto real; modelação, estratégia e raciocínio; cálculos e justificação obrigatórios. markScheme: dados (2pt) + fórmula/método (3pt) + cálculo correcto (3pt) + resposta com unidade (2pt). 10 pts/questão. 5 questões.
${ctx}`,
      scoringRule: `6. COTAÇÃO (totalPoints = 100 exactamente, pontos sempre inteiros):
   • Escolha múltipla: 4 pts/questão (valor de referência); ajusta se necessário, mantém coerência dentro do grupo
   • Verdadeiro/Falso: 2 pts/questão (valor fixo)
   • Resposta curta / Cálculo: 6 pts/questão (valor de referência); markScheme: dados + método + cálculo + resultado
   • Resolução / Resposta longa: 10 pts/questão (valor de referência); markScheme com 4 parcelas: dados (2pt) + fórmula/método (3pt) + cálculo (3pt) + resposta com unidade (2pt)
   • Distribuição alvo: Seleção ~20 pts | Cálculo ~30 pts | Resolução ~50 pts → total 100 pts
   • REGRA: cada "points" tem um valor inteiro concreto — nunca null, nunca 0, nunca omitido`,
    }
  }

  // Tipo único — sem estrutura obrigatória de grupos
  return {
    structureNote: `ORGANIZAÇÃO: Todas as questões são do mesmo tipo — usa um único grupo com label e descrição adequados ao tipo pedido.`,
    scoringRule: `6. COTAÇÃO: totalPoints = 100 exactamente; pontos sempre inteiros; distribuição proporcional à complexidade cognitiva (questões de Bloom 4–6 valem mais).`,
  }
}

// ── markScheme automático por disciplina e tipo de questão ───────────────────
function autoMarkScheme(type: string, pts: number, subject: string): string {
  const s = subject.toLowerCase()
  const p = (frac: number) => Math.max(1, Math.round(pts * frac))

  if (type === 'multiple_choice') {
    return `Resposta correcta (${pts}pt). Critério: correspondência exacta com a opção correcta — sem cotação parcial. Qualquer outra opção = 0 pontos.`
  }
  if (type === 'true_false') {
    return `Resposta correcta (${pts}pt). Critério: classificação exacta como Verdadeiro ou Falso — sem cotação parcial. Resposta errada = 0 pontos.`
  }

  const isLong = type === 'long_answer'

  if (s.includes('matemát') || s.includes('físic') || s.includes('fisic') || s.includes('quím') || s.includes('quim')) {
    return `Identificação dos dados relevantes (${p(0.2)}pt) + fórmula/método correcto (${p(0.3)}pt) + desenvolvimento do cálculo sem erro (${p(0.3)}pt) + resposta com unidade correcta e conclusão (${p(0.2)}pt).`
  }
  if (s.includes('português') || s.includes('portugues') || s.includes('língua')) {
    if (isLong) {
      return `Conteúdo e pertinência (${p(0.4)}pt) + organização e coesão textual com introdução/desenvolvimento/conclusão (${p(0.3)}pt) + correcção linguística, ortográfica e pontuação (${p(0.3)}pt).`
    }
    return `Identificação correcta do elemento pedido (${p(0.4)}pt) + justificação ou exemplificação adequada com recurso ao texto (${p(0.4)}pt) + correcção linguística (${p(0.2)}pt).`
  }
  if (s.includes('história') || s.includes('historia') || s.includes('geografia') || s.includes('geograf') || s.includes('hgp')) {
    if (isLong) {
      return `Conteúdo histórico/geográfico correcto e pertinente com factos e datas relevantes (${p(0.5)}pt) + organização do discurso com tese, argumentação e conclusão (${p(0.3)}pt) + correcção linguística e vocabulário histórico/geográfico específico (${p(0.2)}pt).`
    }
    return `Identificação correcta do conceito/facto histórico ou geográfico (${p(0.5)}pt) + contextualização e justificação adequada (${p(0.5)}pt).`
  }
  if (s.includes('ciência') || s.includes('ciencia') || s.includes('natural') || s.includes('biolog')) {
    if (isLong) {
      return `Identificação correcta do fenómeno ou conceito científico (${p(0.25)}pt) + explicação científica correcta e fundamentada (${p(0.4)}pt) + terminologia científica adequada (${p(0.2)}pt) + conclusão pertinente (${p(0.15)}pt).`
    }
    return `Resposta científica correcta (${p(0.6)}pt) + justificação com terminologia científica adequada (${p(0.4)}pt).`
  }
  if (s.includes('filosof')) {
    if (isLong) {
      return `Tese/Problematização — identificação clara da questão filosófica e posição pessoal fundamentada (${p(0.2)}pt) + Argumentação — pelo menos dois argumentos filosóficos pertinentes com recurso a conceitos e autores do programa DGE (${p(0.45)}pt) + Adequação conceptual e teórica — uso correcto da terminologia filosófica e referências aos autores estudados (${p(0.25)}pt) + Comunicação — organização, coesão e clareza do discurso filosófico (${p(0.1)}pt).`
    }
    return `Identificação correcta do conceito, tese ou autor filosófico (${p(0.5)}pt) + explicação adequada com referência ao pensamento do autor no contexto do programa DGE (${p(0.5)}pt).`
  }
  if (s.includes('inglês') || s.includes('ingles') || s.includes('espanhol') || s.includes('francês') || s.includes('frances')) {
    if (isLong) {
      return `Cumprimento da tarefa e conteúdo pertinente (${p(0.4)}pt) + vocabulário e estruturas gramaticais adequadas ao nível (${p(0.35)}pt) + correcção ortográfica e coesão textual (${p(0.25)}pt).`
    }
    return `Resposta correcta na língua-alvo (${p(0.6)}pt) + correcção gramatical e ortográfica (${p(0.4)}pt).`
  }
  if (s.includes('educação física') || s.includes('educacao fisica')) {
    if (isLong) {
      return `Identificação correcta da questão táctica ou fisiológica (${p(0.4)}pt) + justificação fundamentada (${p(0.35)}pt) + vocabulário técnico-desportivo adequado (${p(0.25)}pt).`
    }
    return `Resposta correcta sobre regra/conceito/aptidão física (${p(0.6)}pt) + justificação adequada (${p(0.4)}pt).`
  }
  if (s.includes('educação visual') || s.includes('educacao visual')) {
    if (isLong) {
      return `Conhecimento técnico e conceptual correcto (${p(0.35)}pt) + justificação estética fundamentada (${p(0.4)}pt) + vocabulário visual específico (${p(0.25)}pt).`
    }
    return `Identificação ou análise visual correcta (${p(0.6)}pt) + justificação com vocabulário visual específico (${p(0.4)}pt).`
  }
  if (s.includes('educação tecnológica') || s.includes('educacao tecnologica')) {
    if (isLong) {
      return `Identificação correcta do problema e requisitos técnicos (${p(0.3)}pt) + proposta de solução tecnicamente viável (${p(0.4)}pt) + justificação com vocabulário técnico adequado (${p(0.3)}pt).`
    }
    return `Identificação ou análise técnica correcta (${p(0.6)}pt) + justificação com vocabulário técnico específico (${p(0.4)}pt).`
  }
  if (/\btic\b/.test(s)) {
    if (isLong) {
      return `Identificação correcta da lógica ou erro do algoritmo (${p(0.4)}pt) + proposta ou correcção válida (${p(0.4)}pt) + vocabulário técnico adequado (${p(0.2)}pt).`
    }
    return `Resposta correcta sobre o conceito/ferramenta digital (${p(0.6)}pt) + justificação ou exemplo concreto (${p(0.4)}pt).`
  }
  // Genérico
  return isLong
    ? `Conteúdo correcto e completo (${p(0.5)}pt) + organização e coesão (${p(0.3)}pt) + rigor e clareza da expressão (${p(0.2)}pt).`
    : `Resposta correcta e completa (${p(0.6)}pt) + clareza e rigor (${p(0.4)}pt).`
}

// System prompt reforçado para modelos de fallback
// Explícito sobre falhas comuns: PT-BR, JSON incompleto, markScheme vago, questões genéricas
const FALLBACK_SYSTEM_ENHANCED = `És um professor especialista em avaliação em Portugal com 20 anos de experiência. A tua missão é gerar questões de avaliação de QUALIDADE EXCELENTE. Segue CADA regra sem excepção.

═══ FORMATO DE SAÍDA ═══
• Responde EXCLUSIVAMENTE com JSON válido — ZERO texto antes ou depois, ZERO blocos \`\`\`json, ZERO comentários
• JSON deve ser completo e bem formado — nunca truncar no meio de uma chave ou valor

═══ LÍNGUA — PORTUGUÊS DE PORTUGAL ESTRITO ═══
Escreve SEMPRE a forma da esquerda, NUNCA a da direita (só pares que realmente diferem):
actividade≠atividade · óptimo≠ótimo · facto≠fato · objecto≠objeto · directo≠directo · correcto≠correto · incorrecto≠incorreto · aspecto≠aspeto · rectângulo≠retângulo · fracção≠fração · acção≠ação · percentagem≠porcentagem · exacto≠exato · contacto≠contato · efectivo≠efetivo · selecção≠seleção
NOTA: palavras como "equação", "solução", "análise", "síntese", "utilização", "período", "fórmula", "efeito" são IGUAIS em PT-PT e PT-BR — usa-as livremente, são correctas. Não as evites.

═══ QUALIDADE PEDAGÓGICA OBRIGATÓRIA ═══
• Cada questão DEVE ser específica ao tópico pedido — zero questões genéricas que poderiam servir qualquer disciplina
• Contexto real e significativo: usa situações concretas, dados numéricos reais, exemplos do quotidiano português
• Distratores (escolha múltipla): cada opção errada deve corresponder a um erro conceptual REAL e plausível — nunca opções obviamente absurdas
• Questões de desenvolvimento: exigem resposta estruturada com argumentação, não apenas listagens
• Bloom: distribui pelos níveis pedidos — questões de análise/avaliação têm peso maior

═══ ESTRUTURA JSON OBRIGATÓRIA ═══
• "points": número inteiro positivo; a soma de TODAS as questões = exactamente 100
• "correctAnswer": obrigatório em TODAS as questões sem excepção
  - multiple_choice: APENAS "A", "B", "C" ou "D" (só a letra, sem ponto, sem texto adicional)
  - true_false: APENAS "Verdadeiro" ou "Falso"
  - short_answer / long_answer: resposta modelo completa (mínimo 15 palavras)
• "markScheme": obrigatório e ESPECÍFICO — nunca genérico como "resposta correcta"
  - multiple_choice: "Resposta: [letra] ([X]pt). Opção [Y]: induz o erro de [...]. Opção [Z]: confunde [...]. Errada = 0pt."
  - true_false: "[Verdadeiro/Falso] — [razão científica/histórica/factual concreta]. ([X]pt). Errada = 0pt."
  - short_answer (Matemática/FQ): "Dados ([X]pt) + fórmula/método ([X]pt) + cálculo sem erro ([X]pt) + resposta com unidade ([X]pt)"
  - short_answer (outras): "Identificação correcta ([X]pt) + justificação com evidência/raciocínio ([X]pt) + correcção linguística ([X]pt)"
  - long_answer: critérios progressivos — conteúdo/argumentação + organização + vocabulário específico
  - A SOMA dos pontos no markScheme deve ser IGUAL a "points" da questão
• "options": array de 4 strings para multiple_choice (["A) ...", "B) ...", "C) ...", "D) ..."]), null para outros tipos
• Não omitas NENHUM campo do schema pedido

═══ VERIFICAÇÃO FINAL ANTES DE RESPONDER ═══
Antes de gerar o JSON, verifica mentalmente:
✓ O JSON está completo e bem formado?
✓ Todos os "correctAnswer" estão preenchidos?
✓ Todos os "markScheme" têm critérios específicos com pontos que somam "points"?
✓ A soma de todos os "points" é exactamente 100?
✓ Usei Português de Portugal em todo o texto?
✓ Cada questão é específica ao tópico (não genérica)?
✓ Em questões com números/cálculos: refiz o cálculo do zero e "correctAnswer" está aritmeticamente correcto?
✓ Em questões de optimização/divisibilidade ("o máximo/mínimo possível"): o enunciado tem todas as restrições necessárias para uma resposta única, sem soluções triviais alternativas?`

// Tenta fechar um JSON truncado adicionando os caracteres em falta
function repairTruncatedJson(raw: string): string {
  // Remover vírgula final antes de fechar (trailing comma)
  let s = raw.trimEnd().replace(/,\s*$/, '')
  // Contar chavetas e colchetes por fechar
  const stack: string[] = []
  let inString = false
  let escape = false
  for (const ch of s) {
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']')
    else if (ch === '}' || ch === ']') stack.pop()
  }
  // Fechar o que ficou aberto (em ordem inversa)
  return s + stack.reverse().join('')
}

// Helper para chamar qualquer endpoint OpenAI-compatible via fetch
// systemPrompt: null → só mensagem user (útil para Tier 1 cujo prompt já tem tudo)
async function callOpenAICompat(
  url: string,
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs = 25_000,
  label = '',
  extraHeaders: Record<string, string> = {},
  systemPrompt: string | null = FALLBACK_SYSTEM_ENHANCED,
  maxTokens = 8192
): Promise<string | null> {
  try {
    const messages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
      : [{ role: 'user', content: prompt }]
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) {
      // Ler corpo da resposta para diagnóstico (primeiros 200 chars)
      let body = ''
      try { body = (await res.text()).slice(0, 200) } catch { /* ignore */ }
      console.warn(`[PROFAI] ${label} falhou: HTTP ${res.status} | ${body}`)
      return null
    }
    const data = await res.json() as { choices: Array<{ message: { content: string } }> }
    const text = data.choices[0]?.message?.content ?? ''
    if (text.length > 50) {
      console.log(`[PROFAI] ${label} OK (${text.length} chars)`)
      return text
    }
    console.warn(`[PROFAI] ${label} resposta curta: "${text.slice(0, 100)}"`)
    return null
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`[PROFAI] ${label} erro: ${msg.slice(0, 120)}`)
    return null
  }
}

interface GenerationResult { text: string; isFallback: boolean; modelUsed: string }

// Cascade com dois níveis de qualidade:
// TIER 1 (ouro): Groq + Gemini em PARALELO — primeiro a responder ganha
//   Groq: ~300ms, Gemini: 10-25s mas qualidade superior — Promise.any() evita espera sequencial
// TIER 2 (fallback com aviso amber): kimi, GitHub gpt-4o, NIM, SambaNova, Mistral, nemotron
// DEADLINE GLOBAL: 58s (Render suporta 60s, 2s de margem)
async function generateWithFallback(prompt: string): Promise<GenerationResult> {
  const BUDGET = 58_000
  const deadline = Date.now() + BUDGET
  const tried: string[] = []

  // Helper: tempo restante, mínimo 3s, máximo maxMs
  const t = (maxMs: number) => Math.max(3_000, Math.min(maxMs, deadline - Date.now()))
  const ok = (minMs = 3_000) => Date.now() < deadline - minMs

  // ── TIER 1: Groq + Gemini em PARALELO — Promise.any() → primeiro sucesso vence ─
  {
    const tasks: Array<Promise<{ text: string; model: string } | null>> = []

    if (process.env.GROQ_API_KEY) {
      tried.push('groq-llama')
      tasks.push(
        callOpenAICompat(
          'https://api.groq.com/openai/v1/chat/completions',
          process.env.GROQ_API_KEY, 'llama-3.3-70b-versatile',
          prompt, 20_000, 'Groq:llama-3.3-70b',
          {}, FALLBACK_SYSTEM_ENHANCED, 16_000
        ).then(text => text ? { text, model: 'groq-llama-3.3-70b' } : null)
      )
    }

    const geminiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
    ].filter((k): k is string => !!k)

    for (const [i, key] of geminiKeys.entries()) {
      tried.push(`gemini-${i + 1}`)
      tasks.push(
        callOpenAICompat(
          'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
          key, 'gemini-2.5-flash', prompt, 25_000, `Gemini:2.5-flash-${i + 1}`,
          {}, null, 16_000
        ).then(text => text ? { text, model: 'gemini-2.5-flash' } : null)
      )
    }

    if (tasks.length > 0) {
      try {
        const winner = await Promise.any(
          tasks.map(p => p.then(r => r ?? Promise.reject(new Error('sem resultado'))))
        )
        console.log(`[PROFAI] ✓ Tier 1 vencedor: ${winner.model}`)
        return { text: winner.text, isFallback: false, modelUsed: winner.model }
      } catch {
        console.warn('[PROFAI] Tier 1 sem sucesso — a usar Tier 2')
      }
    }
  }

  // ── TIER 2: fallback com prompt reforçado (banner amber no UI) ───────────────
  console.warn('[PROFAI] Tier 1 indisponível — a usar Tier 2 com aviso ao utilizador')

  if (process.env.OPENROUTER_API_KEY && ok()) {
    tried.push('kimi-k2.6')
    const orH = { 'HTTP-Referer': 'https://profai-app.onrender.com', 'X-Title': 'PROF.IA' }
    const r = await callOpenAICompat(
      'https://openrouter.ai/api/v1/chat/completions',
      process.env.OPENROUTER_API_KEY, 'moonshotai/kimi-k2.6:free',
      prompt, t(22_000), 'OR:kimi-k2.6:free', orH,
      FALLBACK_SYSTEM_ENHANCED, 12_000
    )
    if (r) return { text: r, isFallback: true, modelUsed: 'kimi-k2.6-free' }
  }

  if (process.env.GITHUB_API_KEY && ok()) {
    tried.push('github-gpt4o')
    const r = await callOpenAICompat(
      'https://models.inference.ai.azure.com/chat/completions',
      process.env.GITHUB_API_KEY, 'gpt-4o',
      prompt, t(22_000), 'GitHub:gpt-4o',
      {}, FALLBACK_SYSTEM_ENHANCED, 12_000
    )
    if (r) return { text: r, isFallback: true, modelUsed: 'github-gpt-4o' }
  }

  // NIM (NVIDIA) — round-robin entre 2 chaves, 40 RPM cada, OpenAI-compatible
  // Validado: mistral-small-4-119b (2.7s, PT-PT correcto, markScheme correcto)
  if (ok()) {
    const nimKeys = [process.env.NIM_API_KEY, process.env.NIM_API_KEY_2].filter((k): k is string => !!k)
    if (nimKeys.length > 0) {
      const nimKey = nimKeys[Math.floor(Date.now() / 1000) % nimKeys.length]
      tried.push('nim-mistral-small-4')
      const r = await callOpenAICompat(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        nimKey, 'mistralai/mistral-small-4-119b-2603',
        prompt, t(18_000), 'NIM:mistral-small-4-119b',
        {}, FALLBACK_SYSTEM_ENHANCED, 12_000
      )
      if (r) return { text: r, isFallback: true, modelUsed: 'nim-mistral-small-4-119b' }
    }
  }

  if (process.env.SAMBANOVA_API_KEY && ok()) {
    tried.push('sambanova')
    const r = await callOpenAICompat(
      'https://api.sambanova.ai/v1/chat/completions',
      process.env.SAMBANOVA_API_KEY, 'DeepSeek-V3.1',
      prompt, t(15_000), 'SambaNova:DeepSeek-V3.1',
      {}, FALLBACK_SYSTEM_ENHANCED, 12_000
    )
    if (r) return { text: r, isFallback: true, modelUsed: 'sambanova-deepseek-v3.1' }
  }

  if (process.env.MISTRAL_API_KEY && ok()) {
    tried.push('mistral')
    const r = await callOpenAICompat(
      'https://api.mistral.ai/v1/chat/completions',
      process.env.MISTRAL_API_KEY, 'mistral-small-latest',
      prompt, t(12_000), 'Mistral:mistral-small',
      {}, FALLBACK_SYSTEM_ENHANCED, 12_000
    )
    if (r) return { text: r, isFallback: true, modelUsed: 'mistral-small' }
  }

  if (process.env.OPENROUTER_API_KEY && ok()) {
    tried.push('nemotron')
    const orH2 = { 'HTTP-Referer': 'https://profai-app.onrender.com', 'X-Title': 'PROF.IA' }
    const r = await callOpenAICompat(
      'https://openrouter.ai/api/v1/chat/completions',
      process.env.OPENROUTER_API_KEY, 'nvidia/nemotron-3-super-120b-a12b:free',
      prompt, t(12_000), 'OR:nemotron-3-super:free', orH2,
      FALLBACK_SYSTEM_ENHANCED, 12_000
    )
    if (r) return { text: r, isFallback: true, modelUsed: 'nemotron-3-super-free' }
  }

  const elapsed = Math.round((Date.now() - (deadline - BUDGET)) / 1000)
  throw new Error(`Todos os modelos falharam (${elapsed}s). Tentados: ${tried.join(', ') || 'nenhum'}. Tenta novamente.`)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()
  const { tool, inputs } = body
  // 'differentiate' reaproveita 100% do pipeline de 'test' (estrutura, banco, crítico,
  // validação) — só acrescenta a directriz de nível A/C e força o título original no fim.
  const isTestLike = tool === 'test' || tool === 'differentiate'

  let prompt = ''

  if (isTestLike) {
    const { subject, yearLevel, topic, difficulty, questionTypes, numQuestions, duration, country, avoidTexts, level, title: forcedTitle } =
      inputs as { subject: string; yearLevel: number; topic: string; difficulty: string
        questionTypes: string[]; numQuestions: number; duration?: number; country: string
        avoidTexts?: string[]; level?: 'A' | 'C' | 'MU' | 'MS'; title?: string }
    const countryLabel = country === 'PT' ? 'Portugal (Aprendizagens Essenciais DGE)' : country
    const isMath = ['Matemática', 'Matemática A'].includes(subject)
    // Disciplinas cuja estrutura pede explicitamente gráficos no campo "figure"
    // (Geografia, CN, FQ) mas que não recebiam a sintaxe exacta — a IA inventava
    // tipos não suportados (ex: "circuito", "gráfico de linha") que o MathFigure
    // não sabe desenhar: a questão ficava com figure≠null mas nada renderizava.
    const subjectLower = subject.toLowerCase()
    const hasChartFigures = !isMath && ['geograf', 'ciência', 'ciencia', 'natural', 'biolog', 'físic', 'fisic', 'quím', 'quim']
      .some(k => subjectLower.includes(k))
    const diffLabel = difficulty === 'easy' ? 'Fácil' : difficulty === 'medium' ? 'Média' : 'Difícil'
    const testDuration = duration ?? 50

    // ── Directrizes por disciplina ──────────────────────────────────────────
    const subjectGuidelines: Record<string, string> = {
      'Matemática': `CONTEÚDO E CONTEXTO — Matemática:
• Usa contextos reais portugueses: preços em euros, distâncias em Portugal, dados populacionais do INE, desportos, receitas, plantas de habitações
• Distratores de EM devem corresponder a erros conceptuais reais: confundir perímetro/área, esquecer converter unidades, inverter numerador/denominador, erro de sinal em subtracção
• Proibido: valores sem contexto ("calcule 3/4 de x"), problemas que não especificam unidades, resposta que está visualmente óbvia num gráfico`,

      'Matemática A': `CONTEÚDO E CONTEXTO — Matemática A (Secundário):
• Domínios típicos por ano: 10.º (funções, geometria analítica, trigonometria), 11.º (limites, derivadas, probabilidades), 12.º (integrais, distribuições)
• Exige demonstração de raciocínio formal: hipóteses, deduções, justificação de cada passo
• Distratores rigorosos: resultado de um erro conceptual específico (sinal, limite errado, confundir derivada com primitiva)
• Problemas multi-passo com dependência entre alíneas — erro numa alínea não deve inviabilizar as seguintes`,

      'Português': `CONTEÚDO E CONTEXTO — Português:
• Géneros textuais variados por ano: 5.º (narrativa, poesia, banda desenhada), 6.º (notícia, conto, texto de opinião), 7.º–9.º (crónica, texto argumentativo, texto dramático)
• Gramática em contexto: perguntas sobre texto real, não exercícios abstractos; tópicos DGE — classes de palavras, funções sintácticas, tipos/formas de frase, coesão, pontuação
• Expressão escrita orientada e real para o nível: 5.º–6.º (narrar, descrever, carta), 7.º–9.º (texto de opinião, crónica, resumo), 10.º–12.º (texto argumentativo, comentário)
• Proibido: excertos inventados, autores fictícios, temas de adultos inadequados para a faixa etária`,

      'Ciências Naturais': `CONTEÚDO E CONTEXTO — Ciências Naturais (DGE):
• Tópicos DGE por ano: 5.º (diversidade dos seres vivos, ecossistemas, rochas e minerais), 6.º (reprodução, corpo humano, saúde e doença, sustentabilidade), 7.º (célula, reprodução, evolução), 8.º (sistema nervoso, herança biológica, ecosistemas), 9.º (microbiologia, biotecnologia)
• Contextualiza com ecossistemas portugueses reais: Reserva Natural do Paul de Arzila, Ria Formosa, Douro vinhateiro, floresta mediterrânea
• Usa dados reais: espécies protegidas em Portugal, taxa de biodiversidade da Serra da Estrela, problemas ambientais actuais em Portugal
• Proibido: inventar espécies, inventar doenças, dados não verificáveis, nomes científicos errados`,

      'Físico-Química': `CONTEÚDO E CONTEXTO — Físico-Química (DGE):
• Tópicos DGE por ano: 7.º (substâncias e misturas, som e luz), 8.º (reacções químicas, electricidade), 9.º (classificação dos materiais, forças e movimentos), 10.º (energia, termodinâmica), 11.º (óptica, electromagnetismo), 12.º (física quântica, radioactividade)
• Usa sempre unidades SI correctas; problemas com dados explícitos (massa, velocidade, temperatura, etc.)
• Contextualiza com situações reais portuguesas: Barragem do Alqueva (energia hídrica), Parque Solar de Amareleja, laboratório escolar típico
• Proibido: fórmulas sem definir variáveis, problemas sem dados suficientes, valores físicos impossíveis (velocidades > c, massas negativas)`,

      'História': `CONTEÚDO E CONTEXTO — História (3.º ciclo e Secundário):
• As fontes incorporadas nas questões devem ser REAIS ou claramente identificadas como reconstituições didácticas — nunca inventadas sem aviso
• Privilegia fontes portuguesas ou sobre Portugal: Crónica de D. João I (Fernão Lopes), Carta de Pêro Vaz de Caminha, discursos de Salazar, cartazes do Estado Novo, dados demográficos históricos do INE
• Questões de desenvolvimento exigem causalidade multicausal, comparação histórica ou perspectiva historiográfica — não apenas listagem de factos
• Vocabulário histórico rigoroso: "expansão marítima" (não "descobertas"), "Revolução de Abril" (não "25 de Abril"), "Estado Novo" (não "ditadura" sem contexto)
• Proibido: anacronismos, atribuir intenções não documentadas a figuras históricas, confundir períodos históricos`,

      'Geografia': `CONTEÚDO E CONTEXTO — Geografia:
• Usa dados geográficos reais e actuais: dados climáticos do IPMA, população por NUT do INE, mapa de uso do solo de Portugal, índices de desenvolvimento humano da ONU
• Tópicos DGE por ano: 7.º (Terra: estudos e representações, meios naturais), 8.º (população e povoamento, actividades económicas), 9.º (contrastes de desenvolvimento, ambiente e sustentabilidade)
• Questões de desenvolvimento com relações espaciais explícitas: por que razão, de que forma, qual o impacto — não apenas localizar ou descrever
• Conecta sempre com problemáticas actuais: alterações climáticas, desertificação do interior, migrações internas, urbanização litoral
• Proibido: dados geográficos inventados, atribuir características erradas a regiões portuguesas`,

      'História e Geografia de Portugal': `CONTEÚDO E CONTEXTO — HGP (2.º ciclo, 10–12 anos):
• Tópicos DGE por ano: 5.º (Portugal físico — relevo, rios, clima, regiões; Portugal histórico da Pré-História à Reconquista), 6.º (Grandes Navegações, Império Português, século XX, Portugal na UE; actividades económicas e população)
• Linguagem simples e directa: frases curtas, vocabulário do 2.º ciclo, sem jargão historiográfico ou geográfico avançado
• Documentos usados nas questões: mapas simples de Portugal, imagens de monumentos ou artefactos, excertos curtos de crónicas medievais adaptados ou de manuais escolares
• Questões de desenvolvimento pedem DESCREVER ou EXPLICAR (não "analisar" ou "avaliar" no sentido de Bloom secundário)
• Proibido: análise de fontes ao nível secundário, conceitos fora do programa do 2.º ciclo, questões sobre eventos pós-2010 sem suporte curricular`,

      'Filosofia': `CONTEÚDO E CONTEXTO — Filosofia (Prova 714 IAVE, alinhamento estrito):
• Toda a questão menciona o conceito filosófico exacto e o autor do programa DGE (nunca inventados)
• 10.º ano: Argumentação e Lógica (falácias, validade, dedução/indução), Ética (Kant, Mill, Aristóteles), Filosofia Política (Rawls, Hobbes, Locke, Rousseau)
• 11.º ano: Teoria do Conhecimento (Platão, Descartes, Hume), Filosofia da Ciência (Popper, Kuhn), Estética (conceito de arte, critérios estéticos), Filosofia da Religião
• Questão de desenvolvimento: exige tese pessoal, argumentação filosófica com conceitos e autores do programa, contra-argumento e conclusão — nunca simples resumo
• Proibido: Nietzsche, Heidegger, Sartre, Nozick, fenomenologia (não estão nas AE); inventar teses ou obras de autores reais; usar PT-BR na terminologia filosófica`,

      'Inglês': `CONTEÚDO E CONTEXTO — Inglês (QECR):
• Nível por ano: 5.º–6.º (A1–A2: vocabulário do quotidiano, presente simples/contínuo, rotinas), 7.º–9.º (A2–B1: passado, futuro, comparativos, texto narrativo/descritivo curto), 10.º–12.º (B1–B2: condicional, voz passiva, texto argumentativo)
• Excertos de leitura adequados ao nível: diálogos, anúncios, e-mails, notícias curtas, blogs — nunca literatura adulta complexa fora do nível
• Produção escrita realista para a idade: e-mail informal, descrição pessoal, parágrafo de opinião simples
• Proibido: gíria não-padrão, expressões idiomáticas avançadas fora do nível, mistura de variantes (britânico/americano inconsistente)`,

      'Espanhol': `CONTEÚDO E CONTEXTO — Espanhol (MCER):
• Nível por ano: 7.º–9.º (A1–A2: presente, vocabulário básico, rotinas), 10.º–12.º (A2–B1: passado, futuro, texto descritivo/narrativo)
• Excertos de leitura curtos e adequados ao nível: diálogos, anúncios, textos informativos simples
• Produção escrita realista: e-mail informal, descrição, parágrafo curto de opinião
• Proibido: gíria regional não-padrão, mistura de variantes (peninsular/latino-americano inconsistente), vocabulário fora do nível declarado`,

      'Francês': `CONTEÚDO E CONTEXTO — Francês (CECR):
• Nível por ano: 7.º–9.º (A1–A2: presente, vocabulário básico, rotinas), 10.º–12.º (A2–B1: passado composto, futuro, texto descritivo/narrativo)
• Excertos de leitura curtos e adequados ao nível: diálogos, anúncios, textos informativos simples
• Produção escrita realista: e-mail informal, descrição, parágrafo curto de opinião
• Proibido: gíria não-padrão, vocabulário fora do nível declarado, estruturas gramaticais não introduzidas no ano`,

      'Educação Física': `CONTEÚDO E CONTEXTO — Educação Física (componente teórica):
• Tópicos DGE: regras e terminologia de jogos colectivos (futebol, basquetebol, voleibol, andebol), ginástica, atletismo, dança, raquetas, capacidades motoras (força, resistência, velocidade, flexibilidade, coordenação)
• Conteúdo de saúde: sistema cardiorrespiratório e exercício, aquecimento e retorno à calma, hábitos de vida saudável, prevenção de lesões
• Situações de jogo/treino devem ser plausíveis e tecnicamente correctas — nunca regras inventadas ou inconsistentes com a modalidade real
• Proibido: perguntas que exigam execução motora (este é um teste escrito teórico, não uma avaliação prática)`,

      'Educação Visual': `CONTEÚDO E CONTEXTO — Educação Visual (componente teórica):
• Tópicos DGE: elementos visuais (ponto, linha, forma, cor, textura, valor, espaço), princípios de composição, técnicas (desenho, pintura, escultura, fotografia), história da arte adequada ao ciclo
• Como não há imagem real disponível, descreve a obra/objecto em texto com detalhe suficiente para a questão fazer sentido sem ver a imagem
• Proibido: pedidos de desenho ou execução prática (este é um teste escrito teórico), inventar obras ou artistas`,

      'Educação Tecnológica': `CONTEÚDO E CONTEXTO — Educação Tecnológica (componente teórica):
• Tópicos DGE: materiais (madeira, metal, plástico, têxteis), ferramentas e processos de fabrico, mecanismos simples, segurança no trabalho, desenho técnico básico
• Situações-problema de concepção devem ser tecnicamente plausíveis — materiais e processos coerentes com o objecto descrito
• Proibido: pedidos de execução prática/manual (este é um teste escrito teórico), processos de fabrico tecnicamente incorrectos`,

      'TIC': `CONTEÚDO E CONTEXTO — TIC (4 domínios AE DGE, 3.º ciclo):
• Domínio 1 — Segurança, responsabilidade e respeito em ambientes digitais: cibersegurança, palavras-passe seguras, phishing/malware, protecção de dados pessoais, pegada digital, netiqueta
• Domínio 2 — Investigar e pesquisar: pesquisa eficaz, avaliação crítica de fontes online, distinção entre informação fiável e desinformação, licenciamento Creative Commons e direitos de autor
• Domínio 3 — Colaborar e comunicar: e-mail, videoconferência, mensageiros instantâneos, documentos colaborativos partilhados — sempre em uso seguro e responsável
• Domínio 4 — Criar e inovar: pensamento computacional, algoritmos, sequências lógicas, programação por blocos (Scratch ou equivalente), produção de conteúdo digital (texto, imagem, apresentação)
• Hardware/software: identificação de componentes elementares (CPU, RAM, armazenamento), sistemas operativos, tipos de software
• Proibido: pedidos de execução prática num computador real (este é um teste escrito), confundir conceitos de hardware/software, algoritmos com erros lógicos não identificados como tal`,
    }
    const subjectNote = subjectGuidelines[subject] ?? 'Cria questões rigorosas, contextualizadas e curricularmente alinhadas com as Aprendizagens Essenciais DGE.'

    // ── Restrições curriculares — biblioteca AE DGE ────────────────────────
    const curriculumConstraint = getCurriculumConstraint(subject, yearLevel)

    // ── Figuras matemáticas ─────────────────────────────────────────────────
    // Figuras são opcionais — apenas quando genuinamente úteis para a questão
    // Não forçar um mínimo para não condicionar a estrutura pedagógica
    const figureNote = isMath ? `
FIGURAS SVG — USAR APENAS QUANDO GENUINAMENTE ÚTIL:
Inclui uma figura SVG numa questão SE E SÓ SE a presença visual melhora significativamente a compreensão ou é necessária para resolver o problema. NÃO adiciones figuras para atingir um mínimo — a qualidade pedagógica é prioritária.
Analisa o tópico e aplica a seguinte lógica:

MAPEAMENTO TÓPICO → FIGURA (usa SEMPRE que o tópico for relevante):
• Triângulos, quadriláteros, polígonos, perímetro, área 2D → right_triangle / triangle / rectangle / square
• Círculo, circunferência, raio, diâmetro → circle
• Ângulos, amplitude → angle
• Frações, numerador, denominador, números racionais → fraction_bar
• Recta numérica, ordenar números, inteiros, decimais → number_line
• Gráficos, estatística, dados, frequência, percentagens → bar_chart ou pie_chart
• Cubo, cuboide, paralelepípedo → cuboid ou cube  (todos os anos)
• Prisma triangular → triangular_prism  (5.º ano: identificação; 7.º+: volume)
• Pirâmide → pyramid  (5.º ano: identificação; 9.º+: volume — NUNCA volume no 6.º)
• Cilindro → cylinder  (5.º ano: identificação; 6.º+: volume V=πr²h)
• Cone → cone  (APENAS 9.º ano — PROIBIDO no ${yearLevel}.º ano${yearLevel < 9 ? ' ✗' : ' ✓'})
• Esfera → sphere  (APENAS 9.º ano — PROIBIDO no ${yearLevel}.º ano${yearLevel < 9 ? ' ✗' : ' ✓'})

Para questões de cálculo puro sem componente visual → "figure": null

SINTAXE EXACTA dos tipos disponíveis (copia e adapta com valores reais para o ${yearLevel}.º ano):
  {"type":"right_triangle","leg1":3,"leg2":4,"leg1Label":"3 cm","leg2Label":"4 cm","hypLabel":"5 cm"}
  {"type":"triangle","base":6,"height":4,"baseLabel":"6 cm","heightLabel":"4 cm","sideLabel":"5 cm"}
  {"type":"rectangle","aspectRatio":1.5,"widthLabel":"6 cm","heightLabel":"4 cm"}
  {"type":"square","sideLabel":"5 cm"}
  {"type":"circle","showRadius":true,"radiusLabel":"5 cm"}
  {"type":"circle","showDiameter":true,"diameterLabel":"10 cm"}
  {"type":"angle","degrees":60,"label":"60°"}
  {"type":"number_line","min":0,"max":10,"step":1,"highlighted":[3,7]}
  {"type":"fraction_bar","numerator":3,"denominator":4,"label":"3/4"}
  {"type":"bar_chart","title":"Título","yLabel":"N.º alunos","bars":[{"label":"Jan","value":5},{"label":"Fev","value":8},{"label":"Mar","value":3}]}
  {"type":"pie_chart","title":"Título","slices":[{"label":"Categoria A","value":60},{"label":"Categoria B","value":40}]}

REGRA PEDAGÓGICA CRÍTICA — gráficos que não podem dar a resposta:
• Quando a questão pede UM valor específico (ex: "Qual a percentagem de Ciências?", "Quantos alunos em Fevereiro?"):
  → usa "hideValueFor": "NomeExacto" — mostra TODOS os outros valores de contexto, substitui só esse por "?"
  → o aluno raciocina com os dados disponíveis para calcular o valor em falta
  → Exemplo: pie_chart com Matemática(25%), Português(40%), Ciências(?) → aluno calcula 100−25−40=35°
• Quando a questão pede TODOS os valores (ex: "Constrói a tabela de frequências"):
  → usa "showValues": false — a escala/proporção é o suporte, os valores são todos pedidos
• Se os valores não são a resposta (ex: "Que tendência observas?"): omite ambas as opções (mostrar tudo)
  {"type":"cuboid","widthLabel":"8 cm","heightLabel":"5 cm","depthLabel":"3 cm"}
  {"type":"cube","sideLabel":"4 cm"}
  {"type":"triangular_prism","baseLabel":"6 cm","heightLabel":"4 cm","depthLabel":"10 cm"}
  {"type":"pyramid","baseLabel":"6 cm","heightLabel":"8 cm"}
  {"type":"cylinder","radiusLabel":"3 cm","heightLabel":"10 cm"}
  {"type":"cone","radiusLabel":"4 cm","heightLabel":"9 cm"}
  {"type":"sphere","radiusLabel":"5 cm"}

Para questões onde uma figura não acrescenta nada → "figure": null (não inventes contexto visual forçado).` : hasChartFigures ? `
FIGURAS — APENAS GRÁFICOS DE DADOS, USAR SÓ QUANDO GENUINAMENTE ÚTIL:
O sistema só sabe desenhar DOIS tipos de figura: "bar_chart" e "pie_chart". NENHUM outro tipo é suportado — nunca inventes "gráfico de linha", "circuito", "diagrama de forças", "esquema" ou qualquer outro: se a figura não for um destes dois tipos exactos, usa SEMPRE "figure": null e descreve os dados em texto no enunciado.

SINTAXE EXACTA (copia e adapta com valores reais):
  {"type":"bar_chart","title":"Título","yLabel":"Unidade","bars":[{"label":"A","value":5},{"label":"B","value":8},{"label":"C","value":3}]}
  {"type":"pie_chart","title":"Título","slices":[{"label":"Categoria A","value":60},{"label":"Categoria B","value":40}]}

REGRA PEDAGÓGICA CRÍTICA — gráficos que não podem dar a resposta directamente:
• Se a questão pede UM valor específico: usa "hideValueFor": "NomeExacto" — mostra todos os outros valores, substitui só esse por "?", o aluno calcula o que falta.
• Se a questão pede TODOS os valores (ex: "constrói a tabela"): usa "showValues": false.
• Se os valores não são a resposta (ex: "que tendência observas?"): omite ambas as opções.

Para questões sem componente gráfico, ou que precisem de circuito/diagrama/esquema que não sabemos desenhar → "figure": null sempre (descreve no campo "text" em vez disso).` : ''

    // ── Perfil disciplinar (estrutura + cotação) ────────────────────────────
    const hasMultipleTypes = questionTypes.length > 1
    const { structureNote, scoringRule } = getSubjectProfile(subject, hasMultipleTypes, yearLevel)

    // ── Diferenciação invisível A/B/C (modelo: artigo "Diferenciação Invisível") ──
    // Mantém a MESMA estrutura de grupos e cotação da disciplina (acima) — só ajusta
    // a exigência cognitiva, o tipo de números e o scaffolding. O título é forçado
    // a ser idêntico ao original depois da geração (ver validação estrutural).
    const differentiationNote = tool !== 'differentiate' ? '' : level === 'A' ? `
NÍVEL DE DIFERENCIAÇÃO — A (APOIO), invisível para o aluno:
• Reduz a exigência cognitiva: prioriza Bloom Recordar/Compreender/Aplicar — evita Analisar/Avaliar/Criar.
• Números e contextos mais simples: inteiros (nunca decimais/fracções salvo se o tema o exigir), dados explícitos e directos, sem passos escondidos.
• Scaffolding visível no próprio enunciado: passos sugeridos, dados parcialmente organizados (ex: parte de uma tabela já preenchida), instruções mais explícitas sobre o que fazer primeiro.
• Distratores de escolha múltipla menos subtis — erro claramente identificável, não erro conceptual sutil.
• PROIBIDO ABSOLUTO: qualquer menção a "nível", "apoio", "fácil" ou marcador de dificuldade no título, enunciado, instruções ou rodapé — o aluno nunca pode distinguir esta versão de outra.` : level === 'C' ? `
NÍVEL DE DIFERENCIAÇÃO — C (APROFUNDAMENTO), invisível para o aluno:
• Eleva a exigência cognitiva: prioriza Bloom Analisar/Avaliar/Criar.
• Números e contextos mais exigentes: decimais, fracções ou dados que exigem interpretação antes de aplicar — nunca dados triviais.
• Inclui pelo menos UMA questão de raciocínio que testa uma concepção errada comum do tema (formato: "[Nome] afirma que [...]. Concordas? Justifica com um exemplo concreto.") — distinta de um simples problema inverso.
• Scaffolding mínimo: o aluno decide a estratégia, sem passos sugeridos nem dados pré-organizados.
• PROIBIDO ABSOLUTO: qualquer menção a "nível", "aprofundamento", "difícil" ou marcador de dificuldade no título, enunciado, instruções ou rodapé — o aluno nunca pode distinguir esta versão de outra.` : level === 'MU' ? `
MEDIDA UNIVERSAL (MU) — DL 54/2018, Art.º 28.º — adaptação de FORMA, não de conteúdo:
• ÂNCORA OBRIGATÓRIA: cada questão deve continuar a avaliar EXACTAMENTE o(s) mesmo(s) descritor(es) de Aprendizagem Essencial listado(s) em CURRÍCULO OBRIGATÓRIO abaixo. Nunca substituas o descritor por outro mais simples.
• Linguagem do ENUNCIADO mais clara e directa (frases mais curtas, vocabulário mais simples) — o CONTEÚDO avaliado e a exigência cognitiva (nível de Bloom) mantêm-se inalterados.
• Estrutura visualmente mais segmentada: instruções passo-a-passo explícitas sobre o que fazer, sem reduzir o que é pedido.
• Cotação e número de questões IDÊNTICOS aos de uma ficha padrão da disciplina — a MU não justifica facilitar a avaliação, só a tornar mais acessível.
• PROIBIDO ABSOLUTO: baixar o nível de Bloom exigido pela AE, reduzir a cotação, ou qualquer menção a "medida", "MU", "adaptado" no título, enunciado, instruções ou rodapé.` : level === 'MS' ? `
MEDIDA SELECTIVA (MS) — DL 54/2018, Adaptação Curricular Não Significativa — adapta-se a APRESENTAÇÃO e o CAMINHO, nunca o DESTINO de aprendizagem:
• ÂNCORA OBRIGATÓRIA E INVIOLÁVEL: cada questão deve continuar a avaliar pelo menos um descritor de Aprendizagem Essencial listado em CURRÍCULO OBRIGATÓRIO abaixo, no nível de Bloom mínimo exigido por esse descritor. PROIBIDO testar apenas memorização/recordação quando a AE exige aplicação ou análise — isso anularia a validade da avaliação.
• Podes reestruturar UMA questão complexa em 2–3 sub-passos escalonados (mesma competência, andaimes intermédios visíveis) em vez de uma única pergunta aberta — cada sub-passo com a sua cotação parcial explícita.
• Podes simplificar MODERADAMENTE a complexidade numérica (ex: menos casas decimais, números mais redondos) SEM trivializar o procedimento ou raciocínio que está a ser avaliado — o aluno continua a ter de aplicar o mesmo processo cognitivo.
• markScheme com cotação mais granular: mais oportunidades de cotação parcial em cada passo intermédio, em vez de "tudo ou nada" na resposta final.
• PROIBIDO ABSOLUTO: descer abaixo do nível de Bloom mínimo da AE, eliminar o descritor central, ou qualquer menção a "medida", "MS", "adaptado", "selectiva" no título, enunciado, instruções ou rodapé.` : ''

    prompt = `És um professor especialista de ${subject} do ${yearLevel}.º ano em ${countryLabel}, com mais de 15 anos de experiência em avaliação formativa e sumativa. Conheces em profundidade as Aprendizagens Essenciais da DGE e os perfis dos alunos do ${yearLevel}.º ano.

TAREFA: Cria uma ficha de avaliação EXCELENTE sobre "${topic}".
Duração: ${testDuration} minutos | Dificuldade: ${diffLabel} | Total: ${numQuestions} questões | 100 pontos

${structureNote}
${figureNote}

${curriculumConstraint}DIRECTRIZES PEDAGÓGICAS OBRIGATÓRIAS:
1. BLOOM: Distribui por níveis cognitivos adaptados à disciplina — questões de Bloom 4–6 (análise/síntese/avaliação) têm sempre peso proporcionalmente maior.
2. CONTEXTO: Questões de desenvolvimento têm sempre contexto real e significativo para alunos de ${yearLevel}.º ano
3. DISTRATORES (escolha múltipla): Cada opção errada corresponde a um erro conceptual real e plausível — nunca opções obviamente absurdas
4. LINGUAGEM: Clara, precisa, Português de Portugal estrito. Usa "rectângulo", "fórmula", "efeito", "facto", "óptimo", "actividade" (nunca formas brasileiras)
5. CURRÍCULO: Alinhamento estrito com as AE da DGE — respeita SEMPRE a secção CURRÍCULO OBRIGATÓRIO acima
${scoringRule}
7. CRITÉRIOS DE CORRECÇÃO — markScheme OBRIGATÓRIO e ESPECÍFICO em CADA questão; pontos parciais cuja SOMA = "points" da questão. NUNCA omitir pontos — cada parcela tem o valor exacto em pt:
   • Escolha múltipla: "Resposta: [letra] (Xpt). A opção [Y] induz o erro de [...]; A opção [Z] confunde [...]. Resposta errada = 0pt."
   • Verdadeiro/Falso: "[Verdadeiro/Falso] — [razão científica/histórica/linguística concreta]. (Xpt). Resposta errada = 0pt."
   • Matemática/FQ (resposta curta ou longa): "dados (Xpt) + fórmula/método (Xpt) + cálculo sem erro (Xpt) + resposta com unidade correcta (Xpt)"
   • Português (resposta curta): "identificação (Xpt) + justificação com referência ao texto (Xpt) + correcção linguística (Xpt). ✓ Cotação semi-objectiva — verificar referência textual concreta."
   • Português (expressão escrita / long_answer): "Conteúdo e pertinência — adequação ao tema, profundidade e relevância das ideias (Xpt) + Organização e coesão — estrutura introdução/desenvolvimento/conclusão e conectores (Xpt) + Correcção linguística, ortográfica e de pontuação (Xpt). ⚑ Rubrica orientadora — cotação a validar pelo professor; avaliação holística da produção escrita."
   • CN (resposta curta): "identificação do fenómeno/conceito (Xpt) + explicação científica fundamentada (Xpt) + terminologia correcta (Xpt). ✓ Cotação semi-objectiva."
   • CN (situação-problema / long_answer): "Identificação do fenómeno ou variáveis (Xpt) + Explicação científica fundamentada com causa-efeito (Xpt) + Terminologia científica correcta (Xpt) + Conclusão ou proposta de solução (Xpt). ⚑ Proposta de cotação — verificar rigor científico e uso de terminologia das AE."
   • HGP/História/Geografia (resposta curta): "identificação de facto/conceito histórico-geográfico (Xpt) + contextualização (Xpt). ✓ Cotação semi-objectiva."
   • HGP/História/Geografia (desenvolvimento / long_answer): "Conteúdo histórico/geográfico com factos e exemplos concretos (Xpt) + Organização do discurso com introdução/desenvolvimento/conclusão (Xpt) + Vocabulário histórico/geográfico específico e adequado (Xpt). ⚑ Rubrica orientadora — cotação a ajustar pelo professor; discurso histórico ou geográfico com avaliação necessariamente holística."
   • Filosofia (EM/VF): "Resposta: [letra ou V/F] (Xpt). Distrator [Y] confunde [...] com [...] — erro conceptual típico. Resposta errada = 0pt. ✓ Cotação objectiva."
   • Filosofia (análise de texto / questão conceptual): "Identificação correcta do conceito/tese/autor (Xpt) + explicação com referência explícita ao pensamento do autor no texto ou no programa (Xpt) + terminologia filosófica adequada (Xpt). ⚑ Proposta de cotação — verificar rigor conceptual na resposta do aluno."
   • Filosofia (desenvolvimento / ensaio filosófico): "Tese/Problematização — posição clara sobre a questão filosófica (Xpt) + Argumentação — mínimo 2 argumentos com conceitos e autores do programa DGE (Xpt) + Adequação conceptual e teórica — terminologia e autores correctamente mobilizados (Xpt) + Comunicação — organização, coesão e clareza do discurso filosófico (Xpt). ⚑ Rubrica orientadora — cotação a ajustar pelo professor; questão de desenvolvimento com avaliação necessariamente holística."
   REGRA ABSOLUTA: A soma dos pontos parciais no markScheme = "points" da questão. Cada Xpt é um número inteiro concreto, nunca um intervalo.
8. CALCULADORA: Para cada questão, define allowCalculator:true APENAS se o objectivo é avaliar raciocínio/estratégia com cálculos complexos onde o cálculo não é o alvo (ex: problemas de optimização, geometria analítica, probabilidade composta). Define false para memorização, conceitos, ou quando o cálculo simples é parte essencial do que se avalia.
9. VERIFICAÇÃO ARITMÉTICA E LÓGICA (questões com números/cálculos/optimização): antes de finalizares, refaz o cálculo do zero e confirma que "correctAnswer" e markScheme estão aritmeticamente correctos — nunca assumas um valor sem o calcular explicitamente (ex: se pedes "o maior divisor de 96 menor que 96", calcula realmente os divisores antes de escrever a resposta). Se o enunciado pede um valor "óptimo"/"máximo"/"mínimo" sob uma restrição (ex: "dividir em grupos iguais com o máximo de alunos por grupo"), confirma que o enunciado inclui TODAS as restrições necessárias para uma resposta única e não-trivial — sem isso, a resposta trivial (ex: 1 único grupo) seria tecnicamente válida e a questão estaria mal proposta. Acrescenta a restrição em falta ao enunciado (ex: "...divididos em mais de 2 grupos...", "...sabendo que cada grupo deve ter entre 10 e 30 alunos..."). PROIBIDO ABSOLUTO: gerar uma questão de optimização/divisibilidade/contagem sem este cálculo de verificação prévio.

DISCIPLINA ESPECÍFICA: ${subjectNote}

VARIEDADE E RIQUEZA — REGRAS ABSOLUTAS:
• Cobre pelo menos ${Math.min(numQuestions, Math.ceil(numQuestions * 0.6))} sub-aspectos DISTINTOS de "${topic}" — nunca repitas o mesmo conceito, procedimento ou contexto em questões diferentes.
• Cada questão avalia algo diferente: um conceito, uma aplicação, um erro conceptual frequente, uma conexão com outro tópico, uma situação do mundo real distinta.
• Proibido: duas questões com o mesmo tipo de cálculo/raciocínio aplicado a números diferentes (isso não é avaliação — é repetição).
• A variedade de contextos (situações do mundo real) é tão importante quanto a variedade de conceitos.
${avoidTexts?.length ? `\nESTE TESTE JÁ TEM AS SEGUINTES QUESTÕES (geradas numa fase anterior) — NÃO repitas o conceito, contexto, cálculo ou formulação de nenhuma delas:\n${avoidTexts.slice(0, 20).map((t, i) => `${i + 1}. ${t.slice(0, 140)}`).join('\n')}` : ''}
${differentiationNote}

Responde APENAS com este JSON válido (sem texto, sem markdown, sem \`\`\`):
{
  "title": "Ficha de Avaliação de ${subject} — ${topic}",
  "subject": "${subject}",
  "yearLevel": ${yearLevel},
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "totalPoints": 100,
  "duration": ${testDuration},
  "instructions": "Lê atentamente cada questão antes de responder. Apresenta todos os cálculos/justificações. Não é permitido o uso de corretor — risca e reescreve com clareza.",
  "groups": [
    {
      "label": "Grupo I",
      "description": "Escolha múltipla — selecciona a única opção correcta. (20 pontos)",
      "totalPoints": 20,
      "questions": [
        {
          "index": 1,
          "type": "multiple_choice",
          "bloomLevel": "Compreender",
          "text": "Enunciado da pergunta com contexto real",
          "figure": null,
          "options": ["A) opção correcta", "B) distrator plausível 1", "C) distrator plausível 2", "D) distrator plausível 3"],
          "correctAnswer": "A",
          "points": 4,
          "allowCalculator": false,
          "markScheme": "Resposta: A. A opção B induz o erro de [...]. A opção C confunde [...]. A opção D [...]. Critério: resposta correcta e completa (4 pontos)."
        }
      ]
    },
    {
      "label": "Grupo II",
      "description": "Resposta curta — responde de forma precisa e justificada. (30 pontos)",
      "totalPoints": 30,
      "questions": [
        {
          "index": 6,
          "type": "short_answer",
          "bloomLevel": "Aplicar",
          "text": "Enunciado com contexto real exigindo aplicação de conhecimentos",
          "figure": null,
          "correctAnswer": "Resposta completa",
          "points": 10,
          "allowCalculator": false,
          "markScheme": "3pt — identificação do conceito; 4pt — desenvolvimento correcto; 3pt — resposta completa e precisa."
        }
      ]
    },
    {
      "label": "Grupo III",
      "description": "Resolução de problemas — apresenta todos os cálculos e justificações. (50 pontos)",
      "totalPoints": 50,
      "questions": [
        {
          "index": 9,
          "type": "long_answer",
          "bloomLevel": "Analisar",
          "text": "Enunciado com contexto real exigindo análise e resolução multi-passo",
          "figure": null,
          "correctAnswer": "Resposta completa com unidades e conclusão",
          "points": 20,
          "allowCalculator": true,
          "markScheme": "4pt — identificação correcta dos dados; 6pt — método/equação correcta; 6pt — cálculo sem erro; 4pt — resposta com unidade e conclusão."
        }
      ]
    }
  ]
}`
  } else if (tool === 'lesson_plan') {
    const { subject, yearLevel, topic, duration, country, methodologies, preferences } = inputs as {
      subject: string; yearLevel: number; topic: string; duration: number; country: string
      methodologies?: string[]; preferences?: string
    }
    const countryLabel = country === 'PT' ? 'Portugal (Aprendizagens Essenciais DGE)' : country
    const curriculumConstraint = getCurriculumConstraint(subject, yearLevel)

    const methodologyNote = methodologies?.length
      ? `\nMETODOLOGIAS ESCOLHIDAS PELO PROFESSOR: ${methodologies.join(', ')}. Estrutura as fases da aula de forma coerente com estas metodologias — não as menciones apenas de nome, aplica-as de facto na sequência de actividades.`
      : '\nNenhuma metodologia específica foi pedida — escolhe a mais adequada ao tema e justifica implicitamente através da estrutura das fases.'

    const preferencesNote = preferences?.trim()
      ? `\nPREFERÊNCIAS DO PROFESSOR (usa APENAS o que for genuinamente relevante para este tema e ano — nunca forces uma ferramenta ou formato que não encaixe pedagogicamente): "${preferences.trim()}"`
      : ''

    prompt = `És um professor especialista de ${subject} do ${yearLevel}.º ano em ${countryLabel}, com mais de 15 anos de experiência em planificação didáctica. Conheces em profundidade as Aprendizagens Essenciais da DGE e os modelos pedagógicos consagrados (Madeline Hunter, Backward Design, Inquiry-Based Learning, Project-Based Learning, Flipped Classroom, Cooperative Learning, Método Socrático, Aprendizagem Experiencial, Differentiated Instruction, Cognitive Apprenticeship, Modelo 5E).

TAREFA: Cria uma planificação de aula EXCELENTE, cativante e pedagogicamente brilhante sobre "${topic}", com duração de ${duration} minutos.
${curriculumConstraint}${methodologyNote}${preferencesNote}

ESTRUTURA OBRIGATÓRIA DO GUIÃO:
• Cada fase tem duração própria que soma exactamente ${duration} minutos no total.
• "teacherScript": falas concretas do professor, como se fossem ditas em voz alta — não um resumo abstracto da actividade.
• "guidingQuestions": 1–3 perguntas orientadoras reais que o professor faz aos alunos nesta fase.
• "expectedAnswers": respostas plausíveis que os alunos dariam — ajuda o professor a antecipar a aula.
• "studentActivity": o que os alunos fazem concretamente (não "participam", mas o quê e como).
• "transition": frase de transição para a fase seguinte.

FERRAMENTAS E RECURSOS EXTERNOS — REGRA DE HONESTIDADE ABSOLUTA:
Se o professor pediu ou se for genuinamente útil incluir uma ferramenta externa (Kahoot, Wordwall, Khan Academy, Suno, Bing Image Creator, Google Forms, Base44, etc.), aplica SEMPRE uma destas três formas, nunca inventes um link, vídeo ou recurso que possa não existir:
1. CONTEÚDO PRONTO A COLAR — quando a ferramenta aceita texto simples (ex: Kahoot/Wordwall: gera as perguntas+opções ou os pares de associação completos, prontos a copiar).
2. PROMPT OU TERMO DE PESQUISA — quando a ferramenta gera conteúdo a partir de um pedido (ex: Suno: a letra da canção; Bing Image Creator: o prompt de imagem; Khan Academy: o termo exacto a pesquisar).
3. CONCEITO/ESTRUTURA — quando é uma ideia mais ampla (ex: Base44: descreve o conceito e os ecrãs principais de uma app simples, nunca finjas que a criaste).
PROIBIDO ABSOLUTO: qualquer URL, link, ou nome de vídeo/jogo específico que não tenhas a certeza de que existe.

MAPA MENTAL — apenas se fizer sentido pedagógico (pedido explícito do professor, ou o tema tem estrutura hierárquica clara e beneficia de síntese visual no fecho da aula). Caso contrário, usa "mindMap": null. Quando incluído: 3–6 ramos principais, cada um com até 4 sub-ramos curtos (3–5 palavras cada).

LINGUAGEM: Português de Portugal estrito — nunca formas brasileiras.

Responde APENAS com este JSON válido (sem texto, sem markdown):
{
  "title": "Planificação — ${topic}",
  "subject": "${subject}",
  "yearLevel": ${yearLevel},
  "duration": ${duration},
  "methodology": "Nome da(s) metodologia(s) aplicada(s)",
  "objectives": ["objectivo curricular 1", "objectivo curricular 2"],
  "materials": ["material 1", "material 2"],
  "phases": [
    {
      "name": "Introdução",
      "duration": 10,
      "objective": "O que esta fase visa atingir",
      "teacherScript": "Bom dia, turma. Hoje vamos explorar...",
      "guidingQuestions": ["Pergunta orientadora 1"],
      "expectedAnswers": ["Resposta plausível do aluno"],
      "studentActivity": "O que os alunos fazem concretamente",
      "transition": "Frase de transição para a fase seguinte",
      "externalTool": null
    }
  ],
  "differentiation": "Notas concretas de diferenciação pedagógica para alunos com ritmos distintos",
  "formativeAssessment": "Como a aprendizagem é verificada ao longo da aula (não só no fim)",
  "homework": "Trabalho de casa, se aplicável, ou null",
  "mindMap": null
}

Se incluíres uma ferramenta externa numa fase, preenche "externalTool" dessa fase assim:
{"tool": "Kahoot", "mode": "conteudo_pronto", "content": "Q1: ...\\nA) ...\\nB) ...\\nResposta: A"}
("mode" é "conteudo_pronto", "prompt_pesquisa" ou "conceito" — conforme a regra de honestidade acima.)

Se incluíres mapa mental, preenche assim:
{"type": "mindmap", "topic": "${topic}", "branches": [{"label": "Ramo 1", "children": ["sub-ramo 1", "sub-ramo 2"]}]}`
  } else if (tool === 'rubric') {
    const { subject, yearLevel, taskType, numCriteria, numLevels } = inputs
    prompt = `Cria uma rubrica de avaliação para ${taskType} de ${subject} do ${yearLevel}.º ano com ${numCriteria} critérios e ${numLevels} níveis de desempenho.

Responde APENAS com este JSON:
{
  "title": "Rubrica — ${taskType}",
  "subject": "${subject}",
  "yearLevel": ${yearLevel},
  "criteria": [
    {
      "name": "Nome do critério",
      "weight": 25,
      "levels": [
        {"level": "Excelente", "score": 4, "descriptor": "Descrição detalhada"},
        {"level": "Bom", "score": 3, "descriptor": "Descrição detalhada"},
        {"level": "Suficiente", "score": 2, "descriptor": "Descrição detalhada"},
        {"level": "Insuficiente", "score": 1, "descriptor": "Descrição detalhada"}
      ]
    }
  ]
}`
  } else {
    return NextResponse.json({ error: 'Ferramenta desconhecida' }, { status: 400 })
  }

  try {
    const genStartMs = Date.now() // Para calcular tempo disponível ao crítico adversarial

    // ── Question Bank: verificar se há questões reutilizáveis ──────────────
    let bankHits: Awaited<ReturnType<typeof findQuestions>> = []
    let numFromAI = isTestLike ? (inputs as Record<string, unknown>).numQuestions as number : 0

    if (isTestLike) {
      const { subject, yearLevel, topic, questionTypes, difficulty, numQuestions } = inputs as {
        subject: string; yearLevel: number; topic: string
        questionTypes: string[]; difficulty: string; numQuestions: number
      }

      // Em modo fallback, tentar buscar o máximo possível do banco (até 3× o pedido)
      // para minimizar a quantidade gerada por modelos de menor qualidade.
      // O valor final ajusta-se depois de saber se é fallback ou não.
      bankHits = await findQuestions({
        subject, yearLevel, topic,
        types: questionTypes,
        difficulty,
        numWanted: numQuestions * 3, // pool alargado — só usamos numQuestions
        userId: user.id,
      })
      // Limitar ao pedido por agora; re-avalia após saber se é fallback
      const bankAvailable = bankHits
      bankHits = bankAvailable.slice(0, numQuestions)

      numFromAI = numQuestions - bankHits.length

      if (bankHits.length > 0) {
        console.log(`[BANK] ${bankHits.length} do banco | ${numFromAI} por gerar`)
      }

      // Se o banco tem tudo → devolver directamente sem chamar a IA
      if (numFromAI <= 0) {
        const { subject: s, yearLevel: y, topic: t, difficulty: d,
                duration, numQuestions: nq } = inputs as Record<string, unknown>
        const bankQuestions = bankHits.map((bq, i) => bankToExamQuestion(bq, i + 1))
        const bankIds = bankHits.map(bq => bq.id)
        await markUsed(bankIds, user.id)

        const bankContent = {
          title: `Ficha de Avaliação de ${s} — ${t}`,
          subject: s, yearLevel: y, topic: t, difficulty: d,
          totalPoints: bankQuestions.reduce((sum, q) => sum + (q.points as number), 0),
          duration: duration ?? 50,
          instructions: 'Lê atentamente cada questão antes de responder. Apresenta todos os cálculos/justificações.',
          groups: [{ label: 'Grupo I', description: 'Questões', totalPoints: 100, questions: bankQuestions }],
          _source: 'bank',
        }
        console.log(`[BANK] ✓ 100% banco (${nq} questões, 0 chamadas IA)`)
        return NextResponse.json({ content: bankContent })
      }

      // Ajustar o prompt para gerar apenas as questões em falta
      if (bankHits.length > 0) {
        prompt = prompt.replace(
          /Total: \d+ questões/,
          `Total: ${numFromAI} questões (complementar banco existente)`
        )
      }
    }

    const genResult = await generateWithFallback(prompt)
    const { text, isFallback, modelUsed } = genResult

    // Em modo fallback: usar o máximo possível do banco para cobrir as questões
    // Isso reduz a quantidade de questões geradas pelo modelo inferior
    if (isFallback && isTestLike) {
      const { subject, yearLevel, topic, questionTypes, difficulty, numQuestions } = inputs as {
        subject: string; yearLevel: number; topic: string
        questionTypes: string[]; difficulty: string; numQuestions: number
      }
      // Pedir o máximo disponível que ainda não foi usado por este utilizador
      const extraBank = await findQuestions({
        subject, yearLevel, topic,
        types: questionTypes,
        difficulty,
        numWanted: numQuestions,
        userId: user.id,
      })
      if (extraBank.length > bankHits.length) {
        console.log(`[BANK] Fallback: banco expandido de ${bankHits.length} → ${extraBank.length} questões`)
        bankHits = extraBank
        numFromAI = numQuestions - bankHits.length
      }
    }

    console.log(`[PROFAI] Modelo: ${modelUsed} | fallback: ${isFallback}`)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[PROFAI] Sem JSON na resposta. Texto recebido (500 chars):', text.slice(0, 500))
      throw new Error('Resposta inválida da IA')
    }
    let content: Record<string, unknown>
    try {
      content = JSON.parse(jsonMatch[0])
    } catch {
      // Tentar reparar JSON truncado: fechar colchetes/chavetas em falta
      const repaired = repairTruncatedJson(jsonMatch[0])
      try {
        content = JSON.parse(repaired)
        console.warn('[PROFAI] JSON reparado com sucesso (estava truncado)')
      } catch {
        console.error('[PROFAI] JSON irreparável (primeiros 500 chars):', jsonMatch[0].slice(0, 500))
        throw new Error('JSON malformado — a IA devolveu uma resposta incompleta. Tenta novamente.')
      }
    }

    // ── Validação e reparação estrutural (zero chamadas IA extra) ────────────
    if (isTestLike) {
      type QRaw = {
        index: number; figure: unknown; points?: number; type?: string
        text?: string; correctAnswer?: unknown; markScheme?: string; options?: unknown[]
        _bankId?: string; bloomLevel?: string
      }
      type GRaw = { label: string; questions: QRaw[]; totalPoints?: number }
      const groups = (content.groups ?? []) as GRaw[]

      // 0. Fundir questões type='text' (âncoras indevidas, proibidas no prompt mas
      //    ocasionalmente geradas) na questão seguinte — nunca devem existir como questão própria,
      //    pois ficam com 0 pontos e geram corrigenda sem cotação correspondente.
      for (const g of groups) {
        const merged: QRaw[] = []
        let pendingPrefix = ''
        for (const q of g.questions ?? []) {
          if (q.type === 'text') {
            pendingPrefix += (pendingPrefix ? '\n\n' : '') + String(q.text ?? '').trim()
            continue
          }
          if (pendingPrefix) {
            q.text = `${pendingPrefix}\n\n${String(q.text ?? '').trim()}`
            pendingPrefix = ''
          }
          merged.push(q)
        }
        if (pendingPrefix && merged.length > 0) {
          const last = merged[merged.length - 1]
          last.text = `${String(last.text ?? '').trim()}\n\n${pendingPrefix}`
        } else if (pendingPrefix) {
          console.warn('[PROFAI] Questão type=\'text\' órfã (sem questão seguinte) — descartada')
        }
        g.questions = merged
      }

      // 1. Remover questões com texto duplicado
      const seenTexts = new Set<string>()
      let removed = 0
      for (const g of groups) {
        const before = g.questions.length
        g.questions = (g.questions ?? []).filter(q => {
          const key = String(q.text ?? '').trim().toLowerCase().slice(0, 80)
          if (!key || seenTexts.has(key)) return false
          seenTexts.add(key)
          return true
        })
        removed += before - g.questions.length
      }
      if (removed > 0) console.warn(`[PROFAI] ${removed} questão(ões) duplicada(s) removida(s)`)

      // 2. Normalizar correctAnswer de MCQ → apenas a letra (A/B/C/D)
      for (const g of groups) {
        for (const q of g.questions) {
          if (q.type === 'multiple_choice' && q.correctAnswer) {
            q.correctAnswer = String(q.correctAnswer).trim().charAt(0).toUpperCase()
          }
          // 3. Garantir markScheme em TODOS os tipos de questão
          const markSchemeMissing = !q.markScheme || String(q.markScheme).trim().length < 25
          if (markSchemeMissing) {
            const pts = Number(q.points) || 0
            const subj = String((inputs as Record<string, unknown>)?.subject ?? '')
            q.markScheme = autoMarkScheme(q.type ?? 'short_answer', pts, subj)
          }
          // 3b. Normalizar bloomLevel para taxonomia PT-PT canónica (validator.py port)
          const rawBloom = q.bloomLevel as string | undefined
          const normalised = normalizeBloom(rawBloom)
          if (normalised) q.bloomLevel = normalised
          // 3c. Corrector determinístico PT-BR → PT-PT (rede editorial; desligável via env).
          // Modelos Tier 2 deslizam para PT-BR em texto longo; o prompt sozinho não chega.
          if (PTPT_CORRECTOR_ON) {
            if (typeof q.text === 'string') q.text = toPtPt(q.text)
            if (typeof q.correctAnswer === 'string') q.correctAnswer = toPtPt(q.correctAnswer)
            if (typeof q.markScheme === 'string') q.markScheme = toPtPt(q.markScheme)
            if (Array.isArray(q.options)) q.options = q.options.map(o => typeof o === 'string' ? toPtPt(o) : o)
          }
        }
      }

      // 4. Re-indexar sequencialmente
      let idx = 1
      for (const g of groups) for (const q of g.questions) q.index = idx++

      // 5. Normalizar totalPoints (soma deve ser 100)
      const allQs = groups.flatMap(g => g.questions)
      const currentTotal = allQs.reduce((s, q) => s + (Number(q.points) || 0), 0)
      if (currentTotal > 0 && currentTotal !== 100) {
        const diff = 100 - currentTotal
        const heaviest = allQs.reduce((max, q) =>
          (Number(q.points) || 0) > (Number(max.points) || 0) ? q : max, allQs[0])
        if (heaviest) heaviest.points = (Number(heaviest.points) || 0) + diff
        console.log(`[PROFAI] Pontos normalizados: ${currentTotal} → 100`)
      }
      for (const g of groups) {
        g.totalPoints = g.questions.reduce((s, q) => s + (Number(q.points) || 0), 0)
      }
      content.totalPoints = 100

      // 5b. Corrigir markScheme cuja soma de critérios não bate com "points" —
      // a IA por vezes erra a soma, e o passo 5 acima pode ter alterado "points"
      // depois do markScheme já estar escrito. Sem isto a correcção automática falha.
      for (const g of groups) {
        for (const q of g.questions) {
          q.markScheme = fixMarkSchemeSum(q.markScheme, Number(q.points) || 0)
        }
      }

      // ── Guardar questões IA no banco + combinar com banco existente ────────
      const allQsFinal = groups.flatMap(g => g.questions)
      const withFig = allQsFinal.filter(q => q.figure !== null && q.figure !== undefined)
      console.log(`[PROFAI] ✓ ${allQsFinal.length} questões IA | ${withFig.length} figuras | 100pts`)

      // Guardar questões novas no banco (await para injectar _bankId na resposta)
      const { subject, yearLevel, topic, difficulty } = (inputs ?? {}) as Record<string, unknown>
      const bankIds = bankHits.map(bq => bq.id)
      if (subject && topic) {
        try {
          const saveable = allQsFinal.filter(
            q => q.text && String(q.text ?? '').trim().length > 10
          )
          const savedIds = await saveQuestions(saveable as Array<Record<string, unknown>>, {
            subject: String(subject), yearLevel: Number(yearLevel),
            topic: String(topic), difficulty: String(difficulty ?? 'medium'),
          }, user.id)
          saveable.forEach((q, i) => { if (savedIds[i]) q._bankId = savedIds[i] })
          markUsed([...savedIds, ...bankIds], user.id).catch(
            err => console.warn('[BANK] markUsed falhou:', err)
          )
        } catch (err) {
          console.warn('[BANK] save falhou:', err)
        }
      }

      // Injectar questões do banco no início (já validadas, alta qualidade)
      if (bankHits.length > 0) {
        const bankQs = bankHits.map((bq, i) => bankToExamQuestion(bq, i + 1))
        // Defesa para questões gravadas no banco antes desta correcção existir.
        for (const q of bankQs) {
          q.markScheme = fixMarkSchemeSum(q.markScheme as string | undefined, Number(q.points) || 0)
        }
        let nextIdx = bankQs.length + 1
        for (const g of groups) for (const q of g.questions) q.index = nextIdx++
        content.groups = [
          { label: 'Banco', description: '', totalPoints: bankQs.reduce((s, q) => s + (q.points as number), 0), questions: bankQs },
          ...groups,
        ]
        const totalAll = [...bankQs, ...allQsFinal].reduce((s, q) => s + (Number(q.points) || 0), 0)
        content.totalPoints = totalAll
        console.log(`[BANK] Teste híbrido: ${bankQs.length} banco + ${allQsFinal.length} IA`)
      }

      // ── Distribuição Bloom (validator.py port) ─────────────────────────────
      // Zero chamadas API — análise determinística da cobertura cognitiva
      const bloomCounts = Object.fromEntries(BLOOM_LEVELS.map(l => [l, 0])) as Record<string, number>
      for (const g of (content.groups as typeof groups)) {
        for (const q of g.questions) {
          const bl = String(q.bloomLevel ?? '')
          if (bl in bloomCounts) bloomCounts[bl]++
        }
      }
      const totalQs = Object.values(bloomCounts).reduce((s, v) => s + v, 0)
      const higherOrder = (bloomCounts['Analisar'] ?? 0) + (bloomCounts['Avaliar'] ?? 0) + (bloomCounts['Criar'] ?? 0)
      const higherPct = totalQs > 0 ? Math.round(higherOrder / totalQs * 100) : 0
      content._bloomDistribution = bloomCounts
      if (higherPct < 25 && totalQs >= 5) {
        const msg = `Bloom: ${higherPct}% de ordem superior (Analisar+Avaliar+Criar). Ideal ≥ 30% para o ${yearLevel}.º ano.`
        console.warn(`[PROFAI] ${msg}`)
        content._bloomWarning = msg
      }
      console.log(`[PROFAI] Bloom: ${JSON.stringify(bloomCounts)} | ${higherPct}% ordem superior`)

      // ── Crítico adversarial leve (inspirado em prompts.py::prompt_critico) ─
      // Corre apenas em Tier 1 (Gemini/Groq como gerador), com modelo DIFERENTE
      // Não bloqueia: se falhar ou demorar, a ficha é entregue sem crítica
      if (!isFallback && process.env.GROQ_API_KEY && genStartMs) {
        const elapsed = Date.now() - genStartMs
        const remainingForCritic = 50_000 - elapsed
        if (remainingForCritic > 6_000) {
          const allQsForCritic = (content.groups as typeof groups).flatMap(g => g.questions)
          const criticPrompt = buildCriticPrompt(
            String(subject ?? ''), Number(yearLevel ?? 0),
            String(topic ?? ''), allQsForCritic as Array<Record<string, unknown>>
          )
          // Usa llama-3.3-70b como crítico — modelo DIFERENTE de Gemini (adversarial)
          const rawCritic = await callOpenAICompat(
            'https://api.groq.com/openai/v1/chat/completions',
            process.env.GROQ_API_KEY, 'llama-3.3-70b-versatile',
            criticPrompt, Math.min(5_000, remainingForCritic - 1_000),
            'Crítico:Groq:llama', {}, null
          )
          if (rawCritic) {
            try {
              const jsonMatch = rawCritic.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                const critica = JSON.parse(jsonMatch[0]) as {
                  aprovado: boolean; score: number
                  problemas: Array<{ tipo: string; gravidade: string; descricao: string; questao: number }>
                }
                content._criticScore = critica.score
                if (!critica.aprovado && critica.problemas?.length > 0) {
                  const high = critica.problemas.filter(p => p.gravidade === 'alta')
                  content._criticWarnings = critica.problemas
                  console.warn(`[CRÍTICO] Score: ${critica.score}/10 | ${high.length} problema(s) alta gravidade`)
                } else {
                  content._criticApproved = true
                  console.log(`[CRÍTICO] ✓ Aprovado (score ${critica.score}/10)`)
                }

                // ── Substitui o quality_score por defeito (0.75) pela avaliação real ──
                // Baseline global do crítico, penalizado por questão com problemas
                // identificados especificamente nela (gravidade alta/média/baixa).
                const baseline = Math.max(0.3, Math.min(0.95, critica.score / 10))
                const scoreUpdates = allQsForCritic
                  .filter(q => q._bankId)
                  .map(q => {
                    const probs = (critica.problemas ?? []).filter(p => p.questao === q.index)
                    const penalty = probs.reduce((s, p) =>
                      s + (p.gravidade === 'alta' ? 0.15 : p.gravidade === 'media' ? 0.05 : 0), 0)
                    return { id: q._bankId!, qualityScore: Math.max(0.2, Math.min(0.95, baseline - penalty)) }
                  })
                updateQualityScores(scoreUpdates).catch(
                  err => console.warn('[BANK] updateQualityScores falhou:', err)
                )
              }
            } catch { /* parse falhou — ignora silenciosamente */ }
          }
        }
      }

      // Aviso de qualidade: activo quando foi usado modelo de fallback E há questões IA
      if (isFallback && groups.flatMap(g => g.questions).length > 0) {
        content._qualityWarning = true
        content._modelUsed = modelUsed
      }

      // ── Diferenciação A/B/C/MU/MS: força o título IDÊNTICO ao teste original ──
      // Diferenciação invisível — o aluno nunca pode distinguir as versões pelo
      // cabeçalho. O nível é decidido pelo professor, nunca exposto no documento.
      if (tool === 'differentiate') {
        const { title: forcedTitle, level: diffLevel } = inputs as { title?: string; level?: 'A' | 'C' | 'MU' | 'MS' }
        if (forcedTitle) content.title = forcedTitle

        // MU/MS marca-se automaticamente — é a medida de suporte, não o nível A/B/C
        if (diffLevel === 'MU' || diffLevel === 'MS') content._measureType = diffLevel

        // Reforço do aviso de qualidade: nestas gerações (NEE/medidas de suporte) o
        // modelo usado importa mais — se foi preciso recorrer ao fallback, o professor
        // tem de saber antes de usar isto num plano educativo real.
        if (content._qualityWarning) {
          content._qualityWarningContext = (diffLevel === 'MU' || diffLevel === 'MS')
            ? 'medida_suporte'
            : (diffLevel === 'A' || diffLevel === 'C') ? 'diferenciacao' : undefined
        }
      }
    }

    return NextResponse.json({ content })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Erro na geração:', msg)
    return NextResponse.json({ error: `Erro: ${msg}` }, { status: 500 })
  }
}
