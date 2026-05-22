-- Dedicated emission tables for each form type.
-- Replaces the generic form_history approach: each form now has its own
-- table, consistent with how devolucoes and liberacoes already work.

CREATE TABLE IF NOT EXISTS ordens_coleta (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  os          TEXT,
  container   TEXT,
  booking     TEXT,
  form_data   JSONB       NOT NULL,
  user_name   TEXT,
  user_id     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ordens_coleta_created ON ordens_coleta (created_at DESC);
ALTER TABLE ordens_coleta DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_coleta TO anon, authenticated;

CREATE TABLE IF NOT EXISTS pre_stacking_emissoes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  os          TEXT,
  container   TEXT,
  booking     TEXT,
  form_data   JSONB       NOT NULL,
  user_name   TEXT,
  user_id     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pre_stacking_emissoes_created ON pre_stacking_emissoes (created_at DESC);
ALTER TABLE pre_stacking_emissoes DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pre_stacking_emissoes TO anon, authenticated;

CREATE TABLE IF NOT EXISTS retiradas_cheio (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  container   TEXT,
  booking     TEXT,
  ship        TEXT,
  form_data   JSONB       NOT NULL,
  user_name   TEXT,
  user_id     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_retiradas_cheio_created ON retiradas_cheio (created_at DESC);
ALTER TABLE retiradas_cheio DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retiradas_cheio TO anon, authenticated;
