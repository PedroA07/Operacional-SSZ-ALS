-- Título opcional para posts da Passagem de Serviço / Feed de Atividades
ALTER TABLE handover_posts ADD COLUMN IF NOT EXISTS title text;
