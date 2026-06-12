-- Tabela de configuração global do app (usada para controle de versão do APK mobile)
CREATE TABLE IF NOT EXISTS app_config (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Versão inicial; GitHub Actions atualiza este valor a cada build
INSERT INTO app_config (key, value)
VALUES ('mobile_app_version', '0')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE app_config DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO anon, authenticated;
