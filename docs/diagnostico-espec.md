# Módulo de Diagnóstico — Especificação (v1)

> Fonte de verdade do módulo de diagnóstico do PROF.IA.
> Autor da spec: orquestrador (Opus). Geração de código: `/polvo` (ver §9).
> Estado: **proposta para validação do Tiago** antes de começar a Fase 1.
> Data: 2026-09-30.

---

## 1. Objetivo

Um instrumento de **diagnóstico adaptativo de Matemática** para o 2.º ciclo (5.º e 6.º
ano) que localiza a **fronteira real** de cada aluno numa rede de pré-requisitos de
Números e Operações (1.º→6.º ano) e distingue **défice estrutural** de **subestimulação
funcional** — a pergunta central do caso Santiago Costa que motivou este módulo.

Não é um teste por ano. É um mapa de competências percorrido de forma adaptativa,
apresentado ao aluno como exploração (metáfora do **cartógrafo**), com um relatório
acionável para o professor e para a Tutoria/SPO.

## 2. Princípios invioláveis

1. **Aditivo / não-destrutivo.** Só ficheiros e rotas novos; migração nova sem `ALTER`
   a tabelas existentes. Nada do que já funciona no PROF.IA é alterado. Qualquer ponto
   de ligação que exija tocar em código existente **pára e pede autorização ao Tiago**.
2. **RGPD e pseudonimato desde o desenho.** O aluno não cria conta; entra com um código.
   No *player* e em qualquer chamada a IA usa-se um rótulo pseudónimo (`student_label`),
   nunca o nome. O nome real vive apenas nas linhas do professor (`class_members`), como
   já acontece no PROF.IA.
3. **PT-PT estrito.** Sem brasileirismos. Termos do currículo português.
4. **Banco de itens validado por humano.** Nenhum item entra em produção com
   `reviewed_by_human = false`. A IA redige; o Tiago revê. Sem exceção.
5. **Mini-jogos de rastreio = indicadores, nunca diagnóstico cognitivo.** Os jogos de
   memória de trabalho, atenção e velocidade de processamento produzem **indicadores
   para ponderar encaminhamento ao SPO**. O relatório di-lo explicitamente. Diagnóstico
   cognitivo é competência de psicólogos, com instrumentos aferidos para a população
   portuguesa.
6. **Sem estigma.** Descer ao 1.º ciclo, no jogo, é revelar território — nunca falhar.
   Sem vidas, sem pontos perdidos, sem cronómetro visível.

## 3. Decisões fixadas

| Decisão | Escolha | Data |
|---|---|---|
| Enquadramento | Módulo do PROF.IA, estritamente aditivo | 2026-09-29 |
| Âmbito da v1 | **Números e Operações (1.º→6.º) + mini-jogos de rastreio** | 2026-09-30 |
| Aplicação | Aluno sozinho, professor monitoriza (turma inteira) | 2026-09-29 |
| Identidade visual | **Cartógrafo novo** sobre tokens do PROF.IA; reaproveita o *motor/código* do MathTrainer XL, não a sua pele | 2026-09-30 |
| Base de conteúdo | Banco PT-PT novo, estendido para baixo até ao 1.º ciclo; sem IA em tempo real no diagnóstico | 2026-09-29 |

## 4. Base científica — os quatro sinais cruzados

A fiabilidade vem de **cruzar quatro sinais** em cada item, não de medir só certo/errado.
É o cruzamento que separa estrutural de funcional.

| Sinal | O que mede | Fundamento | Coluna |
|---|---|---|---|
| **Precisão na rede** | onde começa a falhar | Knowledge Space Theory (Doignon & Falmagne; ALEKS) | `is_correct` |
| **Latência** | automatização vs. contado pelos dedos | carga cognitiva / memória de trabalho (Sweller) | `latency_ms` |
| **Ajudas necessárias** | potencial de aprendizagem com mediação | avaliação dinâmica (Feuerstein; *graduated prompts*, Campione & Brown) | `hints_used` |
| **Padrão de erro** | qual é a concepção errada | distratores codificados (Resnick, decimais) | `selected_index` → `diag_misconceptions` |

