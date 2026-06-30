-- Tabela de Mensagens Prontas (WhatsApp)
-- Armazena modelos de mensagens formatadas reutilizáveis, com referências a
-- clientes, portos e pré-stackings inseridas diretamente no corpo do texto.
CREATE TABLE IF NOT EXISTS message_templates (
  id         TEXT        PRIMARY KEY,
  name       TEXT        NOT NULL,
  body       TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE message_templates DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO anon, authenticated;
