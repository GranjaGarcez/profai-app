-- ============================================================
-- PROF.IA — Diagnóstico de Português: textos de leitura — migração ADITIVA
-- Passagens de leitura (diag_texts) e ligação dos itens de compreensão (text_id).
-- Não altera o módulo de Matemática.
-- ============================================================

create table if not exists public.diag_texts (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  body              text not null,           -- a passagem (texto original, PT-PT)
  year_level        int,                     -- ano-alvo indicativo
  genre             text,                    -- narrativo | informativo | poético | …
  word_count        int,
  source            text default 'original', -- 'original' ou referência
  reviewed_by_human boolean not null default false,
  created_at        timestamptz not null default now()
);

-- Item de compreensão pertence a um texto (vocabulário pode ser autónomo → null).
alter table public.diag_items
  add column if not exists text_id uuid references public.diag_texts(id) on delete set null;
create index if not exists diag_items_text_idx on public.diag_items (text_id);

-- RLS: textos legíveis (o aluno anónimo precisa de os ler), escrita por serviço/seed.
alter table public.diag_texts enable row level security;
create policy "diag_texts_read" on public.diag_texts for select using (true);
