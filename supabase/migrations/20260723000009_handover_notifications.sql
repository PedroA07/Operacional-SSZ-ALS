-- Notificações do Feed de Atividades (menções, respostas, marcações)
CREATE TABLE IF NOT EXISTS handover_notifications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id  text,
  recipient_staff_id text,
  recipient_name     text,
  actor_id           text,
  actor_name         text,
  type               text,  -- 'mention' | 'reply' | 'mark'
  post_id            text,
  comment_id         text,
  excerpt            text,
  read               boolean DEFAULT false,
  created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_handover_notif_user  ON handover_notifications (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_handover_notif_staff ON handover_notifications (recipient_staff_id);

-- App usa auth própria (anon) — desabilita RLS e concede acesso
ALTER TABLE handover_notifications DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON handover_notifications TO anon, authenticated;
