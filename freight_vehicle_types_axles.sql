-- Adiciona colunas de eixos à tabela de tipos de veículo
ALTER TABLE freight_vehicle_types
  ADD COLUMN IF NOT EXISTS axles_going     integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS axles_returning integer NOT NULL DEFAULT 6;

-- Atualiza os defaults para os tipos padrão
UPDATE freight_vehicle_types SET axles_going = 4, axles_returning = 5 WHERE code = 'L';
UPDATE freight_vehicle_types SET axles_going = 4, axles_returning = 6 WHERE code = 'LS';
UPDATE freight_vehicle_types SET axles_going = 4, axles_returning = 6 WHERE code = 'M';
UPDATE freight_vehicle_types SET axles_going = 5, axles_returning = 7 WHERE code = 'ML';
UPDATE freight_vehicle_types SET axles_going = 6, axles_returning = 9 WHERE code = 'VE';
