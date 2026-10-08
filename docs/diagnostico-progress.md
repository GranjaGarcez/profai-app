# Módulo de Diagnóstico — Progresso

> Estado tarefa-a-tarefa. Ver `diagnostico-espec.md` para a spec.
> Atualizado: 2026-09-30.

## Legenda
✅ feito · 🔄 em curso · ⏳ a seguir · ⛔ bloqueado (precisa do Tiago) · 📝 só local

## Fase 0 — Planeamento
- ✅ Análise do MathTrainer XL (é cálculo+aritmética EN; reaproveita-se só o motor/gamificação)
- ✅ Análise da arquitetura do PROF.IA (reaproveita entrega por código + componentes de exame)
- ✅ Decisões fixadas (âmbito, aplicação, identidade)
- ✅ Especificação escrita (`diagnostico-espec.md`)

## Fase 1 — Fundação (Opus) ✅
- ✅ **Rede de pré-requisitos validada pelo Tiago** (§7) — +`PROPRIEDADES_OPERACOES`; base a descer
- ✅ `src/lib/diagnostic/graph.ts` (17 nós, 24 arcos; DAG validado — acíclico, tipos OK)
- ✅ `supabase/migrations/20260930_diagnostic.sql` (migração aditiva — 6 tabelas `diag_*` + RLS)
- ✅ `src/lib/diagnostic/misconceptions.ts` (catálogo inicial, 8 concepções)
- ⛔ **Correr a migração no Supabase** (Tiago: SQL Editor → Run) — antes da Fase 2 semear
- ➕ Decisão: rede e concepções vivem em código, não em tabelas (6 tabelas em vez de 9)

## Fase 2 — Banco de itens (/polvo + revisão humana) 🔄
- ✅ Contrato de formato do item (`docs/diagnostico-itens-formato.md`)
- ✅ `scripts/seedDiagnosticBank.ts` (valida contra graph+concepções; carrega só o que passa)
- ✅ Conjunto-ouro de 5 exemplos (`scripts/diagnostic-items/_gold-exemplos.json`) — carregado na BD
- ✅ Migração aplicada no Supabase (`losnlzddceixvicyxmta`) e pipeline provado end-to-end
- ✅ **Piloto /polvo** (Gemini 2.5 Flash): 3 nós × 10 itens → TABUADA, ADICAO_SUBTRACAO, FRACAO_EQUIVALENCIA
  - 32 itens distintos na BD (5 gold + 27 novos), todos `reviewed_by_human=false`
  - Guardrail funcionou: validador apanhou o gerador a inventar códigos de concepção
  - +4 concepções de fracções formalizadas no catálogo; 1 duplicado normalizado
  - Revisão minha: corrigido 1 distrator mal-etiquetado (143−68); removido 1 item com figura SVG não verificável
- ✅ **Revisão do Tiago** — 32 itens aprovados (`reviewed_by_human=true`) via `approveDiagnosticItems.ts`
  - Decisões: F7–F9 ficam MCQ; F6 aprovado com código actual (afinável); "ordenação interactiva" = tipo candidato p/ Fase 4
- 🔄 **Vaga central** (6 nós): carregada na BD (91 itens · 32 aprovados · 59 por rever)
  - Revisão matemática minha: TODA verificada. Erros reais corrigidos:
    - DECIMAL_OPERACOES: 2,35 km×4 marcava 9350 (correcto 9400) + distrator invertido → corrigido
    - DECIMAL_OPERACOES: unidade na resposta ("8,25 €", "9 350 m") → resposta = número puro
    - DIVISAO: resposta em frase ("cada um recebe 12 e sobram 2") → reformulado p/ "quantas sobram?" = 2
    - PROPRIEDADES: distrator etiquetava a opção correcta → {}
  - Flags p/ Tiago (juízo): PROPRIEDADES #10 (25+17 ambíguo); DEC.MAIS_ALGARISMOS_MAIOR lato em vários DECIMAL_CONCEITO
  - ⚠️ Motor (Fase 3) precisa de normalizador de resposta aberta: "2,0"="2", ignorar espaços/unidades, vírgula↔ponto
  - ✅ Aprovado em bloco (verificação minha): **91 itens `reviewed_by_human=true`** em 9 nós
- ✅ #10 corrigido (opção ambígua removida); rótulo DEC.MAIS_ALGARISMOS_MAIOR fica p/ afinar depois

