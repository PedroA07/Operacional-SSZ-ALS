-- Postos de entrega de documentos (locais onde os documentos podem ser entregues)
CREATE TABLE IF NOT EXISTS delivery_posts (
  id                text PRIMARY KEY,
  name              text NOT NULL,
  address           text,
  neighborhood      text,
  city              text,
  state             text,
  zip_code          text,
  phone             text,
  hours             text,
  notes             text,
  registration_date text,
  created_at        timestamptz DEFAULT now()
);

-- App usa auth própria (anon) — desabilita RLS e concede acesso
ALTER TABLE delivery_posts DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON delivery_posts TO anon, authenticated;
