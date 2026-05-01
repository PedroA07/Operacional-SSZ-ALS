-- Adiciona suporte a múltiplas placas de cavalo e carreta por motorista
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS plates_horse  JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS plates_trailer JSONB NOT NULL DEFAULT '[]';

-- Migra os dados existentes: converte plate_horse / plate_trailer em arrays com isPrimary=true
UPDATE drivers
SET plates_horse = jsonb_build_array(
  jsonb_build_object(
    'id',        gen_random_uuid()::text,
    'plate',     COALESCE(plate_horse, ''),
    'year',      COALESCE(year_horse, ''),
    'isPrimary', true
  )
)
WHERE plate_horse IS NOT NULL AND plate_horse <> '' AND plates_horse = '[]'::jsonb;

UPDATE drivers
SET plates_trailer = jsonb_build_array(
  jsonb_build_object(
    'id',        gen_random_uuid()::text,
    'plate',     COALESCE(plate_trailer, ''),
    'year',      COALESCE(year_trailer, ''),
    'isPrimary', true
  )
)
WHERE plate_trailer IS NOT NULL AND plate_trailer <> '' AND plates_trailer = '[]'::jsonb;
