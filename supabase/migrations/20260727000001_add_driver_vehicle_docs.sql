-- Documentos de cavalo e carreta (PDF ou imagem) no cadastro de motoristas
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS horse_docs jsonb DEFAULT '[]'::jsonb;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS trailer_docs jsonb DEFAULT '[]'::jsonb;
