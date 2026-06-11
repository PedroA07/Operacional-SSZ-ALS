-- Adiciona rastreamento de usuário nas tabelas devolucoes e liberacoes
ALTER TABLE devolucoes
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS user_id   TEXT;

ALTER TABLE liberacoes
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS user_id   TEXT;
