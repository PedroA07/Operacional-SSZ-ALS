CREATE TABLE IF NOT EXISTS form_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_type TEXT NOT NULL,
  form_data JSONB NOT NULL,
  label TEXT,
  user_name TEXT,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS form_history_type_created_idx ON form_history(form_type, created_at DESC);
