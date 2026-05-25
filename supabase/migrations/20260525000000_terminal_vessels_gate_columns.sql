-- Garante que a tabela terminal_vessels existe com todas as colunas necessárias,
-- incluindo gate_dry e gate_reefer que estavam faltando.

CREATE TABLE IF NOT EXISTS terminal_vessels (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal      TEXT        NOT NULL,
  navio         TEXT        NOT NULL,
  situacao      TEXT,
  previsao      TEXT,
  berco         TEXT,
  armador       TEXT,
  viagem        TEXT,
  rap           TEXT,
  agencia       TEXT,
  servico       TEXT,
  gate_dry      TEXT,
  gate_reefer   TEXT,
  dead_line_str TEXT,
  dt_prev_chegada TEXT,
  dt_chegada    TEXT,
  dt_prev_atrac TEXT,
  dt_atracacao  TEXT,
  dt_prev_saida TEXT,
  dt_saida      TEXT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adiciona colunas que podem estar faltando em tabelas já existentes
ALTER TABLE terminal_vessels ADD COLUMN IF NOT EXISTS gate_dry      TEXT;
ALTER TABLE terminal_vessels ADD COLUMN IF NOT EXISTS gate_reefer   TEXT;
ALTER TABLE terminal_vessels ADD COLUMN IF NOT EXISTS dead_line_str TEXT;
ALTER TABLE terminal_vessels ADD COLUMN IF NOT EXISTS rap           TEXT;
ALTER TABLE terminal_vessels ADD COLUMN IF NOT EXISTS agencia       TEXT;
ALTER TABLE terminal_vessels ADD COLUMN IF NOT EXISTS servico       TEXT;
ALTER TABLE terminal_vessels ADD COLUMN IF NOT EXISTS dt_prev_chegada TEXT;
ALTER TABLE terminal_vessels ADD COLUMN IF NOT EXISTS dt_chegada    TEXT;
ALTER TABLE terminal_vessels ADD COLUMN IF NOT EXISTS dt_prev_atrac TEXT;
ALTER TABLE terminal_vessels ADD COLUMN IF NOT EXISTS dt_atracacao  TEXT;
ALTER TABLE terminal_vessels ADD COLUMN IF NOT EXISTS dt_prev_saida TEXT;
ALTER TABLE terminal_vessels ADD COLUMN IF NOT EXISTS dt_saida      TEXT;

CREATE INDEX IF NOT EXISTS idx_terminal_vessels_terminal   ON terminal_vessels(terminal);
CREATE INDEX IF NOT EXISTS idx_terminal_vessels_fetched_at ON terminal_vessels(fetched_at DESC);

ALTER TABLE terminal_vessels DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terminal_vessels TO anon, authenticated, service_role;