**Leitura combinada** (regra do motor de relatório):
- Falha a frio + poucas ajudas até acertar + latência a descer → **subestimulação**
  (aprende com mediação). Aponta para intervenção pedagógica dirigida.
- Falha a frio + muitas ajudas sem consolidar + latência alta e estável → reforça a
  **hipótese estrutural**. Fundamenta encaminhamento ao SPO.

Ciclo completo: **Resposta à Intervenção (RTI)** — 6 a 8 semanas de intervenção dirigida
aos pré-requisitos em falha, seguida de reaplicação. O relatório compara pré/pós
(`diag_sessions.is_retest_of`).

## 4.5 Tipos de resposta e ferramentas (decisão 2026-09-30)

**Híbrido, aprovado pelo Tiago:** resposta **aberta** (escrita) nos itens de cálculo — elimina
o acerto por sorte e captura o erro real, mapeado a uma concepção via `wrong_answers`; **MCQ**
no conceito/comparação, onde os distratores *são* a informação. Na fluência, a escrita mede
*evocação* (recall), não só reconhecimento.

**5.º sinal — registo da calculadora.** A `Calculator.tsx` do exame já emite cada passo
(`onEntry` → `{expr,result}`). Reaproveita-se: em itens de problema (`allow_calculator=true`,
**nunca** em fluência) guarda-se o trilho em `diag_responses.calc_trail` como sinal de
processo/estratégia. A *avaliação* determinística do trilho fica para a Fase 4/5 (sem IA em
tempo real — reprodutibilidade).

**Reaproveita da UI de exame:** campos de entrada numérica, de **fração (num/den)** e de texto
do player (`exam/[code]/page.tsx`); `writingAnalysis.ts` (respostas abertas); `paperOcr.ts`.

**Tipos candidatos para a Fase 4:** reta numérica (grandeza de frações/decimais); ordenação
interactiva (arrastar); avaliação determinística de passos da calculadora.

Migração: `supabase/migrations/20260930_diagnostic_response_types.sql` (colunas aditivas:
`diag_items.response_type/answer/wrong_answers/allow_calculator`;
`diag_responses.answer_value/calc_trail`; relaxa NOT NULL de `options`/`correct_index`).

## 5. Arquitetura aditiva

### 5.1 Reaproveita (não toca)
- **Entrega por código:** padrão de `src/app/exam/[code]/page.tsx` → novo `src/app/diag/[code]/page.tsx`.
- **Professor:** padrões de `components/exam/ExamLauncher.tsx`, `ExamSessionList.tsx`,
  `GradingDashboard.tsx` → novos componentes em `components/diagnostic/`.
- **Figuras:** `components/math/MathFigure.tsx`.
- **Currículo:** `src/lib/curriculum/index.ts` (referência para mapear nós a AE).
- **Tokens/design:** navy `#0D1B2A`, chalk `#F7F3EE`, electric blue `#00B4D8`, gold `#C8A84B`; shadcn + Tailwind v4.
- **Auth/RLS/Supabase:** clientes existentes em `src/lib/supabase`.

### 5.2 Ficheiros novos
```
src/app/(dashboard)/diagnostico/…        # painel do professor
src/app/diag/[code]/page.tsx             # player do aluno (pseudónimo)
src/app/api/diag/…                       # rotas: sessão, resposta, relatório
src/components/diagnostic/               # Mapa (cartógrafo), Player, Launcher, Report, mini-jogos
src/lib/diagnostic/graph.ts              # a rede de pré-requisitos (nós + arcos)
src/lib/diagnostic/engine.ts             # travessia adaptativa + mediação + latência
src/lib/diagnostic/screening.ts          # mini-jogos (indicadores)
supabase/migrations/NNNN_diagnostic.sql  # migração aditiva
scripts/seedDiagnosticBank.ts            # semear banco (via /polvo, revisão humana)
```

## 6. Modelo de dados (tabelas novas)

Todas com prefixo `diag_`, RLS análoga a `exams`/`exam_sessions` (professor vê as suas;
sessão do aluno via `access_code` anónimo). **6 tabelas** — a migração é
`supabase/migrations/20260930_diagnostic.sql`.

