-- ============================================================
-- PROF.IA — Diagnóstico: resposta escrita (open_text) — migração ADITIVA (7)
-- Nível crítico: o aluno escreve e justifica; correcção por palavras-âncora.
-- Não altera o módulo existente (só o check de response_type e uma coluna nova).
-- ============================================================

-- Permitir o tipo 'open_text' (resposta escrita).
alter table public.diag_items drop constraint if exists diag_items_response_type_check;
alter table public.diag_items add constraint diag_items_response_type_check
  check (response_type in ('mcq', 'open_numeric', 'open_fraction', 'open_text', 'audio_reading'));

-- Chave de palavras-âncora do open_text: { "groups": [[sinónimos/raízes], ...], "min": n }
-- Correcto se forem apanhados ≥ min grupos (por omissão, todos). Nunca enviado ao cliente.
alter table public.diag_items
  add column if not exists anchors jsonb;

comment on column public.diag_items.anchors is 'open_text: { groups: string[][], min?: number } — chave de correcção por âncoras (server-side)';
