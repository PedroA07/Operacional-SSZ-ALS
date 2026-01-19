
-- 1. CRIAÇÃO DE ÍNDICES PARA BUSCAS RÁPIDAS (OVERVIEW E FILTROS)
-- Melhora drasticamente a performance dos filtros de data e status
CREATE INDEX IF NOT EXISTS idx_trips_date_time ON trips (date_time);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips (status);
CREATE INDEX IF NOT EXISTS idx_trips_os ON trips (os);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers (status);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications (timestamp DESC);

-- 2. HABILITAR REPLICAÇÃO REALTIME PARA AS TABELAS CRÍTICAS
-- O comando 'SET TABLE' substitui a lista atual da publicação pelas tabelas informadas.
-- Isso evita o erro de "tabela já existe na publicação" que o 'ADD TABLE' daria.
ALTER PUBLICATION supabase_realtime SET TABLE trips, drivers, notifications;

-- 3. OPCIONAL: SE VOCÊ REALMENTE QUISER TODAS AS TABELAS DO BANCO NO REALTIME
-- O comando correto (sem a palavra FOR) é:
-- ALTER PUBLICATION supabase_realtime SET ALL TABLES;
