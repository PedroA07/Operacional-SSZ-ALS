-- Scripts SQL para atualização do banco de dados ALS
-- Execute estes comandos no seu console do Supabase ou PostgreSQL

-- 1. Adicionar novas colunas à tabela 'trips'
ALTER TABLE trips ADD COLUMN IF NOT EXISTS sent_nf BOOLEAN DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduled_location_id TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduled_date_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS scheduling JSONB;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS has_advance BOOLEAN DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS bu TEXT;

-- Se a coluna scheduled_location_id já existir como UUID, mude para TEXT
ALTER TABLE trips ALTER COLUMN scheduled_location_id TYPE TEXT USING scheduled_location_id::TEXT;

-- 1.5 Corrigir tipos de colunas para JSONB (com tratamento de erros para strings vazias)
ALTER TABLE trips ALTER COLUMN status_history TYPE JSONB USING (CASE WHEN status_history IS NULL OR status_history = '' THEN '[]'::JSONB ELSE status_history::JSONB END);
ALTER TABLE trips ALTER COLUMN driver_docs TYPE JSONB USING (CASE WHEN driver_docs IS NULL OR driver_docs = '' THEN '[]'::JSONB ELSE driver_docs::JSONB END);
ALTER TABLE trips ALTER COLUMN oc_form_data TYPE JSONB USING (CASE WHEN oc_form_data IS NULL OR oc_form_data = '' THEN '{}'::JSONB ELSE oc_form_data::JSONB END);
ALTER TABLE trips ALTER COLUMN advance_payment TYPE JSONB USING (CASE WHEN advance_payment IS NULL OR advance_payment = '' THEN '{"status": "BLOQUEADO"}'::JSONB ELSE advance_payment::JSONB END);
ALTER TABLE trips ALTER COLUMN balance_payment TYPE JSONB USING (CASE WHEN balance_payment IS NULL OR balance_payment = '' THEN '{"status": "AGUARDANDO_DOCS"}'::JSONB ELSE balance_payment::JSONB END);
ALTER TABLE trips ALTER COLUMN pre_stacking_form_data TYPE JSONB USING (CASE WHEN pre_stacking_form_data IS NULL OR pre_stacking_form_data = '' THEN '{}'::JSONB ELSE pre_stacking_form_data::JSONB END);

-- 2. Criar índices para otimizar as buscas por data e status (usados na aba Organização)
CREATE INDEX IF NOT EXISTS idx_trips_date_time ON trips(date_time);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_type ON trips(type);

-- 3. Comentários para documentação
COMMENT ON COLUMN trips.sent_nf IS 'Indica se a Nota Fiscal foi enviada';
COMMENT ON COLUMN trips.is_scheduled IS 'Indica se a viagem está agendada';
COMMENT ON COLUMN trips.scheduled_location_id IS 'ID do local de agendamento (Porto ou Pre-Stacking)';
COMMENT ON COLUMN trips.scheduled_date_time IS 'Data e hora do agendamento realizado';
COMMENT ON COLUMN trips.has_advance IS 'Indica se o adiantamento de 70% foi realizado';

-- 4. Tabela para Tipos de Viagem da Coleta do Dia
CREATE TABLE IF NOT EXISTS coleta_tipos_viagem (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE coleta_tipos_viagem ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Permitir leitura para todos os usuários autenticados" ON coleta_tipos_viagem
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir inserção para usuários autenticados" ON coleta_tipos_viagem
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir atualização para usuários autenticados" ON coleta_tipos_viagem
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir exclusão para usuários autenticados" ON coleta_tipos_viagem
    FOR DELETE USING (auth.role() = 'authenticated');

-- 5. Tabela para Configurações do Sistema
CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Permitir leitura para todos os usuários autenticados" ON system_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir inserção para usuários autenticados" ON system_settings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir atualização para usuários autenticados" ON system_settings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 6. Tabela para Histórico de Formulários (Ordem de Coleta, Minuta, Liberação, etc.)
CREATE TABLE IF NOT EXISTS form_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_type TEXT NOT NULL,
  form_data JSONB NOT NULL,
  label TEXT,
  user_name TEXT,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS form_history_type_created_idx ON form_history(form_type, created_at DESC);

-- Habilitar RLS e políticas para form_history
ALTER TABLE form_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "form_history_select" ON form_history
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "form_history_insert" ON form_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "form_history_delete" ON form_history
  FOR DELETE USING (auth.role() = 'authenticated');

-- Habilitar RLS para handover_posts (se ainda não habilitado)
ALTER TABLE handover_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "handover_posts_select" ON handover_posts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "handover_posts_insert" ON handover_posts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "handover_posts_delete" ON handover_posts
  FOR DELETE USING (auth.uid()::text = author_id OR auth.role() = 'service_role');

-- 7. Coluna para preferências de notificação por usuário
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB;

-- 8. Tabela para Passagem de Serviço (feed de posts)
CREATE TABLE IF NOT EXISTS handover_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_photo TEXT,
  author_role TEXT,
  mentions JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS handover_posts_created_idx ON handover_posts(created_at DESC);
