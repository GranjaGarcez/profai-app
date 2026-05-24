/**
 * Biblioteca Curricular — Aprendizagens Essenciais DGE
 * Fontes: https://www.dge.mec.pt/aprendizagens-essenciais-ensino-basico
 * Despacho n.º 8209/2021 (Matemática 2021/22) e AE anteriores para restantes disciplinas.
 *
 * Estrutura por disciplina → ano → { domínios, permitido, proibido }
 * Usado em /api/ai/generate para injectar restrição curricular no prompt.
 */

export interface CurriculumEntry {
  /** Domínios / temas organizadores com conteúdos específicos */
  domains: Array<{ name: string; topics: string[] }>
  /** O que É avaliável neste ano — phrased for AI prompt */
  canTest: string
  /** O que NÃO pertence a este ano — phrased for AI prompt */
  cannotTest: string
  /** URL do PDF oficial DGE */
  source: string
}

export type SubjectCurriculum = Partial<Record<number, CurriculumEntry>>
export type CurriculumDB = Record<string, SubjectCurriculum>

// ─────────────────────────────────────────────────────────────────────────────
// MATEMÁTICA  (AE 2021, Despacho 8209/2021)
// ─────────────────────────────────────────────────────────────────────────────
const matematica: SubjectCurriculum = {
  5: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/ae_mat_5.o_ano.pdf',
    domains: [
      {
        name: 'Números e Operações',
        topics: [
          'Números naturais: divisibilidade, MDC, MMC, critérios de divisibilidade',
          'Potências de base inteira e expoente natural',
          'Frações: representação, comparação, ordenação, equivalência',
          'Operações com frações: adição, subtração, multiplicação, divisão',
          'Números decimais: leitura, escrita, comparação, arredondamento',
          'Conversão frações ↔ decimais',
          'Percentagens: conceito, cálculo de % de um número, encontrar o total',
        ],
      },
      {
        name: 'Álgebra',
        topics: [
          'Sequências e regularidades numéricas',
          'Expressões numéricas com parênteses e prioridade das operações',
          'Propriedades das operações (comutativa, associativa, distributiva)',
        ],
      },
      {
        name: 'Geometria e Medida',
        topics: [
          'Ângulos: tipos, medição com transferidor, adição e subtração',
          'Triângulos: classificação (lados e ângulos), soma dos ângulos internos = 180°',
          'Quadriláteros: paralelogramos, trapézios, losangos — propriedades e classificação',
          'Circunferência e círculo: raio, diâmetro, corda, arco — relações',
          'Área do triângulo, do paralelogramo, do trapézio',
          'Sólidos geométricos: identificação e classificação de prismas, pirâmides, cilindros, cones, esferas',
          'Planificações de sólidos',
          'Volume do cubo e do paralelepípedo (V = c × l × a)',
          'Conversões de unidades de comprimento, área, capacidade e massa',
        ],
      },
      {
        name: 'Dados e Probabilidades',
        topics: [
          'Moda e média aritmética de um conjunto de dados',
          'Gráficos de barras, pictogramas, gráficos de linhas — leitura e construção',
          'Frequência absoluta e relativa',
          'Introdução à probabilidade: acontecimentos certos, impossíveis, prováveis',
        ],
      },
    ],
    canTest: 'Divisibilidade e MDC/MMC; potências; frações e decimais (representação, comparação, operações); percentagens; propriedades e áreas de figuras planas (triângulo, paralelogramo, trapézio); ângulos; circunferência e círculo; identificação e planificação de sólidos; volume do cubo e paralelepípedo; conversões de unidades; média e moda; gráficos de barras/linhas; introdução à probabilidade.',
    cannotTest: 'Volume do cilindro (6.º ano); números inteiros negativos (6.º ano); proporcionalidade inversa (6.º ano); semelhança de figuras (6.º ano); expressões algébricas formais; equações; teorema de Pitágoras.',
  },

  6: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/ae_mat_6.o_ano.pdf',
    domains: [
      {
        name: 'Números e Operações',
        topics: [
          'Números inteiros: representação na recta numérica, comparação, ordenação, simétrico',
          'Operações com inteiros: adição e subtração (incluindo negativos)',
          'Frações e decimais: revisão e aprofundamento das operações',
          'Percentagens: descontos, aumentos, IVA, problemas de percentagens em contexto',
          'Razão e proporção: conceito de razão, proporção, propriedade fundamental',
          'Proporcionalidade directa: identificação, tabelas, gráficos, constante de proporcionalidade',
          'Proporcionalidade inversa: conceito, tabelas, gráficos, produto constante',
          'Regra de três simples directa e inversa',
        ],
      },
      {
        name: 'Álgebra',
        topics: [
          'Expressões algébricas simples: valor numérico, simplificação',
          'Equações do 1.º grau simples (resolução por tentativa e verificação)',
        ],
      },
      {
        name: 'Geometria e Medida',
        topics: [
          'Semelhança de figuras: ampliação e redução, razão de semelhança',
          'Eixo de simetria de figuras planas',
          'Volume do cilindro: V = π × r² × h',
          'Conversões: cm³ ↔ mL, dm³ ↔ L, m³ ↔ kL (e vice-versa)',
          'Problemas envolvendo volume e capacidade em contexto real',
        ],
      },
      {
        name: 'Dados e Probabilidades',
        topics: [
          'Média, mediana e moda: cálculo e interpretação',
          'Gráficos circulares (de sectores): leitura e construção',
          'Diagramas de caule-e-folhas',
          'Probabilidade: espaço de resultados, probabilidade de um acontecimento (contagem)',
        ],
      },
    ],
    canTest: 'Números inteiros negativos (operações, recta numérica); percentagens em contexto (descontos, IVA); razão e proporção; proporcionalidade directa e inversa; semelhança de figuras (razão de semelhança, ampliação/redução); volume do CILINDRO (V=πr²h); conversões cm³↔mL, dm³↔L, m³↔kL; média, mediana, moda; gráficos circulares; probabilidade elementar.',
    cannotTest: 'Volume de pirâmides, prismas triangulares, cones ou esferas; teorema de Pitágoras; funções formais; equações do 2.º grau; trigonometria; semelhança de triângulos (critérios formais do 7.º ano).',
  },

  7: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/ae_mat_7.o_ano.pdf',
    domains: [
      { name: 'Números e Operações', topics: ['Números racionais: operações com positivos e negativos; potências com expoente inteiro negativo', 'Proporcionalidade: razão, proporção, percentagens em contexto avançado'] },
      { name: 'Álgebra', topics: ['Expressões algébricas: simplificação, adição, subtração, multiplicação', 'Equações do 1.º grau a uma incógnita: resolução algébrica, problemas'] },
      { name: 'Geometria e Medida', topics: ['Lugares geométricos; mediatriz e bissectriz', 'Triângulos: construção, congruência (critérios LLL, LAL, ALA)', 'Teorema de Pitágoras: enunciado e aplicação directa', 'Isometrias: reflexão, rotação, translação'] },
      { name: 'Dados e Probabilidades', topics: ['Histogramas e polígonos de frequência', 'Frequências relativas e acumuladas', 'Probabilidade: regra de Laplace, acontecimentos compostos simples'] },
    ],
    canTest: 'Operações com racionais (positivos e negativos); potências com expoente negativo; equações do 1.º grau a uma incógnita; expressões algébricas; congruência de triângulos; teorema de Pitágoras (aplicação directa); isometrias; histogramas; probabilidade com regra de Laplace.',
    cannotTest: 'Sistemas de equações; inequações; funções lineares/afins formais; semelhança de triângulos (critérios formais); volumes de sólidos de revolução; trigonometria.',
  },

  8: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/ae_mat_8.o_ano.pdf',
    domains: [
      { name: 'Números e Operações', topics: ['Radicais: raiz quadrada, simplificação, operações', 'Actividades de revisão de racionais'] },
      { name: 'Álgebra', topics: ['Sistemas de 2 equações do 1.º grau a 2 incógnitas: resolução por substituição, adição e gráfico', 'Inequações do 1.º grau a uma incógnita', 'Monómios e polinómios: operações, produtos notáveis'] },
      { name: 'Funções', topics: ['Conceito de função, domínio, contradomínio', 'Função linear (y = mx) e função afim (y = mx + b): gráfico, taxa de variação', 'Proporcionalidade directa como caso particular de função linear'] },
      { name: 'Geometria e Medida', topics: ['Teorema de Pitágoras: aplicações avançadas, recíproco', 'Semelhança de triângulos: critérios AA, LAL, LLL'] },
      { name: 'Dados e Probabilidades', topics: ['Diagrama de dispersão; correlação (introdução intuitiva)', 'Probabilidade condicional elementar'] },
    ],
    canTest: 'Radicais; sistemas de 2 equações; inequações do 1.º grau; monómios e polinómios; funções linear e afim (gráfico, equação, taxa de variação); teorema de Pitágoras (aplicações avançadas e recíproco); semelhança de triângulos (critérios); diagrama de dispersão.',
    cannotTest: 'Equações do 2.º grau; funções quadráticas; trigonometria; volumes de pirâmides/cones/esferas; estatística inferencial.',
  },

  9: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/ae_mat_9.o_ano.pdf',
    domains: [
      { name: 'Álgebra', topics: ['Equações do 2.º grau: fórmula resolvente, factorização, problemas', 'Sistemas de equações: revisão e problemas complexos', 'Potências e radicais: revisão alargada'] },
      { name: 'Funções', topics: ['Função quadrática (y = ax²+ bx + c): parábola, vértice, zeros', 'Funções: domínio, contradomínio, zeros, monotonia, extremos'] },
      { name: 'Geometria e Medida', topics: ['Trigonometria no triângulo rectângulo: seno, cosseno, tangente', 'Volumes de sólidos: pirâmide (V = ⅓Bh), cone (V = ⅓πr²h), esfera (V = ⁴⁄₃πr³)', 'Áreas de superfície de sólidos'] },
      { name: 'Dados e Probabilidades', topics: ['Probabilidade: regras da adição e da multiplicação', 'Análise combinatória elementar: permutações, combinações'] },
    ],
    canTest: 'Equações do 2.º grau; função quadrática (parábola, vértice, zeros); trigonometria (sen, cos, tg no triângulo rectângulo); volumes de pirâmides, cones e esferas; áreas de superfície de sólidos; probabilidade (regras de adição e multiplicação); combinatória elementar.',
    cannotTest: 'Limites, derivadas, integrais (ensino secundário); funções exponenciais/logarítmicas; cálculo diferencial.',
  },

  // ── ENSINO SECUNDÁRIO (Matemática A) ─────────────────────────────────────

  10: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/mat_a_10_-_vf.pdf',
    domains: [
      {
        name: 'Funções, Sucessões e Limites',
        topics: [
          'Funções reais de variável real: domínio, contradomínio, injectividade, sobrejectividade, bijectividade',
          'Operações com funções: soma, diferença, produto, quociente, composta',
          'Função inversa: condições de existência, representação gráfica',
          'Funções polinomiais: linear, quadrática e cúbica — gráfico, zeros, monotonia',
          'Função módulo: definição, gráfico, equações e inequações com módulos',
          'Função exponencial: a^x (a > 0, a ≠ 1) — propriedades, gráfico, base e',
          'Função logarítmica: log_a(x) — definição como inversa da exponencial, propriedades dos logaritmos',
          'Noção intuitiva de limite: limites elementares; assimptotas horizontais e verticais',
          'Continuidade: definição intuitiva, teorema de Bolzano (aplicação)',
        ],
      },
      {
        name: 'Trigonometria',
        topics: [
          'Ângulos em radianos: conversão graus ↔ radianos',
          'Circunferência trigonométrica: seno, cosseno e tangente de qualquer ângulo',
          'Valores exactos: 0, π/6, π/4, π/3, π/2 e múltiplos',
          'Identidades trigonométricas fundamentais: sin²x + cos²x = 1, tg = sin/cos',
          'Funções trigonométricas: sin x, cos x, tg x — periodicidade, gráficos, amplitude',
          'Equações trigonométricas elementares: sin x = k, cos x = k, tg x = k',
          'Fórmulas de adição: sin(a±b), cos(a±b)',
          'Trigonometria em triângulos: lei dos senos, lei dos cossenos',
        ],
      },
      {
        name: 'Geometria Analítica no Plano',
        topics: [
          'Distância entre dois pontos; ponto médio de um segmento',
          'Equação da mediatriz; equação da recta (reduzida, geral, vectorial)',
          'Rectas: paralelismo, perpendicularidade, ponto de intersecção',
          'Equação da circunferência: centro e raio; posições relativas ponto-circunferência',
          'Vectores no plano: operações, módulo, produto escalar, ângulo entre vectores',
        ],
      },
      {
        name: 'Estatística',
        topics: [
          'Revisão: média, mediana, moda, quartis, amplitude interquartil',
          'Variância e desvio padrão: interpretação e cálculo',
          'Diagramas de extremos e quartis (boxplot)',
          'Correlação linear: coeficiente de Pearson (interpretação)',
          'Regressão linear: recta de mínimos quadrados, coeficiente de determinação R²',
        ],
      },
    ],
    canTest: 'Funções reais (domínio, continuidade, injectividade); função exponencial e logarítmica (propriedades, gráficos, equações); limites elementares e assimptotas; trigonometria na circunferência (valores exactos, identidades, equações); funções trigonométricas (gráfico, periodicidade); lei dos senos e cossenos; geometria analítica (rectas, circunferência, vectores); estatística (variância, desvio padrão, correlação, regressão linear).',
    cannotTest: 'Derivadas (11.º); cálculo integral (12.º); números complexos (12.º); geometria no espaço (12.º).',
  },

  11: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/mat_a_11_-_vf.pdf',
    domains: [
      {
        name: 'Cálculo Diferencial',
        topics: [
          'Taxa de variação média e taxa de variação instantânea: conceito e interpretação',
          'Derivada: definição como limite do quociente incremental',
          'Derivadas de funções elementares: constante, identidade, potência, exponencial, logarítmica, trigonométricas',
          'Regras de derivação: linearidade, produto, quociente, função composta (regra da cadeia)',
          'Derivadas de ordem superior: concavidade e pontos de inflexão',
          'Monotonia e extremos: teorema de Fermat, critério da derivada primeira e segunda',
          'Estudo completo de funções: domínio, continuidade, assimptotas, monotonia, extremos, concavidades, inflexão, gráfico',
          'Teorema de Lagrange (valor médio) — aplicação',
          'Optimização: problemas de máximos e mínimos em contexto real',
        ],
      },
      {
        name: 'Probabilidades',
        topics: [
          'Revisão de combinatória: arranjos, permutações, combinações, binómio de Newton',
          'Probabilidade condicionada: P(A|B); independência de acontecimentos',
          'Teorema de Bayes (aplicação elementar)',
          'Variável aleatória discreta: distribuição de probabilidade, esperança matemática, variância',
          'Distribuição binomial: B(n, p) — parâmetros, cálculo de probabilidades, esperança, variância',
          'Variável aleatória contínua: introdução; função densidade de probabilidade (conceito)',
          'Distribuição normal: curva de Gauss, parâmetros μ e σ; tabela da normal padrão N(0,1); estandardização',
        ],
      },
    ],
    canTest: 'Derivada (definição, regras: produto, quociente, cadeia); derivadas de funções elementares (exponencial, logarítmica, trigonométricas); monotonia e extremos com critério da derivada; concavidade e inflexão; estudo completo de funções; optimização em contexto; combinatória (arranjos, combinações, binómio de Newton); probabilidade condicionada; distribuição binomial (parâmetros, cálculo); distribuição normal (estandardização, tabela N(0,1)).',
    cannotTest: 'Cálculo integral (12.º); números complexos (12.º); geometria no espaço vectorial (12.º); equações diferenciais.',
  },

  12: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/12_matematica_a.pdf',
    domains: [
      {
        name: 'Cálculo Integral',
        topics: [
          'Primitivas: definição de primitiva e primitiva geral (F(x) + C)',
          'Primitivas imediatas: potências, exponencial, seno, cosseno, 1/x',
          'Regras de primitivação: linearidade, primitivação por partes, primitivação por substituição',
          'Integral definido: definição (soma de Riemann), interpretação geométrica (área)',
          'Teorema fundamental do cálculo (regra de Barrow): ∫ₐᵇ f(x) dx = F(b) − F(a)',
          'Cálculo de áreas: região entre a curva e o eixo Ox; região entre duas curvas',
          'Volumes de revolução (introdução): V = π ∫ₐᵇ [f(x)]² dx',
        ],
      },
      {
        name: 'Números Complexos',
        topics: [
          'Forma algébrica: z = a + bi; parte real e parte imaginária',
          'Operações: adição, subtração, multiplicação, divisão; conjugado',
          'Módulo de um número complexo: |z| = √(a² + b²)',
          'Forma trigonométrica (polar): r(cos θ + i sin θ); argumento de um número complexo',
          'Fórmula de Moivre: z^n = r^n (cos nθ + i sin nθ)',
          'Representação no plano de Argand (plano complexo)',
          'Raízes de equações com coeficientes reais: teorema das raízes complexas conjugadas',
        ],
      },
      {
        name: 'Geometria no Espaço (Vectores e Geometria Analítica 3D)',
        topics: [
          'Vectores no espaço: operações, módulo, produto escalar; ângulo entre vectores',
          'Produto vectorial: definição, propriedades, aplicação (área de paralelogramo)',
          'Equação vectorial, paramétrica e cartesiana de uma recta no espaço',
          'Equação do plano: forma vectorial e cartesiana; normal ao plano',
          'Posições relativas: recta-recta, recta-plano, plano-plano',
          'Distância: ponto a recta, ponto a plano',
        ],
      },
      {
        name: 'Probabilidades — Revisão e Aprofundamento',
        topics: [
          'Revisão da distribuição normal e distribuição binomial',
          'Intervalo de confiança para uma proporção (introdução)',
          'Testes de hipóteses elementares (conceito, erro tipo I e II — nível de significância)',
        ],
      },
    ],
    canTest: 'Primitivas imediatas e regras de primitivação (partes, substituição); integral definido (regra de Barrow); cálculo de áreas com integral; volumes de revolução; números complexos (forma algébrica e trigonométrica, módulo, argumento, fórmula de Moivre, conjugado); geometria no espaço (vectores, produto escalar e vectorial, equações de rectas e planos, distâncias); revisão de distribuição normal e intervalo de confiança.',
    cannotTest: 'Equações diferenciais; séries de Fourier; álgebra linear formal; análise complexa.',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTUGUÊS  (AE 2018, 2.º e 3.º ciclo)
