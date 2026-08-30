ALTER TABLE public.cartas
ADD COLUMN IF NOT EXISTS sample_videos jsonb NOT NULL DEFAULT '[]'::jsonb;
