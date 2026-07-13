-- Coluna "CT-e Emitido" no painel de Organização (toggle + anexos PDF opcionais)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS cte_emitido boolean DEFAULT false;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS cte_emitido_anexos jsonb;
