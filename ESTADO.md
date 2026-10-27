# PROF.IA — Estado do Projecto

> Para continuar numa nova sessão, diz apenas **"continua"**.
> Claude lê este ficheiro automaticamente — não precisas de colar nada.

---

## Último update
2026-10-25 — **integridade do exame** (análise de conteúdo + sinais ao vivo, só registar; prof decide/anula) + regeneração de critérios ancorada + editar critérios num exame lançado (ver secções no fim).
2026-10-24 — exame ao vivo com alunos: resultados ao aluno, turmas inteligentes, correção horizontal, sinónimos nos "completar espaços" (ver secção no fim).
Updates anteriores relevantes no fim: 2026-10-17 (corrigenda na edição + rede de segurança), 2026-09-13 (motor por blocos, BYOK).

## Update anterior
2026-06-24 (sessão 7) — consolidação, recuperação de merges e limpeza Netlify

### O que se fez nesta sessão (7)
- **markScheme coerente + qualidade aritmética** (`src/lib/exam/markScheme.ts` novo):
  `fixMarkSchemeSum()` reescala critérios para somarem = `points` (método do maior resto).
  Aplicado em 5 pontos: geração, regeneração, correcção, display e export DOCX.
  Crítico adversarial reforçado: refaz cálculos do zero, reporta divergências como gravidade "alta".
- **Estúdio de Imagens com fontes reais**: pesquisa Wikimedia Commons + Unsplash + banco
  (`search-images/route.ts`, `imageBank.ts`, `save-image-use/route.ts`), variedade estética
  e controlo de formato (1:1/16:9/9:16) na geração, figura de **tabela** (`generate-table`, `MathFigure` TableFig).
- **Importador alinhado** (`questions/import/route.ts`): tipo com underscore + markScheme como texto.
- **Deploy migrou de Netlify → Render** (já era; nesta sessão removeu-se a config morta:
  `netlify.toml`, `.netlifyignore`, devDep `@netlify/plugin-nextjs`). Site Netlify **pausado** no dashboard.

### ⚠️ Lição aprendida (PRs empilhados)
Os PRs #9/#10 foram criados *stacked* (base = branch anterior, não `main`). Merge sequencial com
`gh pr merge --merge` **NÃO** re-aponta os bases para `main` (isso só acontece com `--delete-branch`).
Resultado: #9/#10 foram parar a branches mortos, **fora de produção**. Recuperado via PR #11.
**Regra:** para PRs stacked, mergear de baixo para cima e re-apontar a base de cada um para `main`
*antes* de mergear (ou usar `--delete-branch` + confirmar retarget), e **verificar sempre** que o
conteúdo aterrou em `main` (`git diff origin/main origin/<branch> --stat`).

### Estado git no fim da sessão 7
- Tudo em `main` (SHA `5246791`), **0 PRs abertos**, só o branch `main` no remoto.
- PRs #8, #11, #12 merged; #9/#10 também mas conteúdo recuperado pelo #11; #1 fechado (direcção invertida).

---

## Último update anterior
2026-06-02 (sessão 5)

## Stack
- Next.js 16 (App Router) · TypeScript · Tailwind 4
- Supabase (auth + postgres + RLS)
- Deploy: **Render** (profai-app.onrender.com, free tier, 60s timeout)
- Gemini 2.5 Flash (primário, 14s timeout) + Groq llama-3.3-70b (fallback)
- Deadline cascade: 50s (era 22s no Netlify)

---

## O que está funcional
- [x] Auth (login/signup via Supabase)
- [x] Geração de testes via AI (`/api/ai/generate`)
- [x] Question bank — tabela `question_bank` + RLS + FTS português + campos `citation`/`source_url`
- [x] Reutilização de questões por professor (sem repetição, via `question_usage`)
- [x] Fallback Gemini → Groq automático (22s timeout)
- [x] `validateAndRepair()` — pós-processamento determinístico de qualidade
- [x] Export para DOCX
- [x] Seeder `scripts/seedQuestionBank.ts` — Gemini 2.5 Flash, qualidade não negociável
- [x] Pipeline orquestrador `scripts/pipeline.sh` + skill `/orquestrar`
- [x] Feedback 👍/👎 por questão — `POST /api/questions/feedback` + `apply_question_vote()` SQL
- [x] Questões geradas guardadas automaticamente no banco com `_bankId` (permite feedback imediato)
- [x] markSchemes detalhados e disciplina-específicos (`autoMarkScheme()` + `autoMarkSchemeSeeder()`)

---

## Question Bank — Estado das Sementes

### 2.º Ciclo (completo ✅)
| Disciplina | Ano | Questões na BD |
|-----------|-----|---------------|
| Matemática | 5.º | ~56 |
| Matemática | 6.º | ~46 |
| Ciências Naturais | 5.º | 44 |
| Ciências Naturais | 6.º | 40 |
| Português | 5.º | ~10 |
| Português | 6.º | ~18 |
| HGP | 5.º | ~16 |
| HGP | 6.º | ~24 |
| **TOTAL 2.º ciclo** | | **~254 ✅** |

### 3.º Ciclo e Secundário (✅ completo — 2026-05-30)
| Disciplina | Anos | Tópicos | Questões inseridas |
|-----------|------|---------|-------------------|
| Matemática | 7.º, 8.º, 9.º | 6+6+6 tópicos | ~176 |
| Português | 7.º, 8.º, 9.º | 5+5+4 tópicos | ~128 |
| Matemática A | 10.º, 11.º, 12.º | 6+4+5 tópicos | ~178 |
| Português | 10.º, 11.º, 12.º | 4+4+4 tópicos | ~128 |
| **TOTAL inserido** | | | **940 ✅** |

Seed correu sem erros — 940/940 geradas e guardadas. Cascade funcionou: Gemini → Groq (llama-3.3-70b) → SambaNova (DeepSeek).

