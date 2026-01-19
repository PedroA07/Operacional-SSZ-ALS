
-- 1. ÍNDICES PARA CONTADORES RÁPIDOS
CREATE INDEX IF NOT EXISTS idx_trips_date_status_cat ON trips (date_time, status, category);

-- 2. CONFIGURAÇÃO DE REPLICAÇÃO SEM ERROS
-- O comando SET TABLE redefine a lista, evitando o erro 42710 (já existente)
ALTER PUBLICATION supabase_realtime SET TABLE trips, drivers, staff, notifications;
