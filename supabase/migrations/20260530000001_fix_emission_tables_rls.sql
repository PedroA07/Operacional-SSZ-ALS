-- Fix: ordens_coleta (e tabelas de emissão relacionadas) têm RLS ativo bloqueando
-- inserts/selects. O app usa autenticação própria (tabela users), não Supabase Auth JWT,
-- então auth.role() é sempre 'anon' — RLS com políticas restritas bloqueia tudo.
-- Solução: desabilitar RLS e garantir GRANT explícito, igual ao padrão do projeto.

-- ordens_coleta
DROP POLICY IF EXISTS "Enable read access for all users" ON ordens_coleta;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON ordens_coleta;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON ordens_coleta;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON ordens_coleta;
ALTER TABLE ordens_coleta DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_coleta TO anon, authenticated;

-- pre_stacking_emissoes
DROP POLICY IF EXISTS "Enable read access for all users" ON pre_stacking_emissoes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON pre_stacking_emissoes;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON pre_stacking_emissoes;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON pre_stacking_emissoes;
ALTER TABLE pre_stacking_emissoes DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pre_stacking_emissoes TO anon, authenticated;

-- retiradas_cheio
DROP POLICY IF EXISTS "Enable read access for all users" ON retiradas_cheio;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON retiradas_cheio;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON retiradas_cheio;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON retiradas_cheio;
ALTER TABLE retiradas_cheio DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retiradas_cheio TO anon, authenticated;

-- coleta_order_index: garantir que a coluna existe (caso migration anterior não tenha rodado)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS coleta_order_index integer;