### Wikipedia Enrichment (✅ completo — 2026-05-30 noite)
| Disciplina | Anos | Tópicos | Questões inseridas |
|-----------|------|---------|-------------------|
| Ciências Naturais | 7.º, 8.º, 9.º | 70 tópicos total | 358 + 144 = **502** |
| Físico-Química | 7.º, 8.º, 9.º | (incluído acima) | |
| História | 7.º, 8.º, 9.º | (incluído acima) | |
| Geografia | 7.º, 8.º, 9.º | (incluído acima) | |

- Corrida 1: 358 inseridas (22 falharam por `correct_answer: null`)
- Corrida 2: 144 inseridas (bug corrigido — `modelAnswer` como fallback)
- 3 tópicos saltados (Wikipedia PT sem conteúdo suficiente): Sistema reprodutor humano, Forças e equilíbrio, Riscos naturais
- quality_score: 0.82 | citation: Wikipedia PT | source: wiki_enrichment

---

## NVIDIA NIM — Estado (2026-06-02)
- Base URL: `https://integrate.api.nvidia.com/v1/chat/completions` (OpenAI-compatible)
- 2 chaves: `NIM_API_KEY` + `NIM_API_KEY_2` — ambas ✅ funcionais (prefixo `nvapi-`)
- Free tier: **forever free**, 40 RPM/chave (80 RPM total com 2 chaves), sem créditos
- 118 modelos disponíveis; modelos com conta básica testados:
  - `meta/llama-3.3-70b-instruct` ✅ funcional (3s)
  - `mistralai/mistral-small-4-119b-2603` ✅ **APROVADO** — PT-PT correcto, markScheme correcto, 2.7s
  - `nvidia/llama-3.3-nemotron-super-49b-v1.5` ✅ funcional, PT-PT correcto (3.1s)
  - `deepseek-ai/deepseek-v4-flash` ✅ funcional
  - `nvidia/nemotron-3-super-120b-a12b` ✅ funcional (já validado via OR)
  - `nvidia/nemotron-3-super-120b-a12b` — 10s+ e reasoning leak → não integrado directamente
- Modelos indisponíveis (conta básica): `mistral-large`, `mistral-large-2`, `llama-3.1-nemotron-70b`, `qwen2.5-72b`
- **Cascade**: NIM mistral-small-4-119b inserido como Tier 2 (antes de SambaNova), `isFallback: true`

## OpenRouter — Situação actual (2026-05-30)
- `google/gemini-2.5-flash` via OpenRouter: **NÃO gratuito** (erro 402) — removido da cascade
- `openai/gpt-oss-120b:free`: testado — **reprovado** (erro matemático no markScheme + português do Brasil)
- `deepseek/deepseek-v4-flash:free`: disponível mas com rate-limit frequente (429) — na cascade como 1.ª tentativa free
- `nvidia/nemotron-3-super-120b-a12b:free`: ✅ **APROVADO** — 120B, PT-PT correcto, markScheme 4 critérios, 10s — na cascade
- `moonshotai/kimi-k2.6:free`: ✅ **APROVADO** — PT-PT correcto, LaTeX, "fracção"/"efectuados", 1.4s (!!) — na cascade
- `qwen/qwen3-235b-a22b:free`, `deepseek/deepseek-r1:free`: **indisponíveis** (404 — endpoints removidos)
- **Cascade completa (2026-06-02):**
  1. Gemini 2.5 Flash — 3 keys, round-robin ← melhor qualidade [Tier 1]
  2. Groq: llama-3.3-70b-versatile [Tier 1]
  3. Groq: qwen-qwq-32b [Tier 1]
  4. OR: kimi-k2.6:free (1.4s) [Tier 2]
  5. GitHub: gpt-4o (2.5s) [Tier 2]
  6. NIM: mistral-small-4-119b (2.7s) ← NOVO ✅ [Tier 2]
  7. SambaNova: DeepSeek-V3.1 (1.9s) [Tier 2]
  8. Mistral: mistral-small (2.4s) [Tier 2]
  9. OR: nemotron-3-super-120b:free (10s) [Tier 2]
  10. Erro claro ao utilizador
- **Hyperbolic**: exige créditos (402) — removido
- **Together AI**: exige €5 cartão — removido
- **Cerebras**: catálogo mudou (llama saiu, só gpt-oss-120b e zai-glm-4.7)
- **Política permanente:** sem degradação de qualidade — Gemini 2.5 Flash ou esperar

---

## Pendente (por ordem de prioridade)

### Alta prioridade
- [x] `npm run seed` — 940 questões inseridas (3.º ciclo + secundário). **CONCLUÍDO 2026-05-30** ✅
- [x] Wikipedia Enrichment — 502 questões CN/FQ/História/Geografia 7-9.º. **CONCLUÍDO 2026-05-30** ✅

### Concluído hoje (2026-05-30)
- [x] Testados modelos OpenRouter gratuitos — Nemotron-3-super-120B e Kimi K2.6 aprovados
- [x] Cascade actualizada: OR:deepseek-v4-flash → OR:nemotron-3-super → Kimi K2.6 → Ollama
- [x] Removido Gemini 2.5 Flash via OpenRouter (sempre 402)

### Concluído hoje (2026-05-29)
- [x] markSchemes detalhados disciplina-específicos (`autoMarkScheme()` em `route.ts` e `seedQuestionBank.ts`)
- [x] Feedback 👍/👎 completo:
  - Tabela `question_feedback` (já existia) + função SQL `apply_question_vote()` aplicada
  - `POST /api/questions/feedback` — endpoint seguro com auth + admin client
  - `route.ts` aguarda `saveQuestions()` e injeta `_bankId` na resposta
  - `TestPreview.tsx` — botões 👍/👎 por questão, não impressos, com estado optimista
  - 👍 = quality_score +0.05 | 👎 = quality_score −0.10 | mudança de voto tratada atomicamente
- [x] Dashboard — `BankStats` component + `GET /api/questions/stats`:
  - 4 métricas: total questões, adicionadas (7 dias), disciplinas cobertas, com feedback
  - Tabela por disciplina: count + barra de qualidade + anos cobertos
  - Top 5 questões por quality_score
