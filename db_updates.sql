-- Scripts SQL para atualização do banco de dados ALS
-- Execute estes comandos no seu console do Supabase ou PostgreSQL

-- 1. Adicionar novas colunas à tabela 'trips'
ALTER TABLE trips ADD COLUMN IF NOT EXISTS sent_nf BOOLEAN DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduled_location_id UUID;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduled_date_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS has_advance BOOLEAN DEFAULT FALSE;

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
