-- PROF.IA — Rascunhos de exame em curso (para retomar noutro dispositivo).
-- Aditivo e idempotente. Aplicar no SQL editor do Supabase.
--
-- Um rascunho por (sessão, aluno). O aluno é identificado por uma chave normalizada
-- (nome + turma canónica + número). Escrito/lido pela API com service_role.

create table if not exists public.exam_drafts (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.exam_sessions(id) on delete cascade,
  student_key    text not null,
  student_name   text,
  student_number text,
  student_class  text,
  student_year   int,
  answers        jsonb not null default '{}'::jsonb,
  calc           jsonb not null default '{}'::jsonb,
  deadline       bigint,              -- instante-limite (epoch ms) p/ o temporizador
  updated_at     timestamptz not null default now(),
  unique (session_id, student_key)
);

-- Só o service_role (a nossa API) acede; sem políticas = fechado aos clientes anónimos.
alter table public.exam_drafts enable row level security;
