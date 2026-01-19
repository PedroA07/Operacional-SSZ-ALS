
-- 1. CRIAÇÃO DE ÍNDICES PARA PERFORMANCE MÁXIMA
-- Otimiza a busca por data e status ao mesmo tempo (comum no Overview)
CREATE INDEX IF NOT EXISTS idx_trips_performance ON trips (date_time, status);
CREATE INDEX IF NOT EXISTS idx_trips_os_upper ON trips (upper(os));
CREATE INDEX IF NOT EXISTS idx_drivers_cpf_clean ON drivers (replace(cpf, '.', ''));

-- 2. HABILITAR REALTIME (SINTAXE CORRETA POSTGRESQL)
-- Se você quer habilitar para tabelas específicas (Recomendado):
ALTER PUBLICATION supabase_realtime SET TABLE trips, drivers, notifications;

-- Se você realmente quiser todas as tabelas do schema public (Sintaxe correta sem o "FOR"):
-- ALTER PUBLICATION supabase_realtime SET ALL TABLES;
