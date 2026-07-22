-- Local de retirada do vazio (porto/pré-stacking) para export/coleta — usado
-- na programação e na minuta de liberação de vazio
ALTER TABLE trips ADD COLUMN IF NOT EXISTS retirada_vazio jsonb;
