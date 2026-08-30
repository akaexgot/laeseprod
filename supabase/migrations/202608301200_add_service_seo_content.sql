ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS seo_eyebrow text,
ADD COLUMN IF NOT EXISTS seo_title text,
ADD COLUMN IF NOT EXISTS seo_paragraph_1 text,
ADD COLUMN IF NOT EXISTS seo_paragraph_2 text,
ADD COLUMN IF NOT EXISTS seo_video_title text;

UPDATE public.services
SET
    seo_eyebrow = COALESCE(NULLIF(seo_eyebrow, ''), 'Videos de boda en Sevilla'),
    seo_title = COALESCE(NULLIF(seo_title, ''), 'Peliculas de boda naturales, cuidadas y con emocion real'),
    seo_paragraph_1 = COALESCE(NULLIF(seo_paragraph_1, ''), 'Trabajamos cada boda con una mirada documental y cinematografica: preparativos, ceremonia, celebracion y todos esos gestos que hacen que el recuerdo vuelva con fuerza.'),
    seo_paragraph_2 = COALESCE(NULLIF(seo_paragraph_2, ''), 'El objetivo es crear una pelicula de boda elegante, cercana y fiel a vuestra historia, cuidando el ritmo, el sonido, el color y la forma de contar el dia sin interrumpir lo que esta pasando.'),
    seo_video_title = COALESCE(NULLIF(seo_video_title, ''), 'Video explicativo de bodas')
WHERE slug = 'bodas';

UPDATE public.services
SET
    seo_eyebrow = COALESCE(NULLIF(seo_eyebrow, ''), 'Videoclips en Sevilla'),
    seo_title = COALESCE(NULLIF(seo_title, ''), 'Produccion visual para canciones con identidad propia'),
    seo_paragraph_1 = COALESCE(NULLIF(seo_paragraph_1, ''), 'Trabajamos cada videoclip desde el concepto: escuchamos la cancion, definimos el tono, buscamos referencias y preparamos una pieza pensada para YouTube, redes y lanzamiento.'),
    seo_paragraph_2 = COALESCE(NULLIF(seo_paragraph_2, ''), 'La direccion, el rodaje, el montaje y el color se ajustan al artista para que el resultado tenga ritmo, presencia y una imagen reconocible sin sobrecargar la produccion.'),
    seo_video_title = COALESCE(NULLIF(seo_video_title, ''), 'Video explicativo de videoclips')
WHERE slug = 'videoclips';
