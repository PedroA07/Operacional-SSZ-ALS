-- Data/hora em que a retirada foi realizada (marcada) — cheio e vazio
ALTER TABLE trips ADD COLUMN IF NOT EXISTS retirada_cheio_realizada_em timestamptz;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS retirada_vazio_realizada_em timestamptz;
