-- Contratos de frete com vinculação automática por container
CREATE TABLE IF NOT EXISTS freight_contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name       TEXT NOT NULL,
  file_url        TEXT,                         -- base64 ou URL do arquivo
  contract_number TEXT,                         -- número extraído do arquivo/nome
  container       TEXT,                         -- container detectado no nome
  trip_id         TEXT,                         -- FK trips.id (null = sem vínculo)
  trip_os         TEXT,                         -- OS da trip vinculada
  destination     TEXT,                         -- destino da trip vinculada
  status          TEXT NOT NULL DEFAULT 'unlinked'
                  CHECK (status IN ('linked', 'unlinked')),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_freight_contracts_container ON freight_contracts(container);
CREATE INDEX IF NOT EXISTS idx_freight_contracts_trip_id   ON freight_contracts(trip_id);
CREATE INDEX IF NOT EXISTS idx_freight_contracts_status    ON freight_contracts(status);

ALTER TABLE freight_contracts DISABLE ROW LEVEL SECURITY;
