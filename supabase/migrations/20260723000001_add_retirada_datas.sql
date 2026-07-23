-- Data/hora de agendamento das retiradas (cheio p/ entrega, vazio p/ coleta)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS retirada_cheio_data timestamptz;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS retirada_vazio_data timestamptz;
