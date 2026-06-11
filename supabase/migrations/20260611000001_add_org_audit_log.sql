-- Auditoria da Organização Operacional: registra cada alteração por usuário
CREATE TABLE IF NOT EXISTS org_audit_log (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  area         TEXT        NOT NULL,   -- COLETA | ENTREGA | DEVOLUCAO | LIBERACAO
  action       TEXT        NOT NULL,   -- NF | STATUS | AGENDAMENTO | LOCAL | EDICAO | CRIACAO | EXCLUSAO | COMPROVANTE | ADIANTAMENTO | LIMPEZA
  description  TEXT,
  entity_id    TEXT,
  entity_label TEXT,                   -- OS / container / booking
  changes      JSONB,                  -- [{ field, from, to }]
  user_name    TEXT,
  user_id      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_audit_log_created ON org_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_audit_log_entity  ON org_audit_log (entity_label);
ALTER TABLE org_audit_log DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.org_audit_log TO anon, authenticated;
