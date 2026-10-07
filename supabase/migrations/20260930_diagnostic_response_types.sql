-- ============================================================
-- PROF.IA — Diagnóstico: tipos de resposta + registo da calculadora
-- Migração ADITIVA sobre as tabelas diag_ (só colunas novas / relaxar NOT NULL).
-- Não toca em nenhuma tabela fora do módulo de diagnóstico.
-- Ver docs/diagnostico-itens-formato.md e diagnostico-espec.md §Tipos de resposta.
-- ============================================================

-- diag_items: suportar resposta aberta além de escolha múltipla ---------------
alter table public.diag_items
  add column if not exists response_type text not null default 'mcq'
    check (response_type in ('mcq', 'open_numeric', 'open_fraction')),
  add column if not exists answer text,                 -- resposta canónica (tipos abertos)
  add column if not exists wrong_answers jsonb default '{}'::jsonb, -- { "<resposta errada>": "<código de concepção>" }
  add column if not exists allow_calculator boolean not null default false; -- ferramenta calculadora disponível neste item

-- Opções deixam de ser obrigatórias (itens abertos não as têm).
alter table public.diag_items alter column options drop not null;
alter table public.diag_items alter column correct_index drop not null;

comment on column public.diag_items.response_type is 'mcq | open_numeric | open_fraction';
comment on column public.diag_items.answer is 'Resposta canónica para tipos abertos (ex.: "56", "3/4", "5,55")';
comment on column public.diag_items.wrong_answers is 'Chave de diagnóstico: resposta errada conhecida → código de concepção';
comment on column public.diag_items.allow_calculator is 'Se true, o aluno tem calculadora neste item (nunca em itens de fluência)';

-- diag_responses: resposta escrita + registo de passos da calculadora ---------
alter table public.diag_responses
  add column if not exists answer_value text,           -- resposta escrita (tipos abertos)
  add column if not exists calc_trail jsonb;            -- 5.º sinal: passos da calculadora [{expr,result}]

comment on column public.diag_responses.answer_value is 'Resposta escrita pelo aluno (tipos abertos)';
comment on column public.diag_responses.calc_trail is 'Registo dos passos da calculadora (onEntry), quando allow_calculator; processo/estratégia';