- [x] SEED_PLAN expandido para 3.º ciclo e secundário:
  - Matemática 7.º-9.º: 18 tópicos (~176 questões)
  - Português 7.º-9.º: 14 tópicos (~128 questões)
  - Matemática A 10.º-12.º: 15 tópicos (~178 questões)
  - Português 10.º-12.º: 12 tópicos (~128 questões)

### Concluído hoje (2026-05-30) — tarde/noite
- [x] Seed completo: 940/940 questões geradas e inseridas (Matemática + Português, 7.º-12.º)
- [x] Wikipedia Enrichment: 502 questões CN/FQ/História/Geografia 7-9.º (ancoragem factual verificada)
- [x] Bug corrigido: `correct_answer: null` em questões de desenvolvimento → usa `modelAnswer` como fallback
- [x] Cascade `route.ts` expandida: Gemini (3 chaves) → Groq → SambaNova → GitHub → Mistral (5 fornecedores, sem crash em 429)
- [x] Removido `groq-sdk` da cascade do `route.ts` — substituído por `fetch` directo (trata 429 silenciosamente)
- [x] Página de importação de questões externas:
  - `POST /api/questions/import` — IA estrutura texto colado → JSON → guarda com quality_score 0.95
  - `QuestionImporter.tsx` — 3 passos: colar → preview editável → guardar
  - `/dashboard/importar` — página com dica de uso
  - Card "📥 Importar Questões" adicionado ao dashboard (IAVE, livros, matematica.pt)
  - Cascade de IA: Gemini → Groq → SambaNova DeepSeek-V3.1

### Média prioridade

### Baixa prioridade
- [ ] Deduplicar questões no banco (alguns tópicos têm duplicados de runs anteriores)
- [ ] Verificar qualidade das questões geradas — rever amostra no Supabase

---

## Ficheiros-chave
```
src/app/api/ai/generate/route.ts    — endpoint principal de geração
src/lib/exam/questionBank.ts        — banco de questões (CRUD + busca)
src/lib/exam/grading.ts             — correcção automática
supabase/migrations/                — migrações SQL aplicadas
scripts/seedQuestionBank.ts         — seeder (Gemini 2.5 Flash only)
scripts/pipeline.sh                 — pipeline orquestrador Aider+Groq
.claude/seed-failed.json            — 11 tópicos a retentar
.claude/commands/orquestrar.md      — skill /orquestrar
```

## Env vars necessárias
```
NEXT_PUBLIC_SUPABASE_URL            ✅ definida
NEXT_PUBLIC_SUPABASE_ANON_KEY       ✅ definida
SUPABASE_SERVICE_ROLE_KEY           ✅ definida
GEMINI_API_KEY                      ✅ definida (+ GEMINI_API_KEY_2 + GEMINI_API_KEY_3)
GROQ_API_KEY                        ✅ definida
OPENROUTER_API_KEY                  ✅ definida (Gemini 2.5 Flash não gratuito lá)
NIM_API_KEY                         ✅ definida (nvapi-...) — NVIDIA NIM
NIM_API_KEY_2                       ✅ definida (nvapi-...) — segunda chave NIM (80 RPM total)
```

## Modo de trabalho (PERMANENTE)
- Skill `/orquestrar` activo em `~/.claude/commands/orquestrar.md`
- Aider 0.86.3 + Gemini CLI 0.43.0 instalados
- No Windows/Git Bash: Aider via `powershell.exe -Command "aider ..."`
- OpenRouter disponível para Aider: `aider --model openrouter/google/gemini-2.5-flash`
- ~700 tokens/tarefa em modo orquestrador (vs ~70.000 em modo directo)

## Concluído sessão 5 (2026-06-02)
- [x] NVIDIA NIM investigado: 118 modelos, free forever, 40 RPM/chave
- [x] Chaves NIM_API_KEY e NIM_API_KEY_2 testadas e validadas ✅
- [x] `mistralai/mistral-small-4-119b-2603` aprovado pedagogicamente (PT-PT, markScheme, 2.7s)
- [x] NIM integrado na cascade como Tier 2 (posição 6, antes de SambaNova)
- [x] Round-robin entre 2 chaves NIM implementado
- [x] **Migração Netlify → Render concluída** ✅
  - URL: https://profai-app.onrender.com
  - Deadline 22s → 50s; Gemini timeout 20s → 14s
  - HTTP-Referer actualizado para onrender.com
  - Supabase Site URL actualizado
- [x] **App a gerar testes ao vivo** ✅ (testado: pediu 20, gerou 11 via Tier 2)

## Bugs conhecidos (já corrigidos nesta sessão)
- ✅ OpenRouter 402 não chamava `logFailed()` — corrigido
- ✅ `seed-failed.json` acumulava entradas duplicadas — limpo e reconstruído manualmente
- ✅ Groq 429 propagado ao utilizador (groq-sdk) — substituído por fetch raw (`callOpenAICompat`)
- ✅ HTML em vez de JSON (`Unexpected token '<'`) — deadline global 22s em `generateWithFallback`
  - Causa: Gemini timeout 22s + Groq lento > 26s Netlify → HTML 524
  - Fix: `const deadline = Date.now() + 22_000`; cada modelo usa `min(max, restante)`

