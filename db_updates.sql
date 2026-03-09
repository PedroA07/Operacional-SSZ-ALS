-- Scripts SQL para atualização do banco de dados ALS
-- Execute estes comandos no seu console do Supabase ou PostgreSQL

-- 1. Adicionar novas colunas à tabela 'trips'
ALTER TABLE trips ADD COLUMN IF NOT EXISTS sent_nf BOOLEAN DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduled_location_id TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduled_date_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduling JSONB;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS has_advance BOOLEAN DEFAULT FALSE;

-- Se a coluna scheduled_location_id já existir como UUID, mude para TEXT
ALTER TABLE trips ALTER COLUMN scheduled_location_id TYPE TEXT USING scheduled_location_id::TEXT;

-- 1.5 Corrigir tipos de colunas para JSONB (com tratamento de erros para strings vazias)
ALTER TABLE trips ALTER COLUMN status_history TYPE JSONB USING (CASE WHEN status_history IS NULL OR status_history = '' THEN '[]'::JSONB ELSE status_history::JSONB END);
ALTER TABLE trips ALTER COLUMN driver_docs TYPE JSONB USING (CASE WHEN driver_docs IS NULL OR driver_docs = '' THEN '[]'::JSONB ELSE driver_docs::JSONB END);
ALTER TABLE trips ALTER COLUMN oc_form_data TYPE JSONB USING (CASE WHEN oc_form_data IS NULL OR oc_form_data = '' THEN '{}'::JSONB ELSE oc_form_data::JSONB END);
ALTER TABLE trips ALTER COLUMN advance_payment TYPE JSONB USING (CASE WHEN advance_payment IS NULL OR advance_payment = '' THEN '{"status": "BLOQUEADO"}'::JSONB ELSE advance_payment::JSONB END);
ALTER TABLE trips ALTER COLUMN balance_payment TYPE JSONB USING (CASE WHEN balance_payment IS NULL OR balance_payment = '' THEN '{"status": "AGUARDANDO_DOCS"}'::JSONB ELSE balance_payment::JSONB END);
ALTER TABLE trips ALTER COLUMN pre_stacking_form_data TYPE JSONB USING (CASE WHEN pre_stacking_form_data IS NULL OR pre_stacking_form_data = '' THEN '{}'::JSONB ELSE pre_stacking_form_data::JSONB END);

-- 2. Criar índices para otimizar as buscas por data e status (usados na aba Organização)
CREATE INDEX IF NOT EXISTS idx_trips_date_time ON trips(date_time);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_type ON trips(type);

-- 3. Comentários para documentação
COMMENT ON COLUMN trips.sent_nf IS 'Indica se a Nota Fiscal foi enviada';
COMMENT ON COLUMN trips.is_scheduled IS 'Indica se a viagem está agendada';
COMMENT ON COLUMN trips.scheduled_location_id IS 'ID do local de agendamento (Porto ou Pre-Stacking)';
COMMENT ON COLUMN trips.scheduled_date_time IS 'Data e hora do agendamento realizado';
COMMENT ON COLUMN trips.has_advance IS 'Indica se o adiantamento de 70% foi realizado';
