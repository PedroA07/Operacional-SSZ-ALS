-- Fluxo de Entrega/Importação no painel de Organização:
-- retirada do cheio, comprovante de agendamento e comprovante de reutilização
ALTER TABLE trips ADD COLUMN IF NOT EXISTS retirada_cheio jsonb;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS agendamento_anexo jsonb;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS reutilizacao_comprovante jsonb;