// ─────────────────────────────────────────────────────────────────────────────
const portugues: SubjectCurriculum = {
  5: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/5_portugues.pdf',
    domains: [
      { name: 'Oralidade', topics: ['Compreensão oral: extrair informação, seguir instrução', 'Expressão oral: relatar, descrever, argumentar com apoio'] },
      { name: 'Leitura e Educação Literária', topics: ['Textos narrativos: conto, novela; narrador, personagem, espaço, tempo, acção', 'Textos poéticos: verso, estrofe, rima, ritmo, figuras de estilo (comparação, metáfora, personificação)', 'Texto expositivo-informativo: ideia principal, estrutura', 'PNLL 5.º ano: obras do plano nacional de leitura obrigatórias para o ano lectivo'] },
      { name: 'Escrita', topics: ['Texto narrativo: planificação, textualização, revisão', 'Texto de opinião simples', 'Resumo de texto informativo', 'Ortografia, pontuação e acentuação'] },
      { name: 'Gramática', topics: ['Classes de palavras: nome, adjectivo, determinante, pronome, verbo (modos e tempos), advérbio, preposição, conjunção', 'Morfologia verbal: conjugação de verbos regulares e irregulares frequentes', 'Frase simples: sujeito e predicado; complemento directo e indirecto', 'Tipos de frase: declarativa, interrogativa, exclamativa, imperativa; forma afirmativa e negativa', 'Processos de formação de palavras: derivação (prefixação, sufixação), composição'] },
    ],
    canTest: 'Compreensão de textos narrativos e poéticos; identificação de recursos expressivos (comparação, metáfora, personificação); produção de texto narrativo e de opinião; classes de palavras; funções sintácticas (sujeito, predicado, CD, CI); conjugação verbal; tipos de frase; formação de palavras; ortografia e pontuação.',
    cannotTest: 'Análise sintáctica de orações subordinadas (7.º ano); coesão e progressão textual formal (7.º ano); texto argumentativo completo (6.º/7.º ano).',
  },

  6: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/6_portugues.pdf',
    domains: [
      { name: 'Oralidade', topics: ['Exposição oral estruturada; debate com tomada de posição e argumentação'] },
      { name: 'Leitura e Educação Literária', topics: ['Textos narrativos mais extensos; análise de personagem, intenção do autor, subtexto', 'Texto dramático: introdução', 'Texto argumentativo: tese, argumentos, conclusão', 'PNLL 6.º ano: obras obrigatórias'] },
      { name: 'Escrita', topics: ['Texto argumentativo: defesa de ponto de vista com argumentos', 'Texto narrativo com diálogo integrado', 'Carta, email formal', 'Revisão: coesão textual, conectores'] },
      { name: 'Gramática', topics: ['Análise sintáctica: sujeito simples/composto, predicado, complemento directo/indirecto, complemento oblíquo, vocativo', 'Voz activa e voz passiva; transformação', 'Discurso directo e indirecto: transformação', 'Sinonímia, antonímia, paronímia, homonímia', 'Relações de sentido entre palavras; campo lexical e semântico'] },
    ],
    canTest: 'Compreensão leitora de narrativa, poesia, texto dramático, texto argumentativo; produção de texto argumentativo e narrativo; análise sintáctica completa (CD, CI, CO, vocativo); voz activa/passiva; discurso directo/indirecto; relações de sentido (sinonímia, antonímia); campo lexical/semântico.',
    cannotTest: 'Orações subordinadas completivas/relativas/adverbiais (7.º-9.º ano); retórica avançada; análise estilística aprofundada.',
  },

  7: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/portugues_3c_7a_ff.pdf',
    domains: [
      { name: 'Leitura', topics: ['Os Lusíadas (excertos): épica, estância, narrador épico', 'Conto literário do século XX', 'Texto de imprensa: notícia, reportagem, editorial'] },
      { name: 'Escrita', topics: ['Texto de argumentação formal; artigo de opinião', 'Texto expositivo-argumentativo'] },
      { name: 'Gramática', topics: ['Oração e tipos de orações: coordenadas e subordinadas', 'Subordinação: completivas, relativas, adverbiais', 'Funções sintácticas: modificador do grupo nominal e do grupo verbal', 'Processos fonológicos'] },
    ],
    canTest: 'Excertos de Os Lusíadas; conto; texto de imprensa; artigo de opinião; orações coordenadas e subordinadas; funções sintácticas (modificador do GN e GV); processos fonológicos.',
    cannotTest: 'Poesia do século XX (8.º); Memorial do Convento (8.º); figuras de retórica avançadas.',
  },

  8: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/portugues_3c_8a_ff.pdf',
    domains: [
      { name: 'Leitura', topics: ['Memorial do Convento (Saramago): romance histórico, estilo, narrador', 'Poesia do século XX (Sophia, Eugénio de Andrade, Cesariny)', 'Texto de imprensa avançado; crónica'] },
      { name: 'Escrita', topics: ['Texto expositivo com base em pesquisa; síntese', 'Artigo de opinião desenvolvido'] },
      { name: 'Gramática', topics: ['Período e frase; pontuação em orações', 'Semântica: campos semânticos, conotação/denotação', 'Análise de texto: coesão lexical e gramatical'] },
    ],
    canTest: 'Memorial do Convento; poesia do século XX; crónica; texto expositivo-argumentativo; coesão textual; semântica (conotação/denotação); análise sintáctica de orações complexas.',
    cannotTest: 'Mensagem de Pessoa (9.º); auto-representação literária avançada.',
  },

  9: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/portugues_3c_9a_ff.pdf',
    domains: [
      { name: 'Leitura', topics: ['Mensagem (Fernando Pessoa): heterónimos, saudosismo, sebastianismo', 'Texto dramático: Frei Luís de Sousa ou obra equivalente', 'Textos dos media: entrevista, recensão'] },
      { name: 'Escrita', topics: ['Texto de argumentação formal consolidado', 'Recensão crítica breve'] },
      { name: 'Gramática', topics: ['Revisão e consolidação de toda a gramática do ensino básico', 'Análise textual completa: coesão, progressão, modalização'] },
    ],
    canTest: 'Mensagem de Pessoa; texto dramático; argumentação formal; análise textual (coesão, progressão, modalização); revisão de toda a gramática.',
    cannotTest: 'Conteúdos do ensino secundário.',
  },

  // ── ENSINO SECUNDÁRIO ────────────────────────────────────────────────────

  10: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/10_portugues.pdf',
    domains: [
      {
        name: 'Educação Literária',
        topics: [
          'Os Lusíadas (Camões): epopeia, estrutura (Proposição, Invocação, Dedicatória, Narração), narrador épico, maravilhoso pagão e cristão',
          'Excertos obrigatórios: Inês de Castro, Episódio dos Lusíadas, Adamastor, Ilha dos Amores',
          'Lírica de Camões: redondilhas e sonetos — temas (amor, saudade, desconcerto do mundo), figuras de estilo',
          'Conto de autor do século XX (obra do PNL para o 10.º ano)',
          'Texto de imprensa: editorial, artigo de opinião, crónica',
        ],
      },
      {
        name: 'Oralidade e Escrita',
        topics: [
          'Exposição oral: estruturação, adequação ao contexto, registo formal',
          'Texto de apreciação crítica: estrutura (tese, argumentos, conclusão)',
          'Texto de argumentação: coesão, progressão temática, conectores discursivos',
          'Resumo e síntese a partir de múltiplos textos',
        ],
      },
      {
        name: 'Gramática',
        topics: [
          'Revisão e aprofundamento da sintaxe: orações subordinadas (completivas, relativas, adverbiais)',
          'Semântica: valores dos tempos verbais (indicativo, conjuntivo, condicional)',
          'Modalidade e modalização: marcadores de certeza, probabilidade, obrigatoriedade',
          'Figuras de retórica: anáfora, antítese, hipérbole, eufemismo, ironia, metáfora, metonímia',
          'Análise estilística: construção do sentido, efeitos expressivos',
        ],
      },
    ],
    canTest: 'Os Lusíadas (excertos obrigatórios, narrador épico, maravilhoso, figuras de estilo); lírica de Camões (temas, forma, recursos expressivos); conto de autor do século XX; texto de opinião/crónica/editorial; produção de texto de apreciação crítica e argumentativo; sintaxe (orações subordinadas); modalização; figuras de retórica; análise estilística.',
    cannotTest: 'Fernando Pessoa (11.º); Os Maias (11.º); Vergílio Ferreira (12.º); poesia do século XIX (12.º).',
  },

  11: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/11_portugues.pdf',

    domains: [
      {
        name: 'Educação Literária',
        topics: [
          'Fernando Pessoa e heterónimos: Alberto Caeiro (anti-metafísica, sensacionismo elementar), Ricardo Reis (odes clássicas, epicurismo), Álvaro de Campos (sensacionismo, "Tabacaria", "Ode Triunfal"), Fernando Pessoa ortónimo ("Autopsicografia", "Isto")',
          'Os Maias (Eça de Queirós): romance realista, crítica à sociedade oitocentista, personagens, estrutura narrativa, estilo',
          'Excertos de Os Maias obrigatórios: cenas selecionadas (Jantar no Hotel Central, desfecho)',
          'Texto poético do século XX: um autor adicional (Sophia de Mello Breyner, Eugénio de Andrade ou equivalente)',
          'Texto dramático: Felizmente Há Luar! (Luís de Sttau Monteiro) ou obra equivalente',
        ],
      },
      {
        name: 'Oralidade e Escrita',
        topics: [
          'Debate formal: tomada de posição, refutação, síntese',
          'Dissertação: estrutura (tese, desenvolvimento, conclusão), coesão argumentativa',
          'Texto de apreciação crítica aprofundado',
          'Análise comentada de textos literários',
        ],
      },
      {
        name: 'Gramática',
        topics: [
          'Semântica lexical: polissemia, ambiguidade, ironia, sarcasmo',
          'Análise do discurso: tipos de texto, sequências textuais (narrativa, descritiva, argumentativa, explicativa)',
          'Intertextualidade: referência, citação, alusão, paródia',
          'Revisão geral da gramática normativa para o Exame Nacional',
        ],
      },
    ],
    canTest: 'Fernando Pessoa (os quatro heterónimos/ortónimo, temas, formas, poemas obrigatórios); Os Maias (Eça — realismo, crítica social, personagens, excertos obrigatórios); texto dramático (Felizmente Há Luar! ou equivalente); dissertação e texto de apreciação crítica; análise do discurso; intertextualidade; semântica lexical.',
    cannotTest: 'Antero de Quental e Cesário Verde (12.º); Vergílio Ferreira (12.º); conteúdos do ensino superior.',
  },

  12: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/12_portugues.pdf',
    domains: [
      {
        name: 'Educação Literária',
        topics: [
          'Poesia do século XIX: Antero de Quental (Sonetos — pessimismo, questão social, misticismo) e Cesário Verde (O Livro de Cesário Verde — realismo, Lisboa, quotidiano urbano)',
          'Vergílio Ferreira: romance existencialista; Aparição ou obra equivalente — temas do ser, identidade, morte, liberdade',
          'Excertos obrigatórios de prosa e poesia para o Exame Nacional de Português',
          'Texto não-literário: reportagem, entrevista, discurso político, ensaio curto',
        ],
      },
      {
        name: 'Oralidade e Escrita',
        topics: [
          'Dissertação: argumentação estruturada com base em textos (escrita de síntese e posição)',
          'Texto de apreciação crítica: análise literária aprofundada',
          'Revisão e consolidação dos géneros textuais do ensino secundário',
          'Preparação para o Exame Nacional: análise de textos, produção escrita (grupo I, II, III)',
        ],
      },
      {
        name: 'Gramática',
        topics: [
          'Consolidação de toda a gramática do ensino secundário e básico',
          'Análise textual: coesão referencial, lexical e gramatical; progressão temática',
          'Modalização e polifonia: vozes no texto, responsabilidade enunciativa',
          'Figuras de estilo avançadas e análise do estilo de cada autor',
        ],
      },
    ],
    canTest: 'Antero de Quental (sonetos, temas, estilo); Cesário Verde (poemas de O Livro, realismo, quotidiano); Vergílio Ferreira (romance existencialista, temas, personagens, excertos); texto não-literário (reportagem, entrevista); dissertação e apreciação crítica para exame; coesão e progressão textual; modalização e polifonia.',
    cannotTest: 'Conteúdos do ensino superior; análise textual académica avançada.',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// CIÊNCIAS NATURAIS  (AE 2018, 2.º ciclo | AE ff, 3.º ciclo)
