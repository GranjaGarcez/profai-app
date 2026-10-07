-- ============================================================
-- PROF.IA — Diagnóstico: verificação do open_text pelo professor — migração ADITIVA (8)
-- A correção automática por âncoras MANTÉM-SE (veredicto provisório); o professor
-- lê o texto e confirma ou corrige. A estimativa do nó é recalculada com a decisão.
-- Não altera o módulo existente (só duas colunas novas em diag_responses).
-- ============================================================

alter table public.diag_responses
  add column if not exists teacher_correct boolean,   -- null = por verificar; true/false = veredicto do professor
  add column if not exists teacher_note    text;

comment on column public.diag_responses.teacher_correct is 'open_text: veredicto do professor (confirma/corrige a âncora). null = por verificar.';
comment on column public.diag_responses.teacher_note is 'open_text: nota do professor sobre a resposta escrita.';
