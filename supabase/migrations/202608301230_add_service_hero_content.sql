ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS hero_kicker text,
ADD COLUMN IF NOT EXISTS hero_title text;

UPDATE public.services
SET
    hero_kicker = COALESCE(NULLIF(hero_kicker, ''), 'Historias para volver a vivirlas'),
    hero_title = COALESCE(NULLIF(hero_title, ''), E'Bodas\ncon pulso real')
WHERE slug = 'bodas';

UPDATE public.services
SET
    hero_kicker = COALESCE(NULLIF(hero_kicker, ''), 'Imagen para canciones con identidad'),
    hero_title = COALESCE(NULLIF(hero_title, ''), E'Videoclips\ncon carácter')
WHERE slug = 'videoclips';
