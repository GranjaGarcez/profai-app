-- Gravação ATÓMICA da cotação manual de uma pergunta + REGISTO de alterações.
-- Corrige a corrida "ler-modificar-gravar" que revertia alterações manuais e
-- desacertava o total: faz tudo num único UPDATE, com FOR UPDATE a serializar
-- gravações concorrentes na mesma submissão, e recalcula o total pela SOMA de
-- todas as perguntas (fonte de verdade, sem deriva). Incrementa um contador de
-- revisões (rev) e acrescenta ao histórico (log: quem, quando, de→para) da pergunta.
-- Corre com os direitos do professor (RLS aplica-se).
create or replace function profai_set_question_grade(
  p_id uuid,
  p_qkey text,
  p_score numeric,
  p_max numeric,
  p_feedback text default null,
  p_notes text default null,
  p_by text default null
) returns numeric
language plpgsql
as $$
declare
  d jsonb;
  q jsonb;
  new_total numeric;
  rev int;
  old_score numeric;
  logarr jsonb;
  entry jsonb;
begin
  select coalesce(grading_details, '{}'::jsonb) into d
    from exam_submissions where id = p_id for update;
  if d is null then
    raise exception 'submissão não encontrada';
  end if;

  q := coalesce(d -> p_qkey, '{}'::jsonb);
  old_score := nullif(q ->> 'score', '')::numeric;
  rev := coalesce(nullif(q ->> 'rev', '')::int, 0) + 1;

  -- Entrada do histórico desta alteração.
  entry := jsonb_build_object(
    'at', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'from', old_score,
    'to', p_score
  );
  if p_by is not null then entry := entry || jsonb_build_object('by', p_by); end if;

  logarr := coalesce(q -> 'log', '[]'::jsonb) || entry;
  -- Mantém só as últimas 20 entradas (ordem cronológica).
  if jsonb_array_length(logarr) > 20 then
    select jsonb_agg(e order by rn) into logarr
      from (select e, row_number() over () rn, count(*) over () cnt
              from jsonb_array_elements(logarr) e) s
     where rn > cnt - 20;
  end if;

  q := q || jsonb_build_object(
    'score', p_score, 'max', p_max, 'auto', false, 'manual', true, 'rev', rev, 'log', logarr
  );
  if p_feedback is not null then
    q := q || jsonb_build_object('feedback', p_feedback);
  end if;
  d := d || jsonb_build_object(p_qkey, q);

  select coalesce(sum((v.value ->> 'score')::numeric), 0) into new_total
    from jsonb_each(d) as v where (v.value ? 'score');

  update exam_submissions
     set grading_details = d,
         total_score = new_total,
         status = 'reviewed',
         graded_at = now(),
         teacher_notes = coalesce(p_notes, teacher_notes)
   where id = p_id;

  return new_total;
end;
$$;
