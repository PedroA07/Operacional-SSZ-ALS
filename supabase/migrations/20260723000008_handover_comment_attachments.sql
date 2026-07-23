-- Anexos (imagens/documentos) em comentários do Feed de Atividades
ALTER TABLE handover_comments ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