> **Refinamento (2026-09-30):** a rede (nós + arcos) e o catálogo de concepções erradas
> **vivem em código** — `src/lib/diagnostic/graph.ts` e `misconceptions.ts` — como fonte
> de verdade versionada e revisível, e não em tabelas. O motor percorre a rede sem ida à
> BD; as linhas referenciam o nó por `node_code` (texto). Poupa 3 tabelas e a sua sementeira.

- **`diag_items`** — `id`, `node_code` (texto), `stem`, `figure` jsonb, `options` jsonb,
  `correct_index`, `option_misconceptions` jsonb (índice→código), `hints` jsonb
  (ordenadas: pista → exemplo resolvido), `difficulty`, `is_fluency` bool,
  `target_latency_ms`, **`reviewed_by_human` bool default false**, `review_notes`, timestamps.
- **`diag_assessments`** — instância lançada pelo professor (análogo a `exams`): `id`,
  `teacher_id`, `class_id`, `map_version`, `access_code` (unique), `status`,
  `mode` ('solo'|'mediated'), `include_screening` bool, timestamps.
- **`diag_sessions`** — por aluno (análogo a `exam_sessions`): `id`, `assessment_id`,
  `class_member_id` (pseudónimo), `student_label`, `status`, `started_at`, `finished_at`,
  `is_retest_of` (self-fk, pré/pós), timestamps.
- **`diag_responses`** — os quatro sinais: `id`, `session_id`, `item_id`, `node_id`,
  `selected_index`, `is_correct`, `latency_ms`, `hints_used`, `sequence`, timestamps.
- **`diag_screening_results`** — `id`, `session_id`, `game_key`
  ('working_memory'|'attention'|'processing_speed'), `raw_score`, `normalized_indicator`, `notes`.
- **`diag_node_estimates`** — substrato do relatório, por sessão×nó: `mastery`
  ('mastered'|'frontier'|'deficit'|'not_reached'), `fluency_level`,
  `learning_potential_index`, `dominant_misconception`.

## 7. A rede de pré-requisitos — Números e Operações (proposta a validar)

Nós (código — ano indicativo):
`CONTAGEM` (1) · `VALOR_POSICIONAL` (1–2) · `ADICAO_SUBTRACAO` (1–2) · `FACTOS_ADICAO` (2) ·
`SENTIDO_MULTIPLICATIVO` (2–3) · `PROPRIEDADES_OPERACOES` (2–4) · `TABUADA` (3) ·
`DIVISAO` (3–4) · `FRACAO_CONCEITO` (3–4) · `FRACAO_EQUIVALENCIA` (4–5) ·
`FRACAO_OPERACOES` (5–6) · `DECIMAL_CONCEITO` (4–5) · `DECIMAL_OPERACOES` (5–6) ·
`EXPRESSOES` (5–6) · `RACIONAL_RELACOES` (6) · `PROPORCIONALIDADE` (6) · `POTENCIAS` (6).

`PROPRIEDADES_OPERACOES` = comutativa, associativa e **distributiva/decomposição**. É a
base do **cálculo mental ágil** (validado pelo Tiago); alimenta a dimensão de fluência
(latência) além dos arcos abaixo.

Arcos (pré-requisito → dependente):
```
CONTAGEM → VALOR_POSICIONAL → ADICAO_SUBTRACAO → FACTOS_ADICAO → SENTIDO_MULTIPLICATIVO
VALOR_POSICIONAL → SENTIDO_MULTIPLICATIVO → TABUADA → DIVISAO
SENTIDO_MULTIPLICATIVO → DIVISAO
FACTOS_ADICAO → PROPRIEDADES_OPERACOES ; SENTIDO_MULTIPLICATIVO → PROPRIEDADES_OPERACOES
PROPRIEDADES_OPERACOES → EXPRESSOES ; PROPRIEDADES_OPERACOES → DIVISAO
DIVISAO → FRACAO_CONCEITO → FRACAO_EQUIVALENCIA → FRACAO_OPERACOES
VALOR_POSICIONAL → DECIMAL_CONCEITO ; FRACAO_CONCEITO → DECIMAL_CONCEITO → DECIMAL_OPERACOES
TABUADA → EXPRESSOES
FRACAO_EQUIVALENCIA → RACIONAL_RELACOES ; DECIMAL_CONCEITO → RACIONAL_RELACOES → PROPORCIONALIDADE
DIVISAO → PROPORCIONALIDADE ; TABUADA → POTENCIAS
```
> ✅ Validado pelo Tiago (2026-09-30): espinha correcta; acrescentado
> `PROPRIEDADES_OPERACOES`; números relativos ficam fora (7.º ano).