// ─────────────────────────────────────────────────────────────────────────────
const cienciasNaturais: SubjectCurriculum = {
  5: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/5_ciencias_naturais.pdf',
    domains: [
      {
        name: 'A Terra em transformação — Materiais Terrestres',
        topics: [
          'A água: estados físicos, ciclo da água, propriedades, importância para os seres vivos',
          'O ar: composição (azoto, oxigénio, dióxido de carbono, outros), propriedades, importância',
          'As rochas e o solo: tipos de rochas (eruptivas, sedimentares, metamórficas), formação, constituição do solo, importância',
          'Relações entre materiais terrestres e seres vivos',
        ],
      },
      {
        name: 'A Terra em transformação — Diversidade de Seres Vivos',
        topics: [
          'Célula: unidade básica de vida; célula animal vs. célula vegetal (parede celular, cloroplastos, vacúolo)',
          'Organização dos seres vivos: célula → tecido → órgão → sistema → organismo',
          'Classificação dos seres vivos: critérios, reinos (animais, plantas, fungos, protistas, moneras)',
          'Biodiversidade: adaptações dos seres vivos ao meio (aquático, terrestre, aéreo)',
          'Relações entre seres vivos: predação, parasitismo, mutualismo, comensalismo',
          'Cadeias e teias alimentares; produtores, consumidores, decompositores',
          'Fotossíntese: conceito geral, importância, factores (luz, CO₂, água, clorofila)',
        ],
      },
    ],
    canTest: 'Estados físicos e ciclo da água; composição e propriedades do ar; tipos de rochas e constituição do solo; célula animal e vegetal (estrutura e diferenças); organização dos seres vivos (célula→organismo); classificação em reinos; adaptações ao meio; relações entre seres vivos (predação, parasitismo, mutualismo); cadeias alimentares; fotossíntese (conceito, factores, importância).',
    cannotTest: 'Sistemas do corpo humano detalhados (6.º ano); sistema imunitário (6.º ano); reprodução (6.º ano); genética; evolução.',
  },

  6: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/6_ciencias_naturais.pdf',
    domains: [
      {
        name: 'Sustentabilidade na Terra — Processos Vitais Comuns aos Seres Vivos',
        topics: [
          'Nutrição: sistema digestivo humano (órgãos, funções, digestão mecânica e química), absorção, assimilação',
          'Respiração: sistema respiratório (órgãos e funções), trocas gasosas nos alvéolos, respiração celular',
          'Circulação: sistema circulatório (coração, vasos sanguíneos, sangue e constituintes), pequena e grande circulação',
          'Excreção: sistema excretor (rins, ureteres, bexiga, uretra), urina, importância da excreção; pele como órgão excretor',
          'Reprodução humana: sistema reprodutor masculino e feminino, fecundação, desenvolvimento fetal, parto',
          'Reprodução em plantas: reprodução sexuada (flor, polinização, fecundação, fruto, semente) e assexuada',
        ],
      },
      {
        name: 'Sustentabilidade na Terra — Agressões do Meio e Integridade do Organismo',
        topics: [
          'Saúde e doença: conceito de saúde (OMS), agentes patogénicos (vírus, bactérias, fungos, parasitas)',
          'Sistema imunitário: barreiras físicas e químicas, defesas inespecíficas (fagocitose, inflamação), defesas específicas (anticorpos, linfócitos)',
          'Vacinação e soro: mecanismo, importância na prevenção de doenças',
          'Doenças não-transmissíveis: factores de risco (tabaco, álcool, sedentarismo, alimentação)',
          'Medidas de higiene e saúde pública',
        ],
      },
    ],
    canTest: 'Sistema digestivo (órgãos, funções, digestão mecânica/química); sistema respiratório (órgãos, trocas gasosas); sistema circulatório (coração, vasos, sangue, circuitos); sistema excretor (rins, urina); reprodução humana (órgãos, fecundação, desenvolvimento); reprodução em plantas (flor, polinização, fruto); saúde e doença (agentes patogénicos); sistema imunitário (defesas específicas/inespecíficas, vacinação); factores de risco de doenças não-transmissíveis.',
    cannotTest: 'Sistema nervoso e sistema endócrino (7.º ano); genética e hereditariedade (8.º ano); evolução e selecção natural (9.º ano).',
  },

  7: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/ciencias_naturais_3c_7a_ff.pdf',
    domains: [
      { name: 'Terra em transformação', topics: ['Estrutura interna da Terra; geodinâmica interna', 'Tectónica de placas: evidências, movimentos, consequências (sismos, vulcões, montanhas)', 'Rochas magmáticas, sedimentares, metamórficas: ciclo das rochas', 'Recursos geológicos: importância económica e sustentabilidade'] },
    ],
    canTest: 'Estrutura interna da Terra; tectónica de placas (evidências, movimentos, sismos, vulcões); ciclo das rochas (magmáticas, sedimentares, metamórficas); recursos geológicos. Nota: o 7.º ano de CN foca-se essencialmente em Geologia.',
    cannotTest: 'Sistemas do corpo humano (6.º ano); genética (8.º); evolução (9.º).',
  },

  8: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/ciencias_naturais_3c_8a_ff.pdf',
    domains: [
      { name: 'Sustentabilidade na Terra — Biologia', topics: ['Sistema nervoso: neurónio, impulso nervoso, SNC e SNP, acto reflexo', 'Sistema endócrino: glândulas, hormonas, regulação', 'Reprodução e manipulação da reprodução', 'Crescimento e desenvolvimento', 'Genética: ADN, gene, cromossoma, hereditariedade, leis de Mendel (conceito básico)'] },
    ],
    canTest: 'Sistema nervoso (neurónio, reflexos, SNC/SNP); sistema endócrino (hormonas, regulação); genética (ADN, gene, cromossoma, conceito de hereditariedade, leis de Mendel básicas).',
    cannotTest: 'Evolução (9.º); ecossistemas avançados (9.º); biotecnologia aprofundada.',
  },

  9: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/ciencias_naturais_3c_9a_ff.pdf',
    domains: [
      { name: 'Viver melhor na Terra', topics: ['Evolução biológica: evidências, selecção natural (Darwin), adaptação', 'Mutações e variabilidade genética', 'Ecossistemas: dinâmica de populações, perturbações, sustentabilidade', 'Impactes humanos no ambiente; desenvolvimento sustentável'] },
    ],
    canTest: 'Evolução (evidências, selecção natural, adaptação); mutações; dinâmica de ecossistemas; impactes ambientais; desenvolvimento sustentável.',
    cannotTest: 'Bioquímica avançada; biotecnologia (ensino secundário).',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTÓRIA E GEOGRAFIA DE PORTUGAL  (2.º ciclo — disciplina única)
