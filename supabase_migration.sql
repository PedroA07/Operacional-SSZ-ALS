
-- RODE ESTE BLOCO NO SQL EDITOR DO SUPABASE PARA CORRIGIR OS STATUS

-- 1. Adicionar novos valores ao ENUM existente (se ele já existir)
-- Nota: Postgres não suporta 'IF NOT EXISTS' no ALTER TYPE ADD VALUE antes da v12 de forma simples, 
-- mas aqui usamos a sintaxe padrão que o Supabase aceita.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status') THEN
        -- Lista de todos os status necessários para a aplicação
        -- Se o valor já existir, o Postgres ignorará ou dará um erro não-crítico
        BEGIN ALTER TYPE trip_status ADD VALUE 'Chegou no Cragea'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Aguardando carregar'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Saiu do Cragea'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Chegou na Volkswagen'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Saiu da Volkswagen'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Container sobre rodas'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Aguardando para Descarregar'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Descarregando'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Aguardando baixar o Vazio'; EXCEPTION WHEN duplicate_object THEN null; END;
    END IF;
END
$$;

-- 2. Garantir que os índices existam (sem recriar tabelas)
CREATE INDEX IF NOT EXISTS idx_trips_os_search ON trips (os);
CREATE INDEX IF NOT EXISTS idx_trips_status_filter ON trips (status);
CREATE INDEX IF NOT EXISTS idx_trips_date_sort ON trips (date_time DESC);
CREATE INDEX IF NOT EXISTS idx_stay_records_session_id ON stay_records (session_id);
