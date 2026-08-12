ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'videoclips'
CHECK (category IN ('videoclips', 'bodas'));

UPDATE public.projects
SET category = 'bodas'
WHERE category = 'videoclips'
  AND (
    lower(coalesce(slug, '')) LIKE '%boda%'
    OR lower(coalesce(title, '')) LIKE '%boda%'
    OR lower(coalesce(subtitle, '')) LIKE '%boda%'
    OR lower(coalesce(subtitle, '')) LIKE '%wedding%'
  );