// ─────────────────────────────────────────────────────────────────────────────
const hgp: SubjectCurriculum = {
  5: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/5_historia_e_geografia_de_portugal.pdf',
    domains: [
      {
        name: 'A Península Ibérica — quadro natural e primeiros povos',
        topics: [
          'Localização da Península Ibérica na Europa e no Mundo',
          'Relevo, rios e clima da Península Ibérica',
          'Pré-história na Península Ibérica: Paleolítico, Neolítico, Calcolítico',
          'Povos da Antiguidade: Fenícios, Gregos, Cartagineses',
          'Romanização: conquista, organização administrativa, romanização da língua e cultura; Lusitânia',
          'Povos germânicos: Visigodos — invasão e reino visigótico',
          'Islão na Península Ibérica: conquista muçulmana, al-Ândalus, contributos culturais',
        ],
      },
      {
        name: 'A Formação de Portugal',
        topics: [
          'Reconquista cristã: reinos cristãos, reconquista, Condado Portucalense',
          'D. Afonso Henriques: Batalha de S. Mamede (1128), independência (1143), Batalha de Ourique (lenda)',
          'Formação do Reino de Portugal: fronteiras, 1.ª Dinastia (Afonsina)',
          'Consolidação do território: D. Dinis, povo, clero, nobreza — estrutura social',
          'Crise de 1383-85: D. Fernando, D. João I, Aljubarrota, Tratado de Windsor',
          '2.ª Dinastia (Avis): D. João I, D. Pedro, D. Henrique — condições para a expansão',
        ],
      },
      {
        name: 'Portugal e o Mundo — Expansão',
        topics: [
          'Causas da expansão portuguesa: razões económicas, técnicas, políticas e religiosas',
          'Conquista de Ceuta (1415): início da expansão',
          'Reconhecimento da costa africana: D. Henrique, caravela, Cabo Bojador',
          'Chegada à Índia: Vasco da Gama (1498)',
          'Descobrimento do Brasil: Pedro Álvares Cabral (1500)',
          'Vida quotidiana no século XV: cidade, campo, feiras, comércio',
        ],
      },
    ],
    canTest: 'Localização e quadro natural da Península Ibérica; pré-história; romanização (Lusitânia, língua, cultura); visigodos; islão na Península Ibérica; formação de Portugal (Condado Portucalense, D. Afonso Henriques, independência 1143); crise de 1383-85 e D. João I; expansão portuguesa (causas, Ceuta 1415, Vasco da Gama, Cabral); vida quotidiana medieval.',
    cannotTest: 'Portugal nos séculos XVI-XVIII (6.º ano); revoluções liberais (6.º ano); século XX português (6.º ano).',
  },

  6: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/6_historia_e_geografia_de_portugal.pdf',
    domains: [
      {
        name: 'Portugal nos séculos XVI e XVII',
        topics: [
          'Império português: Brasil, África, Ásia — extensão e organização',
          'Riqueza e conflitos: cobiça europeia, piratas, declínio',
          'Sociedade e cultura do século XVI: humanismo, arte manuelina (Mosteiro dos Jerónimos, Torre de Belém)',
          'Crise dinástica: D. Sebastião, Alcácer Quibir (1578), Filippe II — União Ibérica (1580-1640)',
          'Restauração da Independência: D. João IV (1640)',
        ],
      },
      {
        name: 'Portugal no século XVIII',
        topics: [
          'D. João V: riqueza do Brasil (ouro e diamantes), arte barroca',
          'Marquês de Pombal e D. José I: reformas iluministas, reconstrução de Lisboa após o terramoto (1755)',
          'Iluminismo e reformas educativas',
        ],
      },
      {
        name: 'Portugal nos séculos XIX e XX',
        topics: [
          'Liberalismo: invasões francesas, revolução liberal de 1820, Constituição',
          'Monarquia Constitucional: lutas liberais (miguelismo vs. cartismo), rotativismo',
          'República: implantação (5 de Outubro de 1910), I República',
          'Estado Novo: Ditadura Militar, Salazar, PIDE, guerras coloniais',
          '25 de Abril de 1974: causas, revolução, consequências',
          'Democracia: Constituição de 1976, adesão à CEE (1986), Portugal hoje',
        ],
      },
      {
        name: 'Portugal: quadro geográfico actual',
        topics: [
          'Portugal continental e regiões autónomas (Açores e Madeira)',
          'Divisão administrativa: distritos, municípios, freguesias (NUTS)',
          'População portuguesa: distribuição, densidade, envelhecimento, migrações',
          'Actividades económicas: sectores primário, secundário e terciário em Portugal',
        ],
      },
    ],
    canTest: 'Império português no século XVI; arte manuelina; União Ibérica e Restauração; D. João V e ouro do Brasil; arte barroca; Marquês de Pombal e terramoto de 1755; liberalismo (invasões, 1820, Constituição); República (1910); Estado Novo (Salazar, PIDE); 25 de Abril de 1974; democracia e adesão à CEE; quadro geográfico actual de Portugal (regiões, população, economia).',
    cannotTest: 'Conteúdos de História geral do 7.º-9.º ano (pré-história, Roma, Grécia — já foram no 5.º).',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTÓRIA  (3.º ciclo)
