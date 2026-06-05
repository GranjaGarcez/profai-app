-- ============================================================================
-- PROF.IA — Pipeline de Qualidade (sessão 6, 2026-06-05)
-- Inspirado em orchestrator.py + validator.py + schema.sql (upload do Tiago)
-- Aplicar no Supabase Dashboard → SQL Editor → Run
-- ============================================================================

-- 1. FONTE DE VERDADE CURRICULAR (Aprendizagens Essenciais / DGE)
--    NUNCA gerada pelo modelo. Carregada a partir dos documentos oficiais.
--    Tabela inicialmente vazia — populada pelo seeder curriculo_ae_seed.ts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curriculo_ae (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    disciplina        text NOT NULL,
    ano               int  NOT NULL CHECK (ano BETWEEN 1 AND 12),
    dominio           text NOT NULL,
    subdominio        text,
    ae_codigo         text NOT NULL UNIQUE,        -- chave de ancoragem (ex: MAT5.NUM.01)
    ae_descritor      text NOT NULL,               -- texto literal da AE (fonte DGE)
    verbos_cognitivos text[] NOT NULL DEFAULT '{}', -- verbos cognitivos admissíveis
    bloom_nivel_alvo  text,                        -- nível de Bloom típico da AE
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ae_disc_ano ON curriculo_ae (disciplina, ano, dominio);

-- RLS: leitura pública para utilizadores autenticados (verdade curricular é partilhada)
ALTER TABLE curriculo_ae ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "ae_read" ON curriculo_ae FOR SELECT TO authenticated USING (true);

-- 2. MELHORIAS AO question_bank EXISTENTE
--    Adiciona colunas compatíveis com o pipeline de qualidade — sem breaking changes
-- ---------------------------------------------------------------------------

-- 2a. Versão do item: A (original) ou B (adaptação não significativa / ACNS para NEE)
ALTER TABLE question_bank
    ADD COLUMN IF NOT EXISTS versao char(1) NOT NULL DEFAULT 'A'
        CHECK (versao IN ('A', 'B'));

-- 2b. Referência à AE (nullable — preenchida quando disponível)
ALTER TABLE question_bank
    ADD COLUMN IF NOT EXISTS ae_codigo text REFERENCES curriculo_ae(ae_codigo)
        ON DELETE SET NULL;

-- 2c. Critérios de correcção graduais (JSONB; estrutura: [{nivel, descritor, pontos}])
--     Coexiste com mark_scheme (string) — mais rico, usado progressivamente
ALTER TABLE question_bank
    ADD COLUMN IF NOT EXISTS criterios_correcao jsonb;

-- 2d. Aprovação explícita pelo professor (começa false; 👍 → true)
--     Substitui progressivamente a heurística quality_score ≥ 0.8
ALTER TABLE question_bank
    ADD COLUMN IF NOT EXISTS validado boolean NOT NULL DEFAULT false;

-- 2e. Distribuição de Bloom declarada na geração (para análise de cobertura)
ALTER TABLE question_bank
    ADD COLUMN IF NOT EXISTS bloom_nivel_normalizado text
        CHECK (bloom_nivel_normalizado IN (
            'Lembrar','Compreender','Aplicar','Analisar','Avaliar','Criar'
        ));

-- 2f. Link Versão B → Versão A (ACNS)
ALTER TABLE question_bank
    ADD COLUMN IF NOT EXISTS item_par_id uuid REFERENCES question_bank(id)
        ON DELETE SET NULL;

-- Índice para seleção por versão validada
CREATE INDEX IF NOT EXISTS idx_qb_validado ON question_bank (validado) WHERE validado = true;
CREATE INDEX IF NOT EXISTS idx_qb_bloom    ON question_bank (bloom_nivel_normalizado);

-- 3. CONSTRAINT BD: Versão B não pode baixar bloom_nivel nem cotação
--    (última linha de defesa — garantia estrutural, não só esperança de qualidade)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_versao_b_qb()
RETURNS trigger AS $$
DECLARE a_item question_bank%ROWTYPE;
BEGIN
    IF NEW.versao = 'B' THEN
        IF NEW.item_par_id IS NULL THEN
            RAISE EXCEPTION 'Versão B sem item_par_id (Versão A de origem obrigatória).';
        END IF;
        SELECT * INTO a_item FROM question_bank WHERE id = NEW.item_par_id;
        IF a_item.bloom_nivel_normalizado IS NOT NULL
           AND NEW.bloom_nivel_normalizado IS NOT NULL
           AND a_item.bloom_nivel_normalizado <> NEW.bloom_nivel_normalizado THEN
            RAISE EXCEPTION 'Versão B baixou nível cognitivo (%) → (%) — adaptação redutora proibida.',
                a_item.bloom_nivel_normalizado, NEW.bloom_nivel_normalizado;
        END IF;
        IF a_item.points <> NEW.points THEN
            RAISE EXCEPTION 'Versão B alterou cotação (% → %) — adaptação redutora proibida.',
                a_item.points, NEW.points;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_versao_b_qb ON question_bank;
CREATE TRIGGER trg_versao_b_qb
    BEFORE INSERT OR UPDATE ON question_bank
    FOR EACH ROW EXECUTE FUNCTION fn_check_versao_b_qb();

-- 4. VIEW de cobertura Bloom por disciplina/ano (qualidade a olho nu no dashboard)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_bloom_coverage AS
SELECT
    subject,
    year_level,
    bloom_nivel_normalizado AS bloom_nivel,
    COUNT(*)                AS n_itens,
    ROUND(AVG(quality_score)::numeric, 2) AS quality_avg
FROM question_bank
WHERE is_active AND bloom_nivel_normalizado IS NOT NULL
GROUP BY subject, year_level, bloom_nivel_normalizado
ORDER BY subject, year_level,
    ARRAY_POSITION(ARRAY['Lembrar','Compreender','Aplicar','Analisar','Avaliar','Criar'],
                   bloom_nivel_normalizado);
