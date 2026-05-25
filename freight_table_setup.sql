-- Tabela de rotas de frete (cidade x cidade)
CREATE TABLE IF NOT EXISTS freight_routes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_city text NOT NULL,
  destination_city text NOT NULL,
  vehicle_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tipos de veículo configuráveis para a tabela de frete
CREATE TABLE IF NOT EXISTS freight_vehicle_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tipos padrão
INSERT INTO freight_vehicle_types (code, name, sort_order) VALUES
  ('L',  'Leve',                    1),
  ('LS', 'Leve Semi-Reboque',        2),
  ('M',  'Médio',                    3),
  ('ML', 'Médio Rod. Leve',          4),
  ('VE', 'Veículo Especial',         5)
ON CONFLICT (code) DO NOTHING;

-- RLS
ALTER TABLE freight_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE freight_vehicle_types ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='freight_routes' AND policyname='freight_routes_all'
  ) THEN
    CREATE POLICY "freight_routes_all" ON freight_routes FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='freight_vehicle_types' AND policyname='freight_vehicle_types_all'
  ) THEN
    CREATE POLICY "freight_vehicle_types_all" ON freight_vehicle_types FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
