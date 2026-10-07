-- ============================================================
-- PROF.IA — Diagnóstico: domínio (Matemática | Português) — migração ADITIVA
-- Só acrescenta uma coluna a diag_assessments. Os itens separam-se por código de
-- nó (os de Português começam por PT.), logo diag_items não precisa de coluna.
-- ============================================================

alter table public.diag_assessments
  add column if not exists domain text not null default 'matematica'
    check (domain in ('matematica', 'portugues'));

comment on column public.diag_assessments.domain is 'Domínio do diagnóstico: matematica | portugues';