## 2026-09-13 — Motor de IA por blocos (`src/lib/ai/cascade.ts`)
- Geração de testes partida em blocos de ~4 questões, **em paralelo** (3 chaves Gemini × 2 slots = 24 questões), com plano prévio de sub-aspectos ancorado às AE e fusão com re-escala de cotação + aparo por semelhança. 12 questões em ~10-13 s (antes: 53 s e falha).
- Limites medidos: Groq gpt-oss 8 000 TPM/modelo (pré-check conta o `max_tokens`) e precisa de `reasoning_effort: low`; Gemini 2.5-flash com thinking truncava o JSON (25 s → 7 s por bloco com `thinking_budget: 0`, afinável via `GEMINI_THINKING_BUDGET`); Cloudflare llama-70b ≈ 25 tok/s (reserva).
- Roster: Tier 1 = Gemini 2.5 Flash (todos os blocos) → reservas Groq gpt-oss-20b, CF llama-3.3-70b; Tier 2 (banner amber) = Groq gpt-oss-120b, gemma-4-31b:free, mistral-small, nemotron. Crítico = Groq gpt-oss-120b. Juiz independente reprovou blocos gpt-oss para o 5.º ano (premissas falsas, inglês, nível secundário).
- Corrigido: FTS do banco devolvia 400 com pontuação no tema (banco nunca era usado); crítico chamava modelo Groq removido (404).
- Teste local sem login: `npx tsx scripts/test-cascade.ts [probe|full N]`. Juiz de qualidade: `polvo.py judge`.
- Banco: o `not.in.(842 UUIDs)` no URL dava 400 → exclusão das usadas em JS (`scripts/test-bank.ts`). Cooldown por chave em 429/503, repetições preferem outra família (Groq antes de outra chave Gemini), blocos de 3+1, plano em corrida Gemini/Groq. Rota de imagem: rotação de chaves Gemini + craft no Groq gpt-oss-20b (o llama-3.3-70b-versatile morreu).
- Imagens: o free tier do Nano Banana (`gemini-2.5-flash-image`) esgota-se em poucas imagens (429 nas 3 chaves) → cadeia Nano Banana → **Cloudflare Flux-1-schnell** (~2 s, 10k neurónios/dia) → Pollinations. Guia de estilos ganhou CIENTÍFICO NATURALISTA (defeito em CN/Biologia) e FOTOMICROGRAFIA; vector plano proibido para seres vivos/células.

## 2026-09-13 (noite) — Chave de API pessoal do professor (BYOK) + ciclo de vida do banco
- **Definições → "A minha IA"**: professor liga a sua chave (Claude/Gemini/GPT) e usa o seu modelo de topo nos seus testes. Chave cifrada AES-256-GCM (`src/lib/crypto.ts`, segredo `API_KEY_ENCRYPTION_SECRET`), tabela `user_api_keys` com RLS sem políticas (só service_role). Validação real antes de guardar; interruptor ligar/desligar; Tier 0 na cascade (sem amber). Ao atingir limite/falha → cai na cascade gratuita e avisa o professor (`_personalFallback`). Claude via Messages API nativa; Gemini/GPT via endpoint compatível-OpenAI. `src/lib/ai/personal.ts`, `src/app/api/user/ai-keys/route.ts`, `src/components/settings/AiKeysSection.tsx`.
- **Banco — ciclo de vida** (migração `20260913_bank_lifecycle.sql`, JÁ APLICADA): só Tier 1 completo entra activo; fallback/parcial e problemas graves do crítico → quarentena; 👎 de 2 profs distintos ou score<0.5 retira; 👍 readmite; `purge_question_bank()` limpa rejeitadas >30 dias. Serve só activas com score≥0.6 e rubrica com corpo.
- **Rubricas** (`src/lib/exam/rubric.ts`): critérios analíticos montados em código (soma exacta), resposta esperada, erros frequentes, cotação parcial — para correcção automática de qualidade. Correcção (`grading.ts`) migrada para chaves Gemini com cooldown + Groq (o llama-3.3-70b-versatile morreu).
- **Migrações aplicadas via Supabase MCP; `API_KEY_ENCRYPTION_SECRET` no Render.** Flux a 8 steps.

## 2026-10-17 — Corrigenda coerente na edição + rede de segurança no lançamento
Problema: ao editar o enunciado, as opções ou a resposta de uma questão no editor, a corrigenda (`markScheme` + `correctAnswer`) ficava **igual** — ficava obsoleta e a correcção automática podia dar notas erradas. (Na substituição MS a corrigenda já era refeita; o buraco era só na edição manual.)

- **Actualizar critérios a partir da questão editada** (novo endpoint `src/app/api/ai/refresh-criteria/route.ts`): lê a questão tal como está (enunciado e opções **intocáveis**) e devolve só a corrigenda adequada — resposta re-derivada + critérios analíticos a somar à cotação. Cascata Gemini 2.5 Flash → Groq, PT-PT estrito, refaz cálculos do zero. Distinto do "regenerar", que troca a questão toda.
- **Editor** (`src/components/content/TestPreview.tsx`): marca interna `_criteriaStale` posta ao editar enunciado/opções/resposta (limpa ao editar os critérios à mão); aviso âmbar + botão **"↻ Actualizar critérios"** por questão; a marca é removida antes de gravar/snapshot (`stripInternalFlags`), nunca persiste nem entra no exame.
- **Rede de segurança no lançamento** (`handleLaunch`): se houver questões editadas sem corrigenda actualizada, avisa antes de abrir o lançador, com a contagem e três opções — **actualizar todas** (sequencial, para não esgotar quotas) e lançar, lançar mesmo assim, ou cancelar. Todas as vias de lançamento passam por aqui.
- Validado localmente (`tsc` limpo); confirmados pelo Tiago os pontos 1-3; o ponto 4 (lançar com pendentes → "actualizar todas e lançar") ainda por testar com turma real. Commit `81f5803` em `main` (`GranjaGarcez/profai-app`).

## 2026-10-24 — Exame ao vivo: resultados ao aluno, turmas, correção horizontal
Sessão longa de melhorias para uso real com alunos. Tudo aditivo; `cascade.ts` (roster de IA) nunca foi tocado.