## Cobertura do banco (2026-09-30)
- ✅ 9 nós aprovados: TABUADA, ADICAO_SUBTRACAO, SENTIDO_MULTIPLICATIVO, PROPRIEDADES_OPERACOES,
  DIVISAO, FRACAO_CONCEITO, FRACAO_EQUIVALENCIA, DECIMAL_CONCEITO, DECIMAL_OPERACOES
- ✅ **17/17 nós com itens** (2026-10-01): +8 nós gerados (/polvo flash), convertidos, matemática
  verificada por mim (toda correcta), 78 itens carregados por rever. Rede totalmente coberta.
  - Formatos: FRACAO_OPERACOES→open_fraction; CONTAGEM/FACTOS_ADICAO/EXPRESSOES/PROPORCIONALIDADE/POTENCIAS→open_numeric; VALOR_POSICIONAL/RACIONAL_RELACOES→mcq
  - +4 concepções no catálogo (EXPR.ORDEM_IGNORADA, RAC.CONVERSAO_FRACAO_DECIMAL, PROP.ADITIVO_NAO_MULTIPLICATIVO, POT.MULTIPLICA_BASE_EXPOENTE)
  - ✅ Aprovados pelo Tiago: **169 itens reviewed_by_human=true** (17/17 nós)
  - Racional #8 corrigido (0,1;1/5;30% — desfeito o empate 0,1=10%); VP.ZERO_INTERMEDIO lato fica p/ afinar
- → A espinha 6.º→base já é percorrível: **motor (Fase 3) já é testável**
  - ⛔ Falta **correr a migração 2** no Supabase antes de carregar (colunas novas)
  - Após migração: reseed (converte aprovados em BD, preserva aprovação; insere novos por rever)
  - ⚠️ Rever PROPRIEDADES #10 (25+17): "25+20−3" também é válido — item ambíguo

## Tipos de resposta (híbrido) — implementado 2026-09-30
- Aberta no cálculo (open_numeric), MCQ no conceito. Decisão do Tiago.
- Migração 2: `20260930_diagnostic_response_types.sql` (colunas + relaxa NOT NULL) — **por correr**
- Contrato actualizado; `seedDiagnosticBank.ts` valida ambos e faz upsert preservando aprovação
- Itens de cálculo já aprovados convertidos p/ aberta (mecânico, distratores→chave de diagnóstico)
- 5.º sinal: registo de passos da calculadora (`calc_trail`), reaproveitando `Calculator.onEntry`
- Fase 4 candidatos: reta numérica, ordenação interactiva, avaliação determinística de passos

## Notas técnicas do piloto (/polvo)
- Gemini 2.5 Flash trunca com poucos tokens → usar `--max-tokens 8000+` para 10 itens.
- Tende a inventar códigos de concepção → o `seedDiagnosticBank.ts` recusa os desconhecidos.
- Tende a acrescentar figuras SVG por conta própria → não fiáveis; manter `figure:null` no piloto.
- Ortografia gerada: pós-AO90 ("frações"). Decisão do Tiago se normalizar p/ pré-AO90 ("fracções").

## Fase 3 — Motor (Opus) 🔄
- ✅ `src/lib/diagnostic/normalize.ts` — correção de resposta aberta ("2,0"="2", unidades, frações) + classificação
- ✅ `src/lib/diagnostic/engine.ts` — travessia adaptativa + mediação (avaliação dinâmica) + estimativas
- ✅ Validado por simulação com itens reais: 13 itens, fronteira localizada em FRACAO_CONCEITO,
  potencial de aprendizagem + concepção dominante por nó
## Fase 4 — Player do aluno 🔄
- ✅ `src/lib/diagnostic/session.ts` — ponte servidor↔motor por replay determinístico (sem estado na BD)
- ✅ `src/app/api/diag/start/route.ts` + `answer/route.ts` — sessão, registo dos sinais, estimativas no fim
- ✅ `src/app/diag/[code]/page.tsx` — player "cartógrafo" (sem cronómetro/pontos); MCQ, aberta, fração;
  ajudas só na fase dinâmica; latência + registo da calculadora
