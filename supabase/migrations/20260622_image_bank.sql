-- ============================================================
-- PROF.IA — Image Bank Migration
-- Colar no Supabase Dashboard → SQL Editor → Run
-- Mesmo padrão do question_bank: só cresce com imagens que um
-- professor realmente escolheu usar (não com resultados de pesquisa
-- não revistos) — é isso que mantém a relevância alta.
-- ============================================================

CREATE TABLE IF NOT EXISTS image_bank (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject      TEXT NOT NULL,
  year_level   SMALLINT NOT NULL,
  topic        TEXT NOT NULL,
  query        TEXT NOT NULL,        -- termo de pesquisa usado, ou prompt se gerada por IA
  source       TEXT NOT NULL,        -- 'commons' | 'unsplash' | 'ai-gemini' | 'ai-pollinations'
  url          TEXT NOT NULL,
  thumb_url    TEXT,
  credit       TEXT,                 -- atribuição (autor + licença) — null para imagens geradas por IA
  usage_count  INTEGER NOT NULL DEFAULT 1,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active    BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_ib_subject_year ON image_bank (subject, year_level);
CREATE INDEX IF NOT EXISTS idx_ib_topic_fts ON image_bank
  USING gin (to_tsvector('portuguese', topic || ' ' || query));

ALTER TABLE image_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ib_read" ON image_bank FOR SELECT TO authenticated USING (is_active);

-- Função para incrementar usage_count atomicamente quando a mesma imagem
-- (mesmo url) é reutilizada — evita duplicados a crescer sem necessidade.
CREATE OR REPLACE FUNCTION upsert_image_usage(
  p_subject TEXT, p_year_level SMALLINT, p_topic TEXT, p_query TEXT,
  p_source TEXT, p_url TEXT, p_thumb_url TEXT, p_credit TEXT, p_created_by UUID
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE image_bank SET usage_count = usage_count + 1
  WHERE url = p_url AND subject = p_subject AND year_level = p_year_level;

  IF NOT FOUND THEN
    INSERT INTO image_bank (subject, year_level, topic, query, source, url, thumb_url, credit, created_by)
    VALUES (p_subject, p_year_level, p_topic, p_query, p_source, p_url, p_thumb_url, p_credit, p_created_by);
  END IF;
END;
$$;
