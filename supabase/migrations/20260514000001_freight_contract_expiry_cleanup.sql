-- Habilita pg_cron (disponível em todos os planos Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─────────────────────────────────────────────────────────────────────────────
-- Função que remove contratos de frete com mais de 90 dias
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_expired_freight_contracts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Limpa freightContractDoc legado (campo singular)
  UPDATE trips
  SET freight_contract_doc = NULL
  WHERE freight_contract_doc IS NOT NULL
    AND (
      -- Respeita expiresAt se presente; caso contrário usa uploadDate + 90 dias
      COALESCE(
        (freight_contract_doc->>'expiresAt')::timestamptz,
        (freight_contract_doc->>'uploadDate')::timestamptz + INTERVAL '90 days'
      ) < NOW()
    );

  -- 2. Remove docs expirados do array freight_contract_docs
  UPDATE trips
  SET freight_contract_docs = (
    SELECT jsonb_agg(doc)
    FROM jsonb_array_elements(freight_contract_docs) AS doc
    WHERE COALESCE(
      (doc->>'expiresAt')::timestamptz,
      (doc->>'uploadDate')::timestamptz + INTERVAL '90 days'
    ) >= NOW()
  )
  WHERE freight_contract_docs IS NOT NULL
    AND jsonb_array_length(freight_contract_docs) > 0;

  -- 3. Normaliza arrays vazios para NULL
  UPDATE trips
  SET freight_contract_docs = NULL
  WHERE freight_contract_docs IS NOT NULL
    AND (
      freight_contract_docs = 'null'::jsonb
      OR freight_contract_docs = '[]'::jsonb
      OR jsonb_array_length(freight_contract_docs) = 0
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Agenda execução diária às 03:00 UTC
-- ─────────────────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'cleanup-freight-contracts-90d',  -- nome único do job
  '0 3 * * *',                      -- todo dia às 03:00 UTC
  'SELECT cleanup_expired_freight_contracts()'
);
