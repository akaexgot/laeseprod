-- =====================================================
-- VIDEOMARKETING SEVILLA — Seed Data Script (FIXED)
-- Run this in Supabase SQL Editor to populate with examples
-- =====================================================

-- 2. PROJECTS (Portfolio)
INSERT INTO projects (title, subtitle, slug, description, video_project, video_explanation_desktop, thumbnail, client_name, featured_home, "order")
VALUES 
(
  'Aftermovie - Festival de Verano 2024', 
  'Capturando la esencia del mayor evento musical del sur', 
  'aftermovie-festival-verano-2024', 
  'Energía, música y momentos inolvidables capturados en 4K. Un recorrido cinematográfico por las 3 jornadas del festival, con tomas aéreas de drones y cámaras lentas de alta definición.',
  'https://www.youtube.com/watch?v=D91q99QK11k', 
  'https://www.youtube.com/watch?v=J---aiyznGQ', 
  'https://images.unsplash.com/photo-1459749411177-042180ce673c?q=80&w=2070&auto=format&fit=crop', 
  'Sevilla Music Fest', 
  true, 
  1
),
(
  'Spot Corporativo - Bodegas del Sur', 
  'Tradición y modernidad en cada gota', 
  'spot-bodegas-del-sur', 
  'Elegancia visual para una de las bodegas más icónicas de la región. Anuncio publicitario para televisión y redes sociales destacando el proceso artesanal de la vendimia.',
  'https://www.youtube.com/watch?v=D91q99QK11k', 
  '', 
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2070&auto=format&fit=crop', 
  'Bodegas del Sur', 
  true, 
  2
),
(
  'Serie Documental - Oficios Perdidos', 
  'Un viaje a las raíces de nuestra tierra', 
  'documental-oficios-perdidos', 
  'Documentando la historia viva de nuestra cultura. Producción de 5 capítulos sobre los últimos artesanos de la provincia de Sevilla.',
  'https://www.youtube.com/watch?v=D91q99QK11k', 
  'https://www.youtube.com/watch?v=J---aiyznGQ', 
  'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?q=80&w=2070&auto=format&fit=crop', 
  'Diputación de Sevilla', 
  false, 
  3
)
ON CONFLICT (slug) DO UPDATE SET 
  title = EXCLUDED.title,
  thumbnail = EXCLUDED.thumbnail,
  featured_home = EXCLUDED.featured_home;

-- 3. SERVICES
INSERT INTO services (title, slug, description, icon, video, "order")
VALUES 
('Video Marketing', 'video-marketing', 'Estrategias de contenido audiovisual diseñadas para convertir visualizaciones en ventas.', '📈', 'https://www.youtube.com/watch?v=D91q99QK11k', 1),
('Producción de Eventos', 'eventos', 'Cobertura multicámara y streamings en directo para eventos de cualquier escala.', '🎥', 'https://www.youtube.com/watch?v=D91q99QK11k', 2),
('Spots Publicitarios', 'spots', 'Contenido creativo de alto impacto visual para campañas de marca y televisión.', '🎬', 'https://www.youtube.com/watch?v=D91q99QK11k', 3),
('Contenido para Redes', 'social-media', 'Videos cortos, dinámicos y verticales optimizados para Instagram, TikTok y LinkedIn.', '📱', 'https://www.youtube.com/watch?v=D91q99QK11k', 4)
ON CONFLICT (slug) DO UPDATE SET description = EXCLUDED.description;

-- 4. SECTORS
INSERT INTO sectors (title, slug, description, icon, video, "order")
VALUES 
('Turismo y Hoteles', 'turismo', 'Vendemos experiencias únicas a través de recorridos cinematográficos.', '🏨', 'https://www.youtube.com/watch?v=D91q99QK11k', 1),
('Gastronomía', 'gastronomia', 'Hacemos que tus platos hablen por sí solos con planos detalle exquisitos.', '🍽️', 'https://www.youtube.com/watch?v=D91q99QK11k', 2),
('Corporativo e Industrial', 'corporativo', 'Mostramos el músculo y los valores de tu empresa con profesionalidad.', '🏗️', 'https://www.youtube.com/watch?v=D91q99QK11k', 3),
('Cultura y Ocio', 'cultura', 'Donde hay emoción, hay una cámara de VideoMarketing Sevilla.', '🎨', 'https://www.youtube.com/watch?v=D91q99QK11k', 4)
ON CONFLICT (slug) DO UPDATE SET description = EXCLUDED.description;

-- 5. COMPANIES (Logo Carousel)
INSERT INTO companies (name, logo_url, website, "order")
VALUES 
('Cruzcampo', 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Heineken_Logo.svg/1200px-Heineken_Logo.svg.png', 'https://cruzcampo.es', 1),
('Real Betis', 'https://upload.wikimedia.org/wikipedia/en/thumb/1/13/Real_betis_balompie_logo.svg/1200px-Real_betis_balompie_logo.svg.png', 'https://realbetisbalompie.es', 2),
('Ayuntamiento de Sevilla', 'https://www.sevilla.org/logo-ayto.png', 'https://sevilla.org', 3),
('Sevilla FC', 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/Sevilla_FC_logo.svg/1200px-Sevilla_FC_logo.svg.png', 'https://sevillafc.es', 4)
ON CONFLICT DO NOTHING;

-- 6. PORTAL CLIENTS
INSERT INTO portal_clients (client_name, image, dropbox_link, password_hash, is_active)
VALUES 
('Hotel Alfonso XIII', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop', 'https://www.dropbox.com/sh/example1', 'hashed_pass_123', true),
('Fundación Cajasol', 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=2070&auto=format&fit=crop', 'https://www.dropbox.com/sh/example2', 'hashed_pass_456', true),
('Pabellón de la Navegación', '', '', 'hashed_pass_789', false)
ON CONFLICT DO NOTHING;

-- 7. PAGES SEO
INSERT INTO pages_seo (page_path, title, description)
VALUES 
('/', 'VideoMarketing Sevilla | Productora Audiovisual', 'Expertos en video marketing para empresas. Impulsamos tu marca con contenido audiovisual de alta calidad.'),
('/proyectos', 'Portafolio de Proyectos | VideoMarketing Sevilla', 'Explora nuestros últimos trabajos en publicidad, eventos y documentales.'),
('/contacto', 'Contacta con Nosotros | VideoMarketing Sevilla', '¿Tienes un proyecto en mente? Hablemos.');
