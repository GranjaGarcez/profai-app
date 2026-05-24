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
}

// ─────────────────────────────────────────────────────────────────────────────
// BASE DE DADOS PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export const CURRICULUM_DB: CurriculumDB = {
  'Matemática':                   matematica,
  'Matemática A':                  matematica,   // same base, secondary extends
  'Português':                     portugues,
  'Ciências Naturais':             cienciasNaturais,
  'História e Geografia de Portugal': hgp,
  'História':                      historia,
  'Geografia':                     geografia,
  'Físico-Química':                fisicoQuimica,
  'Inglês':                        ingles,
  'Espanhol':                      {}, // placeholder — estrutura idêntica ao Inglês com conteúdo QECR
  'Francês':                       {}, // placeholder
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
