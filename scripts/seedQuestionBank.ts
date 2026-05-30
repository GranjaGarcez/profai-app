/**
 * PROF.IA — Question Bank Seeder
 *
 * Pré-popula o banco de questões com questões de alta qualidade para os
 * tópicos mais comuns do 2.º ciclo (5.º e 6.º ano), usando Gemini 2.5 Flash.
 *
 * Uso:
 *   npx tsx scripts/seedQuestionBank.ts                          → plano completo
 *   npx tsx scripts/seedQuestionBank.ts --subject Matemática --year 5
 *   npx tsx scripts/seedQuestionBank.ts --retry-failed           → retentar tópicos falhados
 *   npx tsx scripts/seedQuestionBank.ts --dry-run
 *
 * Modelo: Gemini 2.5 Flash (Google AI directo → OpenRouter fallback)
 * Política: qualidade não negociável — sem degradação para modelos inferiores.
 *
 * Requisitos:
 *   .env.local com GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   Opcional: OPENROUTER_API_KEY (quota adicional do mesmo modelo)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

// ── Carregar .env.local ────────────────────────────────────────────────────────
function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx < 1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      if (key && !process.env[key]) process.env[key] = val
    }
    console.log('✓ .env.local carregado')
  } catch {
    console.log('⚠  .env.local não encontrado — a usar variáveis de ambiente do sistema')
  }
}
loadEnvLocal()

// ── Args ───────────────────────────────────────────────────────────────────────
const isDryRun      = process.argv.includes('--dry-run')
const isRetryFailed = process.argv.includes('--retry-failed')
const subjectIdx    = process.argv.indexOf('--subject')
const yearIdx       = process.argv.indexOf('--year')
const filterSubject = subjectIdx !== -1 ? process.argv[subjectIdx + 1] : null
const filterYear    = yearIdx    !== -1 ? parseInt(process.argv[yearIdx + 1]) : null

// ── Configuração do Plano de Semente ──────────────────────────────────────────
interface TopicConfig {
  name: string
  types: string[]
  count: number
  difficulty?: string // 'mixed' (default) | 'easy' | 'medium' | 'hard'
  subtopics?: string[] // subtemas obrigatórios — garante cobertura máxima e variedade
}

interface SubjectConfig {
  subject: string
  yearLevel: number
  topics: TopicConfig[]
}

const SEED_PLAN: SubjectConfig[] = [
  // ── Matemática 5.º ano ────────────────────────────────────────────────────
  {
    subject: 'Matemática',
    yearLevel: 5,
    topics: [
      {
        name: 'Frações — representação, equivalência e comparação',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
      },
      {
        name: 'Números decimais — leitura, escrita e ordenação',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Operações com números decimais — adição, subtracção, multiplicação e divisão',
        types: ['short_answer', 'problem'],
        count: 8,
      },
      {
        name: 'Geometria — classificação de ângulos e triângulos',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Medida — perímetro e área de figuras planas',
        types: ['short_answer', 'problem'],
        count: 8,
      },
      {
        name: 'Proporcionalidade directa — razão e proporção simples',
        types: ['short_answer', 'problem'],
        count: 6,
      },
      {
        name: 'Estatística — tabelas de frequência, gráficos de barras e pictogramas',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Números naturais — divisibilidade, múltiplos e divisores',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
    ],
  },

  // ── Matemática 6.º ano ────────────────────────────────────────────────────
  {
    subject: 'Matemática',
    yearLevel: 6,
    topics: [
      {
        name: 'Proporcionalidade directa e inversa — situações do quotidiano',
        types: ['short_answer', 'problem'],
        count: 10,
      },
      {
        name: 'Percentagens — cálculo, aumento e diminuição percentual',
        types: ['multiple_choice', 'short_answer', 'problem'],
        count: 10,
      },
      {
        name: 'Mínimo múltiplo comum (m.m.c.) e máximo divisor comum (M.D.C.)',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Números inteiros — ordenação, adição e subtracção',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Circunferência e círculo — raio, diâmetro, comprimento e área',
        types: ['short_answer', 'problem'],
        count: 8,
      },
      {
        name: 'Volumes — cubóide e cubo',
        types: ['short_answer', 'problem'],
        count: 6,
      },
      {
        name: 'Estatística — média aritmética, moda e mediana',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Probabilidades — experiências aleatórias e escala de probabilidade',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
    ],
  },

  // ── Ciências Naturais 5.º ano ─────────────────────────────────────────────
  {
    subject: 'Ciências Naturais',
    yearLevel: 5,
    topics: [
      {
        name: 'A Terra no Universo — sistema solar, planetas e movimentos da Terra',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
      },
      {
        name: 'Rochas e minerais — propriedades, tipos e ciclo das rochas',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Diversidade dos seres vivos — classificação e características dos reinos',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
      },
      {
        name: 'Micróbios — bactérias, vírus e fungos; higiene e prevenção de doenças',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Célula — estrutura e funções dos componentes celulares',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
    ],
  },

  // ── Ciências Naturais 6.º ano ─────────────────────────────────────────────
  {
    subject: 'Ciências Naturais',
    yearLevel: 6,
    topics: [
      {
        name: 'Reprodução nos animais — sexual e assexuada; estratégias reprodutivas',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Reprodução nas plantas — flor, polinização, frutificação e disseminação',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Sistema reprodutor humano e puberdade',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Agressões do ambiente — poluição, desflorestação e medidas de preservação',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Dinâmica interna da Terra — sismos, vulcões e placas tectónicas',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
    ],
  },

  // ── Português 5.º ano ─────────────────────────────────────────────────────
  {
    subject: 'Português',
    yearLevel: 5,
    topics: [
      {
        name: 'Gramática — classes de palavras: nome, adjectivo, verbo e advérbio',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
      },
      {
        name: 'Gramática — funções sintácticas: sujeito, predicado e complemento directo',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Leitura e interpretação — texto narrativo e poético',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
    ],
  },

  // ── Português 6.º ano ─────────────────────────────────────────────────────
  {
    subject: 'Português',
    yearLevel: 6,
    topics: [
      {
        name: 'Gramática — tipos e formas de frase; transformação frásica',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
      },
      {
        name: 'Gramática — conjugação verbal: tempos do indicativo e do condicional',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Leitura e interpretação — texto expositivo-informativo',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
    ],
  },

  // ── HGP 5.º ano ───────────────────────────────────────────────────────────
  {
    subject: 'História e Geografia de Portugal',
    yearLevel: 5,
    topics: [
      {
        name: 'Localização e orientação — coordenadas geográficas, rosa dos ventos, escala',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Civilizações da Antiguidade — Egito, Grécia e Roma; contributos para o mundo actual',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'A Idade Média em Portugal — feudalismo, Reconquista e fundação de Portugal',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
    ],
  },

  // ── HGP 6.º ano ───────────────────────────────────────────────────────────
  {
    subject: 'História e Geografia de Portugal',
    yearLevel: 6,
    topics: [
      {
        name: 'As Grandes Descobertas Portuguesas — causas, rotas e consequências',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Portugal nos séculos XVI e XVII — sociedade, cultura e poder',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
      {
        name: 'Portugal no século XX — Estado Novo, 25 de Abril e democracia',
        types: ['multiple_choice', 'short_answer'],
        count: 8,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 3.º CICLO (7.º, 8.º, 9.º ano)
  // ══════════════════════════════════════════════════════════════════════════

  // ── Matemática 7.º ano ───────────────────────────────────────────────────
  {
    subject: 'Matemática',
    yearLevel: 7,
    topics: [
      {
        name: 'Números racionais — representação, operações e propriedades',
        types: ['multiple_choice', 'short_answer', 'problem'],
        count: 12,
        subtopics: [
          'Representação de racionais: fracção, decimal e percentagem — conversões',
          'Comparação e ordenação de números racionais na recta numérica',
          'Adição e subtracção de fracções com denominadores diferentes (m.m.c.)',
          'Multiplicação e divisão de fracções — simplificação antes de calcular',
          'Potências de base racional e expoente inteiro positivo e negativo',
          'Problemas do quotidiano envolvendo operações com racionais',
        ],
      },
      {
        name: 'Proporcionalidade directa e inversa — constante de proporcionalidade e gráficos',
        types: ['multiple_choice', 'short_answer', 'problem'],
        count: 10,
        subtopics: [
          'Identificação de situações de proporcionalidade directa e inversa',
          'Constante de proporcionalidade — cálculo e interpretação',
          'Gráfico cartesiano de proporcionalidade directa (recta pela origem)',
          'Proporcionalidade inversa — tabelas, gráfico (hipérbole) e interpretação',
          'Regra de três simples — problemas do quotidiano (receitas, velocidade, câmbio)',
          'Escala em mapas e plantas — cálculo de distâncias reais',
        ],
      },
      {
        name: 'Expressões algébricas — simplificação, valor numérico e operações com monómios e polinómios',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Valor numérico de uma expressão algébrica para dados concretos',
          'Monómios semelhantes — adição e subtracção',
          'Produto e quociente de monómios',
          'Adição e subtracção de polinómios — simplificação com parêntesis',
          'Propriedade distributiva — desenvolvimento e factorização simples',
          'Tradução de situações para expressões algébricas',
        ],
      },
      {
        name: 'Equações do 1.º grau com uma incógnita — resolução e problemas',
        types: ['short_answer', 'problem'],
        count: 12,
        subtopics: [
          'Verificação de solução — substituição na equação',
          'Resolução de equações simples por operações inversas',
          'Equações com parêntesis e propriedade distributiva',
          'Equações com denominadores — mínimo múltiplo comum',
          'Inequações do 1.º grau — representação na recta e conjunto solução',
          'Problemas — tradução de enunciado verbal para equação e interpretação',
        ],
      },
      {
        name: 'Geometria — semelhança de triângulos e Teorema de Tales',
        types: ['multiple_choice', 'short_answer', 'problem'],
        count: 10,
        subtopics: [
          'Critérios de semelhança de triângulos: AA, LAL, LLL',
          'Razão de semelhança — cálculo de medidas desconhecidas',
          'Teorema de Tales — divisão proporcional de segmentos',
          'Ampliações e reduções de figuras — razão e escala',
          'Aplicações práticas: alturas inacessíveis e sombras',
        ],
      },
      {
        name: 'Estatística — frequências, histogramas, caule-e-folhas e medidas',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Frequências absolutas e relativas — cálculo e tabelas de frequências',
          'Histogramas — construção, leitura e interpretação de classes',
          'Diagrama de caule-e-folhas — construção e leitura',
          'Média, moda e mediana — cálculo e interpretação em contexto',
          'Amplitude e amplitude interquartil — dispersão dos dados',
          'Diagramas de extremos-e-quartis (box-plot) — interpretação',
        ],
      },
    ],
  },

  // ── Matemática 8.º ano ───────────────────────────────────────────────────
  {
    subject: 'Matemática',
    yearLevel: 8,
    topics: [
      {
        name: 'Potências e raízes — propriedades, raiz quadrada, cúbica e notação científica',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Potências de expoente inteiro — produto, quociente e potência de potência',
          'Raiz quadrada — cálculo exacto e aproximado; quadrados perfeitos',
          'Raiz cúbica — cubos perfeitos e estimativa',
          'Notação científica — representação e operações',
          'Simplificação de expressões com radicais',
        ],
      },
      {
        name: 'Polinómios — operações e produtos notáveis',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Adição e subtracção de polinómios — simplificação',
          'Multiplicação de polinómios — regra de Ruffini básica',
          'Produto notável: quadrado da soma (a+b)²',
          'Produto notável: quadrado da diferença (a-b)²',
          'Produto notável: diferença de quadrados (a+b)(a-b)',
          'Factorização — colocar em evidência e usar produtos notáveis inversos',
        ],
      },
      {
        name: 'Sistemas de duas equações do 1.º grau — resolução e problemas',
        types: ['short_answer', 'problem'],
        count: 12,
        subtopics: [
          'Interpretação geométrica — par ordenado e intersecção de rectas',
          'Método da substituição — sistemas simples',
          'Método da adição/eliminação — sistemas com coeficientes opostos',
          'Método da adição/eliminação — multiplicação prévia',
          'Discussão de sistemas: possível determinado, impossível, possível indeterminado',
          'Problemas do quotidiano traduzidos para sistemas (idades, preços, velocidades)',
        ],
      },
      {
        name: 'Funções — noção, domínio, contradomínio, função linear e afim',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Noção de função — correspondência, domínio e contradomínio',
          'Representação de funções: tabela, gráfico e expressão algébrica',
          'Função linear y = kx — gráfico, declive e variação',
          'Função afim y = mx + b — ordenada na origem e declive',
          'Zeros da função afim — cálculo e interpretação gráfica',
          'Sentido de variação (crescente/decrescente) e interpretação de contextos',
        ],
      },
      {
        name: 'Teorema de Pitágoras — demonstração, aplicações e distância',
        types: ['short_answer', 'problem'],
        count: 12,
        subtopics: [
          'Identificação de triângulos rectângulos — critério do recíproco de Pitágoras',
          'Cálculo da hipotenusa em triângulos rectângulos',
          'Cálculo de um cateto dado a hipotenusa e o outro cateto',
          'Ternas pitagóricas — reconhecimento e verificação',
          'Distância entre dois pontos no plano cartesiano',
          'Aplicações práticas: diagonais de rectângulos, alturas de triângulos, escadas',
          'Problemas compostos com Pitágoras e outras propriedades geométricas',
        ],
      },
      {
        name: 'Estatística — medidas de tendência central e de dispersão; diagramas',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Média aritmética — cálculo, propriedades e sensibilidade a valores extremos',
          'Moda e mediana — identificação em dados organizados e não organizados',
          'Amplitude e desvio padrão — interpretação da dispersão',
          'Diagramas de extremos-e-quartis — construção e leitura',
          'Comparação de dois conjuntos de dados usando medidas estatísticas',
          'Interpretação crítica de estatísticas em contextos mediáticos',
        ],
      },
    ],
  },

  // ── Matemática 9.º ano ───────────────────────────────────────────────────
  {
    subject: 'Matemática',
    yearLevel: 9,
    topics: [
      {
        name: 'Equações do 2.º grau — resolução, discriminante e factorização',
        types: ['short_answer', 'problem'],
        count: 12,
        subtopics: [
          'Equações incompletas: ax² = 0, ax² + c = 0, ax² + bx = 0',
          'Fórmula resolvente — cálculo e interpretação do discriminante',
          'Natureza das raízes: duas reais distintas, dupla, sem raízes reais',
          'Factorização de trinómios — relação entre raízes e coeficientes',
          'Equações redutíveis ao 2.º grau (biquadradas, com denominadores)',
          'Problemas do quotidiano — área, trajectória, idades',
        ],
        difficulty: 'mixed',
      },
      {
        name: 'Função quadrática — representação gráfica, vértice e aplicações',
        types: ['multiple_choice', 'short_answer', 'problem'],
        count: 12,
        subtopics: [
          'Parábola — concavidade, vértice e eixo de simetria',
          'Zeros da função quadrática — relação com as raízes da equação',
          'Máximo e mínimo — coordenadas do vértice e interpretação',
          'Esboço do gráfico a partir de a, b, c',
          'Função afim vs. quadrática — distinção e aplicações',
          'Problemas de optimização com função quadrática (área máxima, lucro máximo)',
        ],
      },
      {
        name: 'Trigonometria no triângulo rectângulo — razões trigonométricas e aplicações',
        types: ['short_answer', 'problem'],
        count: 10,
        subtopics: [
          'Definição de seno, cosseno e tangente — lados oposto, adjacente e hipotenusa',
          'Valores exactos para 30°, 45° e 60°',
          'Cálculo de ângulos com a calculadora (arcsin, arccos, arctan)',
          'Cálculo de lados desconhecidos num triângulo rectângulo',
          'Ângulos de elevação e depressão — problemas de distância e altura',
          'Combinação de Pitágoras e trigonometria em figuras compostas',
        ],
      },
      {
        name: 'Geometria no espaço — sólidos, área total e volume',
        types: ['short_answer', 'problem'],
        count: 10,
        subtopics: [
          'Prismas — área da base, área lateral, área total e volume',
          'Pirâmides — área lateral, área total e volume',
          'Cilindros — área lateral, área total e volume',
          'Cones — área lateral, área total e volume',
          'Esferas — área total e volume',
          'Problemas compostos: sólidos inscritos, truncados ou combinados',
        ],
      },
      {
        name: 'Probabilidades — espaço amostral, probabilidade clássica e frequentista',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Experiência aleatória, espaço amostral e acontecimento',
          'Probabilidade clássica — casos favoráveis / casos possíveis',
          'Acontecimentos complementares, impossíveis e certos',
          'Probabilidade de acontecimentos compostos (união e intersecção)',
          'Probabilidade frequentista — interpretação de dados experimentais',
          'Diagramas de árvore — experiências compostas e probabilidade condicionada simples',
        ],
      },
      {
        name: 'Questões tipo prova final 9.º ano — Matemática integrada',
        types: ['multiple_choice', 'short_answer', 'problem'],
        count: 12,
        difficulty: 'hard',
        subtopics: [
          'Álgebra: equações do 1.º e 2.º grau, sistemas, inequações',
          'Funções: afim, quadrática — zeros, variação, gráfico',
          'Geometria plana: semelhança, áreas, Pitágoras',
          'Geometria no espaço: volumes e áreas de sólidos',
          'Trigonometria: ângulos e lados em triângulo rectângulo',
          'Estatística e probabilidades: medidas, diagramas, cálculo de probabilidade',
        ],
      },
    ],
  },

  // ── Português 7.º ano ────────────────────────────────────────────────────
  {
    subject: 'Português',
    yearLevel: 7,
    topics: [
      {
        name: 'Leitura e interpretação — texto narrativo literário (conto e novela)',
        types: ['multiple_choice', 'short_answer'],
        count: 12,
        subtopics: [
          'Identificação de elementos da narrativa: narrador, tempo, espaço, personagens',
          'Tipos de narrador — participante vs. não participante; focalização',
          'Caracterização de personagens — directa e indirecta',
          'Recursos expressivos no texto narrativo: comparação, metáfora, personificação',
          'Inferências e interpretação de sentidos implícitos',
          'Intenção comunicativa e tema central do texto',
        ],
      },
      {
        name: 'Gramática — subordinação e funções sintácticas avançadas',
        types: ['multiple_choice', 'short_answer'],
        count: 12,
        subtopics: [
          'Proposições subordinadas adverbiais: causal, temporal, condicional, concessiva',
          'Proposições subordinadas nominais: completiva e relativa',
          'Complemento oblíquo — identificação e distinção do complemento directo',
          'Agente da passiva — identificação e transformação passiva/activa',
          'Modificador do grupo verbal (circunstancial) — tipos e identificação',
          'Análise sintáctica de frases complexas com subordinação',
        ],
      },
      {
        name: 'Texto poético — figuras de estilo, métrica e análise',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Figuras de som: aliteração, assonância, onomatopeia',
          'Figuras de construção: anáfora, gradação, quiasmo',
          'Figuras de sentido: metáfora, metonímia, hipérbole, ironia',
          'Métrica: contagem de sílabas métricas, tipos de verso',
          'Rima: classificação quanto à posição e quanto ao som',
          'Interpretação de poemas do programa (Sophia, Eugénio de Andrade, poesia popular)',
        ],
      },
      {
        name: 'Escrita — texto de opinião e expositivo-argumentativo',
        types: ['short_answer', 'long_answer'],
        count: 8,
        subtopics: [
          'Planificação: tese, argumentos e contra-argumentos',
          'Conectores discursivos de causa, consequência, oposição e conclusão',
          'Introdução com apresentação da tese',
          'Desenvolvimento argumentativo com exemplos',
          'Conclusão coerente com a tese defendida',
          'Coesão textual e pontuação correcta',
        ],
      },
    ],
  },

  // ── Português 8.º ano ────────────────────────────────────────────────────
  {
    subject: 'Português',
    yearLevel: 8,
    topics: [
      {
        name: 'Leitura e interpretação — texto dramático e épico (selecções de Os Lusíadas)',
        types: ['multiple_choice', 'short_answer'],
        count: 12,
        subtopics: [
          'Texto dramático: acto, cena, didascálias e conflito dramático',
          'Caracterização de personagens no texto dramático — linguagem e acção',
          'Os Lusíadas: estrutura da epopeia, narrador épico e invocação',
          'Camões épico: análise de estâncias seleccionadas (Inês de Castro, Adamastor)',
          'Recursos expressivos na linguagem épica: hipérbole, metáfora, personificação',
          'Tema, intenção e valores veiculados no texto épico',
        ],
      },
      {
        name: 'Gramática — discurso, modos verbais e conectores',
        types: ['multiple_choice', 'short_answer'],
        count: 12,
        subtopics: [
          'Transformação de discurso directo para indirecto — adaptações necessárias',
          'Transformação de discurso indirecto para directo',
          'Conjuntivo presente e pretérito — formas e usos em contexto',
          'Condicional — formas e usos; distinção de futuro do pretérito',
          'Conectores discursivos: causa, consequência, concessão, finalidade',
          'Coerência e coesão textual — identificação de erros e reformulação',
        ],
      },
      {
        name: 'Texto expositivo-informativo — organização e interpretação',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Tema, subtemas e organização do texto expositivo',
          'Distinção de facto, opinião e generalização',
          'Recursos de modalização — advérbios, verbos modais, expressões',
          'Paráfrase e reformulação de informação do texto',
          'Vocabulário especializado — inferência de significado pelo contexto',
          'Comparação de dois textos expositivos sobre o mesmo tema',
        ],
      },
      {
        name: 'Escrita — resumo, síntese e texto argumentativo',
        types: ['short_answer', 'long_answer'],
        count: 8,
        subtopics: [
          'Resumo: selecção de informação essencial e reformulação',
          'Síntese de dois textos com perspectivas diferentes',
          'Texto argumentativo: estrutura tese-argumento-conclusão',
          'Refutação de contra-argumentos — estratégias discursivas',
          'Citação e referência a fontes no texto argumentativo',
          'Revisão e melhoria de um texto argumentativo com erros',
        ],
      },
    ],
  },

  // ── Português 9.º ano ────────────────────────────────────────────────────
  {
    subject: 'Português',
    yearLevel: 9,
    topics: [
      {
        name: 'Literatura portuguesa — narrativa contemporânea e conto',
        types: ['multiple_choice', 'short_answer'],
        count: 12,
        subtopics: [
          'Estrutura da narrativa: situação inicial, conflito, clímax, desenlace',
          'Análise do narrador: homodiegético vs. heterodiegético; omnisciente vs. limitado',
          'Tempo na narrativa: analepse, prolepse e elipse',
          'Espaço físico e psicológico — função e simbolismo',
          'Personagens: protagonista, antagonista, figurante — evolução ao longo da narrativa',
          'Intertextualidade e referências culturais em autores do programa',
        ],
      },
      {
        name: 'Gramática integrada para prova final — classes, funções e processos lexicais',
        types: ['multiple_choice', 'short_answer'],
        count: 14,
        subtopics: [
          'Classes de palavras: distinção entre determinante, pronome e advérbio',
          'Verbos: modos (indicativo, conjuntivo, condicional, imperativo) e tempos compostos',
          'Funções sintácticas: sujeito, predicado, complementos, modificadores',
          'Análise de frase complexa: coordenação e subordinação',
          'Processos de formação de palavras: derivação, composição, conversão',
          'Semântica: sinonímia, antonímia, polissemia, homonímia',
          'Pontuação e ortografia — casos específicos e uso da vírgula',
        ],
      },
      {
        name: 'Texto poético — Fernando Pessoa, Camões lírico e poesia contemporânea',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Camões lírico: redondilhas e sonetos — análise de formas e temas',
          'Fernando Pessoa ortónimo — fingimento poético e emoção fingida',
          'Álvaro de Campos — sensacionismo, odes e exagero expressivo',
          'Ricardo Reis — epicurismo, equilíbrio clássico e odes',
          'Alberto Caeiro — heteronímia, panteísmo e anti-metafísica',
          'Poesia contemporânea do programa — temas e recursos expressivos',
        ],
      },
      {
        name: 'Escrita tipo prova final — texto de opinião e interpretativo',
        types: ['short_answer', 'long_answer'],
        count: 10,
        difficulty: 'hard',
        subtopics: [
          'Texto de opinião com 200-250 palavras: estrutura e coesão',
          'Argumentação fundamentada com exemplos da actualidade',
          'Resposta interpretativa a partir de texto literário (150-200 palavras)',
          'Síntese de texto não literário com selecção de ideias-chave',
          'Análise de recursos expressivos com justificação textual',
          'Revisão e correcção de um texto com erros de coesão e ortografia',
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ENSINO SECUNDÁRIO (10.º, 11.º, 12.º ano)
  // ══════════════════════════════════════════════════════════════════════════

  // ── Matemática A — 10.º ano ──────────────────────────────────────────────
  {
    subject: 'Matemática A',
    yearLevel: 10,
    topics: [
      {
        name: 'Funções reais — propriedades, domínio, contradomínio e gráfico',
        types: ['multiple_choice', 'short_answer'],
        count: 12,
        subtopics: [
          'Domínio natural de funções (restrições com raízes, denominadores, logaritmos)',
          'Imagem de um ponto e contradomínio — cálculo e interpretação gráfica',
          'Zeros, máximos e mínimos — leitura no gráfico e cálculo algébrico',
          'Monotonia (crescimento/decrescimento) — definição e identificação',
          'Paridade: funções pares, ímpares e sem paridade — verificação',
          'Composição de funções e função inversa — domínio e expressão',
        ],
      },
      {
        name: 'Funções polinomiais — afim, quadrática e cúbica; zeros e variação',
        types: ['short_answer', 'problem'],
        count: 12,
        subtopics: [
          'Função afim: declive, ordenada na origem e zeros',
          'Função quadrática: parábola, vértice, eixo de simetria e concavidade',
          'Zeros de uma função quadrática — fórmula resolvente e discriminante',
          'Inequações do 2.º grau — resolução por estudo do sinal',
          'Problemas de optimização com função quadrática (máximo/mínimo)',
          'Esboço de funções polinomiais de grau 3 — comportamento global',
        ],
      },
      {
        name: 'Geometria analítica — ponto, recta, circunferência e cônicas',
        types: ['short_answer', 'problem'],
        count: 10,
        subtopics: [
          'Distância entre dois pontos e ponto médio de um segmento',
          'Equação reduzida e geral da recta — declive e posição relativa',
          'Condições de paralelismo e perpendicularidade de rectas',
          'Mediatriz de um segmento — equação e propriedades',
          'Equação da circunferência — centro, raio e posição relativa com recta',
        ],
      },
      {
        name: 'Trigonometria — círculo trigonométrico, funções e equações',
        types: ['short_answer', 'problem'],
        count: 10,
        subtopics: [
          'Círculo trigonométrico — coordenadas de pontos notáveis (30°,45°,60°,90°...)',
          'Fórmulas de adição e subtracção: sin(a±b), cos(a±b)',
          'Fórmulas do ângulo duplo e ângulo metade',
          'Funções trigonométricas: período, amplitude, fase e esboço gráfico',
          'Equações trigonométricas simples — soluções em [0, 2π] e no conjunto geral',
        ],
      },
      {
        name: 'Combinatória — princípio da contagem, arranjos, combinações e permutações',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Princípio fundamental da contagem — casos com e sem restrições',
          'Permutações simples e permutações com elementos repetidos',
          'Arranjos simples — distinção de arranjos e permutações',
          'Combinações simples — triângulo de Pascal e binómio de Newton básico',
          'Problemas combinatórios com grupos, comités e selecções com restrições',
        ],
      },
      {
        name: 'Probabilidades — probabilidade condicionada, independência e Bayes',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Revisão: probabilidade clássica, acontecimentos complementares e incompatíveis',
          'Probabilidade condicionada — definição e cálculo P(A|B)',
          'Acontecimentos independentes — critério e aplicação',
          'Regra da multiplicação — probabilidade da intersecção',
          'Teorema de Bayes — problemas com diagnóstico e selecção',
          'Variável aleatória discreta — distribuição de probabilidade e esperança matemática',
        ],
      },
    ],
  },

  // ── Matemática A — 11.º ano ──────────────────────────────────────────────
  {
    subject: 'Matemática A',
    yearLevel: 11,
    topics: [
      {
        name: 'Funções exponenciais e logarítmicas — propriedades, gráficos e equações',
        types: ['short_answer', 'problem'],
        count: 12,
        subtopics: [
          'Função exponencial aˣ — domínio, crescimento/decrescimento, assíntota',
          'Número de Euler e e — significado e propriedades',
          'Logaritmo: definição, logaritmo natural (ln) e logaritmo decimal (log)',
          'Propriedades dos logaritmos: produto, quociente, potência e mudança de base',
          'Equações exponenciais — com e sem redução à mesma base',
          'Equações logarítmicas — condições de existência e resolução',
          'Problemas de crescimento e decaimento exponencial (população, capital, radioactividade)',
        ],
      },
      {
        name: 'Geometria analítica no espaço — vectores, rectas e planos',
        types: ['short_answer', 'problem'],
        count: 10,
        subtopics: [
          'Vectores no espaço — representação, módulo e operações',
          'Produto escalar — cálculo, ângulo entre vectores, ortogonalidade',
          'Equação paramétrica e vectorial da recta no espaço',
          'Equação cartesiana do plano — vector normal',
          'Posições relativas de rectas e planos — paralelos, perpendiculares, concorrentes',
          'Distância de ponto a recta e de ponto a plano',
        ],
      },
      {
        name: 'Sucessões — termo geral, limite e progressões',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Definição de sucessão — termo geral e definição recursiva',
          'Monotonia e limitação de sucessões',
          'Progressões aritméticas — termo geral, soma dos n primeiros termos',
          'Progressões geométricas — razão, termo geral, soma e soma infinita (|r|<1)',
          'Limite de uma sucessão — convergência, divergência e regras operatórias',
          'Sucessão de Fibonacci e sucessões definidas por recorrência em contexto',
        ],
      },
      {
        name: 'Introdução ao cálculo diferencial — taxa de variação e derivada',
        types: ['multiple_choice', 'short_answer', 'problem'],
        count: 12,
        subtopics: [
          'Taxa de variação média — quociente incremental e interpretação gráfica',
          'Taxa de variação instantânea — derivada como limite do quociente incremental',
          'Regras de derivação: constante, potência, soma, produto e quociente',
          'Derivada de funções compostas — regra da cadeia',
          'Derivadas de eˣ, ln(x), sin(x), cos(x)',
          'Equação da recta tangente a uma curva num ponto',
          'Interpretação da derivada: crescimento, decrescimento e extremos',
        ],
      },
    ],
  },

  // ── Matemática A — 12.º ano ──────────────────────────────────────────────
  {
    subject: 'Matemática A',
    yearLevel: 12,
    topics: [
      {
        name: 'Limites e continuidade — definição, propriedades e indeterminações',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Limite de uma função num ponto — lim f(x) quando x→a, limites laterais',
          'Propriedades operatórias dos limites',
          'Indeterminações 0/0 e ∞/∞ — factorização e conjugado',
          'Limites no infinito — comportamento assimptótico e assímptotas',
          'Continuidade — definição, tipos de descontinuidade e teorema de Bolzano',
        ],
      },
      {
        name: 'Derivadas — regras avançadas, estudo de funções e optimização',
        types: ['short_answer', 'problem'],
        count: 14,
        subtopics: [
          'Derivadas de ordem superior — derivada segunda e concavidade',
          'Critério da derivada segunda para classificação de extremos',
          'Pontos de inflexão — condição e determinação',
          'Estudo completo de uma função: domínio, assímptotas, extremos, concavidade',
          'Problemas de optimização — máximos e mínimos em contexto real (área, volume, custo)',
          'Derivada implícita — equações com y implícito',
          "Regra de L'Hôpital para resolução de indeterminações",
        ],
      },
      {
        name: 'Primitivas e integrais definidos — cálculo de áreas e volumes',
        types: ['short_answer', 'problem'],
        count: 14,
        subtopics: [
          'Primitivação imediata — funções polinomiais, racionais simples, eˣ, ln x',
          'Regras de primitivação: linearidade, substituição simples',
          'Primitivação por partes — uv\' = uv − ∫u\'v',
          'Integral definido — teorema fundamental do cálculo',
          'Cálculo de área entre curvas — positiva e com parte negativa',
          'Volume de sólido de revolução — método dos discos',
          'Aplicações em física e economia (trabalho, probabilidade contínua)',
        ],
      },
      {
        name: 'Estatística — variáveis aleatórias contínuas, distribuição normal e inferência',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Variável aleatória contínua — função densidade de probabilidade',
          'Distribuição normal N(μ, σ²) — parâmetros e interpretação',
          'Standardização Z = (X−μ)/σ — uso de tabelas da normal reduzida',
          'Cálculo de probabilidades com a distribuição normal',
          'Intervalo de confiança para a média — interpretação e cálculo',
          'Testes de hipóteses — hipótese nula, nível de significância e decisão',
        ],
      },
      {
        name: 'Questões tipo exame nacional 12.º ano — Matemática A integrada',
        types: ['multiple_choice', 'short_answer', 'problem'],
        count: 14,
        difficulty: 'hard',
        subtopics: [
          'Funções e gráficos: domínio, zeros, monotonia, assímptotas',
          'Trigonometria: equações, fórmulas e gráficos',
          'Combinatória e probabilidades: Bayes, v.a. discreta e contínua',
          'Derivadas: estudo completo de função e optimização',
          'Integrais: primitivas, área entre curvas',
          'Geometria analítica no espaço: vectores, rectas e planos',
          'Sucessões e limites: progressões, convergência',
        ],
      },
    ],
  },

  // ── Português — 10.º ano ─────────────────────────────────────────────────
  {
    subject: 'Português',
    yearLevel: 10,
    topics: [
      {
        name: 'Literatura — narrativa do século XX: Saramago, Torga e outros',
        types: ['multiple_choice', 'short_answer'],
        count: 12,
        subtopics: [
          'Análise do narrador e do ponto de vista em narrativas do séc. XX',
          'Tempo e espaço narrativo — analepse, prolepse, espaço simbólico',
          'Miguel Torga — contos de Bichos e Terra Firme: temas e linguagem',
          'José Saramago — estilo, pontuação e estrutura do discurso',
          'Personagem e conflito — evolução e função dramática',
          'Intertextualidade e referências culturais em prosa contemporânea',
        ],
      },
      {
        name: 'Camões — épica (Os Lusíadas) e lírica (sonnetos e redondilhas)',
        types: ['multiple_choice', 'short_answer'],
        count: 12,
        subtopics: [
          'Os Lusíadas: estrutura, narrador épico, planos da narrativa',
          'Episódio de Inês de Castro — análise temática e estilística',
          'Episódio do Adamastor — alegoria e dimensão mítica',
          'Camões lírico: "Mudam-se os tempos, mudam-se as vontades" — análise',
          'Sonetos camoninos: tema amoroso, neoplatonismo e contrariedades',
          'Redondilhas e poesia de circunstância — forma e conteúdo',
        ],
      },
      {
        name: 'Gramática — sintaxe avançada e análise de texto',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Coordenação: tipos de proposições coordenadas e conectores',
          'Subordinação: completivas, relativas e adverbiais — identificação e função',
          'Transformações frásicas: passivização, nominalização, negação',
          'Modalidade: epistémica, deôntica e apreciativa — marcadores linguísticos',
          'Coesão e coerência textual — mecanismos de referência e conectores',
        ],
      },
      {
        name: 'Texto argumentativo e crónica — análise e produção',
        types: ['short_answer', 'long_answer'],
        count: 8,
        subtopics: [
          'Estrutura do texto argumentativo: tese, argumentos, refutação, conclusão',
          'Estratégias argumentativas: exemplo, analogia, autoridade, contra-argumento',
          'Crónica: género, características e marcas de subjectividade',
          'Produção de texto de opinião com 200-250 palavras sobre tema actual',
          'Análise comparativa de dois textos com perspectivas diferentes',
        ],
      },
    ],
  },

  // ── Português — 11.º ano ─────────────────────────────────────────────────
  {
    subject: 'Português',
    yearLevel: 11,
    topics: [
      {
        name: 'Fernando Pessoa e heterónimos — análise aprofundada',
        types: ['multiple_choice', 'short_answer'],
        count: 14,
        subtopics: [
          'Fernando Pessoa ortónimo: "Autopsicografia" e fingimento poético',
          'Alberto Caeiro: anti-metafísica, sensacionismo e "O guardador de rebanhos"',
          'Ricardo Reis: odes, epicurismo, estoicismo e paganismo',
          'Álvaro de Campos: odes triunfais, sensacionismo e tédio existencial',
          'Distinção estilística e filosófica entre os heterónimos',
          'Contexto histórico e literário do modernismo português',
          'Intertextualidade entre heterónimos e outras tradições literárias',
        ],
      },
      {
        name: 'Teatro — Gil Vicente e Almeida Garrett',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Gil Vicente: Auto da Barca do Inferno — alegoria e crítica social',
          'Linguagem vicentina: arcaísmos, ironia e jogo dramático',
          'Almeida Garrett: Frei Luís de Sousa — romantismo e tragédia nacional',
          'Personagens e conflito em Frei Luís de Sousa — fatalismo e identidade',
          'Teatro como espelho da sociedade — função crítica e social',
        ],
      },
      {
        name: 'Texto de imprensa — artigo de opinião, editorial e crónica',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Características do artigo de opinião — estrutura e marcadores de subjectividade',
          'Editorial: posição institucional e estratégias de persuasão',
          'Crónica: características, ironia e registo coloquial vs. formal',
          'Análise comparativa de textos de imprensa sobre o mesmo acontecimento',
          'Distinção entre facto e opinião; identificação de pressupostos',
        ],
      },
      {
        name: 'Gramática — semântica, pragmática e análise do discurso',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Conotação e denotação — valores semânticos em contexto literário e jornalístico',
          'Pressupostos e implicaturas — o que está implícito no enunciado',
          'Actos de fala: assertivos, directivos, compromissivos, expressivos',
          'Dêixis: pessoal, espacial e temporal — identificação em texto',
          'Ironía, paradoxo e antítese — reconhecimento e efeito expressivo',
        ],
      },
    ],
  },

  // ── Português — 12.º ano ─────────────────────────────────────────────────
  {
    subject: 'Português',
    yearLevel: 12,
    topics: [
      {
        name: 'Poesia do século XX — Sophia, Eugénio de Andrade e contemporâneos',
        types: ['multiple_choice', 'short_answer'],
        count: 12,
        subtopics: [
          'Sophia de Mello Breyner: "Arte Poética", transparência e ética da beleza',
          'Sophia: mar, luz e justiça como símbolos recorrentes',
          'Eugénio de Andrade: sensorialidade, natureza e pureza da linguagem',
          'Poesia e resistência — poetas do neo-realismo e da geração de "Orpheu"',
          'Poesia contemporânea: ruptura formal e novos temas (identidade, globalização)',
          'Análise comparativa de dois poemas de autores diferentes sobre o mesmo tema',
        ],
      },
      {
        name: 'Narrativa contemporânea — Lídia Jorge e António Lobo Antunes',
        types: ['multiple_choice', 'short_answer'],
        count: 10,
        subtopics: [
          'Lídia Jorge: A Costa dos Murmúrios — narrador, memória e guerra colonial',
          'Processos narrativos de Lídia Jorge: fragmentação, intertextualidade',
          'Lobo Antunes: estilo, monólogo interior e ruptura com a narrativa linear',
          'Temas recorrentes: guerra, trauma, identidade pós-colonial, memória',
          'Pós-modernismo na narrativa portuguesa — características e autores',
        ],
      },
      {
        name: 'Gramática integrada para exame — revisão completa',
        types: ['multiple_choice', 'short_answer'],
        count: 14,
        subtopics: [
          'Análise morfológica: classes variáveis e invariáveis, sub-classes',
          'Análise sintáctica completa de frases simples e complexas',
          'Processos de formação de palavras: derivação, composição e conversão',
          'Semântica: polissemia, homonímia, hiperonímia, campo lexical',
          'Pontuação e uso de maiúsculas — casos mais problemáticos',
          'Figuras de estilo de construção, som e sentido — identificação e efeito',
          'Pragmática: implicaturas, pressupostos, actos de fala em contexto',
        ],
      },
      {
        name: 'Escrita tipo exame nacional 12.º ano — texto de opinião e análise',
        types: ['short_answer', 'long_answer'],
        count: 10,
        difficulty: 'hard',
        subtopics: [
          'Texto de opinião com 200-250 palavras: estrutura, coesão e argumentação',
          'Análise de um excerto literário: recursos, temas, intenção',
          'Síntese de dois textos de género diferente sobre o mesmo tema',
          'Resposta interpretativa com recurso a elementos textuais (80-120 palavras)',
          'Análise de um poema: forma, conteúdo e relação autor-texto-leitor',
        ],
      },
    ],
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
const FAILED_LOG = resolve(process.cwd(), '.claude/seed-failed.json')

function isRateLimitOrOverload(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('503') || msg.includes('429') ||
    msg.includes('Service Unavailable') || msg.includes('high demand') ||
    msg.includes('rate limit') || msg.includes('quota')
}

function autoMarkSchemeSeeder(type: string, pts: number, subject: string, correctAnswer: unknown): string {
  const s = subject.toLowerCase()
  const p = (frac: number) => Math.max(1, Math.round(pts * frac))
  const ans = String(correctAnswer ?? '')

  if (type === 'multiple_choice') {
    return `Resposta correcta: ${ans} (${pts}pt). Correspondência exacta — sem cotação parcial. Resposta errada = 0pt.`
  }
  if (type === 'true_false') {
    return `Resposta correcta: ${ans} (${pts}pt). Classificação exacta — sem cotação parcial. Resposta errada = 0pt.`
  }
  if (s.includes('matemát') || s.includes('físic') || s.includes('fisic') || s.includes('quím') || s.includes('quim')) {
    return `Identificação dos dados (${p(0.2)}pt) + fórmula/método correcto (${p(0.3)}pt) + cálculo sem erro (${p(0.3)}pt) + resposta com unidade (${p(0.2)}pt). Resposta esperada: ${ans}`
  }
  if (s.includes('português') || s.includes('portugues') || s.includes('língua')) {
    return `Conteúdo correcto (${p(0.4)}pt) + justificação adequada (${p(0.4)}pt) + correcção linguística (${p(0.2)}pt). Resposta esperada: ${ans}`
  }
  if (s.includes('história') || s.includes('historia') || s.includes('geografia') || s.includes('geograf') || s.includes('hgp')) {
    return `Conteúdo histórico/geográfico correcto (${p(0.5)}pt) + contextualização e vocabulário específico (${p(0.5)}pt). Resposta esperada: ${ans}`
  }
  if (s.includes('ciência') || s.includes('ciencia') || s.includes('natural') || s.includes('biolog')) {
    return `Resposta científica correcta (${p(0.6)}pt) + terminologia científica adequada (${p(0.4)}pt). Resposta esperada: ${ans}`
  }
  return `Resposta correcta e completa (${p(0.6)}pt) + clareza e rigor (${p(0.4)}pt). Resposta esperada: ${ans}`
}

function parseJsonArray(raw: string, subject = ''): Array<Record<string, unknown>> {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Resposta não contém um array JSON válido')
  const parsed = JSON.parse(jsonMatch[0])
  if (!Array.isArray(parsed)) throw new Error('JSON parseado não é um array')

  // Normalização defensiva — alguns modelos usam nomes de campos diferentes
  return (parsed as Array<Record<string, unknown>>).map(q => {
    const norm = { ...q }
    // "question" → "text" (Kimi usa "question")
    if (!norm.text && norm.question) { norm.text = norm.question; delete norm.question }
    // options como dicionário {A: ..., B: ...} → array ["A) ...", "B) ..."]
    if (norm.options && !Array.isArray(norm.options) && typeof norm.options === 'object') {
      norm.options = Object.entries(norm.options as Record<string, string>)
        .map(([k, v]) => `${k}) ${v}`)
    }
    // Defaults para campos em falta
    if (!norm.bloomLevel) norm.bloomLevel = 'Aplicar'
    if (!norm.difficulty) norm.difficulty = 'medium'
    if (!norm.points) norm.points = 5
    if (!norm.markScheme || String(norm.markScheme ?? '').trim().length < 25) {
      const pts = Number(norm.points) || 5
      norm.markScheme = autoMarkSchemeSeeder(
        String(norm.type ?? 'short_answer'), pts, subject, norm.correctAnswer
      )
    }
    return norm
  })
}

function logFailed(subject: string, yearLevel: number, topicName: string) {
  const existing = existsSync(FAILED_LOG)
    ? JSON.parse(readFileSync(FAILED_LOG, 'utf-8')) as unknown[]
    : []
  const entry = { subject, yearLevel, topic: topicName, failedAt: new Date().toISOString() }
  writeFileSync(FAILED_LOG, JSON.stringify([...existing, entry], null, 2))
}

// ── Helpers para o prompt ──────────────────────────────────────────────────────
function getCycleInfo(yearLevel: number): { cycle: string; ageRange: string } {
  if (yearLevel <= 4)  return { cycle: '1.º ciclo do ensino básico',   ageRange: `${yearLevel + 5}-${yearLevel + 6}` }
  if (yearLevel <= 6)  return { cycle: '2.º ciclo do ensino básico',   ageRange: yearLevel === 5 ? '10-11' : '11-12' }
  if (yearLevel <= 9)  return { cycle: '3.º ciclo do ensino básico',   ageRange: `${yearLevel + 5}-${yearLevel + 6}` }
  return                      { cycle: 'ensino secundário',             ageRange: `${yearLevel + 5}-${yearLevel + 6}` }
}

function bloomDistribution(yearLevel: number, count: number): string {
  // Distribuição obrigatória de níveis de Bloom adaptada ao ciclo
  if (yearLevel <= 6) {
    const r = Math.max(1, Math.round(count * 0.15))
    const c = Math.max(1, Math.round(count * 0.25))
    const ap = Math.max(1, Math.round(count * 0.35))
    const an = Math.max(1, Math.round(count * 0.20))
    const av = Math.max(0, count - r - c - ap - an)
    return `Recordar ${r} · Compreender ${c} · Aplicar ${ap} · Analisar ${an} · Avaliar ${av}`
  }
  if (yearLevel <= 9) {
    const r = Math.max(1, Math.round(count * 0.10))
    const c = Math.max(1, Math.round(count * 0.20))
    const ap = Math.max(1, Math.round(count * 0.30))
    const an = Math.max(1, Math.round(count * 0.25))
    const av = Math.max(0, count - r - c - ap - an)
    return `Recordar ${r} · Compreender ${c} · Aplicar ${ap} · Analisar ${an} · Avaliar ${av}`
  }
  // Secundário
  const r = Math.max(0, Math.round(count * 0.05))
  const c = Math.max(1, Math.round(count * 0.15))
  const ap = Math.max(1, Math.round(count * 0.25))
  const an = Math.max(1, Math.round(count * 0.30))
  const av = Math.max(0, count - r - c - ap - an)
  return `Recordar ${r} · Compreender ${c} · Aplicar ${ap} · Analisar ${an} · Avaliar ${av}`
}

function qualityReferenceBySubject(subject: string): string {
  const s = subject.toLowerCase()
  if (s.includes('matemát') || s.includes('matemática a'))
    return `Inspira-te no rigor e variedade de exercícios do site matematica.pt e nos exames nacionais de Matemática do IAVE. Cada questão deve testar uma competência distinta — proibido dois problemas com a mesma estrutura de resolução.`
  if (s.includes('português') || s.includes('língua'))
    return `Baseia-te nas Aprendizagens Essenciais DGE e no estilo das provas finais de Português do IAVE. Usa excertos de textos literários portugueses reais (adaptados) quando pertinente. Inclui questões de gramática, leitura e escrita.`
  if (s.includes('ciência') || s.includes('natural') || s.includes('biolog') || s.includes('físic') || s.includes('quím'))
    return `Alinha com as Aprendizagens Essenciais DGE e com provas práticas reais. Privilegia questões de interpretação de dados, gráficos e situações experimentais. Terminologia científica rigorosa em PT-PT.`
  if (s.includes('história') || s.includes('geograf') || s.includes('hgp'))
    return `Alinha com as Aprendizagens Essenciais DGE. Inclui fontes históricas/geográficas (mapas, gráficos, excertos documentais) e questões de análise e contextualização. Evita simples memorização de datas — privilegia compreensão e causa-efeito.`
  return `Alinha com as Aprendizagens Essenciais DGE para o ${subject}. Prioriza competências de aplicação e análise em detrimento da memorização pura.`
}

function markSchemeExamples(subject: string): string {
  const s = subject.toLowerCase()
  const isMath = s.includes('matemát') || s.includes('físic') || s.includes('quím')
  if (isMath) return `   - MCQ: "Resposta: B (5pt). Opção A: erro de confundir perímetro com área. Opção C: esquece converter unidades. Opção D: inverte numerador/denominador. Errada = 0pt."
   - Problema: "Identificação dos dados e incógnita (1pt) + fórmula/método correcto (2pt) + desenvolvimento sem erro de cálculo (1pt) + resposta com unidade e conclusão (1pt)."
   - Resposta curta: "Valor correcto (2pt) + unidade correcta (1pt) + justificação ou processo (2pt)."`
  if (s.includes('português') || s.includes('língua')) return `   - MCQ: "Resposta: C (5pt). Opção A: confunde complemento directo com indirecto. Opção B: ignora o contexto do enunciado. Opção D: erro de identificação de classe de palavra. Errada = 0pt."
   - Resposta curta: "Identificação correcta do elemento pedido (2pt) + citação ou exemplo do texto (2pt) + explicação linguística adequada (1pt)."
   - Resposta desenvolvida: "Conteúdo pertinente e completo (40%) + organização e coesão textual (30%) + correcção linguística e vocabulário (30%)."`
  return `   - MCQ: "Resposta: A (5pt). Distrator B: erro conceptual frequente X. Distrator C: confunde Y com Z. Errada = 0pt."
   - Resposta curta: "Identificação correcta (2pt) + explicação com vocabulário específico da disciplina (2pt) + contextualização (1pt)."
   - Resposta desenvolvida: "Conteúdo correcto e completo (50%) + estrutura e clareza (30%) + rigor terminológico (20%)."`
}

// ── Gerador — apenas Gemini 2.5 Flash, qualidade não negociável ───────────────
// Política: esperar e persistir no modelo correcto, nunca degradar qualidade.
// Se indisponível após tentativas → regista em .claude/seed-failed.json para retry manual.
async function generateQuestionsForTopic(
  genAIOrPool: GoogleGenerativeAI | GoogleGenerativeAI[],
  subject: string,
  yearLevel: number,
  topicName: string,
  types: string[],
  count: number,
  subtopics?: string[],
  difficulty?: string,
  startKeyIndex = 0  // round-robin: cada tópico começa numa key diferente
): Promise<Array<Record<string, unknown>>> {
  const pool = Array.isArray(genAIOrPool) ? genAIOrPool : [genAIOrPool]

  const { cycle, ageRange } = getCycleInfo(yearLevel)

  const typeDescriptions = types
    .map(t => {
      if (t === 'multiple_choice') return 'escolha múltipla com 4 opções A/B/C/D (apenas uma correcta)'
      if (t === 'short_answer')    return 'resposta curta (máx. 3 frases, resposta directa e precisa)'
      if (t === 'long_answer')     return 'resposta desenvolvida (1-2 parágrafos, argumentação ou explicação)'
      if (t === 'true_false')      return 'verdadeiro/falso com justificação obrigatória'
      if (t === 'problem')         return 'problema de resolução multi-passo com contexto real'
      if (t === 'fill_in_blank')   return 'completar espaços em branco (frase com lacuna)'
      return t
    })
    .join(' · ')

  const difficultyLine = difficulty === 'easy'   ? 'Todas fáceis (nível de consolidação básica).'
    : difficulty === 'medium' ? 'Todas de dificuldade média (aplicação directa).'
    : difficulty === 'hard'   ? 'Todas difíceis — nível de prova final/exame nacional.'
    : '~30% fáceis (consolidação) · ~45% médias (aplicação) · ~25% difíceis (análise/problema complexo)'

  const bloomLine = bloomDistribution(yearLevel, count)
  const qualityRef = qualityReferenceBySubject(subject)
  const msExamples = markSchemeExamples(subject)

  const subtopicSection = subtopics && subtopics.length > 0
    ? `\nSUBTEMAS OBRIGATÓRIOS A COBRIR (distribui as ${count} questões por TODOS os subtemas — pelo menos 1 por subtema, sem dois consecutivos sobre o mesmo):
${subtopics.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}\n`
    : ''

  const prompt = `Cria exactamente ${count} questões de avaliação de ${subject} para o ${yearLevel}.º ano do ${cycle} português (alunos de ${ageRange} anos), sobre o tópico:

"${topicName}"
${subtopicSection}
TIPOS A DISTRIBUIR EQUILIBRADAMENTE: ${typeDescriptions}

DISTRIBUIÇÃO OBRIGATÓRIA DE NÍVEIS DE BLOOM (total = ${count} questões):
${bloomLine}
→ O campo "bloomLevel" de cada questão DEVE reflectir a distribuição acima. Não concentres tudo no mesmo nível.

QUALIDADE E REFERÊNCIAS PEDAGÓGICAS:
${qualityRef}

REGRAS ABSOLUTAS:
1. Português de Portugal ESTRITO — actividade (não atividade), rectângulo (não retângulo), gráfico (não grafico), percentagem (não porcentagem), etc.
2. Currículo DGE ${yearLevel}.º ano rigoroso — sem conteúdos de anos anteriores ou posteriores.
3. VARIEDADE MÁXIMA — proibido repetir:
   • o mesmo nome de pessoa, cidade, produto ou valor numérico em duas questões
   • a mesma estrutura frásica do enunciado em questões consecutivas
   • o mesmo tipo de operação/raciocínio sem mudança de contexto
4. Dificuldade: ${difficultyLine}
5. MCQ: exactamente 4 opções (A/B/C/D); distratores baseados em erros conceptuais REAIS e típicos dos alunos (não absurdos); apenas 1 correcta.
6. Problemas e contextos: situações reais portuguesas (preços em €, temperaturas em Portugal, dados demográficos reais, desporto, gastronomia, monumentos).
7. Linguagem: precisa, sem ambiguidade, adaptada à faixa etária — enunciados completos e autossuficientes.
8. markScheme OBRIGATORIAMENTE detalhado — cotação parcial, SOMA = points:
${msExamples}
9. correctAnswer: para MCQ = apenas a letra (ex: "C"); para outros = resposta completa e cientificamente/linguisticamente correcta.
10. points: 3 a 10 conforme complexidade; problemas multi-passo merecem mais pontos.

Responde APENAS com o array JSON puro (sem markdown, sem blocos de código, sem qualquer texto antes ou depois do array):
[
  {
    "type": "multiple_choice",
    "bloomLevel": "Compreender",
    "difficulty": "easy",
    "text": "enunciado completo e autossuficiente",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": "B",
    "markScheme": "Resposta correcta: B (5pt). Opção A: [erro conceptual específico]. Opção C: [erro conceptual específico]. Opção D: [erro conceptual específico]. Resposta errada = 0pt.",
    "points": 5
  },
  {
    "type": "problem",
    "bloomLevel": "Aplicar",
    "difficulty": "medium",
    "text": "enunciado completo com dados suficientes para resolução",
    "options": null,
    "correctAnswer": "resposta numérica completa com unidade e conclusão",
    "markScheme": "Identificação dos dados e da incógnita (1pt) + método/fórmula correcta (2pt) + desenvolvimento sem erro de cálculo (1pt) + resposta com unidade e conclusão (1pt).",
    "points": 5
  }
]`

  // ── 1.ª via: Gemini 2.5 Flash directo — round-robin pelo pool ───────────────
  // Estratégia: uma tentativa por chave, sem espera em quota — cascade imediato
  // Quota reseta em 60s; esperar 10s e retentar é quase sempre inútil.
  let geminiQuotaCount = 0
  for (let ki = 0; ki < pool.length; ki++) {
    const keyIdx = (startKeyIndex + ki) % pool.length
    const model = pool[keyIdx].getGenerativeModel({ model: 'gemini-2.5-flash' })
    try {
      const result = await model.generateContent(prompt)
      return parseJsonArray(result.response.text(), subject)
    } catch (err) {
      if (isRateLimitOrOverload(err)) {
        geminiQuotaCount++
        const nextKeyIdx = (startKeyIndex + ki + 1) % pool.length
        if (ki < pool.length - 1) {
          process.stdout.write(` (k${keyIdx + 1} quota→k${nextKeyIdx + 1}) `)
        } else {
          process.stdout.write(` (k${keyIdx + 1} quota→cascade) `)
        }
        // Sem espera — vai directamente para a próxima key ou cascade
      } else {
        // Erro de rede/auth — tenta próxima key mas não conta como quota
        if (ki < pool.length - 1) {
          process.stdout.write(` (k${keyIdx + 1} erro→k${((startKeyIndex + ki + 1) % pool.length) + 1}) `)
        }
      }
    }
  }
  // Se todas as chaves tiveram quota, aguarda 5s antes do cascade (gentileza para o próximo tópico)
  if (geminiQuotaCount === pool.length) {
    await new Promise(r => setTimeout(r, 5_000))
  }

  // ── 2.ª via: Groq (chave existente, 0.6s, PT-PT confirmado) ────────────────
  const GROQ_KEY = process.env.GROQ_API_KEY
  const GROQ_MODELS = [
    'llama-3.3-70b-versatile',  // 0.6s, PT-PT ok ✅
    'qwen/qwen3-32b',           // 1.8s, PT-PT ok ✅
  ]
  if (GROQ_KEY) {
    for (const groqModel of GROQ_MODELS) {
      const shortName = groqModel.split('/').pop() ?? groqModel
      process.stdout.write(` (Groq:${shortName}) `)
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: groqModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 3000,
          }),
        })
        if (!res.ok) { await res.text(); continue }
        const json = await res.json() as { choices: Array<{ message: { content: string } }> }
        const result = parseJsonArray(json.choices[0]?.message?.content ?? '[]', subject)
        if (result.length > 0) return result
      } catch {
        // tenta próximo modelo Groq
      }
    }
  }

  // ── 3.ª via: SambaNova (DeepSeek V3.1 + Llama 3.3-70B, ~1.5-2s) ────────────
  const SAMBA_KEY = process.env.SAMBANOVA_API_KEY
  const SAMBA_MODELS = [
    'DeepSeek-V3.1',                 // excelente qualidade matemática ✅
    'Meta-Llama-3.3-70B-Instruct',   // PT-PT confirmado ✅
  ]
  if (SAMBA_KEY) {
    for (const sambaModel of SAMBA_MODELS) {
      process.stdout.write(` (Samba:${sambaModel.split('-')[0]}) `)
      try {
        const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SAMBA_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: sambaModel, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 3000 }),
          signal: AbortSignal.timeout(20_000),
        })
        if (!res.ok) { await res.text(); continue }
        const json = await res.json() as { choices: Array<{ message: { content: string } }> }
        const result = parseJsonArray(json.choices[0]?.message?.content ?? '[]', subject)
        if (result.length > 0) return result
      } catch { /* tenta próximo */ }
    }
  }

  // ── 4.ª via: Cerebras (gpt-oss-120b, 0.6s) ───────────────────────────────
  const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY
  if (CEREBRAS_KEY) {
    process.stdout.write(` (Cerebras) `)
    try {
      const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CEREBRAS_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-oss-120b', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 3000 }),
        signal: AbortSignal.timeout(15_000),
      })
      if (res.ok) {
        const json = await res.json() as { choices: Array<{ message: { content: string } }> }
        const result = parseJsonArray(json.choices[0]?.message?.content ?? '[]', subject)
        if (result.length > 0) return result
      } else { await res.text() }
    } catch { /* continua */ }
  }

  // ── 5.ª via: GitHub Models (gpt-4o, via Azure AI) ────────────────────────
  const GITHUB_KEY = process.env.GITHUB_API_KEY
  if (GITHUB_KEY) {
    process.stdout.write(` (GitHub:gpt-4o) `)
    try {
      const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GITHUB_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 3000 }),
        signal: AbortSignal.timeout(20_000),
      })
      if (res.ok) {
        const json = await res.json() as { choices: Array<{ message: { content: string } }> }
        const result = parseJsonArray(json.choices[0]?.message?.content ?? '[]', subject)
        if (result.length > 0) return result
      } else { await res.text() }
    } catch { /* continua */ }
  }

  // ── 6.ª via: Mistral (mistral-small, PT-PT confirmado) ───────────────────
  const MISTRAL_KEY = process.env.MISTRAL_API_KEY
  if (MISTRAL_KEY) {
    process.stdout.write(` (Mistral) `)
    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${MISTRAL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 3000 }),
        signal: AbortSignal.timeout(20_000),
      })
      if (res.ok) {
        const json = await res.json() as { choices: Array<{ message: { content: string } }> }
        const result = parseJsonArray(json.choices[0]?.message?.content ?? '[]', subject)
        if (result.length > 0) return result
      } else { await res.text() }
    } catch { /* continua */ }
  }

  // ── 7.ª via: OpenRouter — modelos gratuitos testados (qualidade confirmada) ──
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
  const OR_FREE_MODELS = [
    'deepseek/deepseek-v4-flash:free',         // qualidade alta — pode ter rate-limit
    'nvidia/nemotron-3-super-120b-a12b:free',  // 120B, qualidade confirmada ✅
  ]
  if (OPENROUTER_KEY) {
    for (const orModel of OR_FREE_MODELS) {
      const shortName = orModel.split('/').pop()?.replace(':free', '') ?? orModel
      process.stdout.write(` (OR:${shortName}) `)
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://profai.netlify.app',
            'X-Title': 'PROF.IA Seeder',
          },
          body: JSON.stringify({
            model: orModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
          }),
        })
        if (!res.ok) {
          await res.text() // drain body
          // 402/429/503 = indisponível ou pago — tenta próximo modelo
          continue
        }
        const json = await res.json() as { choices: Array<{ message: { content: string } }> }
        const result = parseJsonArray(json.choices[0]?.message?.content ?? '[]', subject)
        if (result.length > 0) return result
      } catch {
        // rede ou timeout — tenta próximo modelo
      }
    }
  }

  // ── 3.ª via: Kimi K2.6 via OpenRouter (gratuito, qualidade verificada) ──────
  if (OPENROUTER_KEY) {
    process.stdout.write(' (Kimi K2.6) ')
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://profai.netlify.app',
          'X-Title': 'PROF.IA Seeder',
        },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2.6:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      })
      if (res.ok) {
        const json = await res.json() as { choices: Array<{ message: { content: string } }> }
        return parseJsonArray(json.choices[0]?.message?.content ?? '[]', subject)
      }
    } catch {
      // Kimi indisponível — continua para registo de falha
    }
  }

  // ── 4.ª via: Ollama local (qwen3:8b) — sem limites, sem custo ───────────────
  // Prompt reforçado para compensar menor capacidade do modelo local
  const ollamaAvailable = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })
    .then(r => r.ok).catch(() => false)

  if (ollamaAvailable) {
    process.stdout.write(' (Ollama qwen3:8b) ')
    try {
      const OLLAMA_SYSTEM = `És um professor experiente do ensino básico português, especializado em criar questões de avaliação pedagógica de alta qualidade para o 2.º ciclo (5.º e 6.º ano).

REGRAS ABSOLUTAS — nunca podes violar:
1. Português de Portugal SEMPRE: "actividade" (jamais "atividade"), "óptimo" (jamais "ótimo"), "ensino básico" (jamais "ensino fundamental"), "ficha" (jamais "prova diagnóstica")
2. Responde EXCLUSIVAMENTE com um array JSON válido — zero texto antes, zero texto depois, zero raciocínio visível
3. Matemática e ciências 100% correctas — verifica cada cálculo antes de escrever
4. Curriculum DGE rigoroso — só conteúdos do ano lectivo indicado
5. Cada questão completamente diferente das outras — contextos, dados e estrutura únicos
6. Para escolha múltipla: exactamente 4 opções (A, B, C, D); distratores plausíveis mas claramente incorrectos; apenas uma correcta
7. O campo "correctAnswer" para MCQ é APENAS a letra (ex: "C"), nunca o texto completo`

      // Prompt reforçado com exemplo explícito para o modelo local
      const ollamaPrompt = `/no_think

${prompt}

ATENÇÃO FINAL: A tua resposta deve começar imediatamente com "[" e terminar com "]". Nenhuma palavra antes ou depois. Nenhum raciocínio. Apenas o array JSON.`

      const res = await fetch('http://localhost:11434/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:8b',
          messages: [
            { role: 'system', content: OLLAMA_SYSTEM },
            { role: 'user',   content: ollamaPrompt },
          ],
          temperature: 0.5,   // mais baixa = output mais consistente e previsível
          stream: false,
        }),
      })
      if (res.ok) {
        const json = await res.json() as { choices: Array<{ message: { content: string } }> }
        const content = json.choices[0]?.message?.content ?? ''
        // Remove eventual pensamento residual entre <think>...</think>
        const cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
        return parseJsonArray(cleaned, subject)
      }
    } catch {
      // Ollama indisponível ou modelo não instalado — continua para registo de falha
    }
  }

  // Esgotadas todas as vias — regista para retry posterior
  logFailed(subject, yearLevel, topicName)
  throw new Error('Todos os modelos indisponíveis — tópico em .claude/seed-failed.json')
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱 PROF.IA — Question Bank Seeder')
  console.log('═'.repeat(54))
  if (isDryRun) console.log('⚠  MODO DRY-RUN — nada será guardado na base de dados\n')

  const SUPA_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const SUPA_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Recolher todas as keys disponíveis (rotação automática quando quota esgotada)
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter((k): k is string => !!k && k.trim().length > 0)

  if (geminiKeys.length === 0) { console.error('❌  Nenhuma GEMINI_API_KEY definida'); process.exit(1) }
  if (!SUPA_URL)    { console.error('❌  NEXT_PUBLIC_SUPABASE_URL não definida'); process.exit(1) }
  if (!SUPA_KEY)    { console.error('❌  SUPABASE_SERVICE_ROLE_KEY não definida'); process.exit(1) }

  console.log(`🔑  ${geminiKeys.length} key(s) Gemini disponíveis para rotação`)

  // Pool de instâncias — rotação gerida internamente em generateQuestionsForTopic
  const genAIPool = geminiKeys.map(k => new GoogleGenerativeAI(k))
  const supabase = createClient(SUPA_URL, SUPA_KEY)

  // ── Modo retry-failed: lê tópicos falhados e constrói plano ad-hoc ─────────
  if (isRetryFailed) {
    if (!existsSync(FAILED_LOG)) {
      console.log('✅  Sem tópicos falhados em .claude/seed-failed.json')
      return
    }
    const failed = JSON.parse(readFileSync(FAILED_LOG, 'utf-8')) as Array<{
      subject: string; yearLevel: number; topic: string
    }>
    console.log(`🔁  A retentar ${failed.length} tópicos falhados...\n`)

    // Limpa o log antes de retentar (os que falharem de novo voltam a entrar)
    writeFileSync(FAILED_LOG, '[]')

    let retryInserted = 0, retryErrors = 0
    for (const { subject, yearLevel, topic } of failed) {
      const cfg = SEED_PLAN.find(c => c.subject === subject && c.yearLevel === yearLevel)
      const topicCfg = cfg?.topics.find(t => t.name === topic)
      if (!topicCfg) { console.log(`  ⚠  Tópico não encontrado no plano: ${topic}`); continue }

      const topicShort = topic.split('—')[0].trim()
      process.stdout.write(`  ⏳  ${subject} ${yearLevel}.º — ${topicShort} ... `)
      try {
        const questions = await generateQuestionsForTopic(genAIPool, subject, yearLevel, topic, topicCfg.types, topicCfg.count, topicCfg.subtopics, topicCfg.difficulty)
        const rows = questions.filter(q => q.text && String(q.text).trim().length > 10).map(q => ({
          subject, year_level: yearLevel, topic,
          type: String(q.type ?? 'short_answer'),
          bloom_level: q.bloomLevel ? String(q.bloomLevel) : null,
          difficulty: String(q.difficulty ?? 'medium'),
          text: String(q.text ?? '').trim(),
          options: (q.options && Array.isArray(q.options) && (q.options as unknown[]).length > 0) ? q.options : null,
          correct_answer: String(q.correctAnswer ?? '').trim(),
          mark_scheme: q.markScheme ? String(q.markScheme) : null,
          figure: null, points: Number(q.points) || 5, allow_calculator: false,
          quality_score: 0.85, source: 'ai_seed',
          citation: `PROF.IA — Questão de semente gerada por IA (${subject}, ${yearLevel}.º ano, ${new Date().getFullYear()})`,
          source_url: null,
        }))
        if (!isDryRun && rows.length > 0) {
          const { data, error } = await supabase.from('question_bank').insert(rows).select('id')
          if (error) { process.stdout.write(`❌  ${error.message}\n`); retryErrors++ }
          else { retryInserted += (data ?? []).length; process.stdout.write(`✓  ${(data ?? []).length} guardadas\n`) }
        } else { process.stdout.write(`${questions.length} geradas (dry-run)\n`) }
        await new Promise(r => setTimeout(r, 8000))
      } catch (err) {
        const msg = err instanceof Error ? err.message.slice(0, 100) : String(err)
        process.stdout.write(`❌  ${msg}\n`)
        retryErrors++
        await new Promise(r => setTimeout(r, 12000))
      }
    }
    console.log(`\n✅  Retry: ${retryInserted} inseridas, ${retryErrors} erros`)
    return
  }

  // Filtra o plano conforme args
  const planToRun = SEED_PLAN.filter(c => {
    if (filterSubject && c.subject !== filterSubject)   return false
    if (filterYear    && c.yearLevel !== filterYear)    return false
    return true
  })

  const totalTopics = planToRun.reduce((n, c) => n + c.topics.length, 0)
  const approxQuestions = planToRun.reduce((n, c) => n + c.topics.reduce((m, t) => m + t.count, 0), 0)

  console.log(`Plano: ${planToRun.length} disciplinas/anos, ${totalTopics} tópicos, ~${approxQuestions} questões\n`)

  let totalInserted = 0
  let totalGenerated = 0
  let totalErrors   = 0
  let topicCounter  = 0  // round-robin: distribui carga pelas keys

  for (const config of planToRun) {
    console.log(`\n📚  ${config.subject} — ${config.yearLevel}.º ano`)
    console.log('─'.repeat(54))

    for (const topicConfig of config.topics) {
      const topicShort = topicConfig.name.split('—')[0].trim()
      const startKey = topicCounter % genAIPool.length
      process.stdout.write(`  ⏳  [k${startKey + 1}] ${topicShort} ... `)
      topicCounter++

      try {
        const questions = await generateQuestionsForTopic(
          genAIPool,
          config.subject,
          config.yearLevel,
          topicConfig.name,
          topicConfig.types,
          topicConfig.count,
          topicConfig.subtopics,
          topicConfig.difficulty,
          startKey
        )

        totalGenerated += questions.length
        process.stdout.write(`${questions.length} geradas`)

        if (!isDryRun) {
          const rows = questions
            .filter(q => q.text && String(q.text).trim().length > 10)
            .map(q => ({
              subject:          config.subject,
              year_level:       config.yearLevel,
              topic:            topicConfig.name,
              type:             String(q.type ?? 'short_answer'),
              bloom_level:      q.bloomLevel ? String(q.bloomLevel) : null,
              difficulty:       String(q.difficulty ?? 'medium'),
              text:             String(q.text ?? '').trim(),
              options:          (q.options && Array.isArray(q.options) && (q.options as unknown[]).length > 0) ? q.options : null,
              correct_answer:   String(q.correctAnswer ?? '').trim(),
              mark_scheme:      q.markScheme ? String(q.markScheme) : null,
              figure:           null,
              points:           Number(q.points) || 5,
              allow_calculator: false,
              quality_score:    0.85,   // semente com qualidade ligeiramente superior à geração on-demand
              source:           'ai_seed',
              citation:         `PROF.IA — Questão de semente gerada por IA (${config.subject}, ${config.yearLevel}.º ano, ${new Date().getFullYear()})`,
              source_url:       null,
            }))

          if (rows.length > 0) {
            const { data, error } = await supabase
              .from('question_bank')
              .insert(rows)
              .select('id')

            if (error) {
              process.stdout.write(` — ❌  Erro Supabase: ${error.message}\n`)
              totalErrors++
            } else {
              const inserted = (data ?? []).length
              totalInserted += inserted
              process.stdout.write(` — ✓  ${inserted} guardadas\n`)
            }
          } else {
            process.stdout.write(' — ⚠  nenhuma linha válida\n')
          }
        } else {
          process.stdout.write(' (dry-run)\n')
        }

        // Rate-limiting: 8s entre tópicos (Gemini free ≤ 15 RPM por chave)
        // Com 3 chaves e 8s/tópico → ~7.5 tópicos/min → cada chave vê ~2.5 req/min ← seguro
        await new Promise(r => setTimeout(r, 8_000))

      } catch (err) {
        // generateQuestionsForTopic já tentou todas as keys + cascade OpenRouter/Kimi/Ollama
        // Se chegou aqui, todos os modelos falharam — regista para retry
        const msg = err instanceof Error ? err.message.slice(0, 120) : String(err)
        process.stdout.write(` — ❌  ${msg}\n`)
        totalErrors++
        logFailed(config.subject, config.yearLevel, topicConfig.name)
        await new Promise(r => setTimeout(r, 8000))
      }
    }
  }

  console.log('\n' + '═'.repeat(54))
  console.log(`📊  Geradas: ${totalGenerated}`)
  if (!isDryRun) {
    console.log(`✅  Inseridas: ${totalInserted}`)
    if (totalErrors > 0) console.log(`❌  Erros: ${totalErrors}`)
  } else {
    console.log('   (dry-run — sem escrita na BD)')
  }
  console.log()
}

main().catch(err => {
  console.error('\n💥  Erro fatal:', err)
  process.exit(1)
})
