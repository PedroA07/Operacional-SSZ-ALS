
-- Otimização para os KPIs da ALS Transportes
-- Execute estes comandos no seu Editor SQL do Supabase

-- Índice para busca rápida por data e OS
CREATE INDEX IF NOT EXISTS idx_trips_date_lookup ON trips (date_time, os);

-- Índice para busca rápida por status e motorista
CREATE INDEX IF NOT EXISTS idx_trips_status_driver ON trips (status, (driver->>'id'));

-- Índice para otimizar filtros da categoria
CREATE INDEX IF NOT EXISTS idx_trips_category ON trips (category);
