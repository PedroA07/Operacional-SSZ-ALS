-- GIF/figurinha em comentários do Feed de Atividades
ALTER TABLE handover_comments ADD COLUMN IF NOT EXISTS sticker_url text;
