-- Garante que a coluna id da tabela trips tem DEFAULT gen_random_uuid()
-- para que INSERTs sem id explícito funcionem corretamente.
ALTER TABLE trips ALTER COLUMN id SET DEFAULT gen_random_uuid();
