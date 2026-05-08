-- =============================================================================
-- Scripts SQL para atualização do banco de dados ALS
-- Execute no console SQL do Supabase (separado por seções se necessário)
-- =============================================================================

-- =============================================================================
-- 1. Novas colunas na tabela 'trips'
-- =============================================================================
ALTER TABLE trips ADD COLUMN IF NOT EXISTS sent_nf              BOOLEAN DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_scheduled         BOOLEAN DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduled_location_id TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduled_date_time  TIMESTAMP WITH TIME ZONE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduling           JSONB;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS has_advance          BOOLEAN DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS bu                   TEXT;

-- Garantir tipo TEXT (caso já exista como UUID)
ALTER TABLE trips ALTER COLUMN scheduled_location_id TYPE TEXT USING scheduled_location_id::TEXT;

-- =============================================================================
-- 1.5 Corrigir colunas JSONB (tolerante a strings vazias já gravadas)
-- =============================================================================
ALTER TABLE trips ALTER COLUMN status_history TYPE JSONB
  USING (CASE WHEN status_history IS NULL OR status_history::text = '' THEN '[]'::JSONB ELSE status_history::JSONB END);

ALTER TABLE trips ALTER COLUMN driver_docs TYPE JSONB
  USING (CASE WHEN driver_docs IS NULL OR driver_docs::text = '' THEN '[]'::JSONB ELSE driver_docs::JSONB END);

ALTER TABLE trips ALTER COLUMN oc_form_data TYPE JSONB
  USING (CASE WHEN oc_form_data IS NULL OR oc_form_data::text = '' THEN '{}'::JSONB ELSE oc_form_data::JSONB END);

ALTER TABLE trips ALTER COLUMN advance_payment TYPE JSONB
  USING (CASE WHEN advance_payment IS NULL OR advance_payment::text = '' THEN '{"status":"BLOQUEADO"}'::JSONB ELSE advance_payment::JSONB END);

ALTER TABLE trips ALTER COLUMN balance_payment TYPE JSONB
  USING (CASE WHEN balance_payment IS NULL OR balance_payment::text = '' THEN '{"status":"AGUARDANDO_DOCS"}'::JSONB ELSE balance_payment::JSONB END);

ALTER TABLE trips ALTER COLUMN pre_stacking_form_data TYPE JSONB
  USING (CASE WHEN pre_stacking_form_data IS NULL OR pre_stacking_form_data::text = '' THEN '{}'::JSONB ELSE pre_stacking_form_data::JSONB END);

-- =============================================================================
-- 2. Índices para desempenho
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_trips_date_time ON trips(date_time);
CREATE INDEX IF NOT EXISTS idx_trips_status    ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_type      ON trips(type);

-- =============================================================================
-- 3. Documentação de colunas
-- =============================================================================
COMMENT ON COLUMN trips.sent_nf              IS 'Indica se a Nota Fiscal foi enviada';
COMMENT ON COLUMN trips.is_scheduled         IS 'Indica se a viagem está agendada';
COMMENT ON COLUMN trips.scheduled_location_id IS 'ID do local de agendamento (Porto ou Pre-Stacking)';
COMMENT ON COLUMN trips.scheduled_date_time  IS 'Data e hora do agendamento realizado';
COMMENT ON COLUMN trips.has_advance          IS 'Indica se o adiantamento de 70% foi realizado';

-- =============================================================================
-- 4. Tabela: coleta_tipos_viagem
-- =============================================================================
CREATE TABLE IF NOT EXISTS coleta_tipos_viagem (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE coleta_tipos_viagem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ctv_select" ON coleta_tipos_viagem;
CREATE POLICY "ctv_select" ON coleta_tipos_viagem FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ctv_insert" ON coleta_tipos_viagem;
CREATE POLICY "ctv_insert" ON coleta_tipos_viagem FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ctv_update" ON coleta_tipos_viagem;
CREATE POLICY "ctv_update" ON coleta_tipos_viagem FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ctv_delete" ON coleta_tipos_viagem;
CREATE POLICY "ctv_delete" ON coleta_tipos_viagem FOR DELETE USING (auth.role() = 'authenticated');

-- =============================================================================
-- 5. Tabela: system_settings
-- =============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id         TEXT PRIMARY KEY,
  key        TEXT UNIQUE NOT NULL,
  value      JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ss_select" ON system_settings;
CREATE POLICY "ss_select" ON system_settings FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ss_insert" ON system_settings;
CREATE POLICY "ss_insert" ON system_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ss_update" ON system_settings;
CREATE POLICY "ss_update" ON system_settings FOR UPDATE USING (auth.role() = 'authenticated');

-- =============================================================================
-- 6. Tabela: form_history  (histórico de formulários emitidos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS form_history (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  form_type  TEXT        NOT NULL,
  form_data  JSONB       NOT NULL,
  label      TEXT,
  user_name  TEXT,
  user_id    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS form_history_type_created_idx ON form_history(form_type, created_at DESC);

ALTER TABLE form_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fh_select" ON form_history;
CREATE POLICY "fh_select" ON form_history FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "fh_insert" ON form_history;
CREATE POLICY "fh_insert" ON form_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "fh_delete" ON form_history;
CREATE POLICY "fh_delete" ON form_history FOR DELETE USING (auth.role() = 'authenticated');

-- =============================================================================
-- 7. Coluna: notification_prefs em users
-- =============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB;

-- =============================================================================
-- 8. Tabela: handover_posts  (Passagem de Serviço)
-- =============================================================================
CREATE TABLE IF NOT EXISTS handover_posts (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  content     TEXT        NOT NULL,
  author_id   TEXT        NOT NULL,
  author_name TEXT        NOT NULL,
  author_photo TEXT,
  author_role TEXT,
  mentions    JSONB       DEFAULT '[]'::JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS handover_posts_created_idx ON handover_posts(created_at DESC);

ALTER TABLE handover_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hp_select" ON handover_posts;
CREATE POLICY "hp_select" ON handover_posts FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "hp_insert" ON handover_posts;
CREATE POLICY "hp_insert" ON handover_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "hp_delete" ON handover_posts;
CREATE POLICY "hp_delete" ON handover_posts
  FOR DELETE USING (auth.uid()::text = author_id OR auth.role() = 'service_role');

-- =============================================================================
-- 9. RETENÇÃO DE 90 DIAS  (form_history + notifications)
--
--    Opção A — Limpeza manual / pontual (execute quando quiser purgar):
-- =============================================================================
-- DELETE FROM form_history  WHERE created_at < NOW() - INTERVAL '90 days';
-- DELETE FROM notifications WHERE timestamp  < NOW() - INTERVAL '90 days';

-- =============================================================================
--    Opção B — Limpeza automática via pg_cron (rode UMA VEZ para agendar)
--    Requer extensão pg_cron habilitada no projeto Supabase.
--    Habilite em: Dashboard → Database → Extensions → pg_cron
-- =============================================================================
-- SELECT cron.schedule(
--   'purge-history-90d',
--   '0 3 * * *',   -- toda madrugada às 03:00 UTC
--   $$
--     DELETE FROM form_history  WHERE created_at < NOW() - INTERVAL '90 days';
--     DELETE FROM notifications WHERE timestamp  < NOW() - INTERVAL '90 days';
--   $$
-- );

-- Para verificar jobs agendados:
-- SELECT * FROM cron.job;

-- Para remover o job se precisar recriar:
-- SELECT cron.unschedule('purge-history-90d');
