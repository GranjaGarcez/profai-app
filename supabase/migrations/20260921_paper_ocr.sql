-- Correção de provas em papel (OCR) — colunas ADITIVAS, não-destrutivas.
-- Não altera colunas existentes nem o fluxo digital.

alter table public.exam_submissions
  add column if not exists source text not null default 'digital',
  add column if not exists ocr_details jsonb,
  add column if not exists writing_analysis jsonb;

-- 'digital' (exame online) | 'paper' (foto + OCR)
comment on column public.exam_submissions.source is 'Origem da submissão: digital | paper';
comment on column public.exam_submissions.ocr_details is 'Resultado do OCR por questão (texto, confiança, ilegibilidade) — só source=paper';
comment on column public.exam_submissions.writing_analysis is 'Análise não-pontuável de erros de escrita (perfil ortográfico)';