// ─────────────────────────────────────────────────────────────────────────────
const historia: SubjectCurriculum = {
  7: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/historia_3c_7a_ff.pdf',
    domains: [
      { name: 'Das sociedades recolectoras às primeiras civilizações', topics: ['Pré-história: Paleolítico, Neolítico, revolução agrícola; megalitismo', 'Primeiras civilizações: Mesopotâmia (sumérios, escrita cuneiforme), Egipto (Nilo, faraó, escrita hieroglífica, pirâmides)', 'Hebreus, Fenícios: monoteísmo, alfabeto'] },
      { name: 'A Herança do Mediterrâneo Antigo', topics: ['Grécia: cidades-estado, democracia ateniense (Péricles), cultura e mitologia, guerras pérsicas e do Peloponeso', 'Roma: república, império, Augusto; romanização da Europa; queda do Império Romano', 'Cristandade medieval: expansão do Cristianismo; papel da Igreja'] },
      { name: 'A Europa no Período Medieval', topics: ['Feudalismo: organização social (rei, nobreza, clero, servos), castelos, suserania/vassalagem', 'A Europa cristã: Cruzadas, cultura medieval, universidades, arte românica e gótica', 'O islão: Maomé, expansão, contributos científicos e culturais', 'Expansão europeia: viagens dos descobrimentos (Portugal, Espanha)'] },
    ],
    canTest: 'Pré-história (Paleolítico/Neolítico, revolução agrícola); Mesopotâmia e Egipto (civilizações, escrita, organização); Grécia (democracia, polis, cultura); Roma (república, império, romanização); feudalismo (organização social, castelos); Cruzadas; islão (origem, expansão); descobrimentos.',
    cannotTest: 'Renascimento (8.º); Revolução Industrial (8.º); Guerras Mundiais (9.º).',
  },

  8: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/historia_3c_8a_ff.pdf',
    domains: [
      { name: 'O Mundo Moderno', topics: ['Renascimento: humanismo, arte (Leonardo, Miguel Ângelo, Rafael), ciência (Galileu, Copérnico)', 'Reforma religiosa: Lutero, Calvino, Contra-Reforma, Concílio de Trento', 'Absolutismo: Luís XIV (Versalhes, mercantilismo), absolutismo iluminado', 'Iluminismo: Locke, Montesquieu, Rousseau, Voltaire; Enciclopédia'] },
      { name: 'A Era das Revoluções', topics: ['Revolução Americana (1776): causas, Declaração da Independência, Constituição', 'Revolução Francesa (1789): causas, fases, Declaração dos Direitos do Homem, Napoleão', 'Revolução Industrial: causas (Inglaterra), máquina a vapor, urbanização, classes sociais, movimento operário', 'Liberalismo e Nacionalismo no século XIX; unificação alemã e italiana'] },
    ],
    canTest: 'Renascimento (humanismo, arte, ciência); Reforma e Contra-Reforma; absolutismo (Luís XIV); Iluminismo (filósofos, ideias); Revolução Americana; Revolução Francesa (causas, fases, Declaração, Napoleão); Revolução Industrial (causas, consequências, classes sociais); liberalismo e nacionalismo no século XIX.',
    cannotTest: 'I e II Guerras Mundiais (9.º); Guerra Fria (9.º); descolonização (9.º).',
  },

  9: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/historia_3c_9a_ff.pdf',
    domains: [
      { name: 'O Mundo Contemporâneo', topics: ['Imperialismo e colonialismo: causas, partilha de África (Conferência de Berlim 1884)', 'I Guerra Mundial (1914-18): causas (Triple Entente vs Triple Aliança), frentes, consequências, Tratado de Versalhes', 'Revoluções e regimes totalitários: Revolução Russa (1917), fascismo (Mussolini), nazismo (Hitler), Estalinismo', 'II Guerra Mundial (1939-45): causas, fases, Holocausto, bomba atómica, consequências', 'Guerra Fria: EUA vs URSS, Plano Marshall, NATO, Pacto de Varsóvia, corrida ao espaço', 'Descolonização: independências africanas e asiáticas', 'Portugal no século XX: República, Estado Novo, 25 de Abril, democracia, integração europeia', 'Mundo actual: globalização, ONU, conflitos regionais, direitos humanos'] },
    ],
    canTest: 'Imperialismo e colonialismo (partilha de África); I Guerra Mundial (causas, frentes, Versalhes); regimes totalitários (fascismo, nazismo, estalinismo); II Guerra Mundial (causas, Holocausto, consequências); Guerra Fria; descolonização; Portugal no século XX (Estado Novo, 25 de Abril); globalização e mundo actual.',
    cannotTest: 'Conteúdos do ensino secundário.',
  },

  // ── ENSINO SECUNDÁRIO (História A) ──────────────────────────────────────

  10: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/10_historia_a.pdf',
    domains: [
      {
        name: 'Raízes Medievais da Modernidade',
        topics: [
          'A Europa feudal: ordens sociais, poderes (rei, clero, nobreza), economia rural',
          'A Igreja medieval: papel social e cultural; cruzadas; heresia e inquisição',
          'A afirmação das monarquias medievais: centralização, cidades, burgos, comércio',
          'Portugal medieval: formação, consolidação, reconquista, 1.ª Dinastia',
          'O Islão: civilização, ciência, arte, influência na Europa',
        ],
      },
      {
        name: 'O Mundo Moderno (séculos XV–XVII)',
        topics: [
          'Renascimento e Humanismo: contexto histórico, arte (Leonardo, Miguel Ângelo), ciência (Copérnico, Galileu)',
          'Os Descobrimentos portugueses e castelhanos: motivações, rotas, consequências para o mundo',
          'Encontro de culturas: civilizações pré-colombianas (Aztecas, Incas, Maias); choque com a Europa',
          'Reforma Protestante: Lutero, Calvino; Contra-Reforma; guerras de religião',
          'Absolutismo: Luís XIV (modelo francês), mercantilismo, arte barroca',
          'Portugal nos séculos XVI-XVII: império, sociedade, Inquisição, União Ibérica, Restauração',
        ],
      },
      {
        name: 'Iluminismo e Liberalismo (século XVIII)',
        topics: [
          'Iluminismo: filósofos (Locke, Montesquieu, Rousseau, Voltaire), Enciclopédia, ideias políticas',
          'Despotismo iluminado em Portugal: Pombal, reformas, reconstrução de Lisboa',
          'Revolução Americana (1776): causas, Declaração de Independência, república federal',
          'Revolução Francesa (1789): causas (crise financeira, Antigo Regime), fases (constituinte, convenção, terror, directório), Declaração dos Direitos do Homem, Napoleão',
          'Repercussões na Europa e em Portugal: invasões francesas, liberalismo',
        ],
      },
    ],
    canTest: 'Europa feudal (ordens sociais, Igreja, cruzadas); Renascimento e Humanismo; Descobrimentos (motivações, rotas, encontro de culturas); Reforma e Contra-Reforma; absolutismo (Luís XIV, mercantilismo); Portugal nos séculos XV-XVII; Iluminismo (filósofos, ideias); Pombalismo; Revolução Americana; Revolução Francesa (causas, fases, Napoleão); análise de fontes primárias e secundárias.',
    cannotTest: 'Revolução Industrial (11.º); I Guerra Mundial (11.º); Guerra Fria (12.º).',
  },

  11: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/11_historia_a.pdf',
    domains: [
      {
        name: 'A Civilização Industrial e Burguesa (século XIX)',
        topics: [
          'Revolução Industrial: causas (Inglaterra), máquina a vapor, têxtil, carvão, ferro; urbanização; condições laborais',
          'Liberalismo e Nacionalismo: unificação alemã (Bismarck) e italiana (Garibaldi, Cavour)',
          'Socialismo e movimento operário: Marx, Engels, Manifesto Comunista, I Internacional',
          'Imperialismo: causas (económicas, políticas, ideológicas), partilha de África e Ásia, Conferência de Berlim (1884)',
          'Portugal no século XIX: vintismo, cartismo, setembrismo, regeneração, república',
        ],
      },
      {
        name: 'A Europa e o Mundo na 1.ª metade do século XX',
        topics: [
          'I Guerra Mundial (1914-18): causas (alianças, imperialismo, nacionalismos, Sarajevo), frentes (ocidental e oriental), vida nas trincheiras, Tratado de Versalhes (1919)',
          'Revoluções russas (1917): Fevereiro e Outubro; leninismo; NEP; ascensão de Estaline',
          'Entre-guerras: crise de 1929 (Wall Street), New Deal, consequências na Europa',
          'Regimes totalitários: fascismo italiano (Mussolini), nazismo alemão (Hitler, anti-semitismo, Noite dos Cristais), estalinismo (URSS, Gulags)',
          'II Guerra Mundial (1939-45): causas, pacto Ribbentrop-Molotov, Blitzkrieg, Holocausto, Hiroshima, consequências e reconfiguração do mundo',
          'Portugal: I República, Ditadura Militar (1926), Estado Novo (Salazar — PIDE, censura, regime)',
        ],
      },
    ],
    canTest: 'Revolução Industrial (causas, consequências sociais, urbanização); liberalismo e nacionalismo (unificação alemã e italiana); imperialismo (causas, partilha de África, Berlim 1884); socialismo e movimento operário; Portugal no século XIX; I Guerra Mundial (causas, frentes, Versalhes); revoluções russas; crise de 1929; regimes totalitários (fascismo, nazismo, estalinismo) com fontes e documentos; II Guerra Mundial (causas, Holocausto, consequências); Estado Novo.',
    cannotTest: 'Guerra Fria (12.º); descolonização (12.º); 25 de Abril (12.º); globalização (12.º).',
  },

  12: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/12_historia_a.pdf',
    domains: [
      {
        name: 'O Mundo na 2.ª metade do século XX',
        topics: [
          'Guerra Fria (1947-1991): confrontação bipolar (EUA vs URSS); Plano Marshall, NATO, Pacto de Varsóvia, corrida aos armamentos, corrida ao espaço',
          'Crises da Guerra Fria: Berlim, Coreia, Cuba (1962), Vietname',
          'Descolonização: contexto, casos (Índia, Indochina, África Subsariana), neocolonialismo',
          'Movimentos sociais dos anos 60: feminismo, direitos civis (Martin Luther King), maio de 68',
          'Crise do petróleo (1973): causas e consequências económicas',
          'Fim da Guerra Fria: Gorbatchov (glasnost e perestroika), queda do Muro de Berlim (1989), dissolução da URSS (1991)',
        ],
      },
      {
        name: 'Portugal Contemporâneo',
        topics: [
          'Estado Novo: consolidação, oposição, guerras coloniais (Angola, Moçambique, Guiné)',
          '25 de Abril de 1974: causas (desgaste das guerras, MFA), Revolução dos Cravos, PREC',
          'Democracia portuguesa: Constituição de 1976, normalização democrática, primeiros governos',
          'Descolonização portuguesa: independência das colónias africanas (1974-75), retornados',
          'Integração europeia: adesão à CEE (1986), fundos estruturais, Tratado de Maastricht, euro',
          'Portugal no início do século XXI: globalização, crise financeira (2008-2011), Troika',
        ],
      },
      {
        name: 'O Mundo Global (final do século XX — início do XXI)',
        topics: [
          'Globalização: causas (revolução tecnológica, liberalização do comércio), multinacionais, FMI, Banco Mundial',
          'Novos conflitos: implosão da Jugoslávia, Balcãs, Médio Oriente, terrorismo internacional (11 de Setembro 2001)',
          'Questões ambientais globais: alterações climáticas, protocolos internacionais',
          'ONU e organismos internacionais: papel, limites, reforma',
          'Novos poderes emergentes: China, Índia, Brasil — reconfiguração da geopolítica mundial',
        ],
      },
    ],
    canTest: 'Guerra Fria (confrontação bipolar, crises, corrida ao espaço); descolonização (contexto, casos); movimentos sociais dos anos 60; queda do Muro de Berlim, fim da URSS; 25 de Abril (causas, MFA, PREC); democracia portuguesa e Constituição de 1976; descolonização portuguesa e retornados; integração europeia (CEE, euro); globalização; conflitos pós-Guerra Fria; questões ambientais globais.',
    cannotTest: 'Conteúdos do ensino superior.',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// GEOGRAFIA  (3.º ciclo)
