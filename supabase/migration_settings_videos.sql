-- Adds an optional mobile/vertical hero video while preserving the desktop field.
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS hero_video_mobile TEXT;
