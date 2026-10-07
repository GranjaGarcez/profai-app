/**
 * Catálogo de concepções erradas — Diagnóstico de Matemática (v1)
 *
 * FONTE DE VERDADE do catálogo. Cada distrator de um item pode ser etiquetado
 * com um destes códigos (diag_items.option_misconceptions), o que permite ao
 * relatório dizer *qual* é o erro, não apenas que o aluno errou.
 *
 * A expandir à medida que o banco de itens cresce. PT-PT. Ver docs/diagnostico-espec.md §7.
 */

export interface Misconception {
  code: string;
  /** Nó(s) da rede onde tipicamente se manifesta. */
  nodes: string[];
  label: string;
  description: string;
  /** Pista de remediação para o professor / Tutoria. */
  remediation: string;
}

export const MISCONCEPTIONS: Record<string, Misconception> = {
  "DEC.MAIS_ALGARISMOS_MAIOR": {
    code: "DEC.MAIS_ALGARISMOS_MAIOR",
    nodes: ["DECIMAL_CONCEITO", "DECIMAL_OPERACOES"],
    label: "Mais algarismos = maior",
    description:
      "Trata a parte decimal como inteiro: «0,25 > 0,3 porque tem mais algarismos» (whole-number bias).",
    remediation:
      "Alinhar por valor posicional; usar a recta numérica e completar com zeros (0,3 = 0,30).",
  },
  "DEC.VIRGULA_IGNORADA": {
    code: "DEC.VIRGULA_IGNORADA",
    nodes: ["DECIMAL_OPERACOES"],
    label: "Vírgula ignorada no algoritmo",
    description:
      "Opera como se fossem inteiros e desalinha ou perde a vírgula no resultado.",
    remediation:
      "Estimar a ordem de grandeza antes de calcular; alinhar vírgulas; verificar por estimativa.",
  },
  "FRAC.SOMA_NUM_E_DEN": {
    code: "FRAC.SOMA_NUM_E_DEN",
    nodes: ["FRACAO_OPERACOES"],
    label: "Somar numeradores e denominadores",
    description: "1/2 + 1/3 = 2/5: soma numeradores com numeradores e denominadores com denominadores.",
    remediation:
      "Modelo de área/barras; necessidade de denominador comum; verificar que 1/2 + 1/3 > 1/2.",
  },
  "FRAC.MAIOR_DEN_MAIOR_FRACAO": {
    code: "FRAC.MAIOR_DEN_MAIOR_FRACAO",
    nodes: ["FRACAO_CONCEITO", "FRACAO_EQUIVALENCIA"],
    label: "Maior denominador = maior fração",
    description: "«1/8 > 1/4 porque 8 > 4»: aplica a ordem dos inteiros ao denominador.",
    remediation:
      "Partir o mesmo todo em mais partes → partes menores; comparar com material manipulável.",
  },
  "MULT.ADICAO_REPETIDA_MAL": {
    code: "MULT.ADICAO_REPETIDA_MAL",
    nodes: ["SENTIDO_MULTIPLICATIVO", "TABUADA"],
    label: "Confunde multiplicação com adição",
    description: "Responde à multiplicação somando os factores (3 × 4 = 7) ou soma quando devia multiplicar.",
    remediation:
      "Disposição rectangular e grupos iguais; distinguir «quantos ao todo» de «quantos grupos».",
  },
  "VP.ZERO_INTERMEDIO": {
    code: "VP.ZERO_INTERMEDIO",
    nodes: ["VALOR_POSICIONAL", "ADICAO_SUBTRACAO"],
    label: "Erro de valor posicional com zeros",
    description: "Escreve/lê mal números com zeros intermédios (ex.: 305 como 35) ou desalinha ordens no algoritmo.",
    remediation:
      "Ábaco/tabela de posições; decompor (305 = 3 centenas + 0 dezenas + 5 unidades).",
  },
  "DIV.RESTO_IGNORADO": {
    code: "DIV.RESTO_IGNORADO",
    nodes: ["DIVISAO"],
    label: "Resto ignorado ou mal interpretado",
    description: "Descarta o resto ou não o interpreta no contexto do problema.",
    remediation:
      "Problemas em que o resto obriga a decidir (arredondar para cima/baixo); relação D = d×q + r.",
  },
  "SUB.MENOR_DO_MAIOR": {
    code: "SUB.MENOR_DO_MAIOR",
    nodes: ["ADICAO_SUBTRACAO"],
    label: "Subtrai sempre o menor algarismo do maior",
    description:
      "Em cada ordem subtrai o algarismo menor do maior, ignorando o empréstimo (52 − 27 = 35).",
    remediation:
      "Materiais de troca (dezena por 10 unidades); tornar o empréstimo visível antes do símbolo.",
  },
  // — Frações: concepções emergidas do piloto /polvo (2026-09-30), vetadas e formalizadas —
  "FRAC.DEN_MULT_NUM_NAO": {
    code: "FRAC.DEN_MULT_NUM_NAO",
    nodes: ["FRACAO_EQUIVALENCIA"],
    label: "Altera só um dos termos ao formar equivalente",
    description:
      "Ao construir uma fração equivalente, multiplica (ou divide) só o numerador ou só o denominador.",
    remediation:
      "Uma fração equivalente mantém a proporção: o mesmo factor aplica-se ao numerador E ao denominador.",
  },
  "FRAC.MULT_DIF_NUM_DEN": {
    code: "FRAC.MULT_DIF_NUM_DEN",
    nodes: ["FRACAO_EQUIVALENCIA"],
    label: "Usa factores diferentes no numerador e no denominador",
    description:
      "Multiplica o numerador por um número e o denominador por outro, alterando o valor da fração.",
    remediation:
      "O mesmo factor nos dois termos; confirmar com um modelo de área que representa a mesma parte.",
  },
  "FRAC.SIMPL_INCORRETA": {
    code: "FRAC.SIMPL_INCORRETA",
    nodes: ["FRACAO_EQUIVALENCIA"],
    label: "Simplificação incorrecta",
    description:
      "Divide por um número que não é divisor comum, ou simplifica apenas um dos termos.",
    remediation:
      "Dividir numerador e denominador pelo mesmo divisor comum; confirmar com o m.d.c.",
  },
  "FRAC.NAO_SIMPLIFICADA_IRREDUTIVEL": {
    code: "FRAC.NAO_SIMPLIFICADA_IRREDUTIVEL",
    nodes: ["FRACAO_EQUIVALENCIA"],
    label: "Não reduz à fração irredutível",
    description:
      "Dá uma fração equivalente correcta, mas não totalmente simplificada quando se pede a irredutível.",
    remediation:
      "Dividir sucessivamente pelos divisores comuns até não haver mais, ou dividir pelo m.d.c.",
  },
  // — Nós da vaga central (2026-09-30): divisão, decimais, propriedades, conceito de fração —
  "FRAC.PARTE_TODO_MAL": {
    code: "FRAC.PARTE_TODO_MAL",
    nodes: ["FRACAO_CONCEITO"],
    label: "Relação parte-todo mal interpretada",
    description:
      "Conta as partes erradas (ex.: pintadas sobre não-pintadas) ou ignora que as partes têm de ser iguais.",
    remediation:
      "Reforçar: numerador = partes consideradas, denominador = partes iguais do todo. Usar modelos de área.",
  },
  "DIV.INVERTE_DIVIDENDO_DIVISOR": {
    code: "DIV.INVERTE_DIVIDENDO_DIVISOR",
    nodes: ["DIVISAO"],
    label: "Inverte dividendo e divisor",
    description:
      "Divide o menor pelo maior ou troca a ordem, tratando a divisão como comutativa.",
    remediation:
      "A divisão não é comutativa; identificar o todo a repartir. Confirmar com a multiplicação inversa.",
  },
  "DIV.ZERO_NO_QUOCIENTE": {
    code: "DIV.ZERO_NO_QUOCIENTE",
    nodes: ["DIVISAO"],
    label: "Esquece o zero no quociente",
    description:
      "No algoritmo, omite o zero quando uma ordem do dividendo não é divisível, encurtando o quociente.",
    remediation:
      "Cada ordem baixada gera um algarismo no quociente, mesmo que seja zero. Estimar a grandeza antes.",
  },
  "DEC.CASAS_MULTIPLICACAO": {
    code: "DEC.CASAS_MULTIPLICACAO",
    nodes: ["DECIMAL_OPERACOES"],
    label: "Erra o número de casas decimais no produto",
    description:
      "Na multiplicação de decimais, coloca a vírgula com o número errado de casas (não soma as casas dos factores).",
    remediation:
      "O produto tem tantas casas decimais quantas a soma das casas dos factores. Verificar por estimativa.",
  },
  "PROP.DISTRIBUTIVA_INCOMPLETA": {
    code: "PROP.DISTRIBUTIVA_INCOMPLETA",
    nodes: ["PROPRIEDADES_OPERACOES"],
    label: "Aplica a distributiva só a uma parcela",
    description:
      "Em a×(b+c) multiplica apenas por b (ou só por c), esquecendo a outra parcela.",
    remediation:
      "a×(b+c) = a×b + a×c: distribuir por todas as parcelas. Confirmar com a área do rectângulo.",
  },
  "PROP.FALSA_COMUTATIVA": {
    code: "PROP.FALSA_COMUTATIVA",
    nodes: ["PROPRIEDADES_OPERACOES"],
    label: "Supõe a subtração/divisão comutativas",
    description:
      "Assume que a − b = b − a ou a ÷ b = b ÷ a, generalizando indevidamente a comutatividade.",
    remediation:
      "Só a adição e a multiplicação são comutativas; testar com um contraexemplo (5−2 ≠ 2−5).",
  },
  // — Nós de topo (2026-10-01) —
  "EXPR.ORDEM_IGNORADA": {
    code: "EXPR.ORDEM_IGNORADA",
    nodes: ["EXPRESSOES"],
    label: "Ignora a prioridade das operações",
    description:
      "Calcula da esquerda para a direita sem respeitar a prioridade (3 + 4 × 2 = 14 em vez de 11).",
    remediation:
      "Primeiro potências, depois multiplicação/divisão, por fim adição/subtração; parênteses primeiro.",
  },
  "RAC.CONVERSAO_FRACAO_DECIMAL": {
    code: "RAC.CONVERSAO_FRACAO_DECIMAL",
    nodes: ["RACIONAL_RELACOES"],
    label: "Converte mal entre fração, decimal e percentagem",
    description:
      "Erra a correspondência entre representações (ex.: 1/4 = 0,4, ou 1/2 = 12%).",
    remediation:
      "Fração como divisão (1÷4 = 0,25); percentagem = centésimas (0,25 = 25%); usar a recta e grelhas de 100.",
  },
  "PROP.ADITIVO_NAO_MULTIPLICATIVO": {
    code: "PROP.ADITIVO_NAO_MULTIPLICATIVO",
    nodes: ["PROPORCIONALIDADE"],
    label: "Raciocínio aditivo em vez de multiplicativo",
    description:
      "Na proporção soma uma constante em vez de escalar (se 3→6, então 5→8 em vez de 10).",
    remediation:
      "Procurar a razão/constante (×2) e aplicá-la; tabela de proporcionalidade e redução à unidade.",
  },
  "POT.MULTIPLICA_BASE_EXPOENTE": {
    code: "POT.MULTIPLICA_BASE_EXPOENTE",
    nodes: ["POTENCIAS"],
    label: "Multiplica a base pelo expoente",
    description:
      "Trata a potência como produto base × expoente (3² = 6 em vez de 9; 2³ = 6 em vez de 8).",
    remediation:
      "Potência = produto de factores iguais (3² = 3 × 3); distinguir de 3 × 2.",
  },

  // ===== PORTUGUÊS — erros-tipo de compreensão e léxico =====
  // Desenhados para revelar o TIPO de dificuldade (diagnóstico diferencial).
  "COMP.SUPERFICIE": {
    code: "COMP.SUPERFICIE",
    nodes: ["PT.COMP_INFERENCIAL", "PT.COMP_CRITICA"],
    label: "Fica-se pela informação de superfície",
    description:
      "Responde com o que está explícito/literal quando a pergunta exige inferir o implícito.",
    remediation:
      "Perguntar «o que é que o texto deixa perceber, sem dizer?»; sublinhar pistas e ligá-las; modelar o pensar em voz alta.",
  },
  "COMP.INFERENCIA_NAO_SUSTENTADA": {
    code: "COMP.INFERENCIA_NAO_SUSTENTADA",
    nodes: ["PT.COMP_INFERENCIAL", "PT.COMP_CRITICA"],
    label: "Infere além do texto",
    description:
      "Faz uma inferência plausível mas não sustentada no texto (projeta conhecimento/opinião própria).",
    remediation:
      "Exigir a prova no texto: «onde é que lês isso?»; distinguir o que o texto diz do que eu acho.",
  },
  "COMP.IGNORA_CONECTOR": {
    code: "COMP.IGNORA_CONECTOR",
    nodes: ["PT.COMP_LITERAL", "PT.COMP_INFERENCIAL"],
    label: "Ignora conectores e referências",
    description:
      "Não segue conectores (mas, porque, embora) nem referências pronominais, errando a relação entre ideias.",
    remediation:
      "Trabalhar a quem/ao quê se referem os pronomes; o papel dos conectores na relação causa/oposição.",
  },
  "COMP.FACTO_OPINIAO": {
    code: "COMP.FACTO_OPINIAO",
    nodes: ["PT.COMP_CRITICA"],
    label: "Confunde facto com opinião",
    description: "Não distingue o que é facto verificável do que é juízo/opinião do autor.",
    remediation:
      "Critério: um facto pode verificar-se; uma opinião exprime um juízo. Procurar marcas de opinião (acho, é melhor…).",
  },
  "LEX.SEMELHANCA_GRAFICA": {
    code: "LEX.SEMELHANCA_GRAFICA",
    nodes: ["PT.LEXICO"],
    label: "Adivinha o sentido por semelhança gráfica",
    description:
      "Atribui à palavra o sentido de outra parecida na forma/som (ex.: «eminente» por «iminente»).",
    remediation:
      "Usar o contexto como juiz do sentido; comparar pares confundíveis; dicionário quando a pista não chega.",
  },
  "LEX.SENTIDO_FIXO": {
    code: "LEX.SENTIDO_FIXO",
    nodes: ["PT.LEXICO"],
    label: "Aplica o sentido mais comum, ignorando o contexto",
    description:
      "Usa o significado mais frequente da palavra mesmo quando o contexto pede outro (polissemia).",
    remediation:
      "Mostrar a mesma palavra em contextos diferentes; escolher o sentido que faz a frase funcionar.",
  },
};

export const MISCONCEPTION_CODES = Object.keys(MISCONCEPTIONS);

export function getMisconception(code: string): Misconception | undefined {
  return MISCONCEPTIONS[code];
}