// ─────────────────────────────────────────────────────────────────────────────
const geografia: SubjectCurriculum = {
  7: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/7_geografia.pdf',
    domains: [
      { name: 'A Terra: estudos e representações', topics: ['Mapas: escala, projecções cartográficas, latitude e longitude, coordenadas geográficas', 'Sistemas de informação geográfica (SIG): conceito e utilidade'] },
      { name: 'Meio Natural', topics: ['Clima: elementos e factores; tipos climáticos mundiais; interpretação de climogramas', 'Formações vegetais: floresta equatorial, savana, deserto, mediterrânico, temperado, polar', 'Relevo: formas de relevo (montanha, planalto, planície, depressão); acção erosiva (água, vento, gelo)'] },
    ],
    canTest: 'Coordenadas geográficas (latitude, longitude); escalas; tipos climáticos e factores; climogramas (leitura e interpretação); formações vegetais (relação com o clima); formas de relevo; erosão (agentes e formas).',
    cannotTest: 'População e urbanização (8.º); recursos naturais (8.º); desenvolvimento e globalização (9.º).',
  },

  8: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/8_geografia.pdf',
    domains: [
      { name: 'População e Urbanização', topics: ['Distribuição da população mundial; densidade populacional', 'Indicadores demográficos: natalidade, mortalidade, crescimento natural, esperança de vida', 'Transição demográfica; envelhecimento vs. rejuvenescimento', 'Movimentos migratórios: causas, tipos, consequências', 'Urbanização: causas, taxa de urbanização, problemas urbanos, megacidades'] },
      { name: 'Actividades Económicas', topics: ['Sectores de actividade: primário, secundário, terciário — distribuição mundial', 'Agricultura: factores, tipos (subsistência vs. mercado), problemas alimentares', 'Indústria: localização, tipos, impactes ambientais', 'Serviços: turismo (causas e impactes), comércio, transportes e comunicações'] },
    ],
    canTest: 'Distribuição e densidade populacional; indicadores demográficos (natalidade, mortalidade, crescimento natural); transição demográfica; migrações (causas, tipos); urbanização (taxa, megacidades, problemas); sectores de actividade; agricultura (tipos, problemas alimentares); indústria (localização, tipos); turismo e serviços.',
    cannotTest: 'Contrastes de desenvolvimento formal (9.º); meio ambiente global (9.º).',
  },

  9: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/9_geografia.pdf',
    domains: [
      { name: 'Contrastes de Desenvolvimento', topics: ['Países desenvolvidos vs. em desenvolvimento: indicadores (IDH, PIB, esperança de vida, literacia)', 'Causas das desigualdades; cooperação internacional; ONG', 'Comércio internacional; globalização económica'] },
      { name: 'Ambiente e Sustentabilidade', topics: ['Recursos naturais: renováveis e não-renováveis; gestão sustentável', 'Alterações climáticas: causas (efeito de estufa, CO₂), consequências, Acordo de Paris', 'Riscos naturais e tecnológicos: sismos, tsunamis, erupções, inundações; prevenção', 'Desenvolvimento sustentável: conceito, ODS (Objetivos de Desenvolvimento Sustentável)'] },
    ],
    canTest: 'IDH e outros indicadores de desenvolvimento; causas das desigualdades; globalização; recursos naturais (renováveis/não-renováveis); alterações climáticas (causas, consequências); riscos naturais; ODS e desenvolvimento sustentável.',
    cannotTest: 'Conteúdos do ensino secundário.',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// FÍSICO-QUÍMICA  (3.º ciclo)
// ─────────────────────────────────────────────────────────────────────────────
const fisicoQuimica: SubjectCurriculum = {
  7: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/fisico-quimica_3c_7a_ff.pdf',
    domains: [
      { name: 'Matéria e Energia', topics: ['Substâncias e misturas: propriedades físicas (ponto de fusão, ebulição, solubilidade, densidade)', 'Estados físicos da matéria: sólido, líquido, gasoso; mudanças de estado', 'Separação de misturas: filtração, destilação, cristalização, decantação, cromatografia', 'Soluções: soluto, solvente, concentração, saturação', 'Temperatura e calor: conceitos, termómetros, escalas (Celsius, Kelvin)', 'Transferência de calor: condução, convecção, radiação; isolantes e condutores'] },
    ],
    canTest: 'Propriedades físicas das substâncias (densidade, ponto de fusão/ebulição, solubilidade); estados físicos e mudanças de estado; separação de misturas (filtração, destilação, cristalização); soluções (concentração, saturação); temperatura vs. calor; transferência de calor (condução, convecção, radiação).',
    cannotTest: 'Reacções químicas com equações formais (8.º); electricidade (8.º); ácidos e bases (8.º); forças e movimento (9.º).',
  },

  8: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/fisico-quimica_3c_8a_ff.pdf',
    domains: [
      { name: 'Reacções Químicas', topics: ['Átomo: protões, neutrões, electrões; número atómico; isótopos', 'Tabela periódica: organização, grupos e períodos, metais/não-metais', 'Ligação química: iónica e covalente; fórmulas químicas', 'Reacções químicas: equações químicas, balanceamento, reactivos e produtos', 'Ácidos e bases: pH, indicadores, neutralização; ácidos e bases do quotidiano', 'Oxidação e combustão: reacções com o oxigénio'] },
      { name: 'Electricidade', topics: ['Corrente eléctrica: tensão, intensidade, resistência; lei de Ohm (U = R × I)', 'Circuitos eléctricos: série e paralelo; potência e energia eléctrica', 'Efeitos da corrente: efeito Joule, efeito magnético, efeito químico', 'Segurança eléctrica'] },
    ],
    canTest: 'Estrutura do átomo (protões, neutrões, electrões); tabela periódica (organização); fórmulas e equações químicas (balanceamento); ácidos e bases (pH, indicadores, neutralização); lei de Ohm (U=RI); circuitos série e paralelo; potência e energia eléctrica; efeito Joule.',
    cannotTest: 'Ondas (9.º); movimento e forças (9.º); química orgânica (9.º); mecânica quântica.',
  },

  9: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/fisico-quimica_3c_9a.pdf',
    domains: [
      { name: 'Química', topics: ['Química orgânica: hidrocarbonetos (alcanos, alcenos, alcinos); grupos funcionais (alcoóis, ácidos carboxílicos)', 'Polímeros: adição e condensação; plásticos; sustentabilidade', 'Electroquímica: pilhas, electrólise (conceito)'] },
      { name: 'Física', topics: ['Movimento: velocidade média, velocidade instantânea, aceleração; gráficos (posição-tempo, velocidade-tempo)', 'Forças: força resultante, lei de Newton (F = m × a); peso e massa; atrito', 'Pressão: P = F/A; pressão hidrostática; vasos comunicantes; princípio de Arquimedes', 'Ondas: som (comprimento de onda, frequência, amplitude); luz (reflexão, refracção, espelhos, lentes); espectro electromagnético'] },
    ],
    canTest: 'Hidrocarbonetos (alcanos, alcenos) e grupos funcionais; polímeros; movimento (velocidade, aceleração, gráficos); 2.ª lei de Newton (F=ma); peso vs. massa; pressão (P=F/A, Arquimedes); ondas (som e luz): reflexão, refracção, espelho, lentes.',
    cannotTest: 'Mecânica quântica; relatividade; termodinâmica formal (ensino secundário).',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// INGLÊS  (2.º e 3.º ciclo — por nível QECR)