**Insight de campo (Tiago, 2026-09-30) — a fronteira está a descer.** Alunos de 5.º/6.º
que transitaram mal falham já na **subtração e até na adição**, e os decimais são um
desastre generalizado. Consequência para o desenho: o motor **nunca presume domínio da
base** pelo ano do aluno; os nós de base (`ADICAO_SUBTRACAO`, `VALOR_POSICIONAL`,
`FACTOS_ADICAO`, `DECIMAL_CONCEITO`) são cidadãos de primeira classe no banco de itens,
não afterthoughts.

Concepções erradas iniciais (catálogo a expandir): `DEC.MAIS_ALGARISMOS_MAIOR`
(«0,25 > 0,3»), `DEC.VIRGULA_IGNORADA`, `FRAC.SOMA_NUM_E_DEN`,
`FRAC.MAIOR_DEN_MAIOR_FRACAO`, `MULT.ADICAO_REPETIDA_MAL`, `VP.ZERO_INTERMEDIO`,
`DIV.RESTO_IGNORADO`.

## 8. Motor adaptativo (contrato)

1. **Início** no nó adequado ao ano declarado da turma (6.º → frações/decimais), **mas
   sem presumir a base**: os nós de base recebem sempre ≥1 sonda de confirmação, porque a
   fronteira real está cada vez mais baixa (ver §7, insight de campo).
2. **Descida** ao longo dos arcos de pré-requisito quando falha, até localizar a fronteira
   (estratégia tipo pesquisa binária no DAG, para minimizar itens).
3. **Subida** quando domina com precisão **e** latência baixa (`< target_latency_ms`).
4. **Avaliação dinâmica** nos nós de fronteira: ajudas graduadas + item equivalente;
   regista `hints_used` → `learning_potential_index`.
5. **Paragem** quando a fronteira está localizada na espinha principal, ou ao atingir o
   teto de itens/tempo (anti-fadiga; alvo ≤ 20–30 min para aluno sozinho).
6. **Mini-jogos de rastreio** (se `include_screening`) no fim, como intervalo lúdico.

## 9. Estratégia de tokens e `/polvo` (regra permanente do Tiago)

Gastar o gosto **uma só vez**. O caro é o LLM gerar arte por ecrã — evita-se com sistema
de design herdado + um visual-herói parametrizado.

- **Opus (Top-Top, nunca degradar):** arquitetura; `engine.ts`; o componente **Mapa do
  cartógrafo** (SVG/Canvas movido a dados, autorado uma vez); a migração SQL; o motor do
  **relatório**.
- **`/polvo` (volume, modelos baratos):** autoria do banco de itens (revisão humana
  obrigatória), scaffolding de componentes, mini-jogos, testes, copy, rotas CRUD.
- **Arte:** ícones `lucide` (já nas dependências) + conjunto SVG pequeno e fixo para os
  biomas do mapa. Movimento por CSS/transições + biblioteca leve para 2–3 momentos de
  celebração. Nunca frame-a-frame por IA.

## 10. Fases

1. **Fundação** (Opus): `graph.ts` (nós+arcos validados), migração aditiva, catálogo de
   concepções. → valida a espinha com o Tiago.
2. **Banco de itens** (`/polvo` + revisão humana): itens com distratores codificados e
   ajudas graduadas. Prioridade ao eixo `TABUADA` e tudo a jusante (divisão, frações),
   **mas com cobertura robusta da base** (adição, subtração, valor posicional, decimais) —
   é lá que a fronteira real está a cair.
3. **Motor** (Opus): travessia + mediação + latência.
4. **Player cartógrafo** (Mapa: Opus; resto `/polvo`): reaproveita o invólucro de sessão
   do MathTrainer XL; mini-jogos de rastreio.
5. **Painel + relatório** (relatório: Opus): fronteira, concepções, fluência, índice de
   potencial, plano, comparação pré/pós.

Ver `diagnostico-progress.md` para o estado tarefa-a-tarefa.
