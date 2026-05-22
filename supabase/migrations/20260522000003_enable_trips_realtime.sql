-- Habilita REPLICA IDENTITY FULL e adiciona trips à publicação do Supabase Realtime.
-- Sem isso, a subscription postgres_changes não dispara para outros usuários
-- quando uma viagem é alterada (ex: remoção do painel de Coleta ou Organização).

ALTER TABLE trips REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'trips'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE trips;
  END IF;
END $$;
