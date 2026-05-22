-- ============================================================
-- EXECUTE ESTE SCRIPT COMPLETO NO SUPABASE SQL EDITOR
-- Resolve: form_history (RLS + 401), trips agencia (400), automations (401)
-- ============================================================

-- 1. FORM_HISTORY — garantir tabela existe e desabilitar RLS
CREATE TABLE IF NOT EXISTS form_history (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  form_type  TEXT        NOT NULL,
  form_data  JSONB       NOT NULL,
  label      TEXT,
  user_name  TEXT,
  user_id    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS form_history_type_created_idx
  ON form_history(form_type, created_at DESC);

DROP POLICY IF EXISTS "fh_select" ON form_history;
DROP POLICY IF EXISTS "fh_insert" ON form_history;
DROP POLICY IF EXISTS "fh_delete" ON form_history;

ALTER TABLE form_history DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_history TO anon, authenticated;

-- 2. TRIPS — adicionar coluna agencia (causava erro 400 ao salvar)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS agencia TEXT;
CREATE INDEX IF NOT EXISTS idx_trips_agencia ON trips (agencia);

-- 3. AUTOMATIONS — criar tabela (não existia) e conceder permissões para anon
CREATE TABLE IF NOT EXISTS automations (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  status             TEXT        NOT NULL,
  email_template_id  TEXT,
  whatsapp_group_id  TEXT,
  is_active          BOOLEAN     DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automations_status ON automations (status);
ALTER TABLE automations DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automations TO anon, authenticated;

-- Verificação final
SELECT
  (SELECT COUNT(*) FROM form_history)           AS form_history_rows,
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'form_history') AS form_history_rls,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'trips' AND column_name = 'agencia') AS trips_has_agencia;
