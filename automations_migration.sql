-- Criação da tabela de automações para o sistema ALS
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL,
  email_template_id TEXT, -- Referência ao ID do template de e-mail
  whatsapp_group_id TEXT, -- ID do grupo de WhatsApp (ex: 123456789@g.us)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca rápida por status
CREATE INDEX IF NOT EXISTS idx_automations_status ON automations(status);

-- Comentários para documentação
COMMENT ON TABLE automations IS 'Tabela que armazena as regras de automação disparadas por mudança de status';
COMMENT ON COLUMN automations.status IS 'Status que dispara a automação';
COMMENT ON COLUMN automations.email_template_id IS 'ID do modelo de e-mail a ser enviado';
COMMENT ON COLUMN automations.whatsapp_group_id IS 'ID do grupo de WhatsApp para envio de mensagem';