- ✅ Verificado: fluxo API completo por replay da BD (13 passos, fronteira certa, estimativas guardadas); tsc limpo
- ✅ Diagnóstico de teste **MAPA01** activo (código de acesso) para teste visual
- ⏳ Falta: mapa-herói do cartógrafo mais rico (v1 é simples); painel do professor (launcher); captura de latência afinada
- ⏳ Falta (Fase 5): gerador de relatório a partir das estimativas (fronteira, concepções, fluência, potencial, plano)

## Como testar o player ao vivo
1. Em `profai-app`: `npm run dev`
2. Abrir `http://localhost:3000/diag/MAPA01`, escrever um nome, responder.
3. (Backend já validado sem UI via replay da BD.)

## Fase 4 — Player cartógrafo
- ⏳ Componente Mapa (Opus, SVG/Canvas movido a dados)
- ⏳ `src/app/diag/[code]/page.tsx` (reaproveita padrão de `exam/[code]`)
- ✅ **Mini-jogos de rastreio** — `screening.ts` (lógica) + `components/diagnostic/Screening.tsx`
  (3 jogos: memória de trabalho/dígitos, atenção/go-no-go, velocidade/símbolo→número),
  `api/diag/screening`, toggle no launcher, secção no relatório **com aviso "não diagnóstico"**.
  Verificado: tipos limpos, API guarda, relatório mostra as bandas (ao vivo). Jogos: lógica OK, correr no browser por confirmar visualmente.
- ⏳ `src/app/api/diag/*` (sessão, resposta)

## Fase 5 — Relatório 🔄
- ✅ `src/lib/diagnostic/report.ts` — gerador: fronteira, nível real, concepções, fluência,
  **leitura subestimulação vs estrutural** (potencial), plano de intervenção ordenado
- ✅ Validado com dados reais: fronteira em conceito de fração (~3.º ano), "subestimulação (0,70)", plano com remediação
- ✅ API `/api/diag/report/[sessionId]` — estimativas + re-derivação de concepções por resposta
- ✅ Vista `/diag/report/[sessionId]` — retrato, nível real, leitura subestimulação/estrutural, concepções, plano
- ✅ Verificado ao vivo no browser (sessão demo concluída)
- ✅ Relatório atrás da auth (2026-10-01): vista em `(dashboard)/dashboard/diagnostico/[sessionId]`,
  API autenticada + RLS (professor só vê os seus); público por UUID removido (404)
- ✅ **Pré/pós (resposta à intervenção)** (2026-10-01):
  - ligação automática (mesmo código + mesmo nome → `is_retest_of`), em `api/diag/start`
  - aviso no launcher: banner + selo "⏰ reavaliar" às 6 semanas (RETEST_DAYS=42) sem reavaliação
  - `generateComparison` (report.ts) + API + secção no relatório; verificado: fronteira 3→5, 4 competências melhoraram
  - ✅ Janela de reavaliação **configurável** por diagnóstico (4/6/8 semanas no launcher; coluna `retest_after_days`)
  - ⛔ **Migração 3** por correr: `20261001_diagnostic_retest_window.sql` (coluna `retest_after_days`) — o launcher precisa dela
- ✅ **Mapa-herói do cartógrafo** (`components/diagnostic/MapaCartografo.tsx`): trilho serpenteante dos
  17 nós movido por `graph.ts`; território revela-se (visitados a azul, actual a ouro com brilho/pulso,
  névoa nos por explorar), rosa-dos-ventos. Integrado no player; verificado ao vivo.
- ✅ **Launcher** `src/app/(dashboard)/dashboard/diagnostico/page.tsx` + `api/diag/launch` (GET/POST, auth+RLS)
  - criar diagnóstico (gera código), ligação para alunos, lista de sessões, link p/ relatório
  - verificado: tipos limpos, rota protegida (307→login), query de sessões embebidas OK
  - ✅ link no menu lateral (`Sidebar.tsx`, 1 linha aditiva autorizada pelo Tiago 2026-10-01)

## Notas / decisões abertas
- Confirmar versão ao vivo do MathTrainer XL (mathtrainerxl.netlify.app) antes da Fase 4,
  para extrair o invólucro de sessão real (o `bundle.js` local é mais completo que o fonte).
- Números negativos/inteiros ficam fora da v1 (formalmente 7.º ano).

