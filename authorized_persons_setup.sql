-- Pessoas autorizadas: cadastro de responsáveis selecionáveis nos memorandos
-- (ex.: Liberação de Lacres). Rodar no SQL Editor do Supabase.
CREATE TABLE IF NOT EXISTS pessoas_autorizadas (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  cpf        TEXT,
  rg         TEXT,
  veiculo    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pessoas_autorizadas_name ON pessoas_autorizadas(name);
ALTER TABLE pessoas_autorizadas DISABLE ROW LEVEL SECURITY;
