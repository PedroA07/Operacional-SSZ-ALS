-- Reações (emoji) e respostas a comentários no Feed de Atividades
ALTER TABLE handover_posts    ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;
ALTER TABLE handover_comments ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;
ALTER TABLE handover_comments ADD COLUMN IF NOT EXISTS parent_id text;