## MÓDULO LÍNGUA (Português) — Fase 1: generalização para domínios ✅ (2026-10-02)
- Spec: `docs/diagnostico-lingua-espec.md`. Decisões: v1 = compreensão+léxico; áudio = gravar leitura; mesmo motor.
- ✅ `domainTypes.ts` (DomainGraph + makeDomainGraph), `domains.ts` (registo), `graphs/portugues.ts` (5 nós)
- ✅ `graph.ts` exporta `matematicaGraph` (ponte); motor/`session`/`report` **agnósticos ao domínio** (recebem o grafo)
- ✅ `loadPool(sb, graph)` separa domínios pelos códigos de nó (PT.* vs Matemática) — sem coluna de domínio nos itens
- ✅ Rotas start/answer/report escolhem o grafo por `assessment.domain`; launch aceita `domain`
- ✅ Verificado offline: PT carrega (5 nós); **Matemática sem regressão** (mesma fronteira/leitura); tsc limpo
- ⛔ **Migração 4** por correr: `20261002_diagnostic_domain.sql` (coluna `domain` em diag_assessments) — as rotas lêem-na
- ⏳ Fase 2 (Português): rede validada por docente de PT, `diag_texts` (passagens), banco de compreensão+léxico (/polvo + revisão)
- ⏳ Fase 3: tipos `open_text` (chave de palavras-âncora) e `audio_reading` (gravação + armazenamento + revisão), relatório Visão Simples, launcher com domínio

## Língua — Fase 2 (conteúdo): arranque ✅ (2026-10-02)
- ✅ Migração 5 `20261002_diagnostic_texts.sql` (tabela `diag_texts` + `text_id` em diag_items) — **por correr**
- ✅ Concepções de Português no catálogo (COMP.* e LEX.*) — desenhadas para revelar o TIPO de erro
- ✅ Anel de ouro autorado (Opus): texto original «O guarda-chuva vermelho» (`scripts/diagnostic-texts/_gold-texto1.json`)
  + 5 itens de compreensão (2 literal, 2 inferencial, 1 crítica) + 5 de léxico (`PT_LEXICO_gold.json`), com ajudas graduadas
- ✅ Verificado OFFLINE: motor de PT localiza a fronteira em Compreensão inferencial (~4.º); concepções e plano corretos
- ⚠️ ACHADO: a avaliação dinâmica (sinal do diagnóstico diferencial) só dispara com **≥3 itens/nó** — o gold tem 2. Escalar via /polvo.
- ⏳ A seguir: /polvo gera ≥4 itens por nível de compreensão (sobre o texto) + léxico; rever; verificar que a mediação dispara
- ⏳ Depois: carregar na BD (precisa migrações 4+5+seed domain-aware), tipos open_text/audio_reading (Fase 3)

## Língua — Fase 2: conteúdo escalado e DIFERENCIAL verificado ✅ (2026-10-02)
- ✅ /polvo gerou compreensão (sobre o texto) + léxico; itens por nó: LITERAL 5, INFERENCIAL 7, CRÍTICA (2 em MCQ), LÉXICO 15
- ✅ **Avaliação dinâmica dispara** → fronteira em Compreensão inferencial (~4.º) + leitura "subestimulação (0,70)".
  O diagnóstico DIFERENCIAL (estrutural vs subestimulação) funciona em Português, offline.
- ⚠️ Nível CRÍTICO: perguntas pessoais ("terias dado?") não têm chave única → removidas; o crítico pede `open_text` (Fase 3).
  Ficam em MCQ os tipos com chave (ideia principal, facto/opinião).
- ⚠️ Conteúdo a validar por docente de Português (não somos especialistas de disciplina).
- ⏳ Falta: carregar na BD (migrações 4+5 + seed domain-aware + texts loader); `open_text` e `audio_reading` (Fase 3); launcher com domínio.

## Língua — Fase 3 (motor/UI por domínio): PT carregado e usável ✅ (2026-10-02)
- ✅ **PT ao vivo**: texto «O guarda-chuva vermelho» + 30 itens na BD, aprovados; diagnóstico **LERPT** (domain=portugues) activo
- ✅ **Passagem de leitura no player** (peça que faltava para a compreensão fazer sentido):
  - `diag_items.text_id` → `normalize.DiagItem` + `ITEM_COLS` + `itemForClient`; helper `withText(sb,payload)` em `session.ts`
  - rotas start/answer devolvem `text {id,title,body,genre}` quando o item tem `text_id`
  - player (`diag/[code]`) mostra o texto (painel chalk, scroll até 40vh) acima da pergunta; persiste entre itens do mesmo texto
  - ✅ Verificado ao vivo: LERPT mostra o texto + MCQ, passa de um item crítico para outro mantendo a passagem
