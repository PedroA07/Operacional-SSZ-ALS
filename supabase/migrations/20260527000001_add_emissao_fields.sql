ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS emissao_cte_number text,
  ADD COLUMN IF NOT EXISTS emissao_observacoes text;
