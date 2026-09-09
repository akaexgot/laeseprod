-- LaeseProd S.L. - Live Chat schema repair
-- Safe to run multiple times in Supabase SQL Editor.
-- Use this if a previous live-chat version left legacy columns/constraints.

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS client_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'nuevo',
  ADD COLUMN IF NOT EXISTS source_path TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID,
  ADD COLUMN IF NOT EXISTS sender TEXT DEFAULT 'visitor',
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
DECLARE
  legacy_column TEXT;
BEGIN
  FOREACH legacy_column IN ARRAY ARRAY['visitor_id', 'visitor_name', 'email', 'phone']
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'chat_conversations'
        AND column_name = legacy_column
    ) THEN
      EXECUTE format('ALTER TABLE public.chat_conversations ALTER COLUMN %I DROP NOT NULL', legacy_column);
    END IF;
  END LOOP;

  FOREACH legacy_column IN ARRAY ARRAY['visitor_id', 'admin_id', 'sender_id', 'sender_type', 'content', 'body', 'message']
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'chat_messages'
        AND column_name = legacy_column
    ) THEN
      EXECUTE format('ALTER TABLE public.chat_messages ALTER COLUMN %I DROP NOT NULL', legacy_column);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_status_check;

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_sender_check;

UPDATE public.chat_conversations
SET
  client_token = COALESCE(client_token, gen_random_uuid()),
  status = CASE
    WHEN status IN ('cerrado', 'closed') THEN 'cerrado'
    WHEN status IN ('en_curso', 'active', 'assigned') THEN 'en_curso'
    ELSE 'nuevo'
  END,
  last_message_at = COALESCE(last_message_at, created_at, NOW()),
  updated_at = COALESCE(updated_at, created_at, NOW());

UPDATE public.chat_messages
SET
  sender = CASE
    WHEN sender IN ('visitor', 'admin', 'system') THEN sender
    WHEN sender IN ('user', 'client', 'visitor_message') THEN 'visitor'
    ELSE 'visitor'
  END,
  created_at = COALESCE(created_at, NOW());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_messages'
      AND column_name = 'sender_type'
  ) THEN
    UPDATE public.chat_messages
    SET sender_type = COALESCE(sender_type, sender);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_messages'
      AND column_name = 'content'
  ) THEN
    UPDATE public.chat_messages
    SET message = COALESCE(message, content);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_messages'
      AND column_name = 'body'
  ) THEN
    UPDATE public.chat_messages
    SET message = COALESCE(message, body);
  END IF;
END $$;

ALTER TABLE public.chat_conversations
  ALTER COLUMN client_token SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'nuevo',
  ALTER COLUMN last_message_at SET NOT NULL,
  ALTER COLUMN last_message_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE public.chat_messages
  ALTER COLUMN sender SET NOT NULL,
  ALTER COLUMN sender SET DEFAULT 'visitor',
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE public.chat_conversations
  ADD CONSTRAINT chat_conversations_status_check
  CHECK (status IN ('nuevo', 'en_curso', 'cerrado'));

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_sender_check
  CHECK (sender IN ('visitor', 'admin', 'system'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_conversations_client_token
  ON public.chat_conversations(client_token);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_status
  ON public.chat_conversations(status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message
  ON public.chat_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON public.chat_messages(conversation_id, created_at ASC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_messages_conversation_id_fkey'
      AND conrelid = 'public.chat_messages'::regclass
  ) THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT chat_messages_conversation_id_fkey
      FOREIGN KEY (conversation_id)
      REFERENCES public.chat_conversations(id)
      ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