- ✅ **Mapa/rótulos agnósticos ao domínio**: `/start` devolve `domain`; player usa `getDomainGraph(domain)` para o rótulo da região e ordem do mapa; `MapaCartografo` aceita `order` (retrocompatível com Matemática)
- ✅ **Launcher com selector de área** (Matemática | Português): POST envia `domain`+título; GET devolve `domain`; selo de área em cada cartão; subtítulo reactivo
- ✅ **Relatório — Visão Simples da Leitura** (só PT): `report.ts` separa Descodificação × Compreensão da Linguagem
  - eixo: descodificação | linguagem | ambos | equilibrado | indeterminado; cruza com o potencial (linguagem frágil + alto potencial → reforça subestimulação)
  - **honestidade**: sem leitura em voz alta a descodificação fica "não medido" → eixo indeterminado; NUNCA afirma que a descodificação está preservada sem a medir
  - painel na vista do relatório (2 barras + nota); cabeçalho e subtítulo agnósticos ao domínio
  - ✅ Verificado offline (3 cenários: descodificação / linguagem+subestimulação / sem-descodificação); tsc limpo
- ⏳ Falta Fase 3: `open_text` (crítico, chave de palavras-âncora); **`audio_reading`** (MediaRecorder + Supabase Storage + revisão do professor) — é o que mede mesmo a DESCODIFICAÇÃO e fecha a Visão Simples
- Nota: migrações 1–5 já aplicadas pelo Tiago (PT está ao vivo).

## Língua — Fase 3: leitura em voz alta (audio_reading) construído ✅ (2026-10-02)
Decisão do Tiago: **Storage privado + reter** (comparação pré/pós).
- ✅ Motor (`engine.ts`): `audio_reading` é sonda **não pontuada** (não desce a pré-requisitos nem dispara mediação); nó fica `pending_audio`; descodificação é classificada pelo professor
- ✅ `normalize` ResponseType já tinha `audio_reading`; `classifyAnswer` devolve `{correct:false}` em segurança
- ✅ Captura no player (`diag/[code]`): MediaRecorder → gravar/parar/reouvir/regravar; upload p/ `/api/diag/audio`; se o micro falhar, segue sem áudio
- ✅ `/api/diag/audio` (público): valida sessão activa, cria o bucket **privado** `diag-audio` na 1.ª gravação, guarda em `sessions/{sid}/{item}-{ts}.webm` (máx. 12MB); `answer` grava `audio_path`, `is_correct=null`
- ✅ Conteúdo-âncora (Opus): passagem curta «A manhã de neve» (vocabulário comum → testa descodificação, não léxico) + 1 item `audio_reading` em `scripts/diagnostic-texts/_gold-leitura-voz-alta.json`
- ✅ `seedDiagnosticBank.ts` aceita `audio_reading` (sem opções/resposta/ajudas); `approveDiagnosticItems.ts` passa a cobrir **itens dentro de textos**
- ✅ Revisão do professor: `/api/diag/report/[sessionId]` devolve as gravações (URL assinada 1h) + classificação; `/api/diag/audio-review` guarda 3 dimensões (exatidão/velocidade/prosódia 1–3) e **deriva a estimativa de descodificação** do nó (upsert em `diag_node_estimates`) → alimenta a Visão Simples
- ✅ UI de classificação no relatório (player + 3 botões por dimensão + nota); ao guardar, recarrega e o eixo da descodificação actualiza
- ✅ tsc limpo; seed dry-run 0 erros (PT.FLUENCIA_LEITORA 1)
- ✅ **Migração 6 aplicada** (2026-10-03); reseed inseriu o item de leitura; aprovado (PT.FLUENCIA_LEITORA reviewed=true)
- ✅ **Verificado ao vivo (cadeia completa, dados reais)**:
  - upload `/api/diag/audio` → HTTP 200; bucket `diag-audio` criado **privado**; objecto guardado (sessions/{sid}/{item}-{ts}.webm)
  - motor serve o item de leitura a meio da travessia (…INFERENCIAL, LEXICO, **FLUENCIA/audio_reading**, LITERAL); sessão conclui
  - `/answer` grava `audio_path` com `is_correct=null`; `finalize` deixa FLUENCIA `not_reached` (descodificação «não medido»)
  - URL assinada (1h) gerada OK; classificação (exatidão3/veloc2/prosódia3) → estimativa `mastered`/`em_construcao` → Visão Simples passa a ler descodificação = «sólido»
