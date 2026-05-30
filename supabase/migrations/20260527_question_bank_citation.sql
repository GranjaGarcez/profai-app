-- Adicionar campos de citação ao question_bank
-- Colar no Supabase Dashboard → SQL Editor → Run

ALTER TABLE question_bank
  ADD COLUMN IF NOT EXISTS citation   TEXT,     -- ex: "IAVE Prova de Aferição Mat 6.º 2023, Q4"
  ADD COLUMN IF NOT EXISTS source_url TEXT;     -- ex: "https://iave.pt/..."
