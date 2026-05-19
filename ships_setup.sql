CREATE TABLE IF NOT EXISTS ships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  imo         TEXT,
  armador     TEXT,
  viagem      TEXT,
  terminal    TEXT,
  berco       TEXT,
  eta         TEXT,
  etd         TEXT,
  status      TEXT NOT NULL DEFAULT 'EM TRÂNSITO',
  observacoes TEXT,
  trip_ids    TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ships_status   ON ships(status);
CREATE INDEX IF NOT EXISTS idx_ships_terminal ON ships(terminal);
ALTER TABLE ships DISABLE ROW LEVEL SECURITY;
