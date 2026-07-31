-- Frota Legal: status de cavalo/carreta por motorista e exigência por cliente
ALTER TABLE drivers   ADD COLUMN IF NOT EXISTS frota_legal jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS requires_frota_legal boolean DEFAULT false;
