-- Add agencia column to trips (was missing, causing 400 errors on save)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS agencia TEXT;
CREATE INDEX IF NOT EXISTS idx_trips_agencia ON trips (agencia);

-- Grant access to automations table for anon role (was causing 401 errors)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automations TO anon, authenticated;

-- Also ensure form_history is accessible (belt-and-suspenders alongside the RLS disable)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_history TO anon, authenticated;
