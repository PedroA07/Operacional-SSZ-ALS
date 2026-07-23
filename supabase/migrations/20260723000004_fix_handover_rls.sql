-- ============================================================================
-- FIX RLS — tabelas do Feed de Atividades (Passagem de Serviço) bloqueando
-- INSERT com 401 ("new row violates row-level security policy for table
-- handover_posts").
--
-- O app usa autenticação própria (tabela users), não o Supabase Auth JWT,
-- então auth.role() é sempre 'anon'. Com RLS ativo e políticas restritas, todo
-- INSERT/SELECT é bloqueado. Padrão do projeto: desabilitar RLS + GRANT explícito.
--
-- Idempotente: pode rodar quantas vezes precisar.
-- ============================================================================

DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'handover_posts',
    'handover_comments',
    'duty_swap_requests',
    'system_settings'
  ] LOOP
    -- só age se a tabela existir
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      -- remove todas as políticas existentes da tabela
      FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
      END LOOP;

      -- desabilita RLS e concede acesso ao anon/authenticated
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t
      );
    END IF;
  END LOOP;
END $$;
