-- Habilita REPLICA IDENTITY FULL e adiciona devolucoes e customers à publicação
-- do Supabase Realtime, para que o Portal do Cliente (usuário externo) atualize
-- em tempo real quando essas tabelas forem alteradas.

ALTER TABLE devolucoes REPLICA IDENTITY FULL;
ALTER TABLE customers  REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'devolucoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE devolucoes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'customers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE customers;
  END IF;
END $$;
