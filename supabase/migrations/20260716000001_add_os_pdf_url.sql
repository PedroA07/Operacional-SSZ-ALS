-- PDF original da OS importada anexado à programação (visualizador em Emissões e na OC)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS os_pdf_url text;
