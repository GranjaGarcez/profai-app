-- ============================================================
-- PROF.IA — Diagnóstico: leitura em voz alta (audio_reading) — migração ADITIVA (6)
-- Guarda a referência da gravação na resposta e a classificação de fluência do professor.
-- O áudio em si vive num bucket privado do Supabase Storage ('diag-audio'),
-- criado automaticamente na 1.ª gravação (service role). Não altera o módulo existente.
-- ============================================================

-- Permitir o novo tipo de resposta 'audio_reading' (leitura em voz alta).
alter table public.diag_items drop constraint if exists diag_items_response_type_check;
alter table public.diag_items add constraint diag_items_response_type_check
  check (response_type in ('mcq', 'open_numeric', 'open_fraction', 'audio_reading'));

-- Referência à gravação (caminho no bucket privado 'diag-audio'); null nos outros tipos.
alter table public.diag_responses
  add column if not exists audio_path text;

-- Classificação da leitura em voz alta pelo professor (3 dimensões da fluência).
-- A descodificação do relatório (Visão Simples) vem desta classificação, não do motor.
create table if not exists public.diag_audio_reviews (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.diag_sessions(id) on delete cascade,
  item_id     uuid references public.diag_items(id) on delete set null,
  node_code   text not null,
  accuracy    smallint check (accuracy between 1 and 3),  -- exatidão: 1 fraco · 2 médio · 3 bom
  speed       smallint check (speed between 1 and 3),     -- velocidade
  prosody     smallint check (prosody between 1 and 3),   -- prosódia/expressividade
  notes       text,
  rater       uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (session_id, item_id)
);
create index if not exists diag_audio_reviews_session_idx on public.diag_audio_reviews (session_id);

alter table public.diag_audio_reviews enable row level security;

-- Acesso do professor via junção sessão→instância (mesmo padrão das outras tabelas).
create policy "diag_audio_reviews_access" on public.diag_audio_reviews for all using (
  exists (
    select 1 from public.diag_sessions s
    join public.diag_assessments a on a.id = s.assessment_id
    where s.id = session_id and a.teacher_id = auth.uid()
  )
);
