
-- Execute estes comandos no SQL Editor do Supabase para atualizar a lista de status permitidos

ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Aguardando para Descarregar';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Descarregando';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Aguardando baixar o Vazio';

-- Garantia de que os outros status da VW também existam
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Chegou no Cragea';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Aguardando carregar';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Saiu do Cragea';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Chegou na Volkswagen';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Saiu da Volkswagen';
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Container sobre rodas';
