-- ============================================================================
-- FIX RLS — tabelas de emissão/histórico bloqueando INSERT com 401
-- ("new row violates row-level security policy for table ...")
--
-- O app usa autenticação própria (tabela users), não o Supabase Auth JWT,
-- então auth.role() é sempre 'anon'. Com RLS ativo e políticas restritas, todo
-- INSERT/SELECT é bloqueado. Padrão do projeto: desabilitar RLS + GRANT explícito.
--
-- Idempotente: pode rodar quantas vezes precisar. Cobre ordens_coleta,
-- form_history e as demais tabelas de emissão.
-- ============================================================================

DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'form_history',
    'ordens_coleta',
    'pre_stacking_emissoes',
    'retiradas_cheio',
    'devolucoes',
    'liberacoes'
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
