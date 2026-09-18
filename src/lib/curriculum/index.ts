/**
 * Biblioteca Curricular — Aprendizagens Essenciais DGE
 * Fontes: https://www.dge.mec.pt/aprendizagens-essenciais-ensino-basico
 * Despacho n.º 8209/2021 (Matemática 2021/22) e AE anteriores para restantes disciplinas.
 *
 * Estrutura por disciplina → ano → { domínios, permitido, proibido }
 * Usado em /api/ai/generate para injectar restrição curricular no prompt.
 */

export interface CurriculumDomain {
  name: string
  /** Conteúdos-chave (resumo). Mantido para retrocompatibilidade e como apoio. */
  topics: string[]
  /** Descritores oficiais "O aluno deve ficar capaz de…" (verbatim das AE DGE). */
  descriptors?: string[]
}

export interface CurriculumEntry {
  /** Domínios / temas organizadores com conteúdos e (quando curados) descritores oficiais */
  domains: CurriculumDomain[]
  /** O que É avaliável neste ano — phrased for AI prompt */
  canTest: string
  /** O que NÃO pertence a este ano — phrased for AI prompt */
  cannotTest: string
  /** URL do PDF oficial DGE */
  source: string
  /** Áreas de Competência do Perfil dos Alunos (PASEO) associadas — das próprias AE. */
  perfilAreas?: string[]
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
        name: 'Capacidades Matemáticas',
        topics: ['Resolução de problemas', 'Raciocínio matemático', 'Pensamento computacional', 'Comunicação matemática', 'Representações matemáticas', 'Conexões matemáticas'],
        descriptors: [
          'Reconhecer e aplicar as etapas do processo de resolução de problemas',
          'Formular problemas a partir de uma situação dada, em contextos diversos (matemáticos e não matemáticos)',
          'Aplicar e adaptar estratégias diversas de resolução de problemas, em diversos contextos, nomeadamente com recurso à tecnologia',
          'Reconhecer a correção, a diferença e a eficácia de diferentes estratégias da resolução de um problema',
          'Formular e testar conjeturas/generalizações, a partir da identificação de regularidades comuns a objetos em estudo, nomeadamente recorrendo à tecnologia',
          'Classificar objetos atendendo às suas características',
          'Distinguir entre testar e validar uma conjetura',
          'Justificar que uma conjetura/generalização é verdadeira ou falsa, usando progressivamente a linguagem simbólica',
          'Reconhecer a correção, diferença e adequação de diversas formas de justificar uma conjetura/generalização',
          'Extrair a informação essencial de um problema',
          'Estruturar a resolução de problemas por etapas de menor complexidade de modo a reduzir a dificuldade do problema',
          'Reconhecer ou identificar padrões e regularidades no processo de resolução de problemas e aplicá-los em outros problemas semelhantes',
          'Desenvolver um procedimento (algoritmo) passo a passo para solucionar o problema, nomeadamente recorrendo à tecnologia',
          'Procurar e corrigir erros, testar, refinar e otimizar uma dada resolução',
          'Descrever a sua forma de pensar acerca de ideias e processos matemáticos, oralmente e por escrito',
          'Ouvir os outros, questionar e discutir as ideias de forma fundamentada, e contrapor argumentos',
          'Ler e interpretar ideias e processos matemáticos expressos por representações diversas',
          'Usar representações múltiplas para demonstrar compreensão, raciocinar e exprimir ideias e processos matemáticos, em especial linguagem verbal e diagramas',
          'Estabelecer conexões e conversões entre diferentes representações relativas às mesmas ideias/processos matemáticos, nomeadamente recorrendo à tecnologia',
          'Usar a linguagem simbólica matemática e reconhecer o seu valor para comunicar sinteticamente e com precisão',
          'Reconhecer e usar conexões entre ideias matemáticas de diferentes temas, e compreender esta ciência como coerente e articulada',
          'Aplicar ideias matemáticas na resolução de problemas de contextos diversos (outras áreas do saber, realidade, profissões)',
          'Interpretar matematicamente situações do mundo real, construir modelos matemáticos adequados, e reconhecer a utilidade e poder da Matemática na previsão e intervenção nessas situações',
          'Identificar a presença da Matemática em contextos externos e compreender o seu papel na criação e construção da realidade',
        ],
      },
      {
        name: 'Números',
        topics: ['Números naturais: múltiplos e divisores, números primos, potências de base e expoente naturais', 'Frações, decimais e percentagens: equivalência, comparação, operações', 'Cálculo mental e algoritmos'],
        descriptors: [
          'Reconhecer que um número é divisor de um número diferente de zero quando o resto da divisão inteira do maior pelo menor é zero',
          'Identificar múltiplos de um número, divisores de um número e relacionar múltiplos e divisores de um mesmo número',
          'Reconhecer que qualquer número diferente de zero é múltiplo e divisor de si próprio e que 1 é divisor de todo o número natural',
          'Representar os conjuntos de múltiplos e divisores de um número e reconhecer que há um número finito de divisores de um número e uma infinidade de múltiplos de um número',
          'Reconhecer que um múltiplo de um múltiplo de um número é múltiplo deste número e, analogamente, para os divisores, conjeturando e justificando a relação',
          'Identificar os números primos menores que 100',
          'Resolver problemas que envolvam números primos, em diversos contextos',
          'Reconhecer a potência de um número (base e expoente naturais) como um produto de fatores iguais a esse número',
          'Reconhecer o efeito que a multiplicação sucessiva de um número natural (maior do que um) por si próprio produz na grandeza do número obtido',
          'Interpretar e modelar situações com fenómenos reais e enigmas envolvendo potências e resolver problemas associados',
          'Escrever números como 10, 100, 1000, 10000 na forma de potência de base 10 e vice-versa',
          'Reconhecer e determinar frações equivalentes através de uma relação multiplicativa',
          'Relacionar percentagens com frações de denominador 100',
          'Comparar e ordenar frações e representá-las na reta numérica, comparando criticamente diferentes estratégias de resolução realizadas por si e por outros',
          'Comparar e ordenar decimais e representá-los na reta numérica, comparando criticamente diferentes estratégias da resolução realizadas por si e por outros',
          'Estabelecer relações entre frações, decimais e percentagens, no contexto da resolução de problemas',
          'Determinar o valor aproximado de um número, por defeito e por excesso, até às centésimas',
          'Fazer arredondamentos no contexto da resolução de problemas, até às centésimas',
          'Adicionar e subtrair frações, em casos em que um denominador é múltiplo do outro',
          'Reconhecer a multiplicação de um número natural por uma fração como a adição sucessiva dessa fração',
          'Multiplicar uma fração por um número natural, dando significado à fração como operador',
          'Interpretar e modelar situações que possam ser traduzidas pela multiplicação de dois números, sendo um deles uma fração e o outro um natural, recorrendo criticamente a representações adequadas para explicar as suas ideias',
          'Realizar multiplicações envolvendo decimais e números naturais',
          'Relacionar a multiplicação de um número natural por 0,1; 0,01 e 0,001 com a sua multiplicação por 1/10, 1/100 e 1/1000 respetivamente',
          'Multiplicar decimais até às centésimas',
          'Formular e testar conjeturas, identificando regularidades no número de casas decimais do produto de dois decimais',
          'Realizar divisões envolvendo decimais e números naturais',
          'Relacionar a divisão de um número natural por 0,1; 0,01 e 0,001 com a sua multiplicação por 10, 100 e 1000 respetivamente',
          'Dividir decimais até às centésimas recorrendo ao cálculo mental ou por aplicação conjunta do algoritmo de divisão de naturais e do conhecimento da multiplicação e divisão de um natural por um decimal da forma 0,1 ou 0,01 ou 0,001',
          'Compreender e usar com fluência estratégias de cálculo mental para a adição e subtração de frações, mobilizando as propriedades das operações',
          'Desenvolver e usar estratégias de cálculo mental com decimais, tirando partido da regra da multiplicação e divisão por 10, 100, 1000 e 0,1; 0,01 e 0,001',
          'Decidir da razoabilidade do resultado de uma operação obtida por qualquer um dos processos (algoritmo, cálculo mental, calculadora)',
        ],
      },
      {
        name: 'Álgebra',
        topics: ['Regularidades em sequências (de crescimento); leis de formação', 'Relações numéricas e algébricas; expressões algébricas com letras'],
        descriptors: [
          'Justificar conjeturas que envolvam relações entre o termo de uma sequência de crescimento, em particular geométrica, e a sua ordem (pensamento funcional) sem necessidade de recorrer ao termo anterior (pensamento recursivo)',
          'Identificar e descrever em linguagem natural, pictórica e simbólica, uma possível lei de formação para uma sequência de crescimento dada, transitando de forma fluente entre diferentes representações',
          'Criar, completar e continuar sequências numéricas dadas de acordo com uma lei de formação e verificar se um dado número é elemento de uma sequência, justificando',
          'Resolver problemas que envolvam regularidades e comparar criticamente diferentes estratégias da resolução',
          'Identificar propriedades de elementos de um conjunto ou relações entre os seus elementos, e descrevê-las por palavras, desenhos ou expressões algébricas, apresentando e explicando raciocínios e representações',
          'Exprimir, em linguagem simbólica, relações e propriedades simples descritas em linguagem natural e reciprocamente',
          'Determinar o valor de uma expressão algébrica quando se atribui um valor numérico à letra',
          'Resolver problemas que envolvam expressões algébricas, em diversos contextos',
          'Identificar expressões algébricas equivalentes, relacionando-as com o seu significado no contexto, e justificar por palavras próprias',
        ],
      },
      {
        name: 'Dados',
        topics: ['Questões estatísticas, recolha e organização de dados (dados qualitativos e quantitativos discretos)', 'Representações gráficas (circulares, barras, barras justapostas)', 'Análise de dados: média; comunicação de um estudo', 'Probabilidades: frequência relativa para estimar a probabilidade'],
        descriptors: [
          'Formular questões de interesse dos alunos, sobre características qualitativas e quantitativas discretas',
          'Participar na definição de quais são os dados a recolher e decidir onde devem ser recolhidos, incluindo fontes primárias ou secundárias, e quem inquirir e/ou o que observar',
          'Selecionar o método de recolha dos dados, em especial questionários simples',
          'Construir questionários simples, com questões de resposta fechada, com recurso a tecnologia, e aplicá-los',
          'Usar tabelas de frequências absolutas e relativas (em percentagem) para registar e organizar os dados. Usar título na tabela',
          'Representar dados através de gráficos circulares de frequências relativas',
          'Representar dados através de gráficos de barras de frequências relativas, usando escalas adequadas, e incluindo fonte, título e legendas',
          'Representar conjuntos de dados através de gráficos de barras justapostas (frequências absolutas e relativas), usando escalas adequadas, e incluindo fonte, título e legendas',
          'Analisar e comparar diferentes representações gráficas presentes nos media, discutir a sua adequabilidade e concluir criticamente sobre eventuais efeitos de manipulações gráficas, desenvolvendo a literacia estatística',
          'Decidir criticamente sobre qual(is) as representações gráficas a adotar e justificar a(s) escolha(s)',
          'Identificar a média como o valor resultante da distribuição equitativa do total dos dados (o ponto de equilíbrio dos dados) e interpretar o seu significado em contexto',
          'Calcular a média com recurso a um procedimento adequado aos dados e compreender que esta medida é sensível a cada um dos dados',
          'Identificar qual(ais) a(s) medida(s) de resumo que são possíveis de calcular em dados qualitativos e em dados quantitativos',
          'Ler, interpretar e discutir a distribuição dos dados, salientando criticamente os aspetos mais relevantes',
          'Retirar conclusões, fundamentar decisões e colocar novas questões suscitadas pelas conclusões obtidas',
          'Elaborar um poster digital que apoie a apresentação oral de um estudo realizado',
          'Reconhecer que a probabilidade de um acontecimento exprime o grau de convicção na sua realização',
          'Reconhecer que a probabilidade de um acontecimento assume um valor que está compreendido entre 0% e 100%',
          'Estimar a probabilidade de acontecimentos usando a frequência relativa',
        ],
      },
      {
        name: 'Geometria e Medida',
        topics: ['Figuras planas: retas, ângulos, triângulos (classificação, construção, congruência), equivalência, áreas do paralelogramo e do triângulo', 'Figuras no espaço: propriedades e planificações de poliedros'],
        descriptors: [
          'Distinguir reta de semirreta e de segmento de reta',
          'Identificar a posição relativa de retas paralelas e retas concorrentes, perpendiculares ou oblíquas, e representá-las utilizando recursos diversificados',
          'Compreender que a amplitude de um ângulo pode ser medida e conhecer a unidade de medida grau',
          'Medir a amplitude do ângulo usando transferidor, com aproximação ao grau, e classificá-lo',
          'Fazer estimativas de medida de amplitude de um dado ângulo, por comparação com amplitudes de ângulos de referência (45º, 90º e 180º)',
          'Construir ângulos com uma dada medida de amplitude',
          'Classificar triângulos quanto aos lados e quanto aos ângulos',
          'Descrever relações entre os lados e os ângulos de um triângulo e usá-las na resolução de problemas',
          'Construir triângulos e compreender os casos em que é possível a sua construção, apresentando e explicando ideias e raciocínios',
          'Reconhecer os critérios de congruência de triângulos e usá-los na construção de triângulos e resolução de problemas',
          'Compreender o significado de figuras equivalentes e resolver problemas em diversos contextos',
          'Generalizar e justificar a expressão para o cálculo da medida da área do paralelogramo a partir do retângulo, com recurso a material manipulável e/ou tecnológico',
          'Identificar as alturas de um paralelogramo',
          'Generalizar e justificar a expressão para o cálculo da medida da área do triângulo a partir do paralelogramo, com recurso a material manipulável e/ou tecnológico',
          'Identificar as alturas de um triângulo e relacionar as respetivas posições com a classificação do triângulo',
          'Identificar pares de faces paralelas e pares de faces perpendiculares em prismas',
          'Explicar a classificação hierárquica entre prismas retos, paralelepípedos retângulos e cubos, apresentando e explicando raciocínios e representações',
          'Formular e testar conjeturas identificando regularidades em classes de poliedros envolvendo os seus elementos e expressá-las usando linguagem corrente ou através de expressões algébricas',
          'Identificar e construir poliedros a partir das suas planificações, estabelecendo relações entre elementos da planificação e do poliedro',
          'Construir e reconhecer diferentes planificações para o mesmo poliedro',
        ],
      },
    ],
    canTest: 'Capacidades matemáticas transversais (resolução de problemas, raciocínio, pensamento computacional, comunicação, representações, conexões); múltiplos e divisores, números primos < 100, potências de base e expoente naturais; frações equivalentes, comparação/ordenação de frações e decimais, relações frações-decimais-percentagens, arredondamentos às centésimas, adição/subtração de frações (denominador múltiplo do outro), multiplicação de fração por natural, multiplicação e divisão com decimais, cálculo mental; sequências de crescimento e leis de formação, expressões algébricas com letras e equivalência; estatística (questões, recolha, tabelas, gráficos circulares/barras/barras justapostas, média) e probabilidade por frequência relativa; retas e ângulos (medição/construção), triângulos (classificação, construção, congruência), equivalência de figuras, áreas do paralelogramo e do triângulo, poliedros (propriedades e planificações).',
    cannotTest: 'Volume (paralelepípedo, cubo, cilindro) — 6.º ano; área e perímetro do círculo e π — 6.º ano; proporcionalidade direta — 6.º ano; números inteiros negativos — 7.º ano; equações — 7.º ano; teorema de Pitágoras; semelhança de figuras.',
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
  },

  6: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/ae_mat_6.o_ano.pdf',
    domains: [
      {
        name: 'Capacidades Matemáticas',
        topics: ['Resolução de problemas', 'Raciocínio matemático', 'Pensamento computacional', 'Comunicação matemática', 'Representações matemáticas', 'Conexões matemáticas'],
        descriptors: [
          'Reconhecer e aplicar as etapas do processo de resolução de problemas',
          'Formular problemas a partir de uma situação dada, em contextos diversos (matemáticos e não matemáticos)',
          'Aplicar e adaptar estratégias diversas de resolução de problemas, em diversos contextos, nomeadamente com recurso à tecnologia',
          'Reconhecer a correção, a diferença e a eficácia de diferentes estratégias da resolução de um problema',
          'Formular e testar conjeturas/generalizações, a partir da identificação de regularidades comuns a objetos em estudo, nomeadamente recorrendo à tecnologia',
          'Classificar objetos atendendo às suas características',
          'Distinguir entre testar e validar uma conjetura',
          'Justificar que uma conjetura/generalização é verdadeira ou falsa, usando progressivamente a linguagem simbólica',
          'Reconhecer a correção, diferença e adequação de diversas formas de justificar uma conjetura/generalização',
          'Extrair a informação essencial de um problema',
          'Estruturar a resolução de problemas por etapas de menor complexidade de modo a reduzir a dificuldade do problema',
          'Reconhecer ou identificar padrões e regularidades no processo de resolução de problemas e aplicá-los em outros problemas semelhantes',
          'Desenvolver um procedimento (algoritmo) passo a passo para solucionar o problema, nomeadamente recorrendo à tecnologia',
          'Procurar e corrigir erros, testar, refinar e otimizar uma dada resolução apresentada',
          'Descrever a sua forma de pensar acerca de ideias e processos matemáticos, oralmente e por escrito',
          'Ouvir os outros, questionar e discutir as ideias de forma fundamentada, e contrapor argumentos',
          'Ler e interpretar ideias e processos matemáticos expressos por representações diversas',
          'Usar representações múltiplas para demonstrar compreensão, raciocinar e exprimir ideias e processos matemáticos, em especial linguagem verbal e diagramas',
          'Estabelecer conexões e conversões entre diferentes representações relativas às mesmas ideias/processos matemáticos, nomeadamente recorrendo à tecnologia',
          'Usar a linguagem simbólica matemática e reconhecer o seu valor para comunicar sinteticamente e com precisão',
          'Reconhecer e usar conexões entre ideias matemáticas de diferentes temas, e compreender esta ciência como coerente e articulada',
          'Aplicar ideias matemáticas na resolução de problemas de contextos diversos (outras áreas do saber, realidade, profissões)',
          'Interpretar matematicamente situações do mundo real, construir modelos matemáticos adequados, e reconhecer a utilidade e poder da Matemática na previsão e intervenção nessas situações',
          'Identificar a presença da Matemática em contextos externos e compreender o seu papel na criação e construção da realidade',
        ],
      },
      {
        name: 'Números',
        topics: ['Decomposição em fatores primos; mínimo múltiplo comum e máximo divisor comum; multiplicação e divisão de potências', 'Frações: irredutível, operações (incluindo divisão e inverso), potências (a/b)ⁿ; expressões numéricas e cálculo mental'],
        descriptors: [
          'Representar números naturais como produto de fatores primos e reconhecer que essa decomposição é única',
          'Calcular o mínimo múltiplo comum e o máximo divisor comum de dois números recorrendo aos conjuntos dos seus múltiplos e divisores e à decomposição em fatores primos',
          'Reconhecer o mínimo múltiplo comum e o máximo divisor comum de dois números, quando um deles é múltiplo do outro, ou quando um deles é um número primo',
          'Selecionar e justificar o método mais eficiente para identificação do máximo divisor comum e mínimo múltiplo comum de um determinado par de números, comparando criticamente diferentes estratégias de resolução',
          'Resolver problemas em que seja relevante o recurso ao cálculo de mínimo múltiplo comum e de máximo divisor comum, em diversos contextos',
          'Reconhecer e aplicar as regras da multiplicação e da divisão de potências com a mesma base ou o mesmo expoente',
          'Determinar a fração irredutível equivalente a uma fração dada',
          'Adicionar e subtrair frações, reduzindo ao mesmo denominador',
          'Multiplicar frações e representar geometricamente o resultado em situações simples',
          'Reconhecer que dois números são inversos um do outro, quando o seu produto é 1',
          'Reconhecer a fração como representação de uma medida, tomando uma unidade contínua, e explicar o significado do numerador e do denominador',
          'Dividir duas frações com recurso à multiplicação do dividendo pelo inverso do divisor',
          'Interpretar e modelar situações envolvendo potências do tipo (a/b)ⁿ e calcular o seu valor',
          'Usar expressões numéricas para representar uma dada situação e vice-versa',
          'Calcular o valor de expressões numéricas envolvendo as quatro operações e potências, reconhecendo a importância do uso dos parênteses e o significado da prioridade das operações',
          'Mobilizar as propriedades das operações',
          'Analisar, comparar e ajuizar da simplicidade e eficácia de estratégias realizadas por si e por outros, apresentando e explicando raciocínios',
          'Adicionar frações, recorrendo ao uso das propriedades da adição de forma a agilizar o cálculo, apresentando e explicando raciocínios e representações',
          'Multiplicar frações, tirando partido das propriedades da multiplicação de forma a agilizar o cálculo, apresentando e explicando raciocínios e representações',
        ],
      },
      {
        name: 'Álgebra',
        topics: ['Regularidades em sequências (decrescentes); leis de formação', 'Proporcionalidade direta (razão, proporção, constante); relações numéricas e algébricas'],
        descriptors: [
          'Reconhecer relações entre termos consecutivos de uma sequência numérica decrescente ou entre termos e as respetivas ordens, e formular conjeturas quanto a leis de formação das sequências',
          'Identificar e descrever em linguagem natural ou simbólica uma possível lei de formação para uma dada sequência decrescente',
          'Criar, completar e continuar sequências dadas de acordo com uma lei de formação e verificar se um dado número é elemento de uma sequência, justificando',
          'Resolver problemas que envolvam regularidades e comparar criticamente diferentes estratégias da resolução',
          'Reconhecer a natureza multiplicativa da relação de proporcionalidade direta e distinguir relações de proporcionalidade direta daquelas que não o são',
          'Reconhecer a fração como representação de uma razão entre duas partes de um mesmo todo',
          'Explicar, por palavras suas, o significado da constante de proporcionalidade, razão e proporção no contexto de um problema',
          'Determinar uma quantidade, dada uma outra que lhe é proporcional e conhecida a razão de proporcionalidade',
          'Usar o raciocínio proporcional em situações representadas na forma de texto, tabelas ou gráficos, transitando de forma fluente entre diferentes representações',
          'Resolver problemas que envolvam a interpretação e modelação de situações de proporcionalidade direta',
          'Fazer uso das propriedades das operações e completar equivalências algébricas ou igualdades aritméticas, envolvendo quaisquer das operações com frações e números naturais',
          'Representar as propriedades das operações através de uma expressão algébrica',
          'Exprimir situações de proporcionalidade direta através de uma expressão algébrica',
        ],
      },
      {
        name: 'Dados',
        topics: ['Questões estatísticas (características quantitativas contínuas), recolha e organização em classes', 'Representações gráficas (gráficos de linha, histogramas)', 'Análise de dados: classe modal; comunicação (relatórios, infográficos)', 'Probabilidades: acontecimentos equiprováveis'],
        descriptors: [
          'Formular questões do seu interesse, sobre características quantitativas contínuas',
          'Participar na definição de quais são os dados a recolher e decidir onde devem ser recolhidos, quem inquirir e/ou o que observar',
          'Recolher dados a partir de fontes primárias ou sítios credíveis na Internet (dados contínuos agrupados em classes e não agrupados/listas), através de um dado método de recolha',
          'Reconhecer que os dados contínuos envolvem grande variedade de números levando à necessidade de agrupar os dados em classes',
          'Construir classes de igual amplitude, sem recorrer a regras formais',
          'Usar tabelas de frequências absolutas e relativas para organizar os dados para cada uma das classes. Usar título na tabela',
          'Representar dados que evoluem com o tempo através de gráficos de linha, incluindo fonte, título e legenda',
          'Representar dados através de histogramas, usando escalas adequadas, e incluindo fonte, título e legendas',
          'Analisar e comparar diferentes representações gráficas presentes nos media, discutir a sua adequabilidade e concluir criticamente sobre eventuais efeitos de manipulações gráficas, desenvolvendo a literacia estatística',
          'Decidir criticamente sobre qual(is) as representações gráficas a adotar e justificar a(s) escolha(s)',
          'Reconhecer a(s) classe(s) modal(ais) como a classe que apresenta maior frequência e identificá-la',
          'Analisar criticamente qual(ais) a(s) medida(s) resumo apropriadas para resumir os dados, em função da sua natureza',
          'Ler, interpretar e discutir a distribuição dos dados, salientando criticamente os aspetos mais relevantes',
          'Retirar conclusões, fundamentar decisões e colocar novas questões suscitadas pelas conclusões obtidas',
          'Divulgar o estudo com recurso a um relatório, contando a história que está por detrás dos dados, e questões emergentes para estudos futuros',
          'Elaborar infográficos digitais de modo a divulgar o estudo de forma rigorosa, eficaz e não enganadora',
          'Identificar situações aleatórias em que seja razoável admitir ou não a existência de resultados com igual possibilidade de se verificarem',
          'Reconhecer que as probabilidades de acontecimentos que tenham igual possibilidade de se verificarem são iguais',
        ],
      },
      {
        name: 'Geometria e Medida',
        topics: ['Figuras planas: polígonos (côncavos/convexos, regulares/irregulares), perímetro e área do círculo (π), ângulos suplementares/complementares, ângulos internos e externos do triângulo', 'Figuras no espaço: volume (paralelepípedo, cubo, cilindro)', 'Operações com figuras: rotações e simetrias (rosáceas)'],
        descriptors: [
          'Distinguir polígonos côncavos de polígonos convexos',
          'Distinguir polígonos regulares de polígonos irregulares',
          'Resolver problemas que envolvam polígonos regulares e irregulares',
          'Reconhecer a relação de proporcionalidade direta entre o perímetro e o diâmetro de uma circunferência e designar por π a constante de proporcionalidade, estabelecendo a articulação com a álgebra',
          'Conhecer a expressão para a medida da área do círculo',
          'Resolver problemas que envolvam a determinação das medidas do perímetro e da área do círculo, em diversos contextos',
          'Classificar ângulos suplementares e complementares e reconhecer a invariância da amplitude do ângulo soma',
          'Conjeturar sobre a soma dos ângulos internos e externos de um triângulo e explicar a relação encontrada',
          'Resolver problemas envolvendo as propriedades dos triângulos',
          'Compreender o que é o volume de um objeto e explicar por palavras suas',
          'Medir o volume de um objeto, usando unidades de medida não convencionais e unidades convencionais (metro cúbico e o centímetro cúbico) adequadas',
          'Reconhecer a correspondência entre o decímetro cúbico e o litro',
          'Generalizar a expressão da medida do volume do paralelepípedo relacionando-a com a contagem estruturada do número de cubos unitários existentes num paralelepípedo',
          'Generalizar a expressão da medida do volume do cubo relacionando-a com a expressão da medida do volume do paralelepípedo',
          'Conhecer a expressão da medida do volume para o cilindro',
          'Interpretar e modelar situações que envolvam volumes de paralelepípedos e cilindros ou sólidos decomponíveis em paralelepípedos e cilindros, e resolver problemas associados',
          'Construir as imagens de um ponto por rotação, com um centro fixo e diferentes ângulos, e reconhecer que todas estão contidas numa circunferência cujo centro é o centro de rotação',
          'Construir a imagem de polígonos (triângulos ou quadriláteros) por rotação dado o centro e o ângulo orientado, usando régua, compasso e transferidor ou um AGD',
          'Analisar as simetrias de rotação de rosáceas e explicar a forma como foram construídas, relacionando o ângulo mínimo de rotação com as características das rosáceas',
          'Relacionar, para rosáceas com simetria de reflexão, o número de eixos de simetria com a medida da amplitude do ângulo mínimo de rotação',
          'Construir as imagens de uma figura, por rotações sucessivas, de modo a formar uma rosácea',
        ],
      },
    ],
    canTest: 'Capacidades matemáticas transversais; decomposição em fatores primos, mmc e mdc, multiplicação e divisão de potências; frações (irredutível, adição/subtração, multiplicação, divisão pelo inverso, potências (a/b)ⁿ), expressões numéricas e cálculo mental; sequências decrescentes e leis de formação, proporcionalidade direta (razão, proporção, constante), relações e expressões algébricas; estatística com dados contínuos (classes, tabelas, gráficos de linha, histogramas, classe modal, relatórios/infográficos) e probabilidade de acontecimentos equiprováveis; polígonos côncavos/convexos e regulares/irregulares, perímetro e área do círculo (π), ângulos suplementares/complementares e ângulos internos/externos do triângulo, volume do paralelepípedo, cubo e cilindro, rotações e simetrias (rosáceas).',
    cannotTest: 'Números inteiros negativos — 7.º ano; proporcionalidade inversa — 7.º/8.º ano; semelhança de figuras e de triângulos — 7.º/8.º ano; equações — 7.º ano; teorema de Pitágoras; funções; probabilidade de Laplace formal (8.º ano); mediana e diagramas de caule-e-folhas (não são AE do 6.º).',
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
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
      {
        name: 'Oralidade',
        topics: ['Compreensão: selecionar e organizar informação, controlar a produção discursiva', 'Expressão: apresentações orais, planificar textos orais, interação, coesão do discurso'],
        descriptors: [
          'Selecionar informação relevante em função dos objetivos de escuta e registá-la por meio de técnicas diversas',
          'Organizar a informação do texto e registá-la, por meio de técnicas diversas',
          'Controlar a produção discursiva a partir do feedback dos interlocutores',
          'Preparar apresentações orais (exposição, reconto, tomada de posição) individualmente ou após discussão de diferentes pontos de vista',
          'Planificar e produzir textos orais com diferentes finalidades',
          'Intervir, com dúvidas e questões, em interações com diversos graus de formalidade, com respeito por regras de uso da palavra',
          'Captar e manter a atenção da audiência (postura corporal, expressão facial, clareza, volume e tom de voz)',
          'Produzir um discurso com elementos de coesão adequados (concordância; tempos verbais; advérbios; variação das anáforas; uso de conectores frásicos e textuais mais frequentes)',
        ],
      },
      {
        name: 'Leitura',
        topics: ['Textos narrativos e expositivos; sentido global, inferências, tema e ideias principais, estrutura, recursos expressivos', 'Géneros: verbete de enciclopédia, entrevista, anúncio publicitário, notícia, carta formal'],
        descriptors: [
          'Ler textos com características narrativas e expositivas, associados a finalidades lúdicas, estéticas e informativas',
          'Realizar leitura em voz alta, silenciosa e autónoma',
          'Explicitar o sentido global de um texto',
          'Fazer inferências, justificando-as',
          'Identificar tema(s), ideias principais e pontos de vista',
          'Reconhecer a forma como o texto está estruturado (partes e subpartes)',
          'Compreender a utilização de recursos expressivos para a construção de sentido do texto',
          'Utilizar procedimentos de registo e tratamento de informação',
          'Analisar textos em função do género textual a que pertencem (estruturação e finalidade): verbete de enciclopédia, entrevista, anúncio publicitário, notícia e carta formal (em diversos suportes)',
        ],
      },
      {
        name: 'Educação Literária',
        topics: ['Textos narrativos, líricos e dramáticos; género literário, sentido conotativo, estrutura do texto narrativo, recursos expressivos (personificação, comparação)', 'Projeto de leitura; declamação e representação'],
        descriptors: [
          'Ler integralmente textos literários de natureza narrativa, lírica e dramática (no mínimo, um livro infantojuvenil, quatro poemas, duas lendas, três contos de autor e um texto dramático)',
          'Interpretar o texto em função do género literário',
          'Inferir o sentido conotativo de palavras e expressões',
          'Reconhecer a estrutura e os elementos constitutivos do texto narrativo: personagens, narrador, contexto temporal e espacial, ação',
          'Explicar recursos expressivos utilizados na construção dos textos literários (designadamente personificação, comparação)',
          'Analisar o modo como os temas, as experiências e os valores são representados nas obras lidas e compará-lo com outras manifestações artísticas (música, pintura, escultura, cinema, etc.)',
          'Valorizar a diversidade cultural patente nos textos',
          'Fazer declamações e representações teatrais',
          'Desenvolver um projeto de leitura que integre explicitação de objetivos de leitura pessoais e comparação de temas comuns em livros, em géneros e em manifestações artísticas diferentes',
        ],
      },
      {
        name: 'Escrita',
        topics: ['Planificação, textualização e revisão; parágrafos, ortografia e pontuação', 'Texto descritivo, narrativo e de defesa de uma posição'],
        descriptors: [
          'Descrever pessoas, objetos e paisagens em função de diferentes finalidades e géneros textuais',
          'Planificar a escrita por meio do registo de ideias e da sua hierarquização',
          'Escrever textos organizados em parágrafos, de acordo com o género textual que convém à finalidade comunicativa',
          'Escrever com respeito pelas regras de ortografia e de pontuação',
          'Aperfeiçoar o texto depois de redigido',
          'Escrever textos de natureza narrativa integrando os elementos que circunscrevem o acontecimento, o tempo e o lugar, o desencadear da ação, o desenvolvimento e a conclusão, com recurso a vários conectores de tempo, de causa, de explicação e de contraste',
          'Escrever textos em que se defenda uma posição com argumentos e conclusão coerentes, individualmente ou após discussão de diferentes pontos de vista',
        ],
      },
      {
        name: 'Gramática',
        topics: ['Classes de palavras (verbo, advérbio, conjunção); flexão nominal/adjetival e verbal (mais-que-perfeito)', 'Funções sintáticas (sujeito, vocativo, predicado, CD, CI); frase simples/complexa; formação de palavras; pontuação'],
        descriptors: [
          'Identificar a classe das palavras: verbo principal (transitivo e intransitivo) e verbo auxiliar, advérbio, conjunção',
          'Conjugar verbos regulares e irregulares no pretérito mais-que-perfeito (simples e composto) do modo indicativo',
          'Identificar o particípio passado e o gerúndio dos verbos',
          'Sistematizar processos de formação do feminino dos nomes e adjetivos',
          'Sistematizar a flexão nominal e adjetival quanto ao número',
          'Identificar os constituintes da frase com as seguintes funções sintáticas: sujeito (simples e composto), vocativo, predicado; complemento (direto e indireto)',
          'Distinguir frases simples de frases complexas',
          'Empregar, de modo intencional e adequado, conectores com valor de tempo, de causa, de explicação e de contraste',
          'Analisar palavras a partir dos seus elementos constitutivos (base, radical e afixos), com diversas finalidades (deduzir significados, integrar na classe gramatical, formar famílias de palavras)',
          'Compreender a composição como processo de formação de palavras',
          'Explicitar regras de utilização dos sinais de pontuação',
          'Mobilizar formas de tratamento mais usuais no relacionamento interpessoal, em diversos contextos de formalidade',
        ],
      },
    ],
    canTest: 'Oralidade (seleção/organização de informação, apresentações orais, coesão do discurso); leitura (sentido global, inferências, tema e ideias principais, estrutura, recursos expressivos; verbete, entrevista, anúncio, notícia, carta formal); educação literária (narrativa/lírica/dramática, sentido conotativo, elementos do texto narrativo, personificação e comparação); escrita (descrição, narrativa com conectores, texto de defesa de posição, ortografia e pontuação); gramática (verbo principal/auxiliar, advérbio, conjunção; mais-que-perfeito; particípio e gerúndio; feminino e número; sujeito simples/composto, vocativo, predicado, CD, CI; frase simples/complexa; derivação e composição; pontuação).',
    cannotTest: 'Orações subordinadas e sua classificação (6.º ano); voz passiva e discurso indireto (6.º ano); modo conjuntivo (6.º ano); orações completivas/relativas (3.º ciclo); análise estilística aprofundada.',
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
  },

  6: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/6_portugues.pdf',
    domains: [
      {
        name: 'Oralidade',
        topics: ['Compreensão: sentidos implícitos, factos vs opiniões', 'Expressão: paráfrase e resumo, relato/descrição/apreciação crítica, apresentação estruturada, coesão textual'],
        descriptors: [
          'Explicitar, com fundamentação adequada, sentidos implícitos',
          'Distinguir factos de opiniões na explicitação de argumentos',
          'Comunicar, em contexto formal, informação essencial (paráfrase, resumo) e opiniões fundamentadas',
          'Planificar, produzir e avaliar textos orais (relato, descrição, apreciação crítica), com definição de tema e sequência lógica de tópicos, individualmente ou em grupo',
          'Fazer uma apresentação oral, devidamente estruturada, sobre um tema',
          'Captar e manter a atenção da audiência (olhar, gesto, recurso eventual a suportes digitais)',
          'Utilizar, de modo intencional e sistemático, processos de coesão textual: anáforas lexicais e pronominais, frases complexas, expressões adverbiais, tempos e modos verbais, conectores frásicos',
        ],
      },
      {
        name: 'Leitura',
        topics: ['Textos narrativos e expositivos de maior complexidade; sentido global, inferências, tema, estrutura, recursos expressivos', 'Géneros: notícia, entrevista, anúncio publicitário, roteiro; publicidade'],
        descriptors: [
          'Ler textos com características narrativas e expositivas de maior complexidade, associados a finalidades várias (lúdicas, estéticas, publicitárias e informativas) e em suportes variados',
          'Realizar leitura em voz alta, silenciosa e autónoma',
          'Explicitar o sentido global de um texto',
          'Fazer inferências, justificando-as',
          'Identificar tema(s), ideias principais e pontos de vista',
          'Reconhecer a forma como o texto está estruturado (partes e subpartes)',
          'Compreender a utilização de recursos expressivos para a construção de sentido do texto',
          'Utilizar procedimentos de registo e tratamento de informação',
          'Distinguir nos textos características da notícia, da entrevista, do anúncio publicitário e do roteiro (estruturação, finalidade)',
          'Conhecer os objetivos e as formas de publicidade na sociedade atual',
        ],
      },
      {
        name: 'Educação Literária',
        topics: ['Textos narrativos, poéticos e dramáticos; género literário, sentido conotativo', 'Marcas do texto poético (estrofe, rima, métrica/redondilha) e do texto dramático (ato, cena, fala, indicações cénicas); recursos (anáfora, metáfora)'],
        descriptors: [
          'Ler integralmente obras literárias narrativas, poéticas e dramáticas (no mínimo, quatro poemas de autores portugueses, quatro poemas de autores lusófonos, um poema do Romanceiro, de Almeida Garrett, dois contos de Grimm, três narrativas extensas de autor, um texto dramático)',
          'Interpretar adequadamente os textos de acordo com o género literário',
          'Analisar o sentido conotativo de palavras e expressões',
          'Identificar marcas formais do texto poético: estrofe, rima, esquema rimático e métrica (redondilha)',
          'Reconhecer, na organização do texto dramático, ato, cena, fala e indicações cénicas',
          'Analisar o modo como os temas, as experiências e os valores são representados',
          'Valorizar a diversidade de culturas, de vivências e de mundivisões presente nos textos',
          'Explicar recursos expressivos utilizados na construção de textos literários (designadamente anáfora e metáfora)',
          'Expressar reações aos livros lidos e partilhar leituras através de declamações, representações teatrais, escrita criativa, apresentações orais',
          'Desenvolver um projeto de leitura que integre explicitação de objetivos de leitura pessoais e comparação de temas comuns em obras, em géneros e em manifestações artísticas diferentes',
        ],
      },
      {
        name: 'Escrita',
        topics: ['Texto narrativo com diálogo e descrição; planificação/textualização/revisão', 'Escrita com recursos digitais (blogues, fóruns); exposição, resumo e texto de opinião'],
        descriptors: [
          'Escrever textos de caráter narrativo, integrando o diálogo e a descrição',
          'Utilizar sistematicamente processos de planificação, textualização e revisão de textos',
          'Utilizar processadores de texto e recursos da Web para a escrita, revisão e partilha de textos',
          'Intervir em blogues e em fóruns, por meio de textos adequados ao género e à situação de comunicação',
          'Redigir textos de âmbito escolar, como a exposição e o resumo',
          'Produzir textos de opinião com juízos de valor sobre situações vividas e sobre leituras feitas',
        ],
      },
      {
        name: 'Gramática',
        topics: ['Classes de palavras (verbo copulativo/auxiliar; conjunções e locuções; determinante/pronome indefinido; quantificador); modo conjuntivo e condicional', 'Funções sintáticas (predicativo do sujeito, complemento oblíquo e agente da passiva, modificador); voz passiva; discurso indireto; próclise/ênclise/mesóclise; coordenação e subordinação; derivação e composição; pontuação'],
        descriptors: [
          'Identificar a classe de palavras: verbo copulativo e auxiliar (da passiva e tempos compostos); conjunção e locução conjuncional (coordenativa copulativa e adversativa; subordinativa temporal e causal), determinante indefinido, pronome indefinido; quantificador',
          'Conjugar verbos regulares e irregulares no presente, no pretérito imperfeito e no futuro do modo conjuntivo, no condicional',
          'Utilizar apropriadamente os tempos verbais na construção de frases complexas e de textos',
          'Empregar adequadamente o modo conjuntivo como forma supletiva do imperativo',
          'Identificar funções sintáticas: predicativo do sujeito, complementos (oblíquo e agente da passiva) e modificador (do grupo verbal)',
          'Transformar a frase ativa em frase passiva (e vice-versa) e o discurso direto em discurso indireto (e vice-versa)',
          'Colocar corretamente as formas átonas do pronome pessoal adjacentes ao verbo (próclise, ênclise e mesóclise)',
          'Compreender a ligação de orações por coordenação e por subordinação',
          'Classificar orações coordenadas copulativas e adversativas e orações subordinadas adverbiais temporais e causais',
          'Distinguir derivação de composição',
          'Explicar a utilização de sinais de pontuação em função da construção da frase',
          'Mobilizar no relacionamento interpessoal formas de tratamento adequadas a contextos formais',
        ],
      },
    ],
    canTest: 'Oralidade (sentidos implícitos, factos vs opiniões, paráfrase/resumo, apresentação estruturada, coesão textual); leitura (narrativos/expositivos complexos, inferências, estrutura, recursos; notícia, entrevista, anúncio, roteiro, publicidade); educação literária (narrativa/poesia/drama, sentido conotativo, marcas do texto poético — estrofe, rima, métrica/redondilha — e dramático — ato, cena, fala, indicações cénicas —, anáfora e metáfora); escrita (narrativa com diálogo e descrição, exposição, resumo, texto de opinião, recursos digitais); gramática (verbo copulativo/auxiliar, conjunções/locuções, determinante/pronome indefinido, quantificador; modo conjuntivo e condicional; predicativo do sujeito, complemento oblíquo e agente da passiva, modificador; voz passiva; discurso indireto; próclise/ênclise/mesóclise; coordenação e subordinação adverbial temporal/causal; derivação e composição).',
    cannotTest: 'Orações subordinadas completivas e relativas (3.º ciclo); orações adverbiais além de temporais/causais (7.º-9.º ano); análise estilística aprofundada; retórica formal.',
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
  },

  7: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/portugues_3c_7a_ff.pdf",
    domains: [
      {
        name: "ORALIDADE Compreensão",
        topics: [],
        descriptors: [
          "Compreender textos orais identificando assunto, tema e intenção comunicativa (expor, informar, narrar, descrever, expressar sentimentos, persuadir), com base em inferências.",
          "Destacar o essencial de um texto audiovisual, tendo em conta o objetivo da audição/visionamento.",
          "Sintetizar a informação recebida pela tomada de notas das ideias-chave.",
        ],
      },
      {
        name: "ORALIDADE Expressão",
        topics: [],
        descriptors: [
          "Planificar textos orais tendo em conta os destinatários e os objetivos de comunicação.",
          "Usar a palavra com fluência, correção e naturalidade em situações de intervenção formal, para expressar pontos de vista e opiniões e fazer a exposição oral de um tema.",
          "Respeitar as convenções que regulam a interação discursiva, em situações com diferentes graus de formalidade.",
          "Usar mecanismos de controlo da produção discursiva a partir do feedback dos interlocutores.",
          "Avaliar o seu próprio discurso a partir de critérios previamente acordados com o professor.",
        ],
      },
      {
        name: "LEITURA",
        topics: [],
        descriptors: [
          "Ler em suportes variados textos dos géneros seguintes: biografia, textos de géneros jornalísticos de opinião (artigo de opinião, crítica), textos publicitários.",
          "Realizar leitura em voz alta, silenciosa e autónoma, não contínua e de pesquisa.",
          "Explicitar o sentido global de um texto.",
          "Fazer inferências devidamente justificadas.",
          "Identificar tema(s), ideias principais, pontos de vista, causas e efeitos, factos, opiniões.",
          "Reconhecer a forma como o texto está estruturado (partes e subpartes).",
          "Compreender a utilização de recursos expressivos para a construção de sentido do texto.",
          "Identificar, nas mensagens publicitárias, a intenção persuasiva, os valores e modelos projetados.",
          "Expressar, com fundamentação, pontos de vista e apreciações críticas suscitadas pelos textos lidos.",
          "Utilizar procedimentos de registo e tratamento da informação.",
        ],
      },
      {
        name: "EDUCAÇÃO LITERÁRIA",
        topics: [],
        descriptors: [
          "Ler integralmente obras literárias narrativas, líricas e dramáticas (no mínimo, nove poemas de oito autores diferentes, duas narrativas de autores de língua portuguesa e um texto dramático).",
          "Interpretar os textos em função do género literário.",
          "Identificar marcas formais do texto poético: estrofe, rima, esquema rimático e métrica (redondilha maior e menor).",
          "Reconhecer, na organização do texto dramático, ato, cena, fala e indicações cénicas.",
          "Analisar o modo como os temas, as experiências e os valores são representados na obra e compará-lo com outras manifestações artísticas (música, pintura, escultura, cinema, etc.).",
          "Explicar recursos expressivos utilizados na construção do sentido (enumeração, pleonasmo e hipérbole).",
          "Exprimir ideias pessoais sobre textos lidos e ouvidos com recurso a suportes variados.",
          "Desenvolver um projeto de leitura que integre objetivos pessoais do leitor e comparação de diferentes textos (obras escolhidas em contrato de leitura com o(a) professor(a)).",
        ],
      },
      {
        name: "ESCRITA",
        topics: [],
        descriptors: [
          "Elaborar textos que cumpram objetivos explícitos quanto ao destinatário e à finalidade (informativa ou argumentativa) no âmbito de géneros como: resumo, exposição, opinião, comentário, biografia e resposta a questões de leitura.",
          "Planificar a escrita de textos com finalidades informativas, assegurando distribuição de informação por parágrafos.",
          "Ordenar e hierarquizar a informação, tendo em vista a continuidade de sentido, a progressão temática e a coerência global do texto.",
          "Redigir textos com processos lexicais e gramaticais de correferência e de conexão interfrásica mais complexos com adequada introdução de novas informações, evitando repetições e contradições.",
          "Escrever com propriedade vocabular e com respeito pelas regras de ortografia e de pontuação.",
          "Avaliar a correção do texto escrito individualmente e com discussão de diversos pontos de vista.",
          "Respeitar os princípios do trabalho intelectual, quanto à identificação das fontes.",
        ],
      },
      {
        name: "GRAMÁTICA",
        topics: [],
        descriptors: [
          "Identificar a classe de palavras: determinante relativo, pronome relativo, advérbio relativo; conjunção e locução conjuncional coordenativa disjuntiva, conclusiva e explicativa e subordinativa final, condicional e completiva; locução prepositiva.",
          "Conjugar verbos regulares e irregulares em todos os tempos e modos.",
          "Utilizar corretamente o pronome pessoal átono (verbos antecedidos de determinados pronomes e advérbios).",
          "Empregar corretamente o modo conjuntivo em contextos de uso obrigatório em frases complexas.",
          "Identificar a função sintática de modificador (de nome e de grupo verbal).",
          "Classificar orações subordinadas: adverbiais finais, condicionais; substantivas completivas (selecionadas por verbo) e adjetivas relativas (restritiva e explicativa).",
          "Distinguir os processos de derivação e de composição na formação regular de palavras.",
          "Reconhecer traços da variação da língua portuguesa de natureza geográfica.",
          "Explicar sinais de pontuação em função da construção da frase.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Descritores AE dos domínios Oralidade (Compreensão e Expressão), Leitura, Educação Literária, Escrita e Gramática do 7.º ano.",
    cannotTest: "Conteúdos do 8.º/9.º ano ou do secundário; obras do cânone de outros anos.",
  },
  8: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/portugues_3c_8a_ff.pdf",
    domains: [
      {
        name: "Oralidade (Compreensão)",
        topics: [],
        descriptors: [
          "Compreender o(s) tema(s) e as ideias centrais do texto, relacionando as informações expressas com o contexto e com o objetivo (expor, informar, explicar, persuadir).",
          "Explicar sentidos figurados e contextuais com base em inferências.",
          "Avaliar argumentos quanto à validade e adequação aos objetivos comunicativos.",
          "Sintetizar a informação recebida.",
        ],
      },
      {
        name: "Oralidade (Expressão)",
        topics: [],
        descriptors: [
          "Fazer exposições orais para apresentação de temas, ideias e opiniões.",
          "Planificar e avaliar o texto oral, tendo em conta a intenção comunicativa e o género textual (expor/informar, explicar, argumentar), individualmente e/ou com discussão de diversos pontos de vista.",
          "Produzir um discurso oral com vocabulário e recursos gramaticais diversificados (coordenação e subordinação; anáfora; conectores frásicos e marcadores discursivos).",
          "Usar recursos verbais e não-verbais com fluência e correção (apresentação eletrónica, Web).",
        ],
      },
      {
        name: "Leitura",
        topics: [],
        descriptors: [
          "Ler em suportes variados textos dos géneros seguintes: (auto)biografia, diário, memórias; reportagem, comentário; texto de opinião.",
          "Reconhecer a organização discursiva de cartas de apresentação.",
          "Realizar leitura em voz alta, silenciosa e autónoma, não contínua e de pesquisa.",
          "Explicitar o sentido global de um texto, com base em inferências, devidamente justificadas.",
          "Identificar temas, ideias principais, pontos de vista, causas e efeitos, factos e opiniões.",
          "Reconhecer a forma como o texto está estruturado (diferentes partes e subpartes).",
          "Utilizar procedimentos de registo e tratamento da informação pela utilização dos métodos do trabalho científico.",
        ],
      },
      {
        name: "Educação Literária",
        topics: [],
        descriptors: [
          "Ler integralmente obras literárias narrativas, líricas e dramáticas (no mínimo, nove poemas de sete autores diferentes, duas narrativas de autores de língua portuguesa e um texto dramático).",
          "Interpretar o texto em função do seu modo literário, com base na análise da representação dos temas, das experiências e dos valores.",
          "Identificar marcas formais do texto poético: estrofe, rima, esquema rimático e métrica.",
          "Reconhecer, na organização do texto dramático, ato, cena, fala e indicações cénicas.",
          "Compreender a utilização de recursos expressivos na construção de sentido do texto (designadamente a antítese).",
          "Exprimir opiniões e problematizar sentidos como reação pessoal à audição ou à leitura de um texto ou obra.",
          "Expressar o apreço por livros lidos através de processos e suportes diversificados.",
          "Desenvolver um projeto de leitura que revele um percurso pessoal de leitor (obras escolhidas em contrato de leitura com o(a) professor(a)).",
        ],
      },
      {
        name: "Escrita",
        topics: [],
        descriptors: [
          "Elaborar textos que cumpram objetivos explícitos quanto ao destinatário e à finalidade (informativa ou argumentativa) no âmbito de géneros como: diário, entrevista, comentário e resposta a questões de leitura.",
          "Planificar a escrita de textos com finalidades informativas, assegurando distribuição de informação por parágrafos, continuidade de sentido, progressão temática, coerência e coesão.",
          "Redigir textos coesos e coerentes, em que se confrontam ideias e pontos de vista e se toma uma posição sobre personagens, acontecimentos, situações e/ou enunciados.",
          "Escrever com correção sintática, com vocabulário diversificado, com uso correto da ortografia e dos sinais de pontuação.",
          "Reformular textos tendo em conta a adequação ao contexto e a correção linguística.",
          "Utilizar com critério as tecnologias da informação na produção, na revisão e na edição de texto.",
          "Respeitar os princípios do trabalho intelectual, quanto às normas para citação.",
        ],
      },
      {
        name: "Gramática",
        topics: [],
        descriptors: [
          "Distinguir as seguintes subclasses de palavras: quantificador universal e existencial.",
          "Distinguir na classe da conjunção e locução conjuncional subordinativa as seguintes subclasses: comparativa, consecutiva, concessiva.",
          "Empregar corretamente o modo conjuntivo em contextos de uso obrigatório em frases complexas.",
          "Distinguir funções sintáticas: predicativo do complemento direto.",
          "Distinguir subordinação adverbial de subordinação adjetival e de subordinação substantiva.",
          "Explicar a função sintática da oração substantiva completiva selecionada pelo verbo.",
          "Classificar orações subordinadas comparativas, consecutivas e concessivas.",
          "Analisar relações de sentido entre palavras.",
          "Reconhecer traços da variação da língua portuguesa de natureza social.",
          "Empregar formas linguísticas adequadas à expressão de opinião e à assunção de compromissos.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Descritores AE dos domínios Oralidade, Leitura, Educação Literária, Escrita e Gramática do 8.º ano.",
    cannotTest: "Conteúdos do 7.º/9.º ano ou do secundário; obras do cânone de outros anos.",
  },
  9: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/portugues_3c_9a_ff.pdf",
    domains: [
      {
        name: "Oralidade — Compreensão",
        topics: [],
        descriptors: [
          "Analisar a organização de um texto oral tendo em conta o género (diálogo argumentativo, exposição e debate) e o objetivo comunicativo.",
          "Avaliar argumentos quanto à validade, à força argumentativa e à adequação aos objetivos comunicativos.",
        ],
      },
      {
        name: "Oralidade — Expressão",
        topics: [],
        descriptors: [
          "Fazer exposições orais para apresentação de temas, ideias, opiniões e apreciações críticas.",
          "Intervir em debates com sistematização de informação e contributos pertinentes.",
          "Argumentar para defender e/ou refutar posições, conclusões ou propostas, em situações de debate de diversos pontos de vista.",
          "Estabelecer contacto visual e ampliar o efeito do discurso através de elementos verbais e não-verbais.",
          "Avaliar discursos orais com base em critérios definidos em grupo.",
        ],
      },
      {
        name: "Leitura",
        topics: [],
        descriptors: [
          "Ler em suportes variados textos dos géneros: textos de divulgação científica, recensão crítica e comentário.",
          "Realizar leitura em voz alta, silenciosa e autónoma, não contínua e de pesquisa.",
          "Explicitar o sentido global de um texto.",
          "Identificar temas, ideias principais, pontos de vista, causas e efeitos, factos e opiniões.",
          "Reconhecer a forma como o texto está estruturado (diferentes partes e subpartes).",
          "Compreender a utilização de recursos expressivos para a construção de sentido do texto.",
          "Expressar, de forma fundamentada, pontos de vista e apreciações críticas motivadas pelos textos lidos.",
          "Utilizar métodos do trabalho científico no registo e tratamento da informação.",
        ],
      },
      {
        name: "Educação Literária",
        topics: [],
        descriptors: [
          "Ler e interpretar obras literárias portuguesas de diferentes autores e géneros: Os Lusíadas, de Luís de Camões, um auto de Gil Vicente, narrativa (uma) e poemas (nove poemas de oito autores).",
          "Relacionar os elementos constitutivos do género literário com a construção do sentido da obra em estudo.",
          "Identificar e reconhecer o valor dos seguintes recursos expressivos: perífrase, eufemismo, ironia.",
          "Reconhecer os valores culturais, éticos, estéticos, políticos e religiosos manifestados nos textos.",
          "Expressar, através de processos e suportes diversificados, o apreço por livros e autores em função de leituras realizadas.",
          "Debater, de forma fundamentada e sustentada, pontos de vista suscitados pelos textos lidos.",
          "Desenvolver um projeto de leitura que implique reflexão sobre o percurso individual enquanto leitor (obras escolhidas em contrato de leitura com o(a) professor(a)).",
        ],
      },
      {
        name: "Escrita",
        topics: [],
        descriptors: [
          "Elaborar textos de natureza argumentativa de géneros como: comentário, crítica, artigo de opinião.",
          "Elaborar resumos (para finalidades diversificadas).",
          "Planificar, com recurso a diversas ferramentas, incluindo as tecnologias de informação e a Web, incorporando seleção de informação e estruturação do texto de acordo com o género e a finalidade.",
          "Utilizar diversas estratégias e ferramentas informáticas na produção, revisão, aperfeiçoamento e edição de texto.",
          "Redigir textos coesos e coerentes, com progressão temática e com investimento retórico para gerar originalidade e obter efeitos estéticos e pragmáticos.",
          "Escrever com correção ortográfica e sintática, com vocabulário diversificado e uso correto dos sinais de pontuação.",
          "Reformular o texto de forma adequada, mobilizando os conhecimentos de revisão de texto.",
          "Respeitar princípios do trabalho intelectual como explicitação da bibliografia consultada de acordo com normas específicas.",
        ],
      },
      {
        name: "Gramática",
        topics: [],
        descriptors: [
          "Identificar processos fonológicos de inserção (prótese, epêntese e paragoge), supressão (aférese, síncope e apócope) e alteração de segmentos (redução vocálica, assimilação, dissimilação, metátese).",
          "Identificar arcaísmos e neologismos.",
          "Reconhecer traços da variação da língua portuguesa de natureza diacrónica.",
          "Utilizar apropriadamente os tempos verbais na construção de frases complexas e de textos.",
          "Analisar frases simples e complexas para: identificação de constituintes; identificação de funções sintáticas; divisão e classificação de orações.",
          "Reconhecer os contextos obrigatórios de próclise e de mesóclise.",
          "Distinguir frases com valor aspetual imperfetivo e com valor aspetual perfetivo.",
          "Explicar relações semânticas entre palavras.",
          "Usar de modo intencional diferentes valores modais atendendo à situação comunicativa (epistémicos, deônticos e apreciativos).",
          "Utilizar, com confiança, formas linguísticas adequadas à expressão de discordância com respeito pelo princípio da cooperação.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Descritores AE dos domínios Oralidade, Leitura, Educação Literária, Escrita e Gramática do 9.º ano.",
    cannotTest: "Conteúdos do 7.º/8.º ano ou do secundário; obras do cânone de outros anos.",
  },
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
        name: 'A água, o ar, as rochas e o solo – Materiais Terrestres',
        topics: [
          'A existência de vida na Terra e as características do planeta (água líquida, atmosfera adequada, temperatura amena)',
          'Ambientes terrestres e aquáticos; subsistemas terrestres',
          'Minerais e rochas (magmáticas, metamórficas, sedimentares); génese e constituição do solo',
          'Água: disponibilidade e circulação, propriedades e funções; água potável vs imprópria; gestão sustentável',
          'Ar: propriedades, constituintes e funções na atmosfera; impactes humanos na qualidade do ar',
        ],
        descriptors: [
          'Relacionar a existência de vida na Terra com algumas características do planeta (água líquida, atmosfera adequada e temperatura amena)',
          'Caracterizar ambientes terrestres e ambientes aquáticos, explorando exemplos locais ou regionais, a partir de dados recolhidos no campo',
          'Identificar os subsistemas terrestres em documentos diversificados, integrando saberes de outras disciplinas',
          'Distinguir mineral de rocha e indicar um exemplo de rochas de cada grupo (magmáticas, metamórficas e sedimentares)',
          'Explicar a importância dos agentes biológicos e atmosféricos na génese do solo, indicando os seus constituintes, propriedades e funções',
          'Discutir a importância dos minerais, das rochas e do solo nas atividades humanas, com exemplos locais ou regionais',
          'Interpretar informação diversificada sobre a disponibilidade e a circulação de água na Terra',
          'Identificar as propriedades da água, relacionando-as com a função da água nos seres vivos',
          'Distinguir água própria para consumo (potável e mineral) de água imprópria para consumo (salobra e inquinada)',
          'Interpretar os rótulos de garrafas de água e justificar a importância da água para a saúde humana',
          'Discutir a importância da gestão sustentável da água ao nível da sua utilização, exploração e proteção',
          'Identificar as propriedades do ar e os seus constituintes, explorando as funções que desempenham na atmosfera terrestre',
          'Argumentar acerca dos impactes das atividades humanas na qualidade do ar e sobre medidas que contribuam para a sua preservação',
        ],
      },
      {
        name: 'Diversidade de seres vivos e suas interações com o meio',
        topics: [
          'Animais: características (forma, revestimento, locomoção), regimes alimentares e habitat',
          'Reprodução animal (rituais de acasalamento, células sexuais, ovíparos/ovovivíparos/vivíparos, metamorfoses)',
          'Influência da água, luz e temperatura no desenvolvimento das plantas; adaptações',
          'Biodiversidade local/regional/nacional; espécies invasoras; conservação da Natureza e áreas protegidas',
        ],
        descriptors: [
          'Relacionar as características (forma do corpo, revestimento, órgãos de locomoção) de diferentes animais com o meio onde vivem',
          'Relacionar os regimes alimentares de alguns animais com o respetivo habitat',
          'Discutir a importância dos rituais de acasalamento dos animais na transmissão de características e na continuidade das espécies',
          'Explicar a necessidade da intervenção de células sexuais na reprodução de alguns seres vivos e a sua importância para a evolução das espécies',
          'Distinguir animais ovíparos de ovovivíparos e de vivíparos',
          'Interpretar informação sobre animais que passam por metamorfoses completas durante o seu desenvolvimento',
          'Interpretar a influência da água, da luz e da temperatura no desenvolvimento das plantas',
          'Identificar adaptações morfológicas e comportamentais dos animais e as respetivas respostas à variação da água, luz e temperatura',
          'Caracterizar alguma da biodiversidade existente a nível local, regional e nacional, apresentando exemplos de relações entre a flora e a fauna nos diferentes habitats',
          'Identificar espécies da fauna e da flora invasora e suas consequências para a biodiversidade local',
          'Formular opiniões críticas sobre ações humanas que condicionam a biodiversidade e sobre a importância da sua preservação',
          'Valorizar as áreas protegidas e o seu papel na proteção da vida selvagem',
        ],
      },
      {
        name: 'Unidade na diversidade de seres vivos',
        topics: [
          'A célula como unidade básica dos seres vivos; tipos de células e principais constituintes',
          'Importância da ciência e da tecnologia na evolução do conhecimento celular',
        ],
        descriptors: [
          'Reconhecer a célula como unidade básica dos seres vivos e distinguir diferentes tipos de células e os seus principais constituintes',
          'Discutir a importância da ciência e da tecnologia na evolução do conhecimento celular',
        ],
      },
    ],
    canTest: 'Existência de vida na Terra e características do planeta (água líquida, atmosfera adequada, temperatura amena); ambientes terrestres/aquáticos e subsistemas terrestres; minerais e rochas (magmáticas, metamórficas, sedimentares) e génese/constituição do solo; propriedades, disponibilidade e gestão da água; propriedades e constituintes do ar e impactes na sua qualidade; características, regimes alimentares e habitat dos animais; reprodução animal (ovíparos/ovovivíparos/vivíparos, metamorfoses, células sexuais); influência de água/luz/temperatura nas plantas; adaptações; biodiversidade, espécies invasoras e conservação; a célula como unidade básica e seus constituintes.',
    cannotTest: 'Classificação formal em reinos e chaves dicotómicas (não é AE do 5.º); fotossíntese ao nível celular; sistemas do corpo humano (6.º ano); reprodução humana (6.º ano); genética; evolução como mecanismo formal.',
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
  },

  6: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/6_ciencias_naturais.pdf',
    domains: [
      {
        name: 'Processos vitais comuns aos seres vivos',
        topics: [
          'Nutrição: nutrientes e função; alimentação equilibrada, rótulos e aditivos; sistema digestivo humano e comparado (aves, ruminantes, omnívoros)',
          'Respiração: externa e celular; respiração branquial e pulmonar; ventilação e trocas gasosas',
          'Circulação: coração, veias/artérias/capilares, constituintes do sangue; circulação sistémica e pulmonar; sinais vitais e 112',
          'Excreção: pele e suor; sistema urinário e formação da urina',
          'Fotossíntese e importância das plantas',
          'Reprodução humana (puberdade, órgãos, ciclo menstrual, fecundação, nidação) e reprodução nas plantas (flor, polinização, dispersão, germinação)',
        ],
        descriptors: [
          'Relacionar a existência dos nutrientes com a função que desempenham no corpo humano, partindo da análise de documentos diversificados e valorizando a interdisciplinaridade',
          'Elaborar algumas ementas equilibradas e discutir os riscos e os benefícios dos alimentos para a saúde humana',
          'Interpretar informação contida em rótulos de alimentos familiares aos alunos',
          'Identificar riscos e benefícios dos aditivos alimentares',
          'Discutir a importância da ciência e da tecnologia na evolução dos produtos alimentares, articulando com saberes de outras disciplinas',
          'Relacionar os órgãos do sistema digestivo com as transformações químicas e mecânicas dos alimentos que neles ocorrem',
          'Relacionar os diferentes tipos de dentes com a função que desempenham',
          'Identificar causas da cárie dentária e indicar formas de a evitar',
          'Explicar a importância dos processos de absorção e de assimilação dos nutrientes, indicando o destino dos produtos não absorvidos',
          'Discutir a importância de comportamentos promotores do bom funcionamento do sistema digestivo',
          'Relacionar os sistemas digestivos das aves e dos ruminantes com o sistema digestivo dos omnívoros',
          'Caracterizar os regimes alimentares das aves granívoras, dos animais ruminantes e dos omnívoros, partindo das características do seu tubo digestivo analisando informação diversificada',
          'Distinguir respiração externa de respiração celular',
          'Interpretar informação relativa à composição do ar inspirado e do ar expirado e as funções dos gases respiratórios',
          'Relacionar os órgãos respiratórios envolvidos na respiração branquial e na respiração pulmonar, com a sua função, através de uma atividade laboratorial, partindo de questões teoricamente enquadradas e efetuando registos de forma criteriosa',
          'Relacionar o habitat dos animais com os diferentes processos respiratórios',
          'Relacionar os órgãos do sistema respiratório humano com as funções que desempenham',
          'Explicar o mecanismo de ventilação pulmonar recorrendo a atividades práticas simples',
          'Distinguir as trocas gasosas ocorridas nos alvéolos pulmonares com as ocorridas nos tecidos',
          'Discutir a importância da ciência e da tecnologia na identificação das principais causas das doenças respiratórias mais comuns',
          'Formular opiniões críticas acerca da importância das regras de higiene no equilíbrio do sistema respiratório',
          'Descrever as principais estruturas do coração de diferentes mamíferos, através da realização de uma atividade laboratorial',
          'Relacionar as características das veias, das artérias e dos capilares sanguíneos com a função que desempenham',
          'Identificar os constituintes do sangue, relacionando-os com a função que desempenham, através de uma atividade laboratorial, efetuando registos de forma criteriosa',
          'Relacionar as características do sangue venoso e do sangue arterial com a circulação sistémica e a circulação pulmonar',
          'Discutir a importância dos estilos de vida para o bom funcionamento do sistema cardiovascular, partindo de questões teoricamente enquadradas',
          'Aplicar procedimentos simples de deteção de ausência de sinais vitais no ser humano e de acionamento do 112',
          'Relacionar a morfologia da pele com a formação e a constituição do suor e o seu papel na função excretora do corpo humano',
          'Identificar os constituintes do sistema urinário, a formação e a constituição da urina e o seu papel na função excretora humana, interpretando documentos diversificados',
          'Formular opiniões críticas acerca dos cuidados a ter com a pele e com o sistema urinário, justificando a sua importância para a saúde humana',
          'Explicar a importância da fotossíntese para a obtenção de alimento nas plantas relacionando os produtos da fotossíntese com a respiração celular',
          'Explicar a influência de fatores que intervêm no processo fotossintético, através da realização de atividades experimentais, analisando criticamente o procedimento adotado e os resultados obtidos e integrando saberes de outras disciplinas',
          'Discutir a importância das plantas para a vida na Terra e medidas de conservação da floresta autóctone',
          'Distinguir caracteres sexuais primários de caracteres sexuais secundários e interpretar informação diversificada acerca do desenvolvimento dos órgãos sexuais durante a puberdade',
          'Relacionar os órgãos do sistema reprodutor masculino e feminino com a função que desempenham',
          'Relacionar o ciclo menstrual com a existência de um período fértil, partindo da análise de documentos diversificados',
          'Caracterizar o processo de fecundação e o processo de nidação',
          'Identificar os principais órgãos constituintes da flor, efetuando registos de forma criteriosa',
          'Reconhecer a importância dos agentes de polinização, da dispersão e da germinação das sementes na manutenção das espécies e equilíbrio dos ecossistemas',
        ],
      },
      {
        name: 'Agressões do meio e integridade do organismo',
        topics: [
          'Microscópio e microrganismos; patogénicos e úteis',
          'Conservação de alimentos e prevenção de doenças',
          'Mecanismos de barreira naturais e medidas de higiene',
          'Vacinas, antibióticos e medicamentos de venda livre',
        ],
        descriptors: [
          'Discutir a importância da ciência e da tecnologia na evolução do microscópio e na descoberta dos microrganismos',
          'Identificar diferentes tipos de microrganismos partindo da análise de informação em documentos diversificados',
          'Distinguir microrganismos patogénicos e microrganismos úteis ao ser humano, partindo de exemplos familiares aos alunos',
          'Discutir a importância da conservação de alimentos na prevenção de doenças devidas a microrganismos',
          'Relacionar a existência de mecanismos de barreira naturais no corpo humano com a necessidade de implementar medidas de higiene que contribuam para a prevenção de doenças infeciosas',
          'Discutir a importância das vacinas e do uso adequado de antibióticos e de medicamentos de venda livre',
        ],
      },
    ],
    canTest: 'Nutrição e sistema digestivo humano e comparado (aves granívoras, ruminantes, omnívoros); dentição; absorção/assimilação; respiração externa e celular, branquial e pulmonar, ventilação e trocas gasosas; sistema cardiovascular (coração, vasos, sangue, circulação sistémica/pulmonar, sinais vitais e 112); excreção (pele/suor e sistema urinário); fotossíntese e importância das plantas; reprodução humana (puberdade, órgãos, ciclo menstrual, fecundação, nidação) e reprodução nas plantas (flor, polinização, dispersão, germinação); microrganismos (patogénicos e úteis), conservação de alimentos, barreiras naturais e higiene, vacinas e uso adequado de antibióticos.',
    cannotTest: 'Sistema nervoso e sistema endócrino (não é AE do 6.º); imunidade específica detalhada (anticorpos, linfócitos, resposta imunitária) — não é AE do 6.º; genética e hereditariedade; evolução e selecção natural.',
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
  },

  7: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/ciencias_naturais_3c_7a_ff.pdf",
    domains: [
      {
        name: "TERRA EM TRANSFORMAÇÃO/Dinâmica externa da Terra",
        topics: [],
        descriptors: [
          "Caracterizar a paisagem envolvente da escola (rochas dominantes, relevo), a partir de dados recolhidos no campo.",
          "Identificar alguns minerais (biotite, calcite, feldspato, moscovite, olivina, quartzo), em amostras de mão de rochas e de minerais.",
          "Relacionar a ação de agentes de geodinâmica externa (água, vento e seres vivos) com a modelação de diferentes paisagens, privilegiando o contexto português.",
          "Interpretar modelos que evidenciem a dinâmica de um curso de água (transporte e deposição de materiais), relacionando as observações efetuadas com problemáticas locais ou regionais de cariz CTSA.",
          "Explicar processos envolvidos na formação de rochas sedimentares (sedimentogénese e diagénese) apresentados em suportes diversificados (esquemas, figuras, textos).",
          "Distinguir rochas detríticas, de quimiogénicas e de biogénicas em amostras de mão.",
        ],
      },
      {
        name: "TERRA EM TRANSFORMAÇÃO/Estrutura e dinâmica interna da Terra",
        topics: [],
        descriptors: [
          "Sistematizar informação sobre a Teoria da Deriva Continental, explicitando os argumentos que a apoiaram e que a fragilizaram, tendo em conta o seu contexto histórico.",
          "Caracterizar a morfologia dos fundos oceânicos, relacionando a idade e o paleomagnetismo das rochas que os constituem com a distância ao eixo da dorsal médio-oceânica.",
          "Relacionar a expansão e a destruição dos fundos oceânicos com a Teoria da Tectónica de Placas (limites entre placas) e com a constância do volume e da massa da Terra.",
          "Explicar a deformação das rochas (dobras e falhas), tendo em conta o comportamento dos materiais (dúctil e frágil) e o tipo de forças a que são sujeitos, relacionando-as com a formação de cadeias montanhosas.",
        ],
      },
      {
        name: "TERRA EM TRANSFORMAÇÃO/Consequências da dinâmica interna da Terra",
        topics: [],
        descriptors: [
          "Identificar os principais aspetos de uma atividade vulcânica, em esquemas ou modelos, e estabelecendo as possíveis analogias com o contexto real em que os fenómenos acontecem.",
          "Relacionar os diferentes tipos de edifícios vulcânicos com as características do magma e o tipo de atividade vulcânica que lhes deu origem.",
          "Identificar vantagens e desvantagens do vulcanismo principal e secundário para as populações locais, bem como os contributos da ciência e da tecnologia para a sua previsão e minimização de riscos associados.",
          "Distinguir rochas magmáticas (granito e basalto) de rochas metamórficas (xistos, mármores e quartzitos), relacionando as suas características com a sua génese.",
          "Identificar aspetos característicos de paisagens magmáticas e metamórficas, relacionando-os com o tipo de rochas presentes e as dinâmicas a que foram sujeitas após a sua formação.",
          "Interpretar informação relativa ao ciclo das rochas, integrando conhecimentos sobre rochas sedimentares, magmáticas e metamórficas e relacionando-os com as dinâmicas interna e externa da Terra.",
          "Identificar os principais grupos de rochas existentes em Portugal em cartas geológicas simplificadas e reconhecer a importância do contributo de outras ciências para a compreensão do conhecimento geológico.",
          "Relacionar algumas características das rochas e a sua ocorrência com a forma como o Homem as utiliza, a partir de dados recolhidos no campo.",
          "Analisar criticamente a importância da ciência e da tecnologia na exploração sustentável dos recursos litológicos, partindo de exemplos teoricamente enquadrados em problemáticas locais, regionais, nacionais ou globais.",
          "Distinguir hipocentro de epicentro sísmico e intensidade de magnitude sísmica.",
          "Distinguir a Escala de Richter da Escala Macrossísmica Europeia.",
          "Interpretar sismogramas e cartas de isossistas nacionais, valorizando o seu papel na identificação do risco sísmico de uma região.",
          "Discutir medidas de proteção de bens e de pessoas, antes, durante e após um sismo, bem como a importância da ciência e da tecnologia na previsão sísmica.",
          "Explicar a distribuição dos sismos e dos vulcões no planeta Terra, tendo em conta os limites das placas tectónicas.",
          "Relacionar os fenómenos vulcânicos e sísmicos com os métodos diretos e indiretos e com a sua importância para o conhecimento da estrutura interna da Terra, explicitando os contributos da ciência e da tecnologia para esse conhecimento.",
        ],
      },
      {
        name: "TERRA EM TRANSFORMAÇÃO/A Terra conta a sua história",
        topics: [],
        descriptors: [
          "Identificar as principais etapas da formação de fósseis e estabelecer as possíveis analogias entre as mesmas e o contexto real em que os fenómenos acontecem.",
          "Explicar o contributo do estudo dos fósseis e dos processos de fossilização para a reconstituição da história da vida na Terra.",
          "Distinguir tempo histórico de tempo geológico em documentos diversificados, valorizando saberes de outras disciplinas (ex.: História).",
          "Explicitar os princípios do raciocínio geológico e de datação relativa e reconhecer a sua importância para a caracterização das principais etapas da história da Terra (eras geológicas).",
        ],
      },
      {
        name: "TERRA EM TRANSFORMAÇÃO/Ciência geológica e sustentabilidade da vida na Terra",
        topics: [],
        descriptors: [
          "Relacionar o ambiente geológico com a saúde e a ocorrência de doenças nas pessoas, nos animais e nas plantas que vivem nesse ambiente, partindo de questões problemáticas locais, regionais ou nacionais.",
          "Explicitar a importância do conhecimento geológico para a sustentabilidade da vida na Terra.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Descritores AE de CN do 7.º ano (Terra em transformação — dinâmica externa e interna, rochas, minerais, atividade geológica).",
    cannotTest: "Conteúdos de CN do 8.º/9.º ano; Físico-Química.",
  },
  8: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/ciencias_naturais_3c_8a_ff.pdf",
    domains: [
      {
        name: "TERRA, UM PLANETA COM VIDA",
        topics: [],
        descriptors: [
          "Explicar as principais condições da Terra que permitiram o desenvolvimento e a manutenção da vida, articulando com saberes de outras disciplinas (ex.: Ciências Físico-Químicas).",
          "Interpretar gráficos da evolução da temperatura e do dióxido de carbono atmosférico ao longo do tempo geológico.",
          "Relacionar a influência dos seres vivos com a evolução da atmosfera terrestre e o efeito de estufa na Terra.",
          "Distinguir o sistema Terra dos seus subsistemas, identificando as potencialidades dos mesmos na geração da vida na Terra.",
          "Analisar criticamente o papel das rochas e do solo na existência de vida no meio terrestre e dos subsistemas na manutenção da vida.",
          "Distinguir células eucarióticas de células procarióticas em observações microscópicas.",
          "Reconhecer a célula como unidade básica dos seres vivos, identificando os principais constituintes das células eucarióticas.",
          "Distinguir os níveis de organização biológica dos seres vivos e dos ecossistemas.",
        ],
      },
      {
        name: "SUSTENTABILIDADE NA TERRA",
        topics: [],
        descriptors: [
          "Caracterizar um ecossistema na zona envolvente da escola (níveis de organização biológica, biodiversidade) a partir de dados recolhidos no campo.",
          "Relacionar os fatores abióticos - luz, água, solo, temperatura – com a sua influência nos ecossistemas, apresentando exemplos de adaptações dos seres vivos a esses fatores e articulando com saberes de outras disciplinas (ex.: Geografia).",
          "Interpretar a influência de alguns fatores abióticos nos ecossistemas, em geral, e aplicá-la em exemplos da região envolvente da escola.",
          "Distinguir interações intraespecíficas de interações interespecíficas e explicitar diferentes tipos de relações bióticas.",
          "Interpretar informação relativa a dinâmicas populacionais decorrentes de relações bióticas, avaliando as suas consequências nos ecossistemas.",
          "Sistematizar cadeias tróficas de ambientes aquáticos e terrestres predominantes na região envolvente da escola, indicando formas de transferência de energia.",
          "Interpretar cadeias tróficas, partindo de diferentes exemplos de teias alimentares.",
          "Analisar criticamente exemplos de impactes da ação humana que condicionem as teias alimentares, discutindo medidas de minimização dos mesmos nos ecossistemas.",
          "Explicar o modo como as atividades dos seres vivos (alimentação, respiração, fotossíntese) interferem nos ciclos de matéria e promovem a sua reciclagem nos ecossistemas.",
          "Interpretar as principais fases dos ciclos da água, do carbono e do oxigénio, com base em informação diversificada (notícias, esquemas, gráficos, imagens) e valorizando saberes de outras disciplinas (ex.: Geografia e Ciências Físico-Químicas).",
          "Analisar criticamente exemplos teoricamente enquadrados acerca do modo como a ação humana pode interferir nos ciclos de matéria e afetar os ecossistemas.",
          "Caracterizar as fases de uma sucessão ecológica em documentos diversificados sobre sucessões ecológicas primárias e secundárias.",
          "Discutir causas e consequências da alteração dos ecossistemas, justificando a importância do equilíbrio dinâmico dos ecossistemas e do modo como a sua gestão pode contribuir para alcançar as metas de um desenvolvimento sustentável.",
          "Discutir opções para a conservação dos ecossistemas e o seu contributo para as necessidades humanas, bem como a importância da ciência e da tecnologia na sua conservação.",
          "Distinguir catástrofes de origem natural de catástrofe de origem antrópica, identificando as causas das principais catástrofes de origem antrópica e valorizando saberes de outras disciplinas (ex.: Geografia).",
          "Explicar o modo como a poluição, a desflorestação, os incêndios e as invasões biológicas podem afetar os ecossistemas.",
          "Interpretar a influência de alguns agentes poluentes nos ecossistemas, partindo de problemáticas locais ou regionais e analisando criticamente os resultados obtidos.",
          "Discutir medidas que diminuam os impactes das catástrofes de origem natural e de origem antrópica nos ecossistemas, em geral, e nos ecossistemas da zona envolvente da escola, em particular.",
          "Distinguir recursos energéticos de recursos não energéticos e recursos renováveis de recursos não renováveis.",
          "Caracterizar diferentes formas de exploração dos recursos naturais, indicando as principais transformações dos recursos naturais.",
          "Discutir os impactes da exploração/transformação dos recursos naturais e propor medidas de redução dos mesmos e de promoção da sua sustentabilidade.",
          "Relacionar o papel dos instrumentos de ordenamento e gestão do território com a proteção e a conservação da Natureza.",
          "Sistematizar informação relativa a Áreas Protegidas em Portugal e no mundo, explicitando medidas de proteção e de conservação das mesmas.",
          "Identificar algumas associações e organismos públicos de proteção e conservação da Natureza existentes em Portugal.",
          "Explicar a importância da recolha, do tratamento e da gestão sustentável de resíduos e propor medidas de redução de riscos e de minimização de danos na contaminação da água procedente da ação humana.",
          "Relacionar a gestão de resíduos e da água com a promoção de um desenvolvimento sustentável.",
          "Analisar criticamente os impactes ambientais, sociais e éticos de casos de desenvolvimento científico e tecnológico no desenvolvimento sustentável e na melhoria da qualidade de vida das populações humanas.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Descritores AE de CN do 8.º ano (Terra, um planeta com vida; Sustentabilidade na Terra — ecossistemas, gestão de recursos).",
    cannotTest: "Conteúdos de CN do 7.º/9.º ano; Físico-Química.",
  },
  9: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/ciencias_naturais_3c_9a_ff.pdf",
    domains: [
      {
        name: "VIVER MELHOR NA TERRA",
        topics: [],
        descriptors: [
          "Distinguir saúde de qualidade de vida, segundo a Organização Mundial de Saúde.",
          "Caracterizar as principais doenças provocadas pela ação de agentes patogénicos mais frequentes.",
          "Relacionar as consequências do uso indevido de antibióticos com o aumento da resistência bacteriana.",
          "Caracterizar, sumariamente, as principais doenças não transmissíveis, indicando a prevalência dos fatores de risco associados.",
          "Interpretar informação sobre os determinantes do nível de saúde individual e comunitária, analisando a sua importância na qualidade de vida de uma população.",
          "Explicar o modo como as \"culturas de risco\" podem condicionar as medidas de capacitação das pessoas, pondo em causa a promoção da saúde.",
          "Analisar criticamente estratégias de atuação na promoção da saúde individual, familiar e comunitária, partindo de questões enquadradas em problemáticas locais, regionais ou nacionais.",
          "Caracterizar o organismo humano como sistema aberto, identificando os seus níveis de organização biológica, as direções anatómicas e as cavidades, discutindo o contributo da ciência e da tecnologia para esse conhecimento.",
          "Relacionar os elementos químicos mais abundantes no corpo humano com as funções desempenhadas.",
          "Distinguir alimento de nutriente e nutriente orgânico de inorgânico, indicando as suas funções no organismo e identificando alguns nutrientes em alimentos.",
          "Relacionar a insuficiência de elementos traço (ferro, flúor, iodo) com os seus efeitos no organismo.",
          "Explicar o modo como alguns distúrbios alimentares  anorexia nervosa, bulimia nervosa e compulsão alimentar  podem afetar o organismo humano.",
          "Relacionar a alimentação saudável com a prevenção de doenças da contemporaneidade, reconhecendo a importância da dieta mediterrânica na promoção da saúde.",
          "Caracterizar as etapas da nutrição, explicitando a função do sistema digestivo e a sua relação com o metabolismo celular.",
          "Relacionar os órgãos do sistema digestivo e as respetivas glândulas anexas com as funções desempenhadas, explicitando as transformações físicas e químicas da digestão.",
          "Explicar a importância do microbiota humano, indicando medidas que contribuam para o bom funcionamento do sistema digestivo.",
          "Identificar os constituintes do sangue em preparações definitivas, relacionando-os com a função que desempenham no organismo.",
          "Analisar possíveis causas de desvios dos resultados de análises sanguíneas relativamente aos valores de referência.",
          "Relacionar o modo de atuação dos leucócitos com a função que desempenham no sistema imunitário.",
          "Identificar a morfologia e a anatomia do coração de um mamífero, explicitando os seus principais constituintes e as respetivas funções.",
          "Relacionar os constituintes do sistema cardiovascular com o ciclo cardíaco.",
          "Caracterizar a variação da frequência cardíaca e da pressão arterial em algumas atividades do dia a dia, articulando com saberes de outras disciplinas (ex.: Educação Física).",
          "Relacionar a estrutura dos vasos sanguíneos com as suas funções e comparar as características do sangue venoso e do sangue arterial na circulação sistémica e na circulação pulmonar.",
          "Identificar as principais doenças do sistema cardiovascular, inferindo contributos da ciência e da tecnologia para a minimização das referidas doenças e explicitando a importância da implementação de medidas que contribuam para o seu bom funcionamento.",
          "Distinguir os diferentes tipos de linfa, explicitando a sua função e a importância dos gânglios linfáticos, bem como a necessidade de efetivar medidas que contribuam para o bom funcionamento do sistema linfático.",
          "Identificar os principais constituintes do sistema respiratório de um mamífero e as respetivas funções.",
          "Distinguir respiração externa de respiração interna e descrever as alterações morfológicas ocorridas durante a ventilação pulmonar.",
          "Comparar a hematose alveolar com a hematose tecidular e reconhecer a sua importância no organismo.",
          "Discutir os efeitos do ambiente e dos estilos de vida no equilíbrio do sistema respiratório e na minimização da ocorrência de doenças, destacando as consequências da exposição ao fumo ambiental do tabaco e indicando medidas que contribuam para o seu bom funcionamento.",
          "Explicar a importância da cadeia de sobrevivência no aumento da taxa de sobrevivência em paragem cardiovascular.",
          "Efetuar o exame do paciente (adulto e pediátrico) com base na abordagem inicial do ABC (airway, breathing and circulation).",
          "Implementar procedimentos do alarme em caso de emergência e executar procedimentos de suporte básico de vida (adulto e pediátrico), seguindo os algoritmos do European Resuscitation Council.",
          "Simular medidas de socorro à obstrução grave e ligeira da via aérea e demonstrar a posição lateral de segurança.",
          "Relacionar os constituintes do sistema urinário com a função que desempenham e caracterizar a anatomia e a morfologia do rim de um mamífero, explicitando as funções desempenhadas pelos seus constituintes.",
          "Relacionar as características da unidade funcional do rim com o processo de formação da urina, identificando alguns fatores que condicionam a sua formação.",
          "Caracterizar as funções da pele, explicitando medidas que podem contribuir para a eficácia da sua função excretora.",
          "Discutir a importância da ciência e da tecnologia na minimização de problemas da função renal e o contributo do cidadão na efetivação de medidas que contribuam para a eficiência da função excretora.",
          "Identificar os constituintes e as funções do sistema nervoso central e periférico e relacionar a constituição do neurónio com o modo como ocorre a transmissão do impulso nervoso.",
          "Distinguir ato voluntário de ato reflexo, relacionando-os com o papel do sistema nervoso na regulação homeostática.",
          "Discutir o contributo da ciência e da tecnologia na identificação de doenças do sistema nervoso e o contributo do cidadão na efetivação de medidas que contribuam para o seu bom funcionamento.",
          "Distinguir glândulas de hormonas e de células-alvo, identificando algumas glândulas endócrinas (hipófise, hipotálamo, pâncreas/ilhéus de Langerhans, ovário, placenta, suprarrenal, testículo, tiróide) e as principais hormonas por elas produzidas.",
          "Explicar a importância do sistema neuro-hormonal no organismo e o contributo da ciência e da tecnologia na identificação de doenças associadas, discutindo medidas que podem contribuir para o seu bom funcionamento.",
          "Comparar as estruturas dos órgãos reprodutores humanos com as funções desempenhadas, e explicar, sumariamente, os processos da espermatogénese e da oogénese.",
          "Caracterizar a coordenação ovárica e uterina, identificando o período fértil num ciclo menstrual.",
          "Distinguir as células reprodutoras humanas, a nível morfológico e a nível fisiológico, e o processo de fecundação do processo de nidação.",
          "Discutir questões relacionadas com o aleitamento materno e outras alternativas.",
          "Discutir o papel da ciência e da tecnologia na identificação de infeções sexualmente transmissíveis e o contributo do cidadão na implementação de medidas que contribuam para o bom funcionamento do sistema reprodutor.",
          "Analisar criticamente as vantagens e as desvantagens dos diferentes métodos contraceptivos.",
          "Discutir o contributo da ciência e da tecnologia na evolução do conhecimento genético e das suas aplicações na sociedade e interpretar informação relativa a estruturas celulares portadoras de material genético.",
          "Explicar a relação entre os fatores hereditários, a informação genética e o modo como a reprodução sexuada condiciona a diversidade intraespecífica e a evolução das populações.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Descritores AE de CN do 9.º ano (Viver melhor na Terra — organismo humano em equilíbrio, saúde individual e comunitária).",
    cannotTest: "Conteúdos de CN do 7.º/8.º ano; Biologia e Geologia do secundário.",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTÓRIA E GEOGRAFIA DE PORTUGAL  (2.º ciclo — disciplina única)
// ─────────────────────────────────────────────────────────────────────────────
const hgp: SubjectCurriculum = {
  // AE oficiais (DGE, Julho de 2018). Descritores verbatim da coluna
  // "AE: CONHECIMENTOS, CAPACIDADES E ATITUDES — O aluno deve ficar capaz de:".
  5: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/5_historia_e_geografia_de_portugal.pdf',
    domains: [
      {
        name: 'A Península Ibérica – localização e quadro natural',
        topics: [
          'Localização de Portugal e da Península Ibérica; leitura de mapas',
          'Geografia física: relevo, clima, hidrografia e vegetação',
          'A ação humana na paisagem; TIC e TIG',
        ],
        descriptors: [
          'Identificar e localizar os elementos geométricos da esfera terrestre numa rede cartográfica',
          'Interpretar diferentes tipos de mapas utilizando os elementos de um mapa: rosa-dos-ventos, título, legenda e escala',
          'Localizar Portugal continental e insular, em relação a diferentes espaços geográficos (Península Ibérica, Europa, Mundo), com recurso aos pontos cardeais e colaterais e a outros elementos geográficos de referência',
          'Descrever e representar em mapas as principais características da geografia física (relevo, clima, hidrografia e vegetação) em Portugal e na Península Ibérica, utilizando diferentes variáveis visuais (cores e símbolos)',
          'Utilizar representações cartográficas (em suporte físico ou digital) na localização dos elementos físicos do território e na definição de itinerários',
          'Descrever situações concretas referentes a alterações na paisagem, decorrentes da ação humana',
          'Aplicar as TIC e as TIG para localizar e conhecer características físicas do território português e da Península Ibérica',
          'Identificar/aplicar os conceitos: localização, pontos cardeais e colaterais, bússola, itinerário, planta, globo terrestre, mapa, planisfério, continente, oceano, equador, trópicos, hemisfério, formas de relevo do litoral, erosão marinha, cursos de água, vegetação natural, zona temperada',
        ],
      },
      {
        name: 'A Península Ibérica: dos primeiros povos à formação de Portugal',
        topics: [
          'Primeiros povos na Península',
          'Os romanos na Península Ibérica',
          'Os muçulmanos na Península Ibérica',
          'A formação do reino de Portugal',
        ],
        descriptors: [
          'Distinguir o modo de vida das comunidades recoletoras do das comunidades agropastoris, nomeadamente das castrejas',
          'Compreender que o processo de sedentarização implicou uma maior cooperação interpessoal, criando as bases da vida em sociedade',
          'Identificar os povos que se instalaram na Península Ibérica, relacionando esse fenómeno com a atração exercida pelos recursos naturais',
          'Aplicar o conceito de fonte histórica, partindo da identificação de vestígios materiais',
          'Identificar/aplicar os conceitos: utensílio, recoleção, nómada, sedentário',
          'Identificar ações de resistência à presença dos romanos',
          'Identificar aspetos da herança romana na Península Ibérica',
          'Aplicar o método de datação a. C. e d. C.',
          'Identificar/aplicar os conceitos: cristianismo, era cristã, romanização',
          'Analisar o processo muçulmano de ocupação da Península Ibérica, reconhecendo a existência de interações de conflito e de paz',
          'Identificar aspetos da herança muçulmana na Península Ibérica',
          'Identificar/aplicar os conceitos: árabe, muçulmano, mouro, reconquista',
          'Contextualizar a autonomia do Condado Portucalense e a formação do Reino de Portugal no movimento de conquista cristã, ressaltando episódios de alargamento do território e da luta de D. Afonso Henriques pela independência',
          'Referir os momentos-chave de autonomização e reconhecimento da independência de Portugal, nomeadamente o Tratado de Zamora e o reconhecimento papal da nova potência',
          'Identificar/aplicar os conceitos: condado, fronteira, independência, reino, monarquia',
        ],
      },
      {
        name: 'Portugal do século XIII ao século XVII',
        topics: [
          'Portugal no século XIII',
          '1383-85 — Um tempo de revolução',
          'Portugal nos séculos XV e XVI',
          'Da União Ibérica à Restauração',
        ],
        descriptors: [
          'Caracterizar os modos de vida dos diversos grupos sociais (clero, nobreza e povo)',
          'Sublinhar a importância das comunidades judaica e muçulmana na sociedade medieval portuguesa',
          'Relacionar a organização do espaço português do século XIII com os recursos naturais e humanos e com a distribuição das atividades económicas',
          'Reconhecer a importância assumida pela expansão de feiras e de mercados no crescimento económico do século XIII',
          'Analisar a fixação das fronteiras e do território nacional levada a cabo ao longo do século XIII e reconhecida pelo Tratado de Alcanizes em 1297',
          'Identificar monumentos representativos do período',
          'Identificar/aplicar os conceitos: documento, território, produção artesanal, comércio, nobreza, clero, concelho, carta de foral, ordem religiosa, mosteiro, tratado',
          'Referir as causas políticas e sociais que desencadearam a crise de 1383-85',
          'Identificar a crise de 1383-85 como um momento de rutura e a primeira grande crise portuguesa',
          'Referir os aspetos mais importantes da ação do Mestre de Avis, de Nuno Álvares Pereira, de Álvaro Pais e de João das Regras',
          'Destacar a importância das Cortes de Coimbra na legitimação do novo rei, dando início a uma nova dinastia',
          'Evidenciar o carácter decisivo da batalha de Aljubarrota',
          'Identificar/aplicar os conceitos: revolução, dinastia, Cortes, crise, burguês',
          'Identificar as principais etapas do processo de exploração da costa ocidental africana',
          'Referir a importância do conhecimento dos ventos e das correntes marítimas para a progressão pela costa ocidental africana',
          'Identificar os principais navios e instrumentos náuticos utilizados pelos portugueses na expansão marítima',
          'Destacar a ação do Infante D. Henrique e de D. João II',
          'Localizar territórios do império português quinhentista',
          'Referir o contributo das grandes viagens para o conhecimento de novas terras, povos e culturas, nomeadamente as de Vasco da Gama, de Pedro Álvares Cabral e de Fernão de Magalhães',
          'Sublinhar a importância dos movimentos migratórios no contexto da expansão portuguesa, ressaltando alterações provocadas pela expansão, nomeadamente uma maior miscigenação étnica, a troca de ideias e de produtos, a submissão violenta de diversos povos e o tráfico de seres humanos',
          'Reconhecer o papel da missionação católica na expansão portuguesa',
          'Valorizar a diversidade cultural e o direito à diferença',
          'Enumerar características do estilo Manuelino, sublinhando a sua relação com a expansão marítima',
          'Identificar/aplicar os conceitos: expansão marítima, rota, colonização, escravo, etnia e migração',
          'Analisar as consequências políticas da morte de D. Sebastião em Alcácer-Quibir, evidenciando 1578-80 como o segundo grande momento de crise política e social de Portugal',
          'Apontar as causas de descontentamento com o domínio filipino que desembocaram na revolta do 1.º de Dezembro de 1640',
          'Identificar/aplicar o conceito: Restauração',
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: 'Localização e quadro natural da Península Ibérica (mapas, relevo, clima, hidrografia, vegetação); primeiros povos (recoletores, agropastoris, castrejos, sedentarização); romanos na Península (resistência, herança, romanização, datação a.C./d.C.); muçulmanos na Península (ocupação, herança, reconquista); formação do reino de Portugal (Condado Portucalense, D. Afonso Henriques, Tratado de Zamora); Portugal no século XIII (grupos sociais, feiras e mercados, Tratado de Alcanizes 1297); crise de 1383-85 (Mestre de Avis, Nuno Álvares Pereira, Aljubarrota, Cortes de Coimbra); séculos XV e XVI (exploração da costa africana, náutica, D. Henrique, D. João II, Vasco da Gama, Cabral, Magalhães, estilo Manuelino); Da União Ibérica à Restauração (Alcácer-Quibir 1578, domínio filipino, 1.º de Dezembro de 1640).',
    cannotTest: 'Portugal do século XVIII ao XIX (6.º ano); Portugal do século XX (6.º ano); Portugal Hoje — geografia humana e económica actual (6.º ano).',
  },

  // AE oficiais (DGE, Julho de 2018). Descritores verbatim.
  6: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/6_historia_e_geografia_de_portugal.pdf',
    domains: [
      {
        name: 'Portugal do século XVIII ao século XIX',
        topics: [
          'Portugal no século XVIII',
          'O triunfo do liberalismo',
          'Portugal na segunda metade do século XIX',
        ],
        descriptors: [
          'Evidenciar a importância do Brasil para a economia portuguesa neste período, nomeadamente enquanto centro de exploração de ouro e de outros recursos naturais e recetáculo de produtos manufaturados portugueses e europeus',
          'Relacionar os movimentos migratórios livres e forçados (comércio de escravos) com a cultura do açúcar e com a exploração mineira',
          'Evidenciar a importância da introdução de novas culturas como a batata e o milho para a melhoria da dieta e para o aumento populacional em Portugal',
          'Compreender a organização da sociedade de ordens, sabendo identificar os diferentes grupos sociais',
          'Reconhecer em D. João V um rei absoluto, ressaltando manifestações do seu poder (fausto da Corte, cerimónias públicas e construções monumentais)',
          'Demonstrar a importância do legado africano nas sociedades portuguesa e brasileira',
          'Caracterizar a ação centralizadora do Marquês de Pombal e o carácter inovador de algumas das suas políticas, nomeadamente na organização do espaço urbano em diversas regiões do reino',
          'Identificar/aplicar os conceitos: cristão-novo, monarquia absoluta, mudança',
          'Identificar e localizar as três invasões napoleónicas, realçando a resistência das populações, o carácter destrutivo da guerra e o impacto da participação inglesa no conflito',
          'Analisar a ligação entre a revolução de 1820, o descontentamento face à tutela inglesa e à permanência da Corte no Brasil',
          'Compreender que a Constituição de 1822 significou uma rutura relativamente ao absolutismo, ao estabelecer os princípios fundamentais do liberalismo',
          'Relacionar a guerra civil com a divisão do país entre defensores do absolutismo e defensores do liberalismo',
          'Identificar/aplicar os conceitos: guerra civil, monarquia liberal, Constituição, mudança, rutura',
          'Relacionar o desenvolvimento da produção industrial nas zonas de Lisboa/Setúbal e Porto/Guimarães com as inovações tecnológicas ocorridas, nomeadamente a introdução da energia a vapor e a expansão do caminho de ferro',
          'Explicar as migrações oitocentistas (para outros continentes e dos campos para as cidades), relacionando-as com o crescimento populacional e com o processo de Industrialização',
          'Referir o aparecimento de um novo grupo social (operariado), a progressiva perda de privilégios da nobreza e a ascensão da burguesia',
          'Analisar o processo que desembocou na abolição da escravatura e da pena de morte',
          'Identificar/aplicar os conceitos: indústria, operariado',
        ],
      },
      {
        name: 'Portugal do século XX',
        topics: [
          'A revolução Republicana',
          'Os anos de ditadura',
          'O 25 de abril e a construção da democracia até à atualidade',
        ],
        descriptors: [
          'Explicar como o desgaste da monarquia constitucional conduziu à revolução republicana',
          'Analisar princípios da Constituição de 1911 característicos de um regime republicano',
          'Identificar medidas governativas da 1.ª República relacionadas com a educação e com os direitos dos trabalhadores',
          'Identificar/aplicar os conceitos: revolução, rutura, república, alfabetização, greve',
          'Sintetizar as principais características do Estado Novo, nomeadamente a ausência de liberdade individual, a existência da censura e de polícia política, a repressão do movimento sindical e a existência de um partido único',
          'Relacionar a guerra colonial com a noção de império no contexto do Estado Novo',
          'Identificar/aplicar os conceitos: ditadura, censura, guerra colonial, oposição, liberdade de expressão',
          'Reconhecer os motivos que conduziram a revolução do 25 de abril, bem como algumas das mudanças operadas',
          'Caracterizar o essencial do processo de democratização entre 1975 e 1982',
          'Identificar/aplicar os conceitos: democracia, descolonização, direito de voto, câmara municipal, junta de freguesia, UE, ONU, PALOP, sociedade multicultural',
        ],
      },
      {
        name: 'Portugal Hoje',
        topics: [
          'A população portuguesa',
          'Os lugares onde vivemos',
          'As atividades económicas que desenvolvemos',
          'Como ocupamos os tempos livres',
          'O Mundo mais perto de nós',
        ],
        descriptors: [
          'Analisar a distribuição de diferentes fenómenos relacionados com a população e utilizando diferentes formas de representação cartográfica (em suporte físico ou digital)',
          'Comparar a distribuição de diferentes fenómenos demográficos/indicadores demográficos à escala nacional, estabelecendo relações de causalidade e ou de interdependência',
          'Explicar a ação de fatores naturais e humanos na distribuição da população e do povoamento no território nacional (áreas atrativas e áreas repulsivas)',
          'Aplicar as TIC e as TIG para localizar e conhecer as caraterísticas e a distribuição dos fenómenos demográficos',
          'Identificar/aplicar os conceitos: censos, NUT, distrito, população absoluta, crescimento natural, saldo migratório, esperança de vida à nascença, mortalidade infantil, envelhecimento da população, densidade populacional, área atrativa, área repulsiva',
          'Analisar a distribuição de diferentes fenómenos relacionados com as áreas de fixação humana usando terminologia geográfica apropriada',
          'Mobilizar as TIC e as TIG para localizar e conhecer as caraterísticas e a distribuição da população urbana e rural',
          'Comparar o espaço rural com o espaço urbano, em Portugal, enunciando diferenças ao nível das atividades económicas, ocupação dos tempos livres, tipo de construções e modos de vida',
          'Elaborar pesquisas documentais sobre problemas da vida quotidiana (por exemplo: pobreza, envelhecimento, despovoamento, etc.) das áreas rurais e urbanas, em Portugal, à escala local e nacional',
          'Identificar fatores responsáveis pela ocorrência de problemas sociais que afetam as áreas rurais e áreas urbanas',
          'Identificar ações a empreender de forma a solucionar ou mitigar alguns problemas sociais',
          'Descrever as relações de complementaridade e interdependência entre diferentes lugares e regiões do território à escala local e nacional',
          'Reconhecer algumas características ambientais, sociais, culturais e paisagísticas que conferem identidade a Portugal e à população portuguesa',
          'Identificar/aplicar os conceitos: povoamento rural, povoamento urbano, êxodo rural, taxa de urbanização, equipamento coletivo, saneamento básico, litoralização',
          'Caracterizar os principais setores de atividades económicas e a evolução da distribuição da população por setores de atividade, à escala local e nacional, usando gráficos e mapas',
          'Utilizar diferentes formas de representação cartográfica (em suporte físico ou digital) na análise da distribuição das diferentes atividades económicas no país, à escala local e nacional',
          'Mobilizar as TIC e as TIG para localizar e conhecer as características e a distribuição das atividades económicas',
          'Identificar/aplicar os conceitos: população ativa, setores de atividade',
          'Exemplificar a importância do lazer e das diferentes formas de turismo em Portugal',
          'Localizar em diferentes representações cartográficas as principais áreas de proteção ambiental em Portugal',
          'Identificar fatores responsáveis por problemas ambientais que afetam o território nacional',
          'Exemplificar ações a empreender, no sentido de solucionar ou mitigar problemas ambientais que afetam o território nacional, relacionando-os com os ODS',
          'Identificar/aplicar os conceitos: lazer, turismo, Parque Nacional e Reserva Natural, paisagem, património (natural, cultural), ambiente',
          'Comparar as vantagens e as desvantagens da utilização dos diferentes modos de transporte (rodoviário, ferroviário, marítimo, aéreo e fluvial)',
          'Relacionar a distribuição das redes de transporte com a distribuição da população e atividades económicas',
          'Discutir a importância do desenvolvimento das telecomunicações nas atividades humanas e qualidade de vida, dando exemplos concretos referentes à situação em Portugal',
          'Aplicar as TIC e as TIG para localizar e conhecer as caraterísticas e a distribuição das redes de transporte',
          'Identificar/aplicar os conceitos: distância-tempo, distância-custo, acessibilidade, redes e modos de transporte, telecomunicações, globalização',
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: 'Portugal no século XVIII (importância do Brasil, ouro, escravatura e açúcar, batata e milho, sociedade de ordens, D. João V absoluto, legado africano, Marquês de Pombal); o triunfo do liberalismo (invasões napoleónicas, revolução de 1820, Constituição de 1822, guerra civil); segunda metade do século XIX (industrialização Lisboa/Setúbal e Porto/Guimarães, energia a vapor, caminho de ferro, migrações oitocentistas, operariado, abolição da escravatura e da pena de morte); revolução republicana (desgaste da monarquia, Constituição de 1911, medidas da 1.ª República); anos de ditadura (Estado Novo, censura, polícia política, partido único, guerra colonial); 25 de abril e democratização 1975-82; Portugal Hoje — população (distribuição, indicadores demográficos, áreas atrativas/repulsivas), lugares (rural vs urbano, problemas sociais), atividades económicas (setores, população ativa), tempos livres (lazer, turismo, áreas protegidas, problemas ambientais, ODS), transportes e telecomunicações (modos, redes, globalização).',
    cannotTest: 'Conteúdos do 5.º ano (Península Ibérica, primeiros povos, formação de Portugal, expansão até à Restauração); História geral do 3.º ciclo (7.º-9.º ano).',
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
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/5_ingles.pdf",
    domains: [
        {
          name: "Compreensão oral",
          topics: [],
          descriptors: [
          "Identificar palavras e expressões em canções e textos áudio/audiovisuais",
          "entender pedidos que lhe são dirigidos, perguntas que lhe são feitas e informações que lhe são dadas",
          "identificar a ideia global de pequenos textos orais",
          "seguir conversas sobre assuntos que lhe são familiares, articuladas de forma lenta, clara e pausada.",
          ],
        },
        {
          name: "Compreensão escrita",
          topics: [],
          descriptors: [
          "Seguir instruções elementares",
          "reconhecer informação que lhe é familiar em anúncios/avisos",
          "compreender mensagens curtas e simples (postais, mensagens de texto, post/tweets, blogs, emails) sobre assuntos do seu interesse",
          "desenvolver a literacia, entendendo textos simplificados de leitura extensiva com vocabulário familiar, lendo frases e pequenos textos em voz alta.",
          ],
        },
        {
          name: "Interação oral",
          topics: [],
          descriptors: [
          "Pedir e dar informações sobre identificação pessoal",
          "formular perguntas e respostas sobre assuntos que lhe são familiares",
          "fazer sugestões e convites simples",
          "interagir de forma simples",
          "participar numa conversa simples sobre temas básicos e factuais para satisfazer necessidades imediatas.",
          ],
        },
        {
          name: "Interação escrita",
          topics: [],
          descriptors: [
          "Preencher um formulário (online ou em formato papel) simples com informação pessoal e preferências pessoais básicas",
          "pedir e dar informação pessoal de forma simples",
          "pedir e dar informação sobre gostos e preferências de uma forma simples",
          "responder a um email, chat ou mensagem de forma simples.",
          ],
        },
        {
          name: "Produção oral",
          topics: [],
          descriptors: [
          "Articular sons da língua inglesa não existentes na língua materna",
          "pronunciar, com correção, expressões e frases familiares",
          "exprimir gostos e preferências pessoais, utilizando frases simples",
          "descrever aspetos simples do seu dia a dia, utilizando frases simples",
          "fazer descrições simples de um objeto ou imagem, utilizando expressões comuns",
          "falar/fazer apresentações sobre alguns temas trabalhados previamente.",
          ],
        },
        {
          name: "Produção escrita",
          topics: [],
          descriptors: [
          "Descrever-se a si e à família",
          "redigir mensagens e notas pessoais",
          "redigir postais e convites",
          "escrever sobre as suas preferências, utilizando expressões e frases simples, justificando-as usando o conector because",
          "descrever uma imagem usando there is/there are.",
          ],
        },
        {
          name: "Reconhecer realidades interculturais distintas",
          topics: [],
          descriptors: [
          "Reconhecer elementos constitutivos da sua própria cultura e da(s) cultura(s) de língua estrangeira: diferentes aspetos de si próprio, identificar pessoas, lugares e aspetos que são importantes para si e para a sua cultura",
          "identificar espaços de realidades culturais diferentes (a comunidade dos outros)",
          "localizar no mapa alguns países de expressão inglesa",
          "associar capitais e algumas cidades desses países estudados",
          "reconhecer aspetos culturais de países de expressão inglesa, tais como bandeiras e símbolos nacionais.",
          ],
        },
        {
          name: "Comunicar eficazmente em contexto",
          topics: [],
          descriptors: [
          "Valorizar o uso da língua como instrumento de comunicação e de resolução de problemas, dentro e fora da sala de aula",
          "reformular a sua capacidade de comunicar, usando a linguagem corporal, tais como gestos e mímica, para ajudar a transmitir mensagens ao outro",
          "preparar, repetir e memorizar uma apresentação oral como forma de ganhar confiança",
          "apresentar uma atividade Show & Tell à turma ou a outros elementos da comunidade educativa, respondendo a perguntas simples colocadas sobre o tema abordado.",
          ],
        },
        {
          name: "Trabalhar e colaborar em pares e pequenos grupos",
          topics: [],
          descriptors: [
          "Participar em atividades de pares e grupos, revelando atitudes como, por exemplo, saber esperar a sua vez, ouvir os outros e refletir criticamente sobre o que foi dito, apresentando razões para justificar as suas conclusões",
          "entender e seguir instruções breves",
          "fazer sugestões e convites simples",
          "demonstrar atitudes de inteligência emocional, utilizando expressões para cumprimentar, agradecer e despedir-se",
          "diferenciar as formas de tratamento a utilizar com os colegas e com o professor",
          "convidar outros a contribuir para a realização de tarefas elementares, usando expressões curtas e simples",
          "planear, organizar e apresentar uma tarefa de pares ou um trabalho de grupo.",
          ],
        },
        {
          name: "Utilizar a literacia tecnológica para comunicar e aceder ao saber em contexto",
          topics: [],
          descriptors: [
          "Comunicar com outros a uma escala local, nacional e internacional, recorrendo a aplicações tecnológicas para produção e comunicação online",
          "contribuir para projetos e tarefas de grupo interdisciplinares que se apliquem ao contexto, a experiências reais e quotidianas do aluno",
          "participar num WebQuest e aceder ao saber, recorrendo a aplicações informáticas online.",
          ],
        },
        {
          name: "Pensar criticamente",
          topics: [],
          descriptors: [
          "Seguir um raciocínio bem estruturado e fundamentado e apresentar o seu próprio raciocínio ao/s outro/s, utilizando factos para justificar as suas opiniões",
          "refletir criticamente sobre o que foi dito, fazendo ao outro perguntas simples que desenvolvam a curiosidade",
          "deduzir o significado de palavras e expressões desconhecidas simples acompanhadas de imagens.",
          ],
        },
        {
          name: "Relacionar conhecimentos de forma a desenvolver a criatividade em contexto",
          topics: [],
          descriptors: [
          "Realizar trabalhos criativos e produzir a linguagem necessária para apresentar os mesmos ao professor/aos colegas",
          "realizar atividades para desenvolver a literacia, tais como trabalhar a rima, a sinonímia e a antonímia",
          "desenvolver e participar em projetos e atividades interdisciplinares.",
          ],
        },
        {
          name: "Desenvolver o aprender a aprender em contexto de sala de aula e aprender a regular o processo de aprendizagem",
          topics: [],
          descriptors: [
          "Discutir e selecionar objetivos de aprendizagem comuns e individuais",
          "controlar as suas aprendizagens, registando as experiências mais relevantes",
          "saber procurar palavras por áreas temáticas",
          "utilizar os seus conhecimentos prévios da língua e a experiência pessoal para fazer previsões de sentido e comunicar de forma simples em Inglês",
          "participar numa reflexão no final da aula para identificar atividades associadas aos objetivos de aprendizagem e o cumprimento dos mesmos",
          "realizar atividades simples de auto e heteroavaliação: portefólios, diários e grelhas de progressão de aprendizagem.",
          ],
        },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Compreensão oral e escrita, interação e produção oral e escrita ao nível A1.1/A1.2 (QECR); domínio intercultural; competência estratégica. Vocabulário e funções do programa do 5.º ano (apresentação, gostos/preferências, rotinas, descrição de pessoas/objetos/imagens); gramática elementar coerente com o nível A1.",
    cannotTest: "Níveis A2+ e conteúdos do 6.º ano ou do 3.º ciclo; ensaio argumentativo; tempos verbais além do programa do 5.º.",
  },
  6: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/6_ingles.pdf",
    domains: [
        {
          name: "Compreensão oral",
          topics: [],
          descriptors: [
          "Compreender discursos muito simples articulados de forma clara e pausada",
          "seguir conversas sobre assuntos que lhe são familiares",
          "compreender os acontecimentos principais de uma história/notícia, contada de forma clara e pausada",
          "identificar o contexto do discurso, a ideia principal e informações simples.",
          ],
        },
        {
          name: "Compreensão escrita",
          topics: [],
          descriptors: [
          "Compreender textos simples com vocabulário limitado",
          "identificar a ideia principal e a informação essencial em textos diversificados",
          "desenvolver a literacia, compreendendo textos de leitura extensiva com vocabulário familiar.",
          ],
        },
        {
          name: "Interação oral",
          topics: [],
          descriptors: [
          "Adequar a forma de tratamento ao interlocutor e ao contexto em situações de role play",
          "responder a perguntas diretas com apoio",
          "participar numa conversa curta sobre situações de rotina que lhe são familiares, de necessidade imediata e do seu interesse",
          "comunicar uma tarefa simples",
          "trocar opiniões e comparar lugares, objetos e pessoas, usando uma linguagem simples.",
          ],
        },
        {
          name: "Interação escrita",
          topics: [],
          descriptors: [
          "Preencher um formulário (online) ou em formato papel simples, com informação pessoal e sobre áreas de interesse básicas",
          "pedir e dar informação sobre gostos e preferências de uma forma simples",
          "redigir e responder a posts/tweets curtos com frases curtas sobre passatempos, gostos e preferências",
          "responder a um email, chat ou mensagem de forma simples.",
          ],
        },
        {
          name: "Produção oral",
          topics: [],
          descriptors: [
          "Falar sobre os temas explorados: lojas, serviços públicos, tempos livres, viagens, família e amigos, rotinas, escola, meios de transporte, tipos de habitação, descrever pessoas, lugares, acontecimentos e atividades com apoio de imagens",
          "(re)contar uma pequena história, sequenciando os acontecimentos, de forma simples.",
          ],
        },
        {
          name: "Produção escrita",
          topics: [],
          descriptors: [
          "Escrever um pequeno texto descritivo sobre a sua rotina diária, a escola, acontecimentos, com a ajuda de tópicos ou imagens",
          "escrever notas e mensagens curtas e simples sobre assuntos de necessidade imediata",
          "expressar opinião sobre os seus interesses, utilizando expressões e frases simples do dia a dia.",
          ],
        },
        {
          name: "Reconhecer realidades interculturais distintas",
          topics: [],
          descriptors: [
          "Conhecer o seu meio e o dos outros para identificar a diversidade cultural em universos diferenciados",
          "descrever diferentes elementos da sua cultura, identidade e língua por oposição à cultura anglo-saxónica e à língua inglesa",
          "comparar os espaços à sua volta com espaços de realidades culturais diferentes",
          "identificar exemplos concretos de atitudes de tolerância e respeito intercultural",
          "reconhecer algumas diferenças entre as relações interculturais.",
          ],
        },
        {
          name: "Comunicar eficazmente em contexto",
          topics: [],
          descriptors: [
          "Reconhecer diferentes estratégias de comunicação nas fases de planificação, realização e avaliação das atividades comunicativas",
          "preparar, repetir, memorizar uma apresentação oral",
          "apresentar uma atividade de Show & Tell, com confiança e segurança, à turma e a outros elementos da comunidade educativa, respondendo a perguntas colocadas sobre o tema abordado.",
          ],
        },
        {
          name: "Trabalhar e colaborar em pares e pequenos grupos",
          topics: [],
          descriptors: [
          "Participar em atividades de pares e grupos, revelando atitudes como, por exemplo: saber esperar a sua vez, ouvir ativamente os outros e refletir criticamente sobre o que foi dito, dando razões para justificar as suas conclusões",
          "formular perguntas e dar respostas",
          "demonstrar atitudes de inteligência emocional, utilizando expressões para exprimir sentimentos de agrado e desagrado e indicar concordância e/ou discordância",
          "colaborar em tarefas elementares, pedindo e fazendo sugestões simples",
          "planear, organizar, dar conselhos, utilizando estruturas simples e apresentar uma tarefa de pares ou um trabalho de grupo.",
          ],
        },
        {
          name: "Utilizar a literacia tecnológica para comunicar e aceder ao saber em contexto",
          topics: [],
          descriptors: [
          "Comunicar com outros a uma escala local, nacional e internacional, recorrendo a aplicações tecnológicas para produção e comunicação online",
          "contribuir para projetos e tarefas de grupo interdisciplinares que se apliquem ao contexto, a experiências reais e quotidianas do aluno",
          "participar num WebQuest e aceder ao saber, recorrendo a aplicações informáticas online.",
          ],
        },
        {
          name: "Pensar criticamente",
          topics: [],
          descriptors: [
          "Reunir e associar informação para realizar tarefas e trabalhos ou aprofundar interesses pessoais",
          "desenvolver a autonomia intelectual de forma a adotar uma atitude mais independente perante novas aprendizagens.",
          ],
        },
        {
          name: "Relacionar conhecimentos de forma a desenvolver a criatividade em contexto",
          topics: [],
          descriptors: [
          "Demonstrar uma atitude resiliente e assumir riscos de forma a realizar novos trabalhos criativos, produzindo a linguagem necessária para apresentar os mesmos ao professor/aos colegas, mesmo que isto implique realizar a tarefa em várias tentativas",
          "cantar, reproduzir rimas e lengalengas",
          "participar em atividades dramáticas e de role-play",
          "ler e reproduzir histórias",
          "realizar atividades para desenvolver a literacia, como trabalhar a rima, a sinonímia e antonímia",
          "desenvolver e participar em projetos e atividades interdisciplinares.",
          ],
        },
        {
          name: "Desenvolver o aprender a aprender em contexto de sala de aula e aprender a regular o processo de aprendizagem",
          topics: [],
          descriptors: [
          "Discutir e selecionar objetivos de aprendizagem comuns e individuais",
          "desenvolver uma atitude ativa, autónoma e perseverante perante a própria aprendizagem",
          "monitorizar/avaliar progressos e dificuldades na língua inglesa",
          "selecionar estratégias eficazes para superar dificuldades e consolidar aprendizagens",
          "utilizar dicionários bilingues simples (online e em papel)",
          "utilizar os seus conhecimentos prévios da língua e a sua experiência pessoal para fazer previsões pertinentes e comunicar de forma simples em Inglês",
          "participar numa reflexão e discussão no final da aula para identificar atividades associadas aos objetivos de aprendizagem e ao cumprimento dos mesmos",
          "reconhecer diferentes estratégias de aprendizagem",
          "realizar atividades simples de auto e heteroavaliação: portefólios, diários e gráficos de progressão de aprendizagem.",
          ],
        },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Compreensão oral e escrita, interação e produção oral e escrita ao nível A2 (QECR); domínio intercultural; competência estratégica. Vocabulário e funções do programa do 6.º ano; narração no passado, comparação e planos futuros coerentes com o nível A2.",
    cannotTest: "Níveis B1+ e conteúdos do 3.º ciclo; present perfect, reported speech, conditionals; ensaio argumentativo.",
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
// FILOSOFIA  (Ensino Secundário — 10.º e 11.º anos)
// Fonte: Programa e AE de Filosofia 10-11 (DGE, 2018).
// Referência de exame: Prova 714 (IAVE) — exame nacional de Filosofia.
// NOTA: autores e temas restritos ao programa oficial DGE. Nozick, Nietzsche,
//       fenomenologia (Husserl, Heidegger) NÃO constam nas AE oficiais.
// ─────────────────────────────────────────────────────────────────────────────
const filosofia: SubjectCurriculum = {
  10: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/10_filosofia_ff.pdf',
    domains: [
      {
        name: 'Argumentação e Lógica',
        topics: [
          'Noção de argumento: premissas e conclusão; argumentos dedutivos e indutivos',
          'Validade e verdade: distinção entre argumento válido e argumento com premissas verdadeiras',
          'Validade e invalidade: forma lógica; contra-exemplo',
          'Falácias informais: apelo à autoridade, ad hominem, apelo à emoção, generalização precipitada, falsa dicotomia, petição de princípio',
          'Lógica formal elementar: conectivos proposicionais (negação, conjunção, disjunção, condicional); tabelas de verdade; modus ponens; modus tollens',
        ],
      },
      {
        name: 'Ética e Moral',
        topics: [
          'Distinção entre ética e moral; ética descritiva vs. normativa vs. metaética',
          'Relativismo ético: relativismo individual e cultural; crítica e limites do relativismo',
          'Ética de Kant: imperativo categórico (fórmula da lei universal e fórmula da humanidade); dever; autonomia; crítica às éticas consequencialistas',
          'Utilitarismo (Mill): princípio da utilidade; maximização da felicidade; críticas ao utilitarismo',
          'Ética das virtudes (Aristóteles): eudaimonia; virtude como disposição adquirida; virtude moral vs. intelectual; o justo meio',
          'Problemas éticos actuais: eutanásia, bioética, genoma humano, reprodução assistida, ética ambiental',
        ],
      },
      {
        name: 'Filosofia Política',
        topics: [
          'Estado e contrato social: Hobbes (estado de natureza, Leviatã), Locke (direitos naturais, consentimento), Rousseau (vontade geral)',
          'Liberalismo político: John Rawls — véu da ignorância; princípios de justiça (princípio da liberdade igual e princípio da diferença)',
          'Democracia: valores democráticos; participação cívica; direitos fundamentais',
          'Direitos humanos: fundamentos filosóficos; universalidade vs. relativismo; gerações de direitos',
        ],
      },
    ],
    canTest: 'Noção de argumento (premissas, conclusão, validade, verdade); falácias informais (apelo à autoridade, ad hominem, generalização precipitada, falsa dicotomia, petição de princípio); lógica formal elementar (conectivos, tabelas de verdade, modus ponens, modus tollens); distinção ética/moral; relativismo ético e seus limites; ética de Kant (imperativo categórico — fórmula universal e da humanidade, dever, autonomia); utilitarismo de Mill (princípio da utilidade); ética das virtudes de Aristóteles (eudaimonia, virtude, justo meio); bioética (eutanásia, genoma, reprodução assistida); contrato social (Hobbes, Locke, Rousseau); Rawls (véu da ignorância, princípios de justiça); direitos humanos (fundamentos e gerações).',
    cannotTest: 'Teoria do conhecimento de Platão/Descartes/Hume (11.º); filosofia da ciência — Popper/Kuhn (11.º); filosofia da arte aprofundada (11.º); filosofia da religião aprofundada (11.º); Nozick (fora das AE).',
  },

  11: {
    source: 'https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/11_filosofia_ff.pdf',
    domains: [
      {
        name: 'Teoria do Conhecimento',
        topics: [
          'Platão: conhecimento como crença verdadeira justificada (Mênon, Teeteto); alegoria da caverna; mundo sensível vs. mundo inteligível; teoria da reminiscência',
          'Descartes: dúvida metódica e hiperbólica; cogito ergo sum; res cogitans e res extensa; ideias inatas; racionalismo',
          'Hume: impressões e ideias; princípio da cópia; problema da indução — hábito e costume como fundamento das expectativas; ceticismo moderado; empirismo; crítica à causalidade necessária',
          'Problema de Gettier: limitações da definição clássica de conhecimento como crença verdadeira justificada',
          'Ceticismo: radical (Descartes) e moderado (Hume); respostas ao ceticismo',
        ],
      },
      {
        name: 'Filosofia da Ciência',
        topics: [
          'Problema da demarcação: o que distingue ciência de pseudociência e de metafísica',
          'Verificacionismo (Círculo de Viena): critério de significado empírico; limites do verificacionismo',
          'Falsificacionismo de Popper: falsificabilidade como critério de demarcação; conjecturas e refutações; a ciência cresce por eliminação de erros; convenções e limites',
          'Kuhn: ciência normal e paradigma; anomalia e crise; revolução científica; incomensurabilidade entre paradigmas',
          'Implicações: objectividade científica; progresso científico; relativismo epistémico',
        ],
      },
      {
        name: 'Tema de Aprofundamento — Filosofia da Arte',
        topics: [
          'O que é a arte? Dificuldade de definição',
          'Teoria mimética (Platão): arte como imitação da realidade sensível; crítica platónica à arte',
          'Teoria expressivista: arte como expressão autêntica de sentimentos e emoções',
          'Teoria institucional da arte (Dickie): estatuto artístico conferido pelo "mundo da arte"',
          'Teoria não-essencialista (Wittgenstein): semelhança de família; inexistência de uma essência comum a todas as obras de arte',
          'Juízo estético em Kant: desinteresse; universalidade e necessidade do juízo de gosto; sublime vs. belo',
          'Arte e sociedade: função social da arte; arte contemporânea e fronteiras da arte',
        ],
      },
      {
        name: 'Tema de Aprofundamento — Filosofia da Religião',
        topics: [
          'Argumento cosmológico: Tomás de Aquino (1.ª, 2.ª e 3.ª vias); argumento Kalam; objecções (regressão ao infinito, necessidade)',
          'Argumento teleológico (do desígnio): Paley (analogia do relógio e do relojoeiro); crítica de Hume (Diálogos sobre a Religião Natural)',
          'Argumento ontológico de Anselmo: "ser do qual nada maior pode ser pensado"; objecção de Kant (existência não é predicado real)',
          'Problema do mal: teodiceia; mal físico vs. mal moral; argumento do livre-arbítrio; incompatibilidade com a omnipotência e omnibenevolência divinas',
          'Fideísmo de Pascal: argumento da aposta; fé para além da razão',
        ],
      },
    ],
    canTest: 'Platão (crença verdadeira justificada, alegoria da caverna, mundo sensível vs. inteligível, reminiscência); Descartes (dúvida metódica, cogito, res cogitans/extensa, ideias inatas, racionalismo); Hume (impressões/ideias, problema da indução, hábito e costume, ceticismo moderado, empirismo, crítica à causalidade); problema de Gettier; Popper — falsificacionismo (falsificabilidade, conjecturas e refutações); Kuhn (paradigma, ciência normal vs. revolucionária, revolução científica, incomensurabilidade); Filosofia da Arte — teoria mimética (Platão), expressivista, institucional (Dickie), não-essencialista (Wittgenstein), juízo estético de Kant (desinteresse, universalidade, sublime/belo); Filosofia da Religião — argumento cosmológico (Aquino, Kalam), teleológico (Paley, crítica de Hume), ontológico (Anselmo, objecção de Kant), problema do mal, fideísmo de Pascal.',
    cannotTest: 'Argumentação e lógica formal detalhada (10.º); ética normativa (10.º); filosofia política e Rawls (10.º); Nozick (fora das AE); Nietzsche (fora das AE 11.º); fenomenologia — Husserl, Heidegger (fora das AE); metafísica formal.',
  },
}


// ─────────────────────────────────────────────────────────────────────────────
// EDUCAÇÃO VISUAL / TECNOLÓGICA / MUSICAL / FÍSICA  (2.º ciclo)
// AE oficiais (DGE). EV/ET/EM são documentos de ciclo (mesmos descritores em 5.º e 6.º).
// Descritores verbatim; canTest orienta a avaliação ESCRITA para a componente teórica.
// ─────────────────────────────────────────────────────────────────────────────
const educacaoVisual: SubjectCurriculum = {
  5: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/educacao_visual_2c_ff.pdf",
    domains: [
      {
        name: "Apropriação e Reflexão",
        topics: [],
        descriptors: [
          "Identificar diferentes manifestações culturais do património local e global (obras e artefactos de arte – pintura, escultura, desenho, assemblage, colagem, fotografia; instalação, land’art, banda desenhada, design, arquitetura, artesanato, multimédia e linguagens cinematográficas), utilizando um vocabulário específico e adequado.",
          "Compreender os princípios da linguagem das artes visuais integrada em diferentes contextos culturais (estilos e movimentos artísticos, épocas e geografias).",
          "Reconhecer a tipologia e a função do objeto de arte, design, arquitetura e artesanato de acordo com os contextos históricos, geográficos e culturais.",
          "Descrever com vocabulário adequado (qualidades formais, físicas e expressivas) os objetos artísticos.",
          "Analisar criticamente narrativas visuais, tendo em conta as técnicas e tecnologias artísticas (pintura, desenho, escultura, fotografia, banda desenhada, artesanato, multimédia, entre outros).",
          "Selecionar com autonomia informação relevante para os trabalhos individuais e de grupo.",
        ],
      },
      {
        name: "Interpretação e Comunicação",
        topics: [],
        descriptors: [
          "Utilizar os conceitos específicos da comunicação visual (luz, cor, espaço, forma, movimento, ritmo; proporção, desproporção, entre outros), com intencionalidade e sentido crítico, na análise dos trabalhos individuais e de grupo;",
          "Interpretar os objetos da cultura visual em função do(s) contexto(s) e dos(s) públicos(s);",
          "Compreender os significados, processos e intencionalidades dos objetos artísticos;",
          "Intervir na comunidade, individualmente ou em grupo, reconhecendo o papel das artes nas mudanças sociais;",
          "Expressar ideias, utilizando diferentes meios e processos (pintura, escultura, desenho, fotografia, multimédia, entre outros);",
          "Transformar narrativas visuais, criando novos modos de interpretação;",
          "Transformar os conhecimentos adquiridos em novos modos de apreciação do mundo;",
        ],
      },
      {
        name: "Experimentação e Criação",
        topics: [],
        descriptors: [
          "Utilizar diferentes materiais e suportes para realização dos seus trabalhos;",
          "Reconhecer o quotidiano como um potencial criativo para a construção de ideias, mobilizando as várias etapas do processo artístico (pesquisa, investigação, experimentação e reflexão);",
          "Inventar soluções para a resolução de problemas no processo de produção artística;",
          "Tomar consciência da importância das características do trabalho artístico (sistemático, reflexivo e pessoal) para o desenvolvimento do seu sistema próprio de trabalho;",
          "Manifestar capacidades expressivas e criativas nas suas produções, evidenciando os conhecimentos adquiridos;",
          "Recorrer a vários processos de registo de ideias (ex.: diários gráficos), de planeamento (ex.: projeto, portefólio) de trabalho individual, em grupo e em rede;",
          "Desenvolver individualmente e em grupo projetos de trabalho, recorrendo a cruzamentos disciplinares (artes performativas, multimédia, instalações, happening, entre outros);",
          "Justificar a intencionalidade dos seus trabalhos, conjugando a organização dos elementos visuais com ideias e temáticas, inventadas ou sugeridas.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Componente teórica/reflexiva escrita: elementos da comunicação visual (luz, cor, espaço, forma, movimento, ritmo, proporção); análise e interpretação de imagens e objetos artísticos; tipologia e função de arte, design, arquitetura e artesanato; estilos e movimentos artísticos; vocabulário específico das artes visuais; etapas do processo artístico (pesquisa, experimentação, reflexão).",
    cannotTest: "Execução prática/plástica (desenhar, pintar, construir, produzir trabalhos) — não avaliável em prova escrita.",
  },
  6: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/educacao_visual_2c_ff.pdf",
    domains: [
      {
        name: "Apropriação e Reflexão",
        topics: [],
        descriptors: [
          "Identificar diferentes manifestações culturais do património local e global (obras e artefactos de arte – pintura, escultura, desenho, assemblage, colagem, fotografia; instalação, land’art, banda desenhada, design, arquitetura, artesanato, multimédia e linguagens cinematográficas), utilizando um vocabulário específico e adequado.",
          "Compreender os princípios da linguagem das artes visuais integrada em diferentes contextos culturais (estilos e movimentos artísticos, épocas e geografias).",
          "Reconhecer a tipologia e a função do objeto de arte, design, arquitetura e artesanato de acordo com os contextos históricos, geográficos e culturais.",
          "Descrever com vocabulário adequado (qualidades formais, físicas e expressivas) os objetos artísticos.",
          "Analisar criticamente narrativas visuais, tendo em conta as técnicas e tecnologias artísticas (pintura, desenho, escultura, fotografia, banda desenhada, artesanato, multimédia, entre outros).",
          "Selecionar com autonomia informação relevante para os trabalhos individuais e de grupo.",
        ],
      },
      {
        name: "Interpretação e Comunicação",
        topics: [],
        descriptors: [
          "Utilizar os conceitos específicos da comunicação visual (luz, cor, espaço, forma, movimento, ritmo; proporção, desproporção, entre outros), com intencionalidade e sentido crítico, na análise dos trabalhos individuais e de grupo;",
          "Interpretar os objetos da cultura visual em função do(s) contexto(s) e dos(s) públicos(s);",
          "Compreender os significados, processos e intencionalidades dos objetos artísticos;",
          "Intervir na comunidade, individualmente ou em grupo, reconhecendo o papel das artes nas mudanças sociais;",
          "Expressar ideias, utilizando diferentes meios e processos (pintura, escultura, desenho, fotografia, multimédia, entre outros);",
          "Transformar narrativas visuais, criando novos modos de interpretação;",
          "Transformar os conhecimentos adquiridos em novos modos de apreciação do mundo;",
        ],
      },
      {
        name: "Experimentação e Criação",
        topics: [],
        descriptors: [
          "Utilizar diferentes materiais e suportes para realização dos seus trabalhos;",
          "Reconhecer o quotidiano como um potencial criativo para a construção de ideias, mobilizando as várias etapas do processo artístico (pesquisa, investigação, experimentação e reflexão);",
          "Inventar soluções para a resolução de problemas no processo de produção artística;",
          "Tomar consciência da importância das características do trabalho artístico (sistemático, reflexivo e pessoal) para o desenvolvimento do seu sistema próprio de trabalho;",
          "Manifestar capacidades expressivas e criativas nas suas produções, evidenciando os conhecimentos adquiridos;",
          "Recorrer a vários processos de registo de ideias (ex.: diários gráficos), de planeamento (ex.: projeto, portefólio) de trabalho individual, em grupo e em rede;",
          "Desenvolver individualmente e em grupo projetos de trabalho, recorrendo a cruzamentos disciplinares (artes performativas, multimédia, instalações, happening, entre outros);",
          "Justificar a intencionalidade dos seus trabalhos, conjugando a organização dos elementos visuais com ideias e temáticas, inventadas ou sugeridas.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Componente teórica/reflexiva escrita: elementos da comunicação visual (luz, cor, espaço, forma, movimento, ritmo, proporção); análise e interpretação de imagens e objetos artísticos; tipologia e função de arte, design, arquitetura e artesanato; estilos e movimentos artísticos; vocabulário específico das artes visuais; etapas do processo artístico (pesquisa, experimentação, reflexão).",
    cannotTest: "Execução prática/plástica (desenhar, pintar, construir, produzir trabalhos) — não avaliável em prova escrita.",
  },
}

const educacaoTecnologica: SubjectCurriculum = {
  5: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/2c_educacao_tecnologica.pdf",
    domains: [
      {
        name: "PROCESSOS TECNOLÓGICOS",
        topics: [],
        descriptors: [
          "Distinguir as fases de realização de um projeto: identificação, pesquisa, realização e avaliação.",
          "Identificar e representar as necessidades e oportunidades tecnológicas decorrentes da observação e investigação de contextos socias e comunitários.",
          "Identificar requisitos técnicos, condicionalismos e recursos para a concretização de projetos.",
          "Reconhecer a importância dos protótipos e teste para o desenvolvimento e melhoria (aplicações de criação e tratamento de imagem 2D e 3D) dos projetos.",
          "Comunicar, através do desenho, formas de representação gráfica das ideias e soluções, utilizando: esquemas, codificações e simbologias, assim como meios digitais com ferramentas de modelação e representação.",
          "Diferenciar modos de produção (artesanal, industrial), analisando os fatores de desenvolvimento tecnológico.",
          "Compreender a importância dos objetos técnicos face às necessidades humanas.",
        ],
      },
      {
        name: "RECURSOS E UTILIZAÇÕES TECNOLÓGICAS",
        topics: [],
        descriptors: [
          "Produzir artefactos, objetos e sistemas técnicos, adequando os meios materiais e técnicos à ideia ou intenção expressa.",
          "Apreciar as qualidades dos materiais (físicas, mecânicas e tecnológicas), através do exercício sistemático dos diferentes sentidos, estabelecendo relações com a utilização de técnicas específicas de materiais: madeiras, papéis, plásticos, fios têxteis, pastas entre outros.",
          "Selecionar materiais de acordo com as suas características físicas e mecânicas.",
          "Investigar, através de experiências simples, algumas características de materiais comuns (dureza, flexibilidade, resistência, elasticidade, plasticidade).",
          "Manipular operadores tecnológicos (de energia, movimento/mecanismos, estruturas resistentes) de acordo com as suas funções, princípios e relações com as produções tecnológicas.",
          "Criar soluções tecnológicas através da reutilização ou reciclagem de materiais, tendo em atenção a sustentabilidade ambiental.",
          "Utilizar as principais técnicas de transformação dos materiais usados (união, separação-corte, assemblagem, conformação), identificando os utensílios e as ferramentas na realização de projetos.",
          "Identificar fontes de energia e os seus processos de transformação (elétrico, térmico, mecânico e sonoro), relacionando-as com soluções tecnológicas aplicáveis aos projetos.",
          "Colaborar nos cuidados com o seu corpo e no cumprimento de normas de higiene e segurança na utilização de recursos tecnológicos.",
        ],
      },
      {
        name: "TECNOLOGIA E SOCIEDADE",
        topics: [],
        descriptors: [
          "Reconhecer o potencial tecnológico dos recursos do meio ambiente, explicitando as suas funções, vantagens e impactos (positivos ou negativos) pessoais, sociais e ambientais.",
          "Compreender a evolução dos artefactos, objetos e equipamentos, estabelecendo relações entre o presente e o passado, tendo em conta contextos sociais e naturais que possam influenciar a sua criação, ou reformulação.",
          "Analisar situações concretas como consumidor prudente e defensor do património cultural e natural da sua localidade e região, manifestando preocupações com a conservação da natureza e respeito pelo ambiente.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Componente teórica escrita: fases do projeto tecnológico (identificação, pesquisa, realização, avaliação); propriedades físicas e mecânicas dos materiais (madeiras, papéis, plásticos, fios têxteis, pastas); operadores tecnológicos e mecanismos; fontes de energia e sua transformação; técnicas de transformação de materiais (união, corte, assemblagem, conformação); higiene e segurança; evolução dos objetos técnicos; tecnologia, sociedade e ambiente.",
    cannotTest: "Execução prática/manual (produzir artefactos, manipular ferramentas e utensílios) — não avaliável por escrito.",
  },
  6: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/2c_educacao_tecnologica.pdf",
    domains: [
      {
        name: "PROCESSOS TECNOLÓGICOS",
        topics: [],
        descriptors: [
          "Distinguir as fases de realização de um projeto: identificação, pesquisa, realização e avaliação.",
          "Identificar e representar as necessidades e oportunidades tecnológicas decorrentes da observação e investigação de contextos socias e comunitários.",
          "Identificar requisitos técnicos, condicionalismos e recursos para a concretização de projetos.",
          "Reconhecer a importância dos protótipos e teste para o desenvolvimento e melhoria (aplicações de criação e tratamento de imagem 2D e 3D) dos projetos.",
          "Comunicar, através do desenho, formas de representação gráfica das ideias e soluções, utilizando: esquemas, codificações e simbologias, assim como meios digitais com ferramentas de modelação e representação.",
          "Diferenciar modos de produção (artesanal, industrial), analisando os fatores de desenvolvimento tecnológico.",
          "Compreender a importância dos objetos técnicos face às necessidades humanas.",
        ],
      },
      {
        name: "RECURSOS E UTILIZAÇÕES TECNOLÓGICAS",
        topics: [],
        descriptors: [
          "Produzir artefactos, objetos e sistemas técnicos, adequando os meios materiais e técnicos à ideia ou intenção expressa.",
          "Apreciar as qualidades dos materiais (físicas, mecânicas e tecnológicas), através do exercício sistemático dos diferentes sentidos, estabelecendo relações com a utilização de técnicas específicas de materiais: madeiras, papéis, plásticos, fios têxteis, pastas entre outros.",
          "Selecionar materiais de acordo com as suas características físicas e mecânicas.",
          "Investigar, através de experiências simples, algumas características de materiais comuns (dureza, flexibilidade, resistência, elasticidade, plasticidade).",
          "Manipular operadores tecnológicos (de energia, movimento/mecanismos, estruturas resistentes) de acordo com as suas funções, princípios e relações com as produções tecnológicas.",
          "Criar soluções tecnológicas através da reutilização ou reciclagem de materiais, tendo em atenção a sustentabilidade ambiental.",
          "Utilizar as principais técnicas de transformação dos materiais usados (união, separação-corte, assemblagem, conformação), identificando os utensílios e as ferramentas na realização de projetos.",
          "Identificar fontes de energia e os seus processos de transformação (elétrico, térmico, mecânico e sonoro), relacionando-as com soluções tecnológicas aplicáveis aos projetos.",
          "Colaborar nos cuidados com o seu corpo e no cumprimento de normas de higiene e segurança na utilização de recursos tecnológicos.",
        ],
      },
      {
        name: "TECNOLOGIA E SOCIEDADE",
        topics: [],
        descriptors: [
          "Reconhecer o potencial tecnológico dos recursos do meio ambiente, explicitando as suas funções, vantagens e impactos (positivos ou negativos) pessoais, sociais e ambientais.",
          "Compreender a evolução dos artefactos, objetos e equipamentos, estabelecendo relações entre o presente e o passado, tendo em conta contextos sociais e naturais que possam influenciar a sua criação, ou reformulação.",
          "Analisar situações concretas como consumidor prudente e defensor do património cultural e natural da sua localidade e região, manifestando preocupações com a conservação da natureza e respeito pelo ambiente.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Componente teórica escrita: fases do projeto tecnológico (identificação, pesquisa, realização, avaliação); propriedades físicas e mecânicas dos materiais (madeiras, papéis, plásticos, fios têxteis, pastas); operadores tecnológicos e mecanismos; fontes de energia e sua transformação; técnicas de transformação de materiais (união, corte, assemblagem, conformação); higiene e segurança; evolução dos objetos técnicos; tecnologia, sociedade e ambiente.",
    cannotTest: "Execução prática/manual (produzir artefactos, manipular ferramentas e utensílios) — não avaliável por escrito.",
  },
}

const educacaoMusical: SubjectCurriculum = {
  5: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/2c_educacao_musical.pdf",
    domains: [
      {
        name: "Experimentação e criação",
        topics: [],
        descriptors: [
          "Improvisar peças musicais, combinando e manipulando vários elementos da música (timbre, altura, dinâmica, ritmo, forma, texturas), utilizando múltiplos recursos (fontes sonoras convencionais e não convencionais, imagens, esculturas, textos, vídeos, gravações, etc.) e com técnicas e tecnologias gradualmente mais complexas.",
          "Compor peças musicais com diversos propósitos, combinando e manipulando vários elementos da música (altura, dinâmica, ritmo, forma, timbres e texturas), utilizando recursos diversos (voz, corpo, objetos sonoros, instrumentos musicais, tecnologias e software).",
          "Mobilizar aprendizagens de diferentes áreas do conhecimento para a construção do seu referencial criativo.",
        ],
      },
      {
        name: "Interpretação e comunicação",
        topics: [],
        descriptors: [
          "Cantar, a solo e em grupo, a uma e duas vozes, repertório variado com e sem acompanhamento instrumental, evidenciando confiança e domínio básico da técnica vocal.",
          "Tocar diversos instrumentos acústicos e eletrónicos, a solo e em grupo, repertório variado, controlando o tempo, o ritmo e a dinâmica, com progressiva destreza e confiança.",
          "Interpretar, através do movimento corporal, contextos musicais contrastantes.",
          "Mobilizar sequências de movimentos corporais em contextos musicais diferenciados.",
          "Publicar, na internet, criações musicais (originais ou de outros), construindo, por exemplo, playlists, podcasts e blogs.",
          "Apresentar publicamente atividades artísticas em que se articula a música com outras áreas do conhecimento.",
        ],
      },
      {
        name: "Apropriação e reflexão",
        topics: [],
        descriptors: [
          "Comparar características rítmicas, melódicas, harmónicas, dinâmicas, formais, tímbricas e de textura em peças musicais de épocas, estilos e géneros musicais diversificados.",
          "Utilizar, com crescente domínio, vocabulário e simbologias para documentar, descrever e comparar diversas peças musicais.",
          "Investigar diferentes tipos de interpretações escutadas e observadas em espetáculos musicais (concertos, bailados, teatros musicais, óperas e outros), ao vivo ou gravados, de diferentes tradições e épocas utilizando vocabulário apropriado.",
          "Comparar criticamente estilos e géneros musicais, tendo em conta os enquadramentos socioculturais do passado e do presente.",
          "Relacionar a sua experiência musical com outras áreas do conhecimento, através de atividades diversificadas que integrem e potenciem a transversalidade do saber.",
          "Identificar criticamente a música, enquanto modo de conhecer e dar significado ao mundo, relacionando-a com o seu dia a dia, e os seus mundos pessoais e sociais.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Componente teórica/auditiva escrita: elementos da música (timbre, altura, dinâmica, ritmo, forma, textura); vocabulário e simbologia musical; comparação de características de peças de diferentes épocas, estilos e géneros; enquadramentos socioculturais; audição e apreciação crítica.",
    cannotTest: "Execução prática (cantar, tocar, improvisar, compor, dançar, movimento corporal) — não avaliável em prova escrita.",
  },
  6: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/2c_educacao_musical.pdf",
    domains: [
      {
        name: "Experimentação e criação",
        topics: [],
        descriptors: [
          "Improvisar peças musicais, combinando e manipulando vários elementos da música (timbre, altura, dinâmica, ritmo, forma, texturas), utilizando múltiplos recursos (fontes sonoras convencionais e não convencionais, imagens, esculturas, textos, vídeos, gravações, etc.) e com técnicas e tecnologias gradualmente mais complexas.",
          "Compor peças musicais com diversos propósitos, combinando e manipulando vários elementos da música (altura, dinâmica, ritmo, forma, timbres e texturas), utilizando recursos diversos (voz, corpo, objetos sonoros, instrumentos musicais, tecnologias e software).",
          "Mobilizar aprendizagens de diferentes áreas do conhecimento para a construção do seu referencial criativo.",
        ],
      },
      {
        name: "Interpretação e comunicação",
        topics: [],
        descriptors: [
          "Cantar, a solo e em grupo, a uma e duas vozes, repertório variado com e sem acompanhamento instrumental, evidenciando confiança e domínio básico da técnica vocal.",
          "Tocar diversos instrumentos acústicos e eletrónicos, a solo e em grupo, repertório variado, controlando o tempo, o ritmo e a dinâmica, com progressiva destreza e confiança.",
          "Interpretar, através do movimento corporal, contextos musicais contrastantes.",
          "Mobilizar sequências de movimentos corporais em contextos musicais diferenciados.",
          "Publicar, na internet, criações musicais (originais ou de outros), construindo, por exemplo, playlists, podcasts e blogs.",
          "Apresentar publicamente atividades artísticas em que se articula a música com outras áreas do conhecimento.",
        ],
      },
      {
        name: "Apropriação e reflexão",
        topics: [],
        descriptors: [
          "Comparar características rítmicas, melódicas, harmónicas, dinâmicas, formais, tímbricas e de textura em peças musicais de épocas, estilos e géneros musicais diversificados.",
          "Utilizar, com crescente domínio, vocabulário e simbologias para documentar, descrever e comparar diversas peças musicais.",
          "Investigar diferentes tipos de interpretações escutadas e observadas em espetáculos musicais (concertos, bailados, teatros musicais, óperas e outros), ao vivo ou gravados, de diferentes tradições e épocas utilizando vocabulário apropriado.",
          "Comparar criticamente estilos e géneros musicais, tendo em conta os enquadramentos socioculturais do passado e do presente.",
          "Relacionar a sua experiência musical com outras áreas do conhecimento, através de atividades diversificadas que integrem e potenciem a transversalidade do saber.",
          "Identificar criticamente a música, enquanto modo de conhecer e dar significado ao mundo, relacionando-a com o seu dia a dia, e os seus mundos pessoais e sociais.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Componente teórica/auditiva escrita: elementos da música (timbre, altura, dinâmica, ritmo, forma, textura); vocabulário e simbologia musical; comparação de características de peças de diferentes épocas, estilos e géneros; enquadramentos socioculturais; audição e apreciação crítica.",
    cannotTest: "Execução prática (cantar, tocar, improvisar, compor, dançar, movimento corporal) — não avaliável em prova escrita.",
  },
}

const educacaoFisica: SubjectCurriculum = {
  5: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/5_educacao_fisica.pdf",
    domains: [
      {
        name: "ÁREA DAS ATIVIDADES FÍSICAS",
        topics: [],
        descriptors: [
          "Participar em JOGOS, ajustando a iniciativa própria e as qualidades motoras na prestação às possibilidades oferecidas pela situação de jogo e ao seu objetivo, realizando habilidades básicas e ações técnico-táticas fundamentais, com oportunidade e correção de movimentos.",
          "Cooperar com os companheiros para o alcance do objetivo dos JOGOS DESPORTIVOS COLETIVOS (Basquetebol, Futebol, Andebol, Voleibol), desempenhando com oportunidade e correção as ações solicitadas pelas situações de jogo, aplicando a ética do jogo e as suas regras.",
          "Compor e realizar, da GINÁSTICA (Solo, Aparelhos, Rítmica), as destrezas elementares de solo, aparelhos e minitrampolim, em esquemas individuais e/ou de grupo, aplicando os critérios de correção técnica e expressão e apreciando os esquemas de acordo com esses critérios.",
          "Realizar, do ATLETISMO, saltos, corridas e lançamentos, segundo padrões simplificados, e cumprindo corretamente as exigências elementares técnicas e regulamentares.",
          "Patinar com equilíbrio e segurança, ajustando as suas ações para orientar o seu deslocamento com intencionalidade e oportunidade na realização de sequências rítmicas, percursos ou jogos.",
          "Interpretar sequências de habilidades específicas elementares das ATIVIDADES RÍTMICAS E EXPRESSIVAS (Dança, Danças Sociais, Danças Tradicionais) , em coreografias individuais e/ou em grupo, aplicando os critérios de expressividade considerados, de acordo com os motivos das composições.",
          "Realizar ações de oposição direta solicitadas de COMBATE (Luta), utilizando as técnicas fundamentais de controlo e desequilíbrio, com segurança (própria e do opositor), aplicando as regras e os princípios éticos.",
          "Deslocar-se com segurança no MEIO AQUÁTICO (Natação), coordenando a respiração com as ações propulsivas específicas das técnicas selecionadas.",
        ],
      },
      {
        name: "ÁREA DA APTIDÃO FÍSICA",
        topics: [],
        descriptors: [
          "Desenvolver capacidades motoras evidenciando aptidão muscular e aptidão aeróbia, enquadradas na Zona Saudável de Aptidão Física do programa Fitescola®, para a sua idade e sexo.",
        ],
      },
      {
        name: "ÁREA DOS CONHECIMENTOS",
        topics: [],
        descriptors: [
          "Identificar as capacidades físicas: resistência, força, velocidade, flexibilidade, agilidade e coordenação (geral), de acordo com as características do esforço realizado.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Componente teórica escrita (Área dos Conhecimentos): capacidades físicas (resistência, força, velocidade, flexibilidade, agilidade, coordenação); adaptações do organismo à atividade física; aptidão física e Zona Saudável de Aptidão Física (Fitescola); regras, objetivos e princípios éticos das modalidades.",
    cannotTest: "Execução motora (jogos desportivos, ginástica, atletismo, natação, patinagem, dança, combate) — não avaliável em prova escrita.",
  },
  6: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/2_ciclo/6_educacao_fisica.pdf",
    domains: [
      {
        name: "ÁREA DAS ATIVIDADES FÍSICAS",
        topics: [],
        descriptors: [
          "Cooperar com os companheiros para o alcance do objetivo dos JOGOS DESPORTIVOS COLETIVOS (Basquetebol, Futebol, Andebol, Voleibol), desempenhando com oportunidade e correção as ações solicitadas pelas situações de jogo, aplicando a ética do jogo e as suas regras.",
          "Compor e realizar, da GINÁSTICA (Solo, Aparelhos, Rítmica), as destrezas elementares de solo, aparelhos e minitrampolim, em esquemas individuais e/ou de grupo, aplicando os critérios de correção técnica e expressão, e apreciando os esquemas de acordo com esses critérios.",
          "Realizar, do ATLETISMO, saltos, corridas e lançamentos, segundo padrões simplificados, e cumprindo corretamente as exigências elementares técnicas e regulamentares.",
          "Patinar com equilíbrio e segurança, ajustando as suas ações para orientar o seu deslocamento com intencionalidade e oportunidade na realização de sequências rítmicas, percursos ou jogos.",
          "Interpretar, nas ATIVIDADES RÍTMICAS E EXPRESSIVAS (Dança, Danças Sociais, Danças Tradicionais), sequências de elementos técnicos elementares, em coreografias individuais e ou em grupo, aplicando os critérios de expressividade, de acordo com os motivos das composições.",
          "Realizar PERCURSOS (Orientação) elementares, utilizando técnicas de orientação e respeitando as regras de organização, participação e de preservação da qualidade do ambiente.",
          "Realizar ações de oposição direta solicitadas de COMBATE (Luta), utilizando as técnicas fundamentais de controlo e desequilíbrio, com segurança (própria e do opositor), aplicando as regras e os princípios éticos.",
          "Deslocar-se com segurança no MEIO AQUÁTICO (Natação), coordenando a respiração com as ações propulsivas específicas das técnicas selecionadas.",
        ],
      },
      {
        name: "ÁREA DA APTIDÃO FÍSICA",
        topics: [],
        descriptors: [
          "Desenvolver capacidades motoras evidenciando aptidão muscular e aptidão aeróbia, enquadradas na Zona Saudável de Aptidão Física do programa Fitescola®, para a sua idade e sexo.",
        ],
      },
      {
        name: "ÁREA DOS CONHECIMENTOS",
        topics: [],
        descriptors: [
          "Identificar as capacidades físicas: resistência, força, velocidade, flexibilidade, agilidade e coordenação (geral), de acordo com as características do esforço realizado.",
          "Interpreta as principais adaptações do funcionamento do seu organismo durante a atividade física.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Componente teórica escrita (Área dos Conhecimentos): capacidades físicas (resistência, força, velocidade, flexibilidade, agilidade, coordenação); adaptações do organismo à atividade física; aptidão física e Zona Saudável de Aptidão Física (Fitescola); regras, objetivos e princípios éticos das modalidades.",
    cannotTest: "Execução motora (jogos desportivos, ginástica, atletismo, natação, patinagem, dança, combate) — não avaliável em prova escrita.",
  },
}

const tic: SubjectCurriculum = {
  7: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/tic_3c_7a_ff.pdf",
    domains: [
      {
        name: "Segurança, responsabilidade e respeito em ambientes digitais",
        topics: [],
        descriptors: [
          "Adotar uma atitude crítica, refletida e responsável no uso de tecnologias, ambientes e serviços digitais:",
          "Conhecer diferentes sistemas operativos e mecanismos de segurança;",
          "Adotar práticas seguras de instalação, atualização, configuração e utilização de ferramentas digitais;",
          "Conhecer comportamentos que visam a proteção da privacidade; adotar comportamentos seguros na utilização de ferramentas digitais;",
          "Adotar práticas seguras de utilização das ferramentas digitais e na navegação na Internet;",
          "Ler, compreender e identificar mensagens manipuladas ou falsas;",
          "Identificar os riscos do uso inapropriado de imagens, de sons e de vídeos;",
          "Respeitar as normas dos direitos de autor associados à utilização da imagem, do som e do vídeo.",
        ],
      },
      {
        name: "Investigar e pesquisar",
        topics: [],
        descriptors: [
          "Planificar estratégias de investigação e de pesquisa a realizar online;",
          "Formular questões que permitam orientar a recolha de dados ou informações pertinentes;",
          "Definir palavras-chave para localizar informação, utilizando mecanismos e funções simples de pesquisa;",
          "Utilizar o computador e outros dispositivos digitais como ferramentas de apoio ao processo de investigação e pesquisa;",
          "Conhecer as potencialidades e principais funcionalidades de aplicações para apoiar o processo de investigação e de pesquisa online;",
          "Realizar pesquisas, utilizando os termos selecionados e relevantes de acordo com o tema a desenvolver;",
          "Analisar criticamente a qualidade da informação;",
          "Utilizar o computador e outros dispositivos digitais, de forma a permitir a organização e gestão da informação.",
        ],
      },
      {
        name: "Comunicar e colaborar",
        topics: [],
        descriptors: [
          "Mobilizar estratégias e ferramentas de comunicação e colaboração:",
          "Identificar novos meios e aplicações que permitam a comunicação e a colaboração;",
          "Selecionar as soluções tecnológicas (mais adequadas para realização de trabalho colaborativo e comunicação) que se pretendem efetuar no âmbito de atividades e/ou projetos;",
          "Utilizar diferentes meios e aplicações que permitem a comunicação e colaboração em ambientes digitais fechados;",
          "Apresentar e partilhar os produtos desenvolvidos, utilizando meios digitais de comunicação e colaboração em ambientes digitais fechados.",
        ],
      },
      {
        name: "Criar e inovar",
        topics: [],
        descriptors: [
          "Explorar ideias e desenvolver o pensamento computacional e produzir artefactos digitais criativos, recorrendo a estratégias e ferramentas digitais de apoio à criatividade:",
          "Compreender e utilizar técnicas elementares (enquadramento, ângulos, entre outras) de captação e edição de imagem, som, vídeo e modelação 3D;",
          "Analisar que tipos de problemas podem ser resolvidos usando, imagem, som, vídeo, modelação e simulação;",
          "Decompor um objeto nos seus elementos constituintes;",
          "Desenhar objetos, produzir narrativas digitais, utilizando as técnicas e materiais adequados de captação de imagem, som, vídeo e modelação, tendo em vista soluções adequadas a um problema ou projeto;",
          "Mobilizar os conhecimentos sobre as normas dos direitos de autor associados à utilização da imagem, do som e do vídeo e modelação 3D;",
          "Integrar conteúdos provenientes de diferentes tipos de suportes, para produzir e modificar, de acordo com normas e diretrizes conhecidas, artefactos digitais criativos para exprimir ideias, sentimentos e propósitos específicos.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Descritores AE de TIC do 7.º ano (Segurança, responsabilidade e respeito em ambientes digitais; Investigar e pesquisar; Colaborar e comunicar; Criar e inovar — pensamento computacional). Componente escrita/teórica.",
    cannotTest: "Execução prática em computador real; conteúdos de outros anos.",
  },
  8: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/tic_3c_8a_ff.pdf",
    domains: [
      {
        name: "SEGURANÇA, RESPONSABILIDADE E RESPEITO EM AMBIENTES DIGITAIS",
        topics: [],
        descriptors: [
          "Adotar uma atitude crítica, refletida e responsável no uso de tecnologias, ambientes e serviços digitais:",
          "Adotar práticas seguras de utilização das aplicações digitais e na navegação na Internet;",
          "Conhecer e utilizar critérios de validação da informação publicada online;",
          "Conhecer e utilizar as normas (relacionadas com direitos de autor, com propriedade intelectual e com licenciamento) relativas aos recursos e aos conteúdos que mobiliza nos seus trabalhos, combatendo o plágio;",
          "Conhecer e utilizar as recomendações relativas à acessibilidade, no âmbito da criação e da publicação de conteúdos digitais, mesmo que de forma elementar;",
          "Conhecer comportamentos que visam a proteção da privacidade;adotar comportamentos seguros na utilização de aplicações digitais.",
        ],
      },
      {
        name: "INVESTIGAR E PESQUISAR",
        topics: [],
        descriptors: [
          "Planificar estratégias de investigação e de pesquisa a realizar online;",
          "Formular questões que permitam orientar a recolha de dados ou informações pertinentes;",
          "Definir palavras‑chave para localizar informação, utilizando mecanismos e funções simples de pesquisa;",
          "Utilizar o computador e outros dispositivos digitais como ferramentas de apoio ao processo de investigação e pesquisa;",
          "Conhecer as potencialidades e principais funcionalidades de aplicações, para apoiar o processo de investigação e pesquisa online;",
          "Realizar pesquisa, utilizando os termos selecionados e relevantes, de acordo com o tema a desenvolver;",
          "Analisar criticamente a qualidade da informação;",
          "Utilizar o computador e outros dispositivos digitais, de forma a permitir a organização e gestão da informação.",
        ],
      },
      {
        name: "COLABORAR E COMUNICAR",
        topics: [],
        descriptors: [
          "Mobilizar estratégias e ferramentas de comunicação e colaboração:",
          "Identificar novos meios e aplicações que permitam a comunicação e a colaboração;",
          "Selecionar as soluções tecnológicas mais adequadas para a realização de trabalho colaborativo e comunicação síncrona e assíncrona que se pretendem efetuar, no âmbito de atividades e/ou projetos, utilizando de forma autónoma e responsável as soluções mais adequadas e eficazes para partilhar ideias, sentimentos, informações ou factos na concretização dos objetivos;",
          "Apresentar e partilhar os produtos desenvolvidos utilizando meios digitais de comunicação e colaboração.",
        ],
      },
      {
        name: "CRIAR E INOVAR",
        topics: [],
        descriptors: [
          "Explorar ideias e desenvolver o pensamento computacional e produzir artefactos digitais criativos, recorrendo a estratégias e ferramentas digitais de apoio à criatividade:",
          "Diferenciar as potencialidades e os constrangimentos de diferentes estratégias e aplicações para apoiar a criatividade e a inovação, aplicando critérios de análise pertinentes, previamente validados;",
          "Fomentar o desenvolvimento de projetos, em articulação com outras áreas disciplinares e ou domínios das TIC, serviços e projetos da escola, com a família e com instituições regionais, nacionais ou internacionais;",
          "Tratar e organizar os dados recolhidos, em diferentes formatos, por exemplo: em sítios online, plataformas sociais, de aprendizagem, entre outros;",
          "Gerar e priorizar ideias, desenvolvendo planos de trabalho de forma colaborativa, selecionando e utilizando, de forma autónoma e responsável, as tecnologias digitais mais adequadas e eficazes para a concretização de projetos desenhados;",
          "Produzir, modificar e gerir artefactos digitais criativos, de forma autónoma e responsável, e de acordo com os projetos desenhados;",
          "Proporcionar a criação de artefactos digitais diversificados: blogues, sítios da internet, plataformas sociais, jogos, cartazes, infográficos, apresentações multimédia, animações, narrativas digitais, textos criativos, vídeos, etc.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Descritores AE de TIC do 8.º ano (Segurança, responsabilidade e respeito em ambientes digitais; Investigar e pesquisar; Colaborar e comunicar; Criar e inovar — pensamento computacional). Componente escrita/teórica.",
    cannotTest: "Execução prática em computador real; conteúdos de outros anos.",
  },
  9: {
    source: "https://www.dge.mec.pt/sites/default/files/Curriculo/Aprendizagens_Essenciais/3_ciclo/tic_3c_9a_ff.pdf",
    domains: [
      {
        name: "SEGURANÇA, RESPONSABILIDADE E RESPEITO EM AMBIENTES DIGITAIS",
        topics: [],
        descriptors: [
          "Adotar uma atitude crítica, refletida e responsável no uso de tecnologias, ambientes e serviços digitais:",
          "Ter consciência do impacto das tecnologias emergentes (por exemplo: realidade virtual, realidade aumentada e inteligência artificial) na sociedade e no dia a dia;",
          "Adotar práticas seguras de utilização de dispositivos móveis (por exemplo: riscos de acesso através de redes públicas, instalação de aplicações para dispositivos móveis de fontes credíveis e dados recolhidos durante a sua utilização);",
          "Analisar critérios para seleção e instalação de aplicações nos dispositivos móveis;",
          "Conhecer funcionalidades de configuração dos dispositivos móveis que condicionam a privacidade (por exemplo: georreferenciação, acesso à câmara e microfone do dispositivo);",
          "Conhecer e utilizar as normas relacionadas com direitos de autor, propriedade intelectual e licenciamento relativas à utilização e criação de aplicações para dispositivos móveis;",
          "Conhecer e utilizar as recomendações relativas à acessibilidade, no âmbito da criação de aplicações para dispositivos móveis, mesmo que de forma elementar.",
        ],
      },
      {
        name: "INVESTIGAR E PESQUISAR",
        topics: [],
        descriptors: [
          "Planificar estratégias de investigação e de pesquisa a realizar online;",
          "Formular questões que permitam orientar a recolha de dados ou informações pertinentes;",
          "Definir palavras‑chave para localizar informação, utilizando mecanismos e funções de pesquisa;",
          "Utilizar o computador e outros dispositivos digitais como ferramentas de apoio ao processo de investigação e de pesquisa;",
          "Conhecer as potencialidades e principais funcionalidades de ferramentas, para apoiar o processo de investigação e pesquisa online;",
          "Realizar pesquisas, utilizando os termos selecionados e relevantes de acordo com o tema a desenvolver;",
          "Analisar criticamente a qualidade da informação;",
          "Utilizar o computador e outros dispositivos digitais, de forma a permitir a organização e gestão da informação.",
        ],
      },
      {
        name: "COMUNICAR E COLABORAR",
        topics: [],
        descriptors: [
          "Mobilizar estratégias e ferramentas de comunicação e colaboração:",
          "Identificar meios e aplicações que permitam a comunicação e a colaboração;",
          "Promover a criação de situações, no âmbito das quais o aluno comunica, colabora e interage de forma síncrona e assíncrona, recorrendo às plataformas digitais mais adequadas ao desenvolvimento do projeto.",
        ],
      },
      {
        name: "CRIAR E INOVAR",
        topics: [],
        descriptors: [
          "Conhecer e utilizar as potencialidades de aplicações digitais de representação de dados e estatística;",
          "Conhecer e explorar os conceitos de “Internet das coisas” e outras tecnologias emergentes (por exemplo: realidade virtual, realidade aumentada e inteligência artificial);",
          "Conhecer e explorar novas formas de interação com os dispositivos digitais;",
          "Fomentar o desenvolvimento de projetos, em articulação com outras áreas disciplinares, serviços e projetos da escola, com a família e com instituições regionais, nacionais ou internacionais;",
          "Promover estratégias que envolvam a criatividade dos alunos para criar aplicações para dispositivos móveis, utilizando as metodologias de desenho e desenvolvimento adequadas;",
          "Explorar os conceitos de programação para dispositivos móveis;",
          "Produzir, testar e validar aplicações para dispositivos móveis que correspondam a soluções para o problema enunciado.",
        ],
      },
    ],
    perfilAreas: ['Linguagens e textos', 'Informação e comunicação', 'Raciocínio e resolução de problemas', 'Pensamento crítico e pensamento criativo', 'Relacionamento interpessoal', 'Desenvolvimento pessoal e autonomia', 'Bem-estar, saúde e ambiente', 'Sensibilidade estética e artística', 'Saber científico, técnico e tecnológico', 'Consciência e domínio do corpo'],
    canTest: "Descritores AE de TIC do 9.º ano (Segurança, responsabilidade e respeito em ambientes digitais; Investigar e pesquisar; Colaborar e comunicar; Criar e inovar — pensamento computacional). Componente escrita/teórica.",
    cannotTest: "Execução prática em computador real; conteúdos de outros anos.",
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
  'Educação Visual':                    educacaoVisual,
  'Educação Tecnológica':               educacaoTecnologica,
  'Educação Musical':                   educacaoMusical,
  'Educação Física':                    educacaoFisica,
  'TIC':                                tic,
  // Ensino Secundário (disciplinas próprias)
  'Biologia e Geologia':                biologiaGeologia,
  'Física e Química A':                 fisicaQuimicaA,
  'Filosofia':                          filosofia,
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL — gera restrição curricular para o prompt
// ─────────────────────────────────────────────────────────────────────────────
export function getCurriculumConstraint(subject: string, yearLevel: number): string {
  const subjectDB = CURRICULUM_DB[subject]
  if (!subjectDB) return ''

  const entry = subjectDB[yearLevel]
  if (!entry) return ''

  // Para alinhamento total, emite AMBAS as camadas por domínio: os conteúdos-chave
  // (visão geral) E os descritores oficiais das AE ("o aluno deve ficar capaz de…").
  // Domínios ainda sem descritores curados caem só nos conteúdos (retrocompatível).
  const domainsText = entry.domains
    .map(d => {
      const head = `  ▸ ${d.name}`
      const conteudos = d.topics.length ? `\n    Conteúdos: ${d.topics.join('; ')}` : ''
      const descritores = d.descriptors?.length
        ? `\n    Descritores (o aluno deve ficar capaz de):\n${d.descriptors.map(x => `      - ${x}`).join('\n')}`
        : ''
      return head + conteudos + descritores
    })
    .join('\n')

  const perfilText = entry.perfilAreas?.length
    ? `\nÁREAS DE COMPETÊNCIA DO PERFIL DOS ALUNOS (as questões devem mobilizá-las): ${entry.perfilAreas.join('; ')}.\n`
    : ''

  return `
CURRÍCULO OBRIGATÓRIO — ${subject} ${yearLevel}.º ano (Aprendizagens Essenciais, DGE)
Fonte oficial: ${entry.source}

DOMÍNIOS E ${entry.domains.some(d => d.descriptors?.length) ? 'DESCRITORES DAS APRENDIZAGENS ESSENCIAIS' : 'CONTEÚDOS ESPECÍFICOS'}:
${domainsText}
${perfilText}
✅ O QUE PODES AVALIAR: ${entry.canTest}

❌ O QUE NÃO PERTENCE A ESTE ANO: ${entry.cannotTest}

REGRA INVIOLÁVEL: Todas as questões devem avaliar directamente um ou mais descritores/conteúdos acima, ao nível do ${yearLevel}.º ano. Se o tópico pedido tocar em conteúdos de outros anos, restringe ao que é permitido neste ano.
`
}
