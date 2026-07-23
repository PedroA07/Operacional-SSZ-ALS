-- Função/cargo do autor exibida no Feed de Atividades (posts e comentários)
ALTER TABLE handover_posts    ADD COLUMN IF NOT EXISTS author_position text;
ALTER TABLE handover_comments ADD COLUMN IF NOT EXISTS author_position text;
