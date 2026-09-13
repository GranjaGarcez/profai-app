-- Chaves de API pessoais dos professores ("traz a tua própria chave", 2026-09-13).
-- A chave é guardada CIFRADA (AES-256-GCM, app-side) em key_ciphertext — nunca em texto
-- simples. Uma chave activa por professor (o interruptor liga/desliga; trocar de
-- fornecedor substitui a linha). RLS sem políticas para authenticated/anon: só o
-- service_role (rotas de API server-side) acede — o texto cifrado nunca chega ao browser.

CREATE TABLE IF NOT EXISTS user_api_keys (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider       TEXT NOT NULL CHECK (provider IN ('anthropic','google','openai')),
  model          TEXT NOT NULL,
  key_ciphertext TEXT NOT NULL,
  key_last4      TEXT NOT NULL,
  enabled        BOOLEAN NOT NULL DEFAULT true,
  last_ok_at     TIMESTAMPTZ,
  last_error     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_uak_user ON user_api_keys (user_id) WHERE enabled;

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
-- Sem políticas: authenticated/anon não lêem nem escrevem. Todo o acesso é via
-- service_role nas rotas /api/user/ai-keys, que nunca devolvem key_ciphertext ao cliente.
