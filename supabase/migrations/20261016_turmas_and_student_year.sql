-- Turmas do professor + ano do aluno na submissão (aditivo, não-destrutivo).
-- APLICAR no Supabase (SQL editor) antes de fazer deploy da parte B.

alter table public.exam_submissions
  add column if not exists student_year int;

create table if not exists public.turmas (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  ano int,
  created_at timestamptz not null default now(),
  unique (teacher_id, ano, nome)
);

alter table public.turmas enable row level security;

drop policy if exists turmas_select_own on public.turmas;
create policy turmas_select_own on public.turmas
  for select using (teacher_id = auth.uid());

drop policy if exists turmas_insert_own on public.turmas;
create policy turmas_insert_own on public.turmas
  for insert with check (teacher_id = auth.uid());

drop policy if exists turmas_delete_own on public.turmas;
create policy turmas_delete_own on public.turmas
  for delete using (teacher_id = auth.uid());

comment on table public.turmas is 'Turmas do professor, criadas automaticamente nas submissões (teacher_id, ano, nome).';
comment on column public.exam_submissions.student_year is 'Ano de escolaridade do aluno (normalmente = ano do teste).';
