
-- 1. ATUALIZAÇÃO DO ENUM (Resolve o Erro 400)
-- Rode estes comandos para permitir os novos textos no banco de dados
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Chegou no Cragea';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Aguardando carregar';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Saiu do Cragea';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Chegou na Volkswagen';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Saiu da Volkswagen';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Container sobre rodas';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Aguardando para Descarregar';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Descarregando';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Aguardando baixar o Vazio';

-- 2. ÍNDICES DE PERFORMANCE (Opcional, mas melhora a velocidade)
-- Criar índices só se eles não existirem (Postgres 9.5+)
CREATE INDEX IF NOT EXISTS idx_trips_os_search ON trips (os);
CREATE INDEX IF NOT EXISTS idx_trips_status_filter ON trips (status);
CREATE INDEX IF NOT EXISTS idx_trips_date_sort ON trips (date_time DESC);
CREATE INDEX IF NOT EXISTS idx_stay_records_session_id ON stay_records (session_id);
