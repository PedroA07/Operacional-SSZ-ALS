
-- RODE ESTE BLOCO NO SQL EDITOR DO SUPABASE PARA CORRIGIR OS STATUS (ERRO 400)

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status') THEN
        -- Adiciona todos os valores que podem estar faltando
        BEGIN ALTER TYPE trip_status ADD VALUE 'Chegou no Cragea'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Aguardando carregar'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Saiu do Cragea'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Chegou na Volkswagen'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Saiu da Volkswagen'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Container sobre rodas'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Aguardando para Descarregar'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Descarregando'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Aguardando baixar o Vazio'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Pendente'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Retirada de vazio'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Retirada do cheio'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Em viagem'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Chegou no cliente'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Pegou NF'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Saiu do cliente'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Chegou no destino'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Devolução do cheio'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Viagem concluída'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE trip_status ADD VALUE 'Viagem cancelada'; EXCEPTION WHEN duplicate_object THEN null; END;
    END IF;
END
$$;
