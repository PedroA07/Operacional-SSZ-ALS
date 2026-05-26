-- ─────────────────────────────────────────────────────────────────────────────
-- Tabela para contratos de frete sem vínculo com OS (avulsos)
-- Contratos que não têm viagem correspondente no sistema
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS standalone_freight_contracts (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL,
  url         TEXT,
  file_name   TEXT NOT NULL,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  parsed_data JSONB
);

ALTER TABLE standalone_freight_contracts DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_standalone_fc_upload_date ON standalone_freight_contracts(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_standalone_fc_expires_at  ON standalone_freight_contracts(expires_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Adicionar colunas de motorista à tabela freight_contracts (se ainda não existirem)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE freight_contracts
  ADD COLUMN IF NOT EXISTS driver_id   TEXT,
  ADD COLUMN IF NOT EXISTS driver_name TEXT;

-- Desabilitar RLS na freight_contracts (bloqueava inserts do app)
ALTER TABLE freight_contracts DISABLE ROW LEVEL SECURITY;
