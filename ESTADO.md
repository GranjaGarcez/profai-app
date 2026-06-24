# PROF.IA — Estado do Projecto

> Para continuar numa nova sessão, diz apenas **"continua"**.
> Claude lê este ficheiro automaticamente — não precisas de colar nada.

---

## Último update
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
