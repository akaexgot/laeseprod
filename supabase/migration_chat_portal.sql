-- ═══════════════════════════════════════════════════════════
-- VideoMarketing Sevilla — Chat & Portal Clients Migration
-- Execute this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── Chat Conversations ──────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id text NOT NULL,
  visitor_name text DEFAULT 'Visitante',
  status text DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Chat Messages ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('visitor', 'admin')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for faster message lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages(conversation_id, created_at);

-- Index for conversation lookups by visitor
CREATE INDEX IF NOT EXISTS idx_chat_conversations_visitor
  ON chat_conversations(visitor_id, status);

-- ── Portal Clients ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name text NOT NULL,
  logo text DEFAULT '',
  dropbox_link text DEFAULT '',
  password_hash text DEFAULT '',
  is_active boolean DEFAULT true,
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Enable Realtime (for live chat) ─────────────────────
-- Note: This may fail if Realtime is not enabled on your Supabase project.
-- If so, enable it from the Supabase Dashboard > Database > Realtime.
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;

-- ── RLS Policies ────────────────────────────────────────
-- Allow anonymous read/insert for chat (visitors can chat without auth)
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_clients ENABLE ROW LEVEL SECURITY;

-- Chat: anyone can create conversations and send messages
CREATE POLICY "Allow insert chat_conversations" ON chat_conversations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select chat_conversations" ON chat_conversations
  FOR SELECT USING (true);

CREATE POLICY "Allow update chat_conversations" ON chat_conversations
  FOR UPDATE USING (true);

CREATE POLICY "Allow insert chat_messages" ON chat_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select chat_messages" ON chat_messages
  FOR SELECT USING (true);

-- Portal clients: read-only for anonymous
CREATE POLICY "Allow select portal_clients" ON portal_clients
  FOR SELECT USING (true);
