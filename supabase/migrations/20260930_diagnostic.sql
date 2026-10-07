-- ============================================================
-- PROF.IA — Módulo de Diagnóstico (v1) — migração ADITIVA
-- Colar no Supabase Dashboard → SQL Editor → Run.
-- NÃO altera nenhuma tabela existente. Só cria tabelas novas (prefixo diag_).
-- A rede de pré-requisitos e as concepções erradas vivem em código
-- (src/lib/diagnostic/graph.ts, misconceptions.ts) — aqui só o que é dinâmico.
-- Ver docs/diagnostico-espec.md §6.
-- ============================================================

-- 1. Banco de itens de diagnóstico ------------------------------------------
-- Item referencia o nó da rede por código (texto), não por FK.
create table if not exists public.diag_items (
  id                    uuid primary key default gen_random_uuid(),
  node_code             text not null,                 -- ex.: 'TABUADA' (ver graph.ts)
  stem                  text not null,                 -- enunciado
  figure                jsonb,                         -- figura opcional (mesmo formato de question_bank)
  options               jsonb not null,                -- array de opções
  correct_index         smallint not null,
  option_misconceptions jsonb default '{}'::jsonb,     -- { "<índice>": "<código de concepção>" }
  hints                 jsonb not null default '[]'::jsonb, -- ajudas graduadas ordenadas (pista → exemplo)
  difficulty            text not null default 'medium',
  is_fluency            boolean not null default false, -- item de fluência (mede latência/automatização)
  target_latency_ms     integer,                        -- limiar de automatização, se is_fluency
  reviewed_by_human     boolean not null default false, -- INVIOLÁVEL: só entra em produção com true
  review_notes          text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists diag_items_node_idx on public.diag_items (node_code);
create index if not exists diag_items_reviewed_idx on public.diag_items (reviewed_by_human);

-- 2. Instância de diagnóstico lançada pelo professor -------------------------
create table if not exists public.diag_assessments (
  id                uuid primary key default gen_random_uuid(),
  teacher_id        uuid not null references public.profiles(id) on delete cascade,
  class_id          uuid references public.classes(id) on delete set null,
  title             text,
  map_version       text not null default 'v1',
  access_code       text unique not null,              -- aluno entra com este código
  status            text not null default 'draft' check (status in ('draft','active','paused','closed')),
  mode              text not null default 'solo' check (mode in ('solo','mediated')),
  include_screening boolean not null default true,     -- mini-jogos de rastreio
  created_at        timestamptz not null default now()
);
create index if not exists diag_assessments_teacher_idx on public.diag_assessments (teacher_id);

-- 3. Sessão por aluno (pseudónimo) ------------------------------------------
create table if not exists public.diag_sessions (
  id              uuid primary key default gen_random_uuid(),
  assessment_id   uuid not null references public.diag_assessments(id) on delete cascade,
  class_member_id uuid references public.class_members(id) on delete set null,
  student_label   text not null,                       -- pseudónimo; o nome real fica em class_members
  status          text not null default 'waiting' check (status in ('waiting','active','finished','abandoned')),
  started_at      timestamptz,
  finished_at     timestamptz,
  is_retest_of    uuid references public.diag_sessions(id) on delete set null, -- comparação pré/pós (RTI)
  created_at      timestamptz not null default now()
);
create index if not exists diag_sessions_assessment_idx on public.diag_sessions (assessment_id);
create index if not exists diag_sessions_member_idx on public.diag_sessions (class_member_id);

-- 4. Respostas — os quatro sinais cruzados ----------------------------------
create table if not exists public.diag_responses (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.diag_sessions(id) on delete cascade,
  item_id        uuid references public.diag_items(id) on delete set null,
  node_code      text not null,
  selected_index smallint,                              -- → concepção errada (padrão de erro)
  is_correct     boolean,                               -- precisão
  latency_ms     integer,                               -- fluência (nunca mostrado ao aluno)
  hints_used     smallint not null default 0,           -- potencial de aprendizagem (avaliação dinâmica)
  sequence       integer not null,                      -- ordem na sessão
  created_at     timestamptz not null default now()
);
create index if not exists diag_responses_session_idx on public.diag_responses (session_id);
create index if not exists diag_responses_node_idx on public.diag_responses (node_code);

-- 5. Mini-jogos de rastreio (INDICADORES, não diagnóstico cognitivo) ---------
create table if not exists public.diag_screening_results (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null references public.diag_sessions(id) on delete cascade,
  game_key             text not null check (game_key in ('working_memory','attention','processing_speed')),
  raw_score            numeric,
  normalized_indicator numeric,                          -- indicador para ponderar encaminhamento ao SPO
  notes                text,
  created_at           timestamptz not null default now()
);
create index if not exists diag_screening_session_idx on public.diag_screening_results (session_id);

-- 6. Estimativas por nó (substrato do relatório) ----------------------------
create table if not exists public.diag_node_estimates (
  id                       uuid primary key default gen_random_uuid(),
  session_id               uuid not null references public.diag_sessions(id) on delete cascade,
  node_code                text not null,
  mastery                  text check (mastery in ('mastered','frontier','deficit','not_reached')),
  fluency_level            text,
  learning_potential_index numeric,
  dominant_misconception   text,
  created_at               timestamptz not null default now(),
  unique (session_id, node_code)
);
create index if not exists diag_node_estimates_session_idx on public.diag_node_estimates (session_id);

-- ============================================================
-- RLS — mesmo padrão de exams/exam_sessions/exam_answers
-- ============================================================
alter table public.diag_items enable row level security;
alter table public.diag_assessments enable row level security;
alter table public.diag_sessions enable row level security;
alter table public.diag_responses enable row level security;
alter table public.diag_screening_results enable row level security;
alter table public.diag_node_estimates enable row level security;

-- Itens: banco partilhado, leitura livre (o aluno anónimo precisa de ler).
-- Escrita feita pelo seed/serviço (service role ignora RLS).
create policy "diag_items_read" on public.diag_items for select using (true);

-- Instâncias: cada professor gere as suas.
create policy "diag_assessments_own" on public.diag_assessments for all
  using (auth.uid() = teacher_id);

-- Sessões: professor vê as suas (via instância); aluno anónimo pode inserir.
create policy "diag_sessions_teacher" on public.diag_sessions for all using (
  exists (
    select 1 from public.diag_assessments a
    where a.id = assessment_id and a.teacher_id = auth.uid()
  )
);
create policy "diag_sessions_insert_public" on public.diag_sessions for insert with check (true);

-- Respostas: acesso do professor via junção; inserção pública (player do aluno).
create policy "diag_responses_access" on public.diag_responses for all using (
  exists (
    select 1 from public.diag_sessions s
    join public.diag_assessments a on a.id = s.assessment_id
    where s.id = session_id and a.teacher_id = auth.uid()
  )
);
create policy "diag_responses_insert" on public.diag_responses for insert with check (true);

-- Rastreio: mesmo padrão.
create policy "diag_screening_access" on public.diag_screening_results for all using (
  exists (
    select 1 from public.diag_sessions s
    join public.diag_assessments a on a.id = s.assessment_id
    where s.id = session_id and a.teacher_id = auth.uid()
  )
);
create policy "diag_screening_insert" on public.diag_screening_results for insert with check (true);

-- Estimativas: mesmo padrão (calculadas do lado do servidor).
create policy "diag_estimates_access" on public.diag_node_estimates for all using (
  exists (
    select 1 from public.diag_sessions s
    join public.diag_assessments a on a.id = s.assessment_id
    where s.id = session_id and a.teacher_id = auth.uid()
  )
);
create policy "diag_estimates_insert" on public.diag_node_estimates for insert with check (true);
