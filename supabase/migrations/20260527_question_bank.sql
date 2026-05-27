-- ============================================================
-- PROF.IA — Question Bank Migration
-- Colar no Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1. Banco de questões
CREATE TABLE IF NOT EXISTS question_bank (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject        TEXT NOT NULL,
  year_level     SMALLINT NOT NULL,
  topic          TEXT NOT NULL,
  type           TEXT NOT NULL,
  bloom_level    TEXT,
  difficulty     TEXT NOT NULL DEFAULT 'medium',
  text           TEXT NOT NULL,
  options        JSONB,
  correct_answer TEXT NOT NULL,
  mark_scheme    TEXT,
  figure         JSONB,
  points         SMALLINT NOT NULL,
  allow_calculator BOOLEAN NOT NULL DEFAULT false,
  quality_score  REAL NOT NULL DEFAULT 0.75,
  usage_count    INTEGER NOT NULL DEFAULT 0,
  upvotes        INTEGER NOT NULL DEFAULT 0,
  downvotes      INTEGER NOT NULL DEFAULT 0,
  source         TEXT NOT NULL DEFAULT 'ai',
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active      BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_qb_subject_year ON question_bank (subject, year_level);
CREATE INDEX IF NOT EXISTS idx_qb_type         ON question_bank (type);
CREATE INDEX IF NOT EXISTS idx_qb_quality      ON question_bank (quality_score DESC) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_qb_topic_fts    ON question_bank
  USING gin (to_tsvector('portuguese', topic || ' ' || text));

-- 2. Registo de uso por professor (evita repetições)
CREATE TABLE IF NOT EXISTS question_usage (
  question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL,
  used_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (question_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_qu_teacher ON question_usage (teacher_id);

-- 3. Feedback por professor (futuro: botões 👍/👎 no preview)
CREATE TABLE IF NOT EXISTS question_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL,
  vote        SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  flag        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, teacher_id)
);

-- 4. RLS
ALTER TABLE question_bank     ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_usage    ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qb_read"       ON question_bank     FOR SELECT TO authenticated USING (is_active);
CREATE POLICY "qu_own"        ON question_usage    FOR SELECT TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "qf_own"        ON question_feedback FOR ALL    TO authenticated USING (teacher_id = auth.uid());

-- 5. Função para incrementar usage_count atomicamente
CREATE OR REPLACE FUNCTION increment_question_usage(ids UUID[])
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE question_bank SET usage_count = usage_count + 1 WHERE id = ANY(ids);
$$;
