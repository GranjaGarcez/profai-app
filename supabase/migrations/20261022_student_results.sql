-- PROF.IA — Divulgação de resultados ao aluno + email (opcional)
-- Aditivo e idempotente. Aplicar no SQL editor do Supabase.

-- Interruptor por sessão: os alunos só veem a correcção quando o professor divulga.
alter table public.exam_sessions
  add column if not exists results_released boolean not null default false,
  add column if not exists results_released_at timestamptz;

-- Email do aluno (opcional) — para envio da correcção depois de divulgada.
-- Dado pessoal: recolhido só se o aluno o fornecer.
alter table public.exam_submissions
  add column if not exists student_email text;
