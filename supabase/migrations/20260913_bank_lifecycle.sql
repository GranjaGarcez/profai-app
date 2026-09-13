-- Ciclo de vida do banco de questões (2026-09-13)
--  • apply_question_vote passa a manter upvotes/downvotes (as colunas existiam mas
--    nunca eram actualizadas) e a decidir is_active:
--      - 👎 de 2 professores distintos (mais 👎 do que 👍) → retira do banco
--      - quality_score < 0.5 → retira do banco
--      - 👍 com saldo positivo → readmite uma questão em quarentena
--  • purge_question_bank(): apaga de vez as rejeitadas há mais de 30 dias.

CREATE OR REPLACE FUNCTION apply_question_vote(
  p_question_id UUID,
  p_teacher_id  UUID,
  p_vote        SMALLINT   -- 1 (👍) ou -1 (👎)
)
RETURNS REAL LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  old_vote  SMALLINT;
  delta     REAL;
  new_score REAL;
  ups       INTEGER;
  downs     INTEGER;
BEGIN
  SELECT vote INTO old_vote
  FROM question_feedback
  WHERE question_id = p_question_id AND teacher_id = p_teacher_id;

  -- 👍 = +0.05 | 👎 = -0.10 ; se já havia voto, desfaz o efeito anterior
  delta := CASE WHEN p_vote = 1 THEN 0.05 ELSE -0.10 END;
  IF old_vote IS NOT NULL THEN
    delta := delta - CASE WHEN old_vote = 1 THEN 0.05 ELSE -0.10 END;
  END IF;

  INSERT INTO question_feedback (question_id, teacher_id, vote)
  VALUES (p_question_id, p_teacher_id, p_vote)
  ON CONFLICT (question_id, teacher_id)
  DO UPDATE SET vote = EXCLUDED.vote;

  SELECT count(*) FILTER (WHERE vote = 1), count(*) FILTER (WHERE vote = -1)
  INTO ups, downs
  FROM question_feedback WHERE question_id = p_question_id;

  UPDATE question_bank
  SET quality_score = GREATEST(0, LEAST(1, quality_score + delta)),
      upvotes   = ups,
      downvotes = downs,
      is_active = CASE
        WHEN downs >= 2 AND downs > ups THEN false
        WHEN GREATEST(0, LEAST(1, quality_score + delta)) < 0.5 THEN false
        WHEN p_vote = 1 AND ups > downs THEN true
        ELSE is_active
      END
  WHERE id = p_question_id
  RETURNING quality_score INTO new_score;

  RETURN COALESCE(new_score, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION apply_question_vote FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION apply_question_vote TO service_role;

-- Limpeza definitiva: rejeitadas pela comunidade há mais de 30 dias.
CREATE OR REPLACE FUNCTION purge_question_bank()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE n INTEGER;
BEGIN
  WITH gone AS (
    DELETE FROM question_bank
    WHERE NOT is_active
      AND downvotes >= 2 AND downvotes > upvotes
      AND created_at < now() - interval '30 days'
    RETURNING id
  )
  SELECT count(*) INTO n FROM gone;
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION purge_question_bank FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION purge_question_bank TO service_role;

-- Índice para o serviço do banco (activas, por qualidade)
CREATE INDEX IF NOT EXISTS idx_qb_active_quality ON question_bank (subject, year_level, quality_score DESC) WHERE is_active;
