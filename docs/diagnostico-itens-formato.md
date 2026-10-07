# Contrato de formato do item de diagnóstico (v1)

> O que um item **tem de ser** para entrar no banco. Alvo obrigatório de qualquer
> gerador (`/polvo` ou humano). O `scripts/seedDiagnosticBank.ts` valida cada item
> contra este contrato e recusa os que não cumprem. Ver `diagnostico-espec.md`.

## Onde vivem
Ficheiros JSON em `scripts/diagnostic-items/<NODE_CODE>.json`, cada um um **array de itens**
do mesmo nó. Ex.: `scripts/diagnostic-items/TABUADA.json`.
O conjunto-ouro de referência está em `scripts/diagnostic-items/_gold-exemplos.json`.

## Esquema de um item
```jsonc
{
  "node_code": "FRACAO_EQUIVALENCIA",   // ∈ src/lib/diagnostic/graph.ts (obrigatório)
  "stem": "Qual das frações é equivalente a 2/3?", // PT-PT, enunciado claro
  "figure": null,                         // ou objecto (mesmo formato de question_bank)
  "options": ["4/6", "2/6", "3/4", "5/6"],// 3 a 5 opções
  "correct_index": 0,                     // índice da opção correcta
  "option_misconceptions": {              // distratores etiquetados (índice → código)
    "1": "FRAC.MAIOR_DEN_MAIOR_FRACAO"    // ∈ misconceptions.ts; nunca o correct_index
  },
  "hints": [                              // ajudas GRADUADAS, ordenadas, ≥2
    "Uma fração equivalente representa a mesma parte do todo.",  // 1: pista conceptual
    "Multiplica numerador e denominador de 2/3 pelo mesmo número: ×2 → 4/6." // 2: exemplo
  ],
  "difficulty": "medium",                 // easy | medium | hard
  "is_fluency": false,                    // true = mede automatização (latência)
  "target_latency_ms": null               // obrigatório e >0 se is_fluency=true
}
```

## Tipos de resposta (`response_type`)
Híbrido (decisão 2026-09-30): **aberta no cálculo, MCQ no conceito**.

- **`mcq`** (omisso): usa `options` + `correct_index` + `option_misconceptions` (acima).
- **`open_numeric`**: o aluno **escreve** a resposta (cálculo — tabuada, ±, ÷, operações com
  decimais). Sem `options`. Usa antes:
  ```jsonc
  {
    "node_code": "TABUADA",
    "stem": "7 × 8 = ?",
    "response_type": "open_numeric",
    "answer": "56",                       // resposta canónica
    "wrong_answers": { "15": "MULT.ADICAO_REPETIDA_MAL" }, // chave de diagnóstico: erro conhecido → código
    "hints": ["...", "..."],
    "difficulty": "easy", "is_fluency": true, "target_latency_ms": 4000
  }
  ```
- **`open_fraction`**: como `open_numeric` mas a resposta é uma fração ("a/b"); usa o campo
  de numerador/denominador do player de exame.
- **`allow_calculator`** (bool, omisso `false`): disponibiliza a calculadora e **regista os
  passos** (`onEntry` → `calc_trail`) como 5.º sinal. **Nunca** em itens `is_fluency`.

Nós de cálculo (TABUADA, ADICAO_SUBTRACAO, SENTIDO_MULTIPLICATIVO, DIVISAO,
DECIMAL_OPERACOES) → `open_numeric`. Conceito/comparação (FRACAO_*, DECIMAL_CONCEITO,
PROPRIEDADES_OPERACOES) → `mcq`. O `seedDiagnosticBank.ts` valida ambos.

## Regras invioláveis
1. **PT-PT estrito.** Sem brasileirismos. Vocabulário do currículo português.
2. **`node_code`** existe em `graph.ts`. **Códigos de concepção** existem em `misconceptions.ts`.
3. **Distratores com significado.** Cada opção errada é um erro *plausível*; pelo menos um
   distrator, sempre que o nó tenha concepção conhecida, etiquetado em `option_misconceptions`.
   Nunca inventar um código de concepção — se falta, propor a adição ao catálogo primeiro.
4. **Ajudas graduadas (≥2).** A 1.ª é uma pista que não entrega a resposta; a 2.ª mostra o
   caminho/um exemplo resolvido. É isto que sustenta a avaliação dinâmica.
5. **Itens de fluência** (`is_fluency:true`): cálculo directo (tabuada, factos, cálculo
   mental), resposta única, `target_latency_ms` definido (limiar de automatização).
6. **`reviewed_by_human`** é sempre `false` à entrada. Só o Tiago o passa a `true`. O seed
   força `false` — nunca confia no ficheiro.
7. **Sem ficção pedagógica.** Enunciados e chaves matematicamente correctos; verificados.

## Cobertura por nó (orientação)
- **Nós de base** (`CONTAGEM`, `VALOR_POSICIONAL`, `ADICAO_SUBTRACAO`, `FACTOS_ADICAO`,
  `DECIMAL_CONCEITO`): tratar como primeira classe — a fronteira real está a descer.
- Misturar 1–2 itens de sonda rápida + itens com distratores diagnósticos por nó.
- Sugestão v1: ~6–10 itens por nó; mais nos nós-eixo (`TABUADA`, `DIVISAO`, frações, decimais).

## Validação (o que o seed verifica)
`node_code` válido · 3–5 opções · `correct_index` no intervalo · chaves de
`option_misconceptions` são índices válidos ≠ correcto e apontam a códigos existentes ·
`hints` ≥2 · `difficulty` no conjunto · coerência `is_fluency`/`target_latency_ms`.
Itens que falhem são **recusados com o motivo**, não carregados.