### Geração / versões (17–24 Out)
- **Adicionar questão por tipo** (geração IA) + **reordenar/mover questões** (incl. entre grupos, com renumeração coerente). Commits `5e1d605`, `16fc8dd`.
- **Fiabilidade da questão única** (gerar/regenerar/critérios): novo `src/lib/ai/singleCall.ts` (`callJsonCascade`) reutiliza a cascata validada; fim do Groq `llama-3.3-70b-versatile` morto. `af9c7e6`.
- **Questões auto-suficientes** — prompt proíbe referir imagens/figuras que não existem. `572a329`.
- **Export Word com figuras/gráficos/ilustrações** (rasteriza SVG→PNG; tabela nativa; ilustrações base64). `cbfc8d2`.
- **Coerência figura↔corrigenda** (`src/lib/exam/figureText.ts`): `refresh-criteria` e `generate-figure` passam a ler a figura; crítico também. Resolve corrigendas que falavam de dados diferentes do gráfico. **Cotação integrada nos critérios**: mudar a cotação reescala o markScheme. `f72bbe7`.
- **QR de entrada no exame** (`qrcode.react`) no `ExamLauncher`. `e041738`.
- **Acessibilidade linguística** (2 níveis novos no painel de versões: "Linguagem acessível" e "Simplificada") + **modo "Descreve o teste"** (texto livre que guia a geração) + **imagens passam para as versões adaptadas** (reanexo por posição) + **MU/MS acrescentam sigla ao nome** + **upload de imagem por questão** (com redução de tamanho). `49b7da9`.

### Resultados ao aluno (PENDENTE DE MIGRAÇÃO + RESEND)
- Divulgação controlada pelo professor + página pública `/exam/resultado/[id]` (link/QR dado ao aluno ao submeter) + envio por email via **Resend** (fetch, sem SDK). `cb4b3b2`.
- **Falta aplicar** a migração `supabase/migrations/20261022_student_results.sql` (Supabase MCP está só-leitura; colar no SQL editor). Sem ela: submissão funciona, divulgar/resultado ficam inactivos.
- **Email (Resend):** precisa de `RESEND_API_KEY` + `EXAM_EMAIL_FROM` no Render (o Tiago tem a chave; o plano grátis do Render só permite 2 env vars; **envio congelado por agora**). O link/QR NÃO precisa de env vars — só da migração.

### Turmas inteligentes
- `src/lib/exam/turma.ts` (`canonicalTurma`/`turmaLabel`): normaliza grafias inconsistentes ("6g"/"G", "6º G", "turma A"…) → par (ano, turma) canónico. Aplicado no submit (dados limpos) e no agrupamento do painel (corrige também os dados já guardados, sem migração).
- **Associação manual** por aluno (endpoint `/api/exam/submissions/[id]/turma`) no detalhe, com **sugestão pela hora de submissão**. `ebfe293`.

### Correção horizontal
- Nova tab "Correção horizontal" (`src/components/exam/HorizontalGrading.tsx`): navega questão a questão (setas ← →), lista todos os alunos com a resposta, a resposta certa e os critérios; filtra/agrupa por turma; cota em série (✓/✗ nos objectivos, campo numérico nas abertas). Versões (MU/MS…) são sessões separadas → já agrupadas por versão. `3d63fc5`.

### Correção de "completar espaços" + re-correção selectiva
- `fill_blank` passou a ser corrigido **pelo significado**: aceita sinónimos/equivalentes no contexto ("elevadas"="altas", "escassez"="falta de", "baixas"="geladas"), exige termo exacto só em termos técnicos. `7cf8507`.
- **"Re-corrigir com os critérios novos"**: só aparece quando há submissões corrigidas **antes** da última melhoria do motor (`src/lib/exam/graderVersion.ts` → `GRADER_IMPROVED_AT`), e re-corrige **só as perguntas do tipo afectado** (`GRADER_AFFECTS`, agora `fill_blank`), preservando as outras e as revistas à mão. Poupa tokens, não estraga trabalho feito. `0d65caa`, `e105857`.
  - Ao melhorar o motor no futuro: actualizar `GRADER_IMPROVED_AT` e `GRADER_AFFECTS`.

### Pendentes
- Aplicar a migração `20261022_student_results.sql` (resultados ao aluno).
- Email por Resend congelado (limite de env vars do Render / plano).
- Alíneas (subquestões) como tipo novo — adiado (toca na página de exame ao vivo).

## 2026-10-25 — Identificar o teste em uso + como se alteram critérios na correção
Problema do Tiago: com vários testes do mesmo nome, não conseguia saber qual estava a ser usado num exame (nome cortado na biblioteca, sem indicador de "em uso"), nem como corrigir critérios imprecisos de um exame já a decorrer.

### Identificação do teste (commit `571b05f`, aditivo)
- **Correção do exame** (`src/app/(dashboard)/dashboard/exams/[sessionId]/page.tsx`): atalho `✏️ Teste de origem #xxxxxx` que abre o conteúdo de onde o exame foi lançado (a sessão guarda `content_item_id`). Tooltip avisa que editar aí vale para lançamentos futuros, não para o exame já lançado.
- **Biblioteca** (`content/page.tsx` + `ContentLibraryClient.tsx`): cada cartão mostra agora badge verde `📣 Em uso (N) · CÓDIGO` (query a `exam_sessions` por `teacher_id`), linha `👥 Turmas: 6ºG, 6ºH` (turma canónica via `turmaLabel` sobre `exam_submissions`), **nome completo** em 2 linhas com tooltip (fim do corte que impedia distinguir homónimos), e ref `#xxxxxx` igual à do exame. `tsc` limpo; páginas compilam (307 → login).

