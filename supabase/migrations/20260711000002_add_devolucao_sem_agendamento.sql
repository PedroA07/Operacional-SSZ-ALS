-- Baixa de vazio em terminal pré-stacking que não exige agendamento nem comprovante
ALTER TABLE devolucoes ADD COLUMN IF NOT EXISTS sem_agendamento boolean DEFAULT false;