- ⏳ **Falta o Tiago testar** (precisa de micro real + login): gravar como aluno num browser normal; no relatório, ouvir + classificar e ver o eixo da descodificação fechar
- ⏳ Nota: há sessões de teste em LERPT (labels "Teste…"/"Driver…") das minhas verificações — descartáveis
- ⏳ Falta ainda na Fase 3: `open_text` (nível crítico, chave de palavras-âncora)
- ⚠️ Validar a passagem «A manhã de neve» e os critérios de fluência com docente de PT

## Língua — Fase 3: resposta escrita (open_text) no nível crítico ✅ construído (2026-10-03)
- Objectivo: perguntas de juízo fundamentado que a escolha múltipla não capta (facto/opinião com justificação, avaliar a decisão, interpretar o fim).
- Modelo: `anchors` = { groups: [[raízes/sinónimos], …], min } — correcto se apanhar ≥ min grupos. Determinístico, sem IA, replay intacto. **Nunca enviado ao cliente** (é a chave).
- `normalize.ts`: `canonText` (minúsculas, sem acentos), `matchAnchors` (prefixo por palavra → apanha flexões), ramo open_text em `classifyAnswer`.
- `session.ts`: `anchors` em ITEM_COLS (carregado no pool, não no cliente); player: textarea para open_text.
- `seedDiagnosticBank.ts`: valida open_text (exige anchors.groups); `anchors` no toRow.
- Conteúdo-âncora (Opus): **3 itens open_text** de PT.COMP_CRITICA sobre «O guarda-chuva vermelho» (com ajudas graduadas). Crítico passa a ter 6 itens (3 MCQ + 3 escritos).
- Relatório: secção **«Respostas escritas (nível crítico)»** mostra o texto do aluno + veredicto das âncoras, com aviso "lê o texto · confirma tu" (o juízo vale mais que as palavras).
- ✅ Verificado: tsc limpo; seed dry-run 0 erros (CRÍTICA 6); **matcher testado 10/10** (justificado vs não-justificado, acentos, flexões).
- ⛔ **Migração 7** por correr: `20261003_diagnostic_open_text.sql` (open_text no check + coluna `anchors`). Os itens escritos **só carregam depois disto**.
- ⏳ Após migração 7: reseed + aprovar os 3 itens + testar ao vivo (resposta escrita → pontuação por âncora → texto no relatório).
- ⏳ Melhoria futura possível: override do professor no open_text (como no áudio), se a âncora falhar num caso real.

## Turmas: seletor + escolha do aluno da lista ✅ (2026-10-08)
Objetivo: identificação limpa (sem colisões de nomes) e pré/pós fiável. Reusa as tabelas existentes `classes(id,teacher_id,name,year_level)` e `class_members(id,class_id,name,email)` — **sem migração** (FKs `diag_assessments.class_id` e `diag_sessions.class_member_id` já existiam).
- Gestão de turmas: `/dashboard/classes` (link do sidebar já existia, estava morto) — criar turma, adicionar alunos (um nome por linha), remover, apagar. Rotas `api/classes` (GET/POST), `api/classes/[id]` (GET/DELETE), `api/classes/[id]/members` (POST/DELETE) — autenticadas, admin client com `teacher_id` do próprio.
- Launcher: seletor de **turma** («sem turma» por omissão); POST valida que a turma é do professor; cartões mostram a turma.
- Player: `api/diag/roster?code=` (público) devolve os alunos; se houver turma, o aluno **escolhe o nome da lista** (senão escreve, como antes).
- `/start` aceita `classMemberId` → `student_label`=nome real + `class_member_id`; **ano vem da turma** (corrige o 6.º por omissão); pré/pós liga por `class_member_id` quando existe, senão pelo nome.
- ✅ Verificado E2E (local): roster lista a turma; start com aluno cria sessão (ano certo) com nome real + id; tsc limpo; build de produção OK.