### Esclarecimento importante — critérios na correção (NÃO é editável no exame lançado)
O snapshot do exame (`test_snapshot`) está **congelado** no lançamento. A corrigenda (correctAnswer + markScheme) aparece na correção **só como guia read-only** (`HorizontalGrading.tsx` linhas ~156/169). **Não** há campo para reescrever o texto nem re-correr a IA sobre critérios novos dentro de um exame já lançado.
- O lever real é a **nota manual**: campo numérico por questão (0..máx, passo 0,5). O `PATCH /api/exam/submissions/[id]` põe `details[qKey].auto=false`, submissão → `status: 'reviewed'`, e **limita ao máximo** da questão (`getAllQuestions(snapshot).find(...).points`). Isso marca `✓ revisto` e blinda das re-correções automáticas.
- **Nuance:** tocar numa questão marca a submissão **inteira** como `reviewed` → fica fora do "Re-corrigir com os critérios novos" (regrade-outdated salta `reviewed`). Logo: correr o re-grade **antes** dos ajustes manuais.
- Corrigir o **texto** dos critérios de forma permanente = no conteúdo de origem (atalho ✏️) + "↻ Actualizar critérios" (`/api/ai/refresh-criteria`). Só afecta **próximos** lançamentos.
- Possível melhoria futura (não pedida): editar a corrigenda de um exame já lançado e re-correr só as questões afectadas, sem tocar no revisto à mão. → **FEITO em seguida (commit `994e080`).**

## 2026-10-25 (cont.) — Editar critérios de uma pergunta num exame já lançado
Peça pedida pelo Tiago, com a condição "preservar o bom trabalho, sem destruir nada". Resolve o caso em que, a meio da correção, se descobrem critérios imprecisos numa pergunta e se quer corrigi-los só nessa pergunta sem mexer no resto. Commit `994e080`, aditivo, `cascade.ts` intocado.

### Como funciona
- **`src/lib/exam/editCriteria.ts`** (`applyCriteriaEdit`): edição **imutável** do snapshot — muda só `correctAnswer` + `markScheme` (+`bloomLevel`) de UMA pergunta; enunciado, opções, cotação, tipo, índice e figura ficam intactos; as outras perguntas idem. A corrigenda anterior é empilhada em `Question._criteriaHistory` (reversível, **sem migração** — vive no próprio JSON).
- **`POST /api/exam/sessions/[id]/edit-criteria`**: grava o snapshot novo e re-corrige **só a pergunta editada** em cada submissão (`regradeSubmissionSelective` com predicado `onlyThis`). Preserva: as cotações dadas à mão (saltadas, nunca reescritas) e todas as outras perguntas. Status: mantém `reviewed`; só desce a `por_corrigir` se a IA falhar a nova correção numa submissão não-revista.
- **Marcador `manual: true`** novo no `GradingDetail` (carimbado no PATCH de cotação manual) — distingue revisão do professor de falha da IA (ambas punham `auto:false`). Dados antigos sem o marcador: heurístico `auto:false && status==='reviewed'` (seguro, porque falha da IA fica em `por_corrigir`, não `reviewed`).
- **UI** (`HorizontalGrading.tsx`): botão **"✏️ Editar critérios"** por pergunta → textareas (resposta certa + critérios) + **"↻ Regenerar com IA"** (reusa `refresh-criteria`) + confirmação que mostra quantas respostas re-corrige e quantas manuais preserva. Fecha ao navegar de questão.

### Garantias de não-destruição
1. Nunca reescreve uma cotação manual (marcador explícito + histórico). 2. Só toca na pergunta editada. 3. Guarda sempre a corrigenda antiga. 4. Immutable update (não muta o snapshot em memória). 5. tsc + eslint limpos; servidor compila sem erros.
- **Por testar com turma real** (precisa de exame lançado + submissões): abrir a Correção horizontal, editar os critérios de uma pergunta, confirmar que só essa pergunta muda e que as revisões manuais ficam.

## 2026-10-25 (cont.) — Regeneração de critérios ancorada (commit `c42d630`)
A regeneração (`refresh-criteria`) reinventava a resposta do zero e não impunha o ano. Agora aceita `currentAnswer`/`currentMarkScheme` (opcionais): mantém a resposta certa do professor como âncora e constrói os critérios à volta dela; regra nova impõe linguagem/exigência do 2.º ciclo (sem termos acima do ano). O editor de critérios do exame envia a resposta/critérios actuais. Retrocompatível (editor de conteúdo sem âncora = comportamento antigo).

## 2026-10-25 (cont.) — Integridade do exame (anti-batota) — commits `05f519f` + `4471d2a`
Pedido do Tiago (2 alunas pesquisaram na net termos não dados). Decisão final: **só registar, NÃO bloquear o aluno; o professor vê e decide** (anulação sempre humana). Tudo aditivo, `cascade.ts` intocado, **zero migração** (registo em `answers.__integrity`, chave reservada ignorada pela correção como as `calc_`).

### Limites técnicos (honestos, ditos ao Tiago)
É um site no browser do aluno: **impossível** ler SMS, histórico do telemóvel, outras apps/páginas, ou ver um 2.º aparelho. Captura de ecrã exige consentimento do aluno (inútil contra batota). Por isso o proctoring do lado do cliente só apanha o que acontece **na própria página**.

### Peça 1 — Análise de conteúdo/nível (`content-check`, `src/lib/exam/integrity.ts`)
Botão no painel → IA (cascata validada) classifica cada resposta aberta: `above` (vocabulário/conceitos acima do 2.º ciclo), `off_topic` (fora do tema/cara de IA) ou `ok`; conservadora; lista termos. Só anexa **indícios** (`contentFlags`), não mexe em notas. **Apanha o caso real mesmo que pesquisem noutro aparelho** (analisa o texto, não o dispositivo). Marcas na Correção horizontal, sempre "indício para reveres, não prova".

### Peça 2 — Sinais ao vivo (`useExamIntegrity.ts`) — só registar
Na prova regista saídas do ecrã (com duração), colagens (com pergunta + excerto) e cópias; anexa à entrega. Sem overlay/suspensão/aviso a meio (decisão pedagógica). Aviso-prévio honesto no arranque (transparência = legitimidade). `data-qkey` nas respostas abertas atribui a colagem à pergunta.
- **Professor** (`SubmissionDetail`): selo `🛡️ indícios`/`⛔ anulado` na lista; painel com resumo + **linha temporal** dos eventos + indícios de conteúdo; botão **"Anular exame"** (motivo obrigatório, prova anexa, **reversível**, não mexe na nota) via `POST /api/exam/submissions/[id]/annul`. Privacidade: a API de resultados do aluno nunca devolve o `__integrity`.

