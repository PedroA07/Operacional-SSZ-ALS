-- Add agencia column to trips (was missing, causing 400 errors on save)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS agencia TEXT;
CREATE INDEX IF NOT EXISTS idx_trips_agencia ON trips (agencia);

-- Create automations table if it doesn't exist, then grant access for anon role
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

-- Also ensure form_history is accessible (belt-and-suspenders alongside the RLS disable)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_history TO anon, authenticated;