## Revisão pedagógica do conteúdo PT (como docente de PT) + verificação do open_text ✅ (2026-10-03)
Parecer (resumo): esqueleto excelente (literal→inferencial→crítica, Visão Simples, mediação). Achados:
- **Léxico**: 5 palavras acima do 2.º ciclo (perspicaz, zeloso, eminente, refutar, efémera) → efeito de chão. `perplexo`/`subitamente` passam. Redundância iminente/eminente.
  - ✅ CORRIGIDO já: 10 enunciados tinham `**markdown**` (mostrava asteriscos ao aluno) → «»; distrator errado do «banco» («vendem peixe» → «cardume»). Ficheiro + BD.
  - ⏳ A fazer: trocar as 5 palavras difíceis por vocabulário de 5.º/6.º (mesma competência, gradiente).
- **Compreensão**: 3 pares duplicados (literal «chegou a casa» ×2; inferencial «sol por dentro» ×2 e «hesitou» ×2) + 1 item mal nivelado («frio do Armando» é literal disfarçado). Só 1 texto (narrativo) → limitação de validade.
  - ⏳ A fazer: remover duplicados, re-nivelar, escrever inferenciais novos distintos; 2.º texto informativo.
- **Correção open_text**: teste adversarial → **falso positivo** por polaridade («Não valeu…» conta «valeu») e **falsos negativos** em respostas abertas válidas. Âncoras não vêem negação nem paráfrase.

## 2.º texto (informativo) via /polvo + revisão ✅ (2026-10-03)
- «As Abelhas e a Polinização» (informativo, ~185 palavras, PT-PT, SEM estatísticas inventadas, com frase de opinião + causa-efeito). Gerado por Gemini Flash (/polvo), revisto por mim.
- Revisão corrigiu vícios do Gemini: 3 "inferenciais" eram recuperação explícita → re-nivelados a literal; 1 item crítico inválido (opção 0 também era opinião — «fascinantes») → corrigido; códigos soltos em literais → limpos.
- Escrevi 2 inferenciais **genuínos** (cadeia polinização→alimento; «função específica»→cooperação).
- Carregado + aprovado (10 itens ligados ao texto). **Bank PT activo: Literal 10 · Inferencial 7 · Crítica 8 · Léxico 10 · Fluência 1.**
- Dois textos (narrativo + informativo) → fecha a maior lacuna de validade. Ficheiro: `scripts/diagnostic-texts/_gold-texto2-informativo.json`.

## Verificação do open_text pelo professor (não elimina o automático) ✅ construído (2026-10-03)
Decisão do Tiago: manter a avaliação automática, sujeitá-la a aprovação/verificação.
- Migração 8 `20261003_diagnostic_opentext_review.sql`: `diag_responses.teacher_correct` + `teacher_note`.
- Motor: `submit(..., overrideCorrect?)`; `rebuildSession` aplica `teacher_correct` no replay → veredicto do professor tem prioridade sobre a âncora.
- Rota `/api/diag/open-text-review` (auth): guarda o veredicto + **recalcula** as estimativas por replay (upsert; **não toca** nos nós com classificação de áudio).
- Relatório: secção «Respostas escritas · validar» mostra texto + âncora (ponto de partida) + ✓/✗ do professor + nota + estado «por verificar/validado»; `criticalPendingVerification` exposto.
- ✅ Verificado offline: override vira PT.COMP_CRITICA de `deficit`→`mastered`; tsc limpo.
- ⛔ **Migração 8 por correr** — o relatório e o /answer lêem `teacher_correct` (rebuildSession); **a app precisa dela para funcionar**.

## Correcção — baralhar opções (anti-gaming) ✅ (2026-10-03)
- Achado do Tiago: a opção correcta estava quase sempre na posição 0 → **77/90 itens MCQ (86%)** com correct_index=0 (o gerador /polvo e o ouro punham a chave primeiro).
- Risco: o aluno aprende "escolho sempre a primeira" → inflaciona e corrompe o diagnóstico.
- Correcção: baralhar a ordem **só na apresentação** (`shuffled()` em `itemForClient`, cópia Fisher–Yates, nunca muta o pool).
  - A pontuação é por **valor** da opção; `selected_index` guardado e o replay usam a ordem **original** → dados canónicos intactos, replay determinístico intacto.
  - Cobre todos os itens (actuais e futuros) sem migração nem reseed.
- ✅ Verificado ao vivo (5 sessões): 40 respostas com o valor correcto → todas `correct:true`; posição servida da chave espalhada {0:14,1:11,2:5,3:10}. tsc limpo.