### ADIADOS — pensar mais tarde: câmara e screenshot
Ambos ficaram **parqueados por decisão do Tiago** (2026-10-25), para reavaliar depois. NÃO implementar sem o retomar explicitamente.

- **Câmara.** Tiago abriu a porta ("se não for contra a lei"; EEs assinam captura de imagem na matrícula). Não construída: não posso afirmar que é legal; o consentimento genérico da matrícula quase de certeza **não cobre** videovigilância comportamental de menores por app externa (RGPD exige finalidade específica; responsável = escola). A retomar: só com OK escrito da direção/EPD da escola, e no modo mínimo (deteção de *presença* no próprio dispositivo, zero imagens guardadas, sem reconhecimento facial).
- **Screenshot do ecrã.** Tecnicamente **inviável num site** para o fim pretendido: `getDisplayMedia` exige autorização explícita + o aluno escolhe o que partilha + indicador visível + **não existe nos telemóveis** (iOS não suporta; Android quase nulo) + página em 2.º plano não pode capturar. Fotografar o próprio DOM (html2canvas) só capta a página do teste (que já temos), não a pesquisa noutro lado. A retomar só se o cenário mudar (ex.: app nativa dedicada, com consentimento e indicadores — nunca encoberto).
- **O "instantâneo" que já se faz** é do comportamento, não do ecrã: hora/duração das saídas e o **excerto do texto colado** (muitas vezes a prova mais forte) + análise de conteúdo. É o que dá matéria concreta sem prometer captura que o browser não permite.

### Nota de método (tokens)
`/polvo` não é inútil, mas é para trabalho-lixo (gerar questões, rascunhos), não para cirurgia neste código ao vivo (a própria regra manda Claude directo para arquitectura/delicado). Poupança sem perder qualidade: leituras dirigidas, verificação agrupada no fim de cada peça, decisões fechadas à cabeça.

### Por testar com turma real
Aluno: aviso no arranque; sair do ecrã/colar fica registado (sem bloqueio). Professor: correr "Analisar conteúdo (IA)", ver selos/linha temporal, anular com motivo e confirmar que é reversível.

## 2026-10-25 (cont.) — Resultados por turma + exportação Excel das cotações
- **Filtro por turma** (commit `e5a99f3`): na Análise e nas Submissões, botões de turma (mantém "Todas"); tabela "Resultados por turma" na Análise (média/acerto/aprovados/mín-máx/DP por turma). `AnalyticsDashboard` passou a receber `fallbackYear`/`turmaView`/`allSubmissions`.
- **Exportar Excel** (commit `a467c81`, dependência nova `exceljs ^4.4`): `GET /api/exam/sessions/[id]/export-grades` (+`?turma=`) gera .xlsx com folha Global + 1 por turma; grelha com cada pergunta (cotação máxima), nome/ano-turma/número, **ordenada pelo número**, total/%/média, <50% a vermelho. `POST /api/exam/submissions/[id]/identity` (prof certifica/edita nome/número/turma). UI: botão "📊 Exportar Excel" → modal de certificação editável + descarregar tudo ou por turma. **Render tem de reinstalar deps** (exceljs) no próximo deploy.

## 2026-10-25 (cont.) — Módulo B: estudo pedagógico (commit `833ec37`)
Âmbito escolhido pelo Tiago: recomendações **por regras + IA a pedido**; exportação **Excel + PDF**. Aditivo, `cascade.ts` intocado.
- **`src/lib/exam/pedagogy.ts`** (motor puro): por item — dificuldade, **discriminação** (27% sup vs inf), taxa de erro; global — média/mediana/DP/mín-máx, distribuição por nível 1-5, **alfa de Cronbach**; por Bloom e por tipo; **perfil por aluno** (forças/fraquezas por Bloom/tipo); recomendações por regras (turma + individuais).
- **Excel** multi-folha: `GET /api/exam/sessions/[id]/export-study` (Resumo, Por questão, Por turma, Por aluno, Recomendações).
- **IA a pedido**: `POST /api/exam/sessions/[id]/study-ai` redige medidas (turma + alunos em risco) ancoradas só nas estatísticas; custo só ao carregar no botão.
- **Página/PDF**: `/dashboard/exams/[sessionId]/estudo` mostra o relatório e serve de fonte do PDF (botão "Guardar PDF" via impressão, reusa `.no-print`); botões Excel e "Aprofundar com IA". Link "📈 Estudo pedagógico" no painel de correção.
- **Por testar com turma real**: abrir o Estudo, confirmar estatística/discriminação, exportar Excel e PDF, e correr o aprofundamento por IA.
- Nota: discriminação/alfa precisam de nº razoável de alunos (≥10 p/ discriminação) — com poucos, ficam indicativos.

## 2026-10-26 — Exportação Word do estudo (commit `d62ead7`)
`GET /api/exam/sessions/[id]/export-study-docx` (reusa a lib `docx` já instalada, server-side `Packer.toBuffer`): relatório editável (resumo, tabelas por questão/turma/Bloom, recomendações). Botão "⬇️ Word (relatório)" na página do estudo.

## PRÓXIMO (autorizado para mais tarde pelo Tiago) — Acompanhamento ao longo do tempo
Decisão do Tiago (2026-10-26): **implementar AMBAS as versões** (mínima + gráficos de progresso), identidade por **escrita livre + correspondência automática + correção manual** (não muda o ecrã do aluno). Barato em IA (determinístico); dificuldade = identidade do aluno entre testes. Caminho: lista de turma persistente (semeada do roster certificado) → ligar submissões por número+turma (com correção manual que já existe) → histórico por aluno/turma + gráficos de evolução. Precisa de migração nova (tabelas de alunos). **Só avançar quando o Tiago autorizar o arranque.**

