-- ============================================================
-- PROF.IA — Diagnóstico: janela de reavaliação configurável — migração ADITIVA
-- Só acrescenta uma coluna à tabela diag_assessments. Não altera mais nada.
-- ============================================================

alter table public.diag_assessments
  add column if not exists retest_after_days int not null default 42; -- 6 semanas por omissão

comment on column public.diag_assessments.retest_after_days is
  'Dias após o diagnóstico a partir dos quais o launcher sugere reavaliar (resposta à intervenção).';