// ─────────────────────────────────────────────────────────────────────────────
const ingles: SubjectCurriculum = {
  5: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/5_ingles.pdf',
    domains: [
      { name: 'Comunicação oral e escrita — nível A1/A2', topics: ['Vocabulário: família, escola, rotinas, animais, cores, números, alimentos, vestuário, tempo atmosférico, datas', 'Gramática: present simple, present continuous, verb to be, have got, can/can\'t, there is/are, articles, plurals, adjectives, prepositions of place/time', 'Funções comunicativas: apresentar-se, descrever pessoas/lugares, falar de gostos (like/love/hate + -ing), pedir/dar informações', 'Temáticas culturais: países anglófonos, tradições, festividades (Halloween, Christmas)'] },
    ],
    canTest: 'Compreensão de textos simples (A1-A2); produção escrita guiada; vocabulário (família, escola, rotinas, animais, casa, alimentos); present simple e continuous; to be, have got, can; there is/are; preposições; artigos; adjectivos; funções comunicativas (apresentação, gostos, descrição).',
    cannotTest: 'Past simple (6.º); present perfect (7.º); conditionals (8.º-9.º); ensaio argumentativo.',
  },

  6: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/6_ingles.pdf',
    domains: [
      { name: 'Comunicação oral e escrita — nível A2', topics: ['Vocabulário: viagens e férias, desportos e passatempos, saúde e corpo humano, meio ambiente, tecnologia', 'Gramática: past simple (regular e irregular), future (going to, will), comparatives e superlatives, question words, possessive pronouns, countable/uncountable nouns, some/any/much/many', 'Funções comunicativas: narrar no passado, fazer planos, comparar, dar opiniões, expressar preferências'] },
    ],
    canTest: 'Past simple (regular e irregular, afirmativo/negativo/interrogativo); going to e will (futuro); comparativos e superlativos; countable/uncountable; some/any/much/many; vocabulário de viagens, desportos, saúde; narração simples no passado; comparação.',
    cannotTest: 'Present perfect (7.º); reported speech (8.º); conditionals (8.º-9.º).',
  },

  7: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/ingles_3c_7a_ff.pdf',
    domains: [
      { name: 'Comunicação — nível B1 inicial', topics: ['Vocabulário: media e tecnologia, ambiente, cultura juvenil, saúde e bem-estar', 'Gramática: present perfect (already, just, yet, ever, never), past continuous, used to, modal verbs (should, must, have to, might), first conditional', 'Produção: email informal, descrição de imagem, texto de opinião curto'] },
    ],
    canTest: 'Present perfect (com marcadores: already, yet, just, ever, never); past continuous; used to; modais (should, must, have to, might); first conditional; vocabulário de media, ambiente, tecnologia; email informal; opinião curta.',
    cannotTest: 'Second e third conditionals (8.º-9.º); passive voice formal (8.º); reported speech avançado.',
  },

  8: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/ingles_3c_8a_ff.pdf',
    domains: [
      { name: 'Comunicação — nível B1', topics: ['Vocabulário: globalização, cinema e entretenimento, ciência e tecnologia, problemas sociais', 'Gramática: passive voice (present e past simple), second conditional, reported speech (statements e questions), relative clauses (who, which, that)', 'Produção: artigo, recensão, carta formal curta'] },
    ],
    canTest: 'Passive voice (present e past simple); second conditional; reported speech (afirmações e perguntas); relative clauses (who, which, that); vocabulário de globalização, cinema, ciência; artigo e recensão curtos.',
    cannotTest: 'Third conditional completo; passive voice em todos os tempos; ensaio académico formal.',
  },

  9: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/ingles_3c_9a_ff.pdf',
    domains: [
      { name: 'Comunicação — nível B1/B2 inicial', topics: ['Vocabulário: mundo do trabalho, cidadania, direitos humanos, futuro e tecnologia', 'Gramática: third conditional, mixed conditionals (introdução), passive em vários tempos, wish/if only, modal perfeito (should have, could have)', 'Produção: ensaio argumentativo curto, relatório simples'] },
    ],
    canTest: 'Third conditional; wish/if only; modal perfeito (should/could have); passive em vários tempos; vocabulário de trabalho, cidadania, futuro; ensaio argumentativo curto.',
    cannotTest: 'Conteúdos do ensino secundário.',
  },

  // ── ENSINO SECUNDÁRIO (Inglês — continuação, nível B1+/B2) ──────────────

  10: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/10_ingles_f_geral_cont.pdf',
    domains: [
      {
        name: 'Comunicação oral e escrita — nível B1+/B2 inicial (consolidação)',
        topics: [
          'Vocabulário: identidade cultural, media e redes sociais, ciência e tecnologia, saúde e bem-estar, ambiente e sustentabilidade, mundo do trabalho',
          'Gramática: revisão e consolidação de todos os tempos verbais; mixed conditionals; wish/if only avançado; passive em todos os tempos; reported speech complexo (perguntas, ordens, sugestões)',
          'Discurso académico: discourse markers (however, nevertheless, in contrast, as a result, furthermore); coesão textual',
          'Produção escrita: ensaio argumentativo (250-300 palavras), artigo de opinião, email formal e informal, relatório simples',
          'Compreensão leitora: textos autênticos (artigos de imprensa, excertos literários, textos divulgativos); estratégias de inferência',
          'Compreensão oral: podcasts, entrevistas, debates — extracção de informação essencial e inferência',
        ],
      },
    ],
    canTest: 'Compreensão de textos autênticos B1+/B2 (imprensa, divulgação); produção de ensaio argumentativo, artigo de opinião e email formal; mixed conditionals; wish/if only; passive em todos os tempos; reported speech complexo; discourse markers e coesão; vocabulário de cultura, media, tecnologia, ambiente, trabalho.',
    cannotTest: 'Literatura britânica ou americana específica (dependente do programa da escola); CAE/CPE preparação (exames externos).',
  },

  11: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/11_ingles_f_geral_cont.pdf',
    domains: [
      {
        name: 'Comunicação oral e escrita — nível B2 (consolidação e extensão)',
        topics: [
          'Vocabulário: ética e cidadania global, direitos humanos, arte e cultura, globalização e economia, desafios do século XXI (IA, clima, migrações)',
          'Gramática: inversion (Never have I…, Seldom do they…), cleft sentences (It is/was… that…), emphasis structures; nominalization; hedging language (may, might, tend to, appear to)',
          'Texto literário: excerto de novela ou conto em língua inglesa — análise de personagens, narrador, estilo',
          'Produção escrita avançada: discursive essay, review, report, proposal (300-350 palavras)',
          'Oralidade: debate e apresentação formal; uso de argumentação estruturada; linguagem académica',
          'Compreensão leitora: textos complexos — análise de argumentação, intenção do autor, registo',
        ],
      },
    ],
    canTest: 'Compreensão de textos complexos B2 (literários e não-literários); discursive essay, review e report; inversion e cleft sentences; hedging language; nominalization; análise de excerto literário; argumentação oral estruturada; vocabulário de ética, globalização, desafios do século XXI.',
    cannotTest: 'Nível C1 (ensino universitário/exames internacionais avançados).',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// BIOLOGIA E GEOLOGIA  (ensino secundário — 10.º e 11.º ano)
// ─────────────────────────────────────────────────────────────────────────────
const biologiaGeologia: SubjectCurriculum = {
  10: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/10_biologia_e_geologia.pdf',
    domains: [
      {
        name: 'Biologia Celular',
        topics: [
          'Célula procariótica vs. eucariótica: estrutura e organelos (membrana, núcleo, mitocôndrias, retículo endoplasmático, aparelho de Golgi, cloroplastos)',
          'Membrana plasmática: modelo de mosaico fluido; transporte (difusão simples, facilitada, osmose; transporte activo, endocitose, exocitose)',
          'Metabolismo celular: catabolismo e anabolismo; enzimas (estrutura, actividade, inibição)',
          'Respiração celular: glicólise (citoplasma), ciclo de Krebs (mitocôndria), cadeia de transporte de electrões; balanço energético (ATP)',
          'Fotossíntese: fase fotoquímica (tilacóides, fotossistemas, fotólise da água, ATP e NADPH) e fase química (estroma, ciclo de Calvin, CO₂ + RuBP → G3P → glicose)',
          'Divisão celular: mitose (fases: profase, metáfase, anáfase, telófase) e citocinese; importância para crescimento e regeneração',
        ],
      },
      {
        name: 'Geologia — Terra: sistema de sistemas',
        topics: [
          'Estrutura interna da Terra: crusta, manto e núcleo — métodos de estudo (ondas sísmicas P e S)',
          'Tectónica de placas: litosfera e astenosfera; tipos de limites (convergentes, divergentes, transformantes); provas (paleomagnetismo, idades do fundo oceânico, fosseis)',
          'Geodinâmica interna: sismos (foco, epicentro, escala de Richter vs. Mercalli), vulcanismo (tipos de erupção, materiais expelidos)',
          'Rochas e minerais: minerais (propriedades: dureza, clivagem, brilho, cor, risca); rochas magmáticas (intrusivas/extrusivas), sedimentares (clásticas, químicas, orgânicas), metamórficas — formação e ciclo das rochas',
          'Recursos geológicos: minerais industriais e metálicos, combustíveis fósseis, exploração sustentável',
        ],
      },
    ],
    canTest: 'Estrutura e funções dos organelos celulares; membrana plasmática (modelos, transporte passivo e activo, osmose); metabolismo (enzimas, catabolismo, anabolismo); respiração celular (glicólise, Krebs, cadeia respiratória, ATP); fotossíntese (fase fotoquímica e fase química, factores); mitose (fases e importância); estrutura interna da Terra (métodos de estudo); tectónica de placas (tipos de limites, provas); sismos e vulcanismo; minerais (propriedades) e rochas (tipos e ciclo); recursos geológicos.',
    cannotTest: 'Meiose e gametogénese (11.º); genética mendeliana (11.º); evolução (11.º); biotecnologia (11.º); dinâmica externa da Terra (11.º).',
  },

  11: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/11_biologia_e_geologia_vf.pdf',
    domains: [
      {
        name: 'Reprodução e Hereditariedade',
        topics: [
          'Reprodução sexuada e assexuada: vantagens evolutivas de cada uma',
          'Meiose: fases (meiose I e meiose II); comparação com mitose; importância na diversidade genética (crossing-over, segregação independente)',
          'Gametogénese: espermatogénese e ovogénese — fases e diferenças',
          'Genética mendeliana: leis de Mendel (dominância, segregação, segregação independente); cruzamentos monohíbridos e dihíbridos; razões fenotípicas e genotípicas',
          'Extensões ao mendelismo: co-dominância (grupos sanguíneos ABO), dominância incompleta, hereditariedade ligada ao sexo (daltionismo, hemofilia); genes letais (conceito)',
          'Genética humana: heredograma (interpretação e construção); doenças genéticas (fibrose cística, síndrome de Down)',
        ],
      },
      {
        name: 'Evolução Biológica',
        topics: [
          'Teorias da evolução: Lamarckismo (herança de caracteres adquiridos) vs. Darwinismo (selecção natural, variabilidade, sobrevivência diferencial)',
          'Provas da evolução: registo fóssil (datação relativa e absoluta), anatomia comparada (homologia, analogia), bioquímica comparada, biogeografia',
          'Especiação: isolamento geográfico (especiação alopátrica); isolamento reprodutivo; deriva genética, efeito de gargalo',
          'Evolução humana: grandes etapas; características dos Hominini; Homo sapiens',
          'Biotecnologia: tecnologia do ADN recombinante (enzimas de restrição, vectores, transformação); PCR (conceito e aplicações); sequenciação genómica; aplicações (GMO, vacinas, diagnóstico genético); questões éticas',
        ],
      },
      {
        name: 'Geologia — Dinâmica Externa e Recursos',
        topics: [
          'Agentes de geodinâmica externa: meteorização (física e química), erosão, transporte e deposição — agentes (água, vento, gelo, ser humano)',
          'Solos: formação (perfil — horizontes A, B, C), composição, tipos; degradação e conservação',
          'Bacias hidrográficas: caudal, cheias, aluviões, gestão de recursos hídricos',
          'Riscos geológicos: sismos, tsunamis, movimentos de massa, vulcões — avaliação e prevenção em Portugal',
          'Recursos geológicos e sustentabilidade: minerais, combustíveis fósseis (formação e impacte), energias alternativas (geotérmica, solar, eólica)',
        ],
      },
    ],
    canTest: 'Meiose (fases, comparação com mitose, diversidade genética); gametogénese (espermatogénese e ovogénese); genética mendeliana (leis de Mendel, cruzamentos mono e dihíbridos, razões fenotípicas/genotípicas); extensões ao mendelismo (co-dominância, dominância incompleta, ligada ao sexo); heredogramas; evolução (teorias, provas, especiação); evolução humana; biotecnologia (ADN recombinante, PCR, aplicações e ética); geodinâmica externa (meteorização, solos, bacias hidrográficas); riscos geológicos; recursos geológicos e sustentabilidade.',
    cannotTest: 'Conteúdos do ensino superior (bioquímica avançada, genómica de sistemas, etc.).',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// FÍSICA E QUÍMICA A  (ensino secundário — 10.º e 11.º ano)