## 2026-10-26 — INVESTIGAÇÃO (em curso): correções manuais alteradas?
Tiago reportou: correções que já tinha confirmado apareceram alteradas e com incoerências. Pediu investigação **sem alterar nada** até autorizar.
- **Auditoria ao código** (todos os writers de `grading_details`/`status` em `src/app/api/exam/**`): submit e paper/grade **inserem** submissões novas (não reescrevem); PATCH manual põe `reviewed`+`manual:true`+clamp ao máximo; `regrade` (pendentes, reescreve tudo) só toca `por_corrigir/grading/submitted`; `regrade-outdated` só `graded` desactualizadas + tipo afectado; `edit-criteria` re-corrige SÓ a pergunta editada e salta as manuais, mantém `reviewed`. Nenhum clamp deixa passar score>max; brancos→0.
- **Hipótese principal**: o "Editar critérios → re-corrigir" **toca submissões `reviewed`** na pergunta editada (não-manual), recalcula total e `graded_at` — o Tiago pode ter sentido isso como "o que confirmei mudou". As incoerências (score>max / branco com pontos) **não podem ser criadas por re-correções** (todas limitam) → são provavelmente **pré-existentes** de correções antigas, só agora notadas.
- **Supabase MCP desta sessão só vê o projecto `tribo`**, não o PROF.IA → não dá para consultar os dados daqui; diagnóstico fica por SQL que o Tiago corre no SQL editor (fornecido no chat).
- **Correção proposta (por autorizar, não-destrutiva)**: tratar `auto:false` como "não tocar" em TODAS as re-correções (manual OU falha), e fazer o `edit-criteria` **saltar submissões `reviewed`** por defeito (ou perguntar). Nada se implementa sem OK do Tiago.

## 2026-10-27 — Pergunta completa + imagem nas correções (commit `32434f0`)
Componente partilhado `QuestionMedia` (figura MathFigure + ilustração/imagem). No resultado do aluno a pergunta+imagem fica num bloco colapsável (a API `result/[id]` passou a enviar figure/illustration); na Correção horizontal a imagem entra no enunciado; no detalhe da submissão (prof) há agora bloco colapsável "Ver pergunta e imagem" (antes só texto truncado). `Question` ganhou `illustration`/`illustrationCredit`. Aditivo; não mexe na correção.

## 2026-10-27 — Alíneas (versão A) — dividir questão de resposta aberta
Resolução escolhida pelo Tiago: **versão A** (alíneas DENTRO da mesma questão — uma cotação, uma resposta; não subperguntas independentes). Aditivo, no editor, não toca no exame ao vivo.
- `POST /api/ai/split-alineas`: reescreve o enunciado em a), b), c)… (2-4 conforme cotação), mantém o tema, e devolve markScheme com parcela POR ALÍNEA a somar a cotação (via `fixMarkSchemeSum`) + resposta-modelo rotulada. Só aceita `long_answer`/`short_answer`.
- `TestPreview`: botão **"➗ Dividir em alíneas"** por questão, só visível em resposta aberta (`canSplit`); actualiza text+markScheme+correctAnswer+bloom e limpa `_criteriaStale`. Encaixa no que já existe: markScheme parcelar + rubrica na correção por IA mostram a decomposição por alínea.
- Versão B (subperguntas independentes, cada uma cotável/respondível em separado) continua adiada — mexeria no modelo de dados, na entrada do aluno, correção, snapshot, grelha e estatística.

## 2026-10-27 — Duplicar questão + Tradução LPNM (Fase 1)
- **Duplicar questão** (commit `4903a9c`): botão "⧉ Duplicar" no editor; cópia exacta com índice novo, a seguir à original. (Reverter edições já existia: ↩️/↪️ desfazer/refazer no editor.)
- **Tradução LPNM — Fase 1 (só visualização), controlada pelo professor.** Decisão do Tiago. Aditivo, **zero migração** (flag e cache no snapshot).
  - `POST /api/exam/sessions/[id]/allow-translation` (prof liga/desliga → `snapshot._allowTranslation`). Botão "🌐 Permitir tradução (LPNM)" no painel.
  - `POST /api/exam/translate` (público; só funciona se ligado): traduz enunciados+opções para uma língua da lista curada (`src/lib/exam/languages.ts`), **cache por língua** em `snapshot._translations[lang]` (1 chamada de IA por língua/exame). O fetch público `session/[code]` remove `_translations` do payload.
  - Exame do aluno: selector "🌐 Ver o enunciado em:" (só aparece se o prof ligar); mostra enunciado+opções traduzidos; **a resposta é na mesma** (opções valem por letra/posição, independentes da língua). Não altera o teste nem as respostas guardadas.
  - **Fase 2 (adiada)**: responder em L1 com tradução para PT-PT na submissão (decisão de avaliação do prof).

## 2026-10-27 — Editar critérios: opção de re-corrigir também as revisões manuais (não-destrutivo)
Pedido do Tiago: ao editar critérios, por defeito mantém-se a re-correção da pergunta editada nas submissões (incl. reviewed, nas perguntas não-manuais) — isso é desejado. NOVO: opção explícita de re-corrigir **também** as que ele revira à mão (mudou de critério ao fim de vários testes), com aviso antes e marca depois.
- `edit-criteria` aceita `overrideManual` (default false). Com true, re-corrige a pergunta editada mesmo onde estava manual; guarda a cotação anterior em `details[q].prevManual` (score+feedback) e marca `overrodeManual:true`. Devolve `overridden`. Status reviewed mantém-se sempre reviewed.
- `GradingDetail` ganhou `overrodeManual?` e `prevManual?` (aditivo).
- UI (HorizontalGrading): no painel de confirmação, checkbox "Re-corrigir também as N que revi à mão" (só aparece se houver manuais) com aviso vermelho; mensagem final diz quantas foram substituídas; na linha do aluno, selo "↻ IA substituiu a tua revisão (antes: X)".
- Não-destrutivo: opt-in, nota manual anterior guardada (reversível), outras perguntas intactas.
