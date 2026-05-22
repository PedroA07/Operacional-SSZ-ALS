-- Adiciona campos de remoção por usuário nas viagens
-- Substitui os booleanos globais por arrays de user IDs, permitindo que cada
-- usuário remova viagens de forma independente sem afetar os demais.

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS removed_from_coleta_by jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS removed_from_org_by jsonb DEFAULT '[]'::jsonb;
