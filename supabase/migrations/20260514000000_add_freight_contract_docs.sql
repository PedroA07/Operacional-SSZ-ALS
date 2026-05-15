-- Adiciona coluna JSONB para múltiplos contratos de frete com dados extraídos do PDF
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS freight_contract_docs JSONB DEFAULT NULL;

-- Índice GIN para buscas por dados dos contratos (container, motorista, etc.)
CREATE INDEX IF NOT EXISTS idx_trips_freight_contract_docs
  ON trips USING GIN (freight_contract_docs);
