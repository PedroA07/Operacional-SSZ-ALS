-- Fix: form_history RLS was blocking inserts/selects with anon key.
-- This app uses a custom auth system (users table), not Supabase Auth JWT,
-- so auth.role() is always 'anon' — the previous policies blocked everything.

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

-- Remove old restrictive policies (if they exist)
DROP POLICY IF EXISTS "fh_select" ON form_history;
DROP POLICY IF EXISTS "fh_insert" ON form_history;
DROP POLICY IF EXISTS "fh_delete" ON form_history;

-- Disable RLS entirely — consistent with all other tables in this project
ALTER TABLE form_history DISABLE ROW LEVEL SECURITY;
