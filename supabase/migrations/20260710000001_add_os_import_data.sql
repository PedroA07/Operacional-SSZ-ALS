-- Dados completos extraídos da OS importada (PDF Aliança), exibidos em Emissões
ALTER TABLE trips ADD COLUMN IF NOT EXISTS os_import_data jsonb;