// ─────────────────────────────────────────────────────────────────────────────
const fisicaQuimicaA: SubjectCurriculum = {
  10: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/10_fq_a.pdf',
    domains: [
      {
        name: 'Química — Da Atmosfera à Indústria',
        topics: [
          'Composição e estrutura da atmosfera terrestre: troposfera, estratosfera; pressão atmosférica',
          'Estrutura atómica: modelo de Bohr, orbitais (subníveis s, p, d, f); configuração electrónica; iões',
          'Tabela periódica: organização (período, grupo, bloco), tendências periódicas (raio atómico, energia de ionização, electronegatividade)',
          'Ligação química: ligação iónica (formação, redes cristalinas), ligação covalente (apolar e polar, molecular e em rede), ligação metálica',
          'Geometria molecular: teoria VSEPR (geometria das moléculas com 2, 3, 4 pares); polaridade molecular',
          'Forças intermoleculares: forças de London, dipolo-dipolo, pontes de hidrogénio; influência nas propriedades (ponto de fusão/ebulição, solubilidade)',
          'Reacções químicas: equações, balanceamento, reagente em excesso e limitante, rendimento',
          'Estequiometria: mole, massa molar, cálculos estequiométricos; soluções (concentração molar)',
          'Oxirredução: número de oxidação, oxidação/redução, agentes oxidante e redutor; equações redox (semi-reacções)',
        ],
      },
      {
        name: 'Física — Movimentos e Forças',
        topics: [
          'Grandezas vectoriais: representação, adição e subtracção, componentes',
          'Cinemática: posição, deslocamento, velocidade média e instantânea, aceleração; MRU (v = cte, x = x₀ + vt); MRUA (v = v₀ + at, x = x₀ + v₀t + ½at²)',
          'Queda livre e lançamento vertical: g = 9,8 m/s²; relações cinemáticas',
          'Movimento de projéctil (lançamento oblíquo): decomposição em componente horizontal (MRU) e vertical (MRUA)',
          'Dinâmica newtoniana: 1.ª, 2.ª e 3.ª leis de Newton; força resultante; peso (P = mg); atrito (estático e cinético)',
          'Quantidade de movimento (momento linear): p = mv; lei da conservação do momento; impulso (F·Δt = Δp)',
          'Trabalho e energia: trabalho de uma força (W = F·d·cosθ); energia cinética (Ec = ½mv²); energia potencial gravítica (Ep = mgh); conservação da energia mecânica; potência (P = W/t)',
        ],
      },
    ],
    canTest: 'Estrutura atómica (Bohr, configuração electrónica); tabela periódica (tendências periódicas); ligação química (iónica, covalente, metálica); geometria molecular (VSEPR); forças intermoleculares; estequiometria (mole, massa molar, reagente limitante, rendimento); concentração molar; oxirredução (número de oxidação, semi-reacções); cinemática (MRU, MRUA, equações); queda livre; projécteis; leis de Newton (F=ma, 3.ª lei); atrito; quantidade de movimento e impulso; trabalho, energia cinética e potencial, conservação da energia.',
    cannotTest: 'Termodinâmica (11.º); campos electromagnéticos (11.º); cinética química (11.º); pilhas electroquímicas (11.º).',
  },

  11: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/11_fq_a.pdf',
    domains: [
      {
        name: 'Química — Ácido-base, Termodinâmica e Cinética',
        topics: [
          'Ácidos e bases: teoria de Brønsted-Lowry (par conjugado ácido-base); Ka, Kb; ácidos e bases fortes vs. fracos',
          'pH: definição pH = −log[H₃O⁺]; cálculo de pH de ácidos/bases fortes; indicadores ácido-base',
          'Reacções de neutralização: equivalência; titulação ácido-base (curva de titulação, ponto de equivalência)',
          'Equilíbrio químico: lei da acção das massas (expressão de Kc, Kp); princípio de Le Chatelier; factores que afectam o equilíbrio (concentração, pressão, temperatura)',
          'Termodinâmica química: entalpia (ΔH); lei de Hess; energia de ligação; entropia (conceito intuitivo); energia de Gibbs (ΔG = ΔH − TΔS); espontaneidade',
          'Cinética química: velocidade de reacção; factores (concentração, temperatura, catalisador, superfície); lei cinética simples (r = k[A]ⁿ); energia de activação; catálise (homogénea, heterogénea, enzimática)',
          'Electroquímica: pilha electroquímica (ânodo, cátodo, ponte salina, potencial de pilha); pilha de Daniell; electrólise (eletrólito, elétrodos, lei de Faraday); aplicações (galvanoplastia, produção de Al)',
        ],
      },
      {
        name: 'Física — Campos e Radiação',
        topics: [
          'Campo gravítico: intensidade (g = F/m); lei da gravitação universal (F = G m₁m₂/r²); energia potencial gravítica; satélites e velocidade orbital',
          'Campo eléctrico: lei de Coulomb (F = kq₁q₂/r²); campo eléctrico (E = F/q); potencial eléctrico (V = U/q); condensadores (C = Q/V); energia armazenada',
          'Corrente eléctrica em circuitos: lei de Ohm; resistências em série e paralelo; circuitos RC; potência e energia; efeito de Joule',
          'Campo magnético: força de Lorentz (F = qvB); fio percorrido por corrente (F = BIL); lei de Biot-Savart (intuitiva); solenóide',
          'Indução electromagnética: lei de Faraday (ε = −ΔΦ/Δt); lei de Lenz; gerador e motor; transformador (V₁/V₂ = N₁/N₂)',
          'Ondas e radiação: características (comprimento de onda, frequência, velocidade: v = fλ); reflexão, refracção (lei de Snell: n₁sinθ₁ = n₂sinθ₂); difracção e interferência (conceitos); espectro electromagnético; efeito fotoeléctrico (E = hf); modelo de Bohr (espectros de emissão/absorção)',
        ],
      },
    ],
    canTest: 'Ácidos e bases (Brønsted-Lowry, Ka, pH, titulação); equilíbrio químico (Kc, Le Chatelier, factores); termodinâmica (ΔH, lei de Hess, ΔG, espontaneidade); cinética química (velocidade, lei cinética, energia de activação, catálise); electroquímica (pilhas, electrólise, lei de Faraday); campo gravítico (gravitação universal, energia, satélites); campo eléctrico (Coulomb, E, V, condensadores); circuitos com Ohm e Joule; campo magnético (Lorentz, indução, Faraday); ondas (v=fλ, Snell); efeito fotoeléctrico; modelo de Bohr.',
    cannotTest: 'Mecânica quântica formal; relatividade; física nuclear avançada; termodinâmica estatística.',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// BASE DE DADOS PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export const CURRICULUM_DB: CurriculumDB = {
  // Ensino Básico
  'Matemática':                        matematica,
  'Matemática A':                       matematica,   // anos 5-9 iguais; 10-12 adicionados ao mesmo objeto
  'Português':                          portugues,
  'Ciências Naturais':                  cienciasNaturais,
  'História e Geografia de Portugal':   hgp,
  'História':                           historia,
  'História A':                         historia,     // mesmo conteúdo; AE secundário adicionado ao objeto
  'Geografia':                          geografia,
  'Físico-Química':                     fisicoQuimica,
  'Inglês':                             ingles,
  'Espanhol':                           {}, // placeholder — estrutura idêntica ao Inglês com QECR
  'Francês':                            {}, // placeholder
  // Ensino Secundário (disciplinas próprias)
  'Biologia e Geologia':                biologiaGeologia,
  'Física e Química A':                 fisicaQuimicaA,
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL — gera restrição curricular para o prompt
// ─────────────────────────────────────────────────────────────────────────────
export function getCurriculumConstraint(subject: string, yearLevel: number): string {
  const subjectDB = CURRICULUM_DB[subject]
  if (!subjectDB) return ''

  const entry = subjectDB[yearLevel]
  if (!entry) return ''

  const domainsText = entry.domains
    .map(d => `  • ${d.name}: ${d.topics.join('; ')}`)
    .join('\n')

  return `
CURRÍCULO OBRIGATÓRIO — ${subject} ${yearLevel}.º ano (AE DGE)
Fonte oficial: ${entry.source}

DOMÍNIOS E CONTEÚDOS ESPECÍFICOS:
${domainsText}

✅ O QUE PODES AVALIAR: ${entry.canTest}

❌ O QUE NÃO PERTENCE A ESTE ANO: ${entry.cannotTest}

REGRA INVIOLÁVEL: Todas as questões devem ser estritamente retiradas dos conteúdos acima. Se o tópico pedido tocar em conteúdos de outros anos, restringe ao que é permitido no ${yearLevel}.º ano.
`
}
