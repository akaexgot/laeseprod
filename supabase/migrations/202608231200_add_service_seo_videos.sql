ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS seo_video text,
ADD COLUMN IF NOT EXISTS seo_video_mobile text;
