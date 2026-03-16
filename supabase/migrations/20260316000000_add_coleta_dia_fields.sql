ALTER TABLE trips
ADD COLUMN coleta_tipo_viagem text,
ADD COLUMN coleta_email_sent boolean DEFAULT false,
ADD COLUMN coleta_doc_generated boolean DEFAULT false,
ADD COLUMN coleta_emissao_solicitada boolean DEFAULT false;

CREATE TABLE coleta_tipos_viagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE coleta_tipos_viagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON coleta_tipos_viagem FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON coleta_tipos_viagem FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON coleta_tipos_viagem FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON coleta_tipos_viagem FOR DELETE USING (auth.role() = 'authenticated');
