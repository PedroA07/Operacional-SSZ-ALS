ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS emissao_cte_attachments jsonb;
