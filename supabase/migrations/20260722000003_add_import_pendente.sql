-- Viagens criadas pela importação em massa de OS que ficam na fila de pendentes
-- (para gerar minutas depois ou editar a programação manualmente)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS import_pendente boolean DEFAULT false;
