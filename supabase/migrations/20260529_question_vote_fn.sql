-- Função atómica para registar voto e actualizar quality_score
-- Trata nova votação E mudança de voto (desfaz efeito anterior)
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
BEGIN
  -- Verificar se já existe voto anterior deste professor
  SELECT vote INTO old_vote
  FROM question_feedback
  WHERE question_id = p_question_id AND teacher_id = p_teacher_id;

  -- Calcular delta: 👍 = +0.05 | 👎 = -0.10
  delta := CASE WHEN p_vote = 1 THEN 0.05 ELSE -0.10 END;

  -- Se já havia voto, desfazer o seu efeito antes de aplicar o novo
  IF old_vote IS NOT NULL THEN
    delta := delta - CASE WHEN old_vote = 1 THEN 0.05 ELSE -0.10 END;
  END IF;

  -- Registar (ou actualizar) o voto
  INSERT INTO question_feedback (question_id, teacher_id, vote)
  VALUES (p_question_id, p_teacher_id, p_vote)
  ON CONFLICT (question_id, teacher_id)
  DO UPDATE SET vote = EXCLUDED.vote;

  -- Actualizar quality_score (limitado a [0, 1])
  UPDATE question_bank
  SET quality_score = GREATEST(0, LEAST(1, quality_score + delta))
  WHERE id = p_question_id
  RETURNING quality_score INTO new_score;

  RETURN COALESCE(new_score, 0);
END;
$$;

-- RLS: só o service role pode invocar esta função (chamada pelo API server-side)
REVOKE EXECUTE ON FUNCTION apply_question_vote FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION apply_question_vote TO service_role;
