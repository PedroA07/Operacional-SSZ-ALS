-- Adiciona colunas de PREVISÃO de abertura de gate (separadas da liberação efetiva).
-- Santos Brasil retorna PREVISAO_LIBERACAO_DRY/REEFER (previsão) e
-- LIBERACAO_DRY/REEFER (efetiva); os dois precisam de campos distintos.

ALTER TABLE terminal_vessels ADD COLUMN IF NOT EXISTS prev_gate_dry    TEXT;
ALTER TABLE terminal_vessels ADD COLUMN IF NOT EXISTS prev_gate_reefer TEXT;
