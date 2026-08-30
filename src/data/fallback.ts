const BODAS_ID = "11111111-1111-4111-8111-111111111111";
const VIDEOCLIPS_ID = "22222222-2222-4222-8222-222222222222";
const provisionalVideo = "https://www.youtube.com/watch?v=D91q99QK11k";

export const siteSettings = {
    site_name: "LaeseProd S.L.",
    site_description: "Productora audiovisual especializada en arte visual.",
    logo_url: "",
    primary_color: "#000000",
    secondary_color: "#FFFFFF",
    font_heading: "Impact",
    font_body: "Arial",
    whatsapp_number: "34662908416",
    phone: "+34 662 90 84 16",
    email: "laeseprod@gmail.com",
    address: "Sevilla, España",
    instagram: "",
    linkedin: "",
    google_maps_embed: "",
    hero_video_desktop: provisionalVideo,
    hero_video_mobile: "",
    contact_hero_video: provisionalVideo,
    about_summary: "Somos una productora audiovisual centrada en arte visual. Trabajamos cada proyecto de forma cercana, ágil y con una mirada cinematográfica.",
    contract_terms_text: "Al continuar, aceptas la política de privacidad y los términos de servicio de LaeseProd S.L.",
    faq_section_enabled: true,
    maintenance_mode: false,
};

export const navigation = [
    { label: "Inicio", href: "/", order: 1, is_visible: true },
    { label: "Proyectos", href: "/proyectos", order: 2, is_visible: true },
    { label: "Servicios", href: "/servicios", order: 3, is_visible: true },
    { label: "Contacto", href: "/contacto", order: 4, is_visible: true },
];

export const projects = [
    { id: "p1", title: "Proyecto provisional 01", subtitle: "", category: "videoclips", slug: "proyecto-01", description: "Contenido provisional editable desde el panel.", video_project: provisionalVideo, video_explanation_desktop: "", video_explanation_mobile: "", video_explanation_thumbnail: "", thumbnail: "", client_name: "", client_logo: "", featured_home: true, order: 1, created_at: "2026-01-01" },
    { id: "p2", title: "Proyecto provisional 02", subtitle: "", category: "bodas", slug: "proyecto-02", description: "Contenido provisional editable desde el panel.", video_project: provisionalVideo, video_explanation_desktop: "", video_explanation_mobile: "", video_explanation_thumbnail: "", thumbnail: "", client_name: "", client_logo: "", featured_home: true, order: 2, created_at: "2026-01-02" },
];

export const services = [
    {
        id: BODAS_ID,
        title: "Bodas",
        slug: "bodas",
        description: "Películas de boda naturales, cuidadas y hechas para volver a sentir cada momento.",
        video: provisionalVideo,
        video_vertical: "",
        hero_kicker: "Historias para volver a vivirlas",
        hero_title: "Bodas\ncon pulso real",
        seo_video: "",
        seo_video_mobile: "",
        seo_eyebrow: "Videos de boda en Sevilla",
        seo_title: "Peliculas de boda naturales, cuidadas y con emocion real",
        seo_paragraph_1: "Trabajamos cada boda con una mirada documental y cinematografica: preparativos, ceremonia, celebracion y todos esos gestos que hacen que el recuerdo vuelva con fuerza.",
        seo_paragraph_2: "El objetivo es crear una pelicula de boda elegante, cercana y fiel a vuestra historia, cuidando el ritmo, el sonido, el color y la forma de contar el dia sin interrumpir lo que esta pasando.",
        seo_video_title: "Video explicativo de bodas",
        preview_seconds: 3,
        order: 1,
    },
    {
        id: VIDEOCLIPS_ID,
        title: "Videoclips",
        slug: "videoclips",
        description: "Piezas visuales para artistas que convierten una canción en una imagen con identidad propia.",
        video: provisionalVideo,
        video_vertical: "",
        hero_kicker: "Imagen para canciones con identidad",
        hero_title: "Videoclips\ncon carácter",
        seo_video: "",
        seo_video_mobile: "",
        seo_eyebrow: "Videoclips en Sevilla",
        seo_title: "Produccion visual para canciones con identidad propia",
        seo_paragraph_1: "Trabajamos cada videoclip desde el concepto: escuchamos la cancion, definimos el tono, buscamos referencias y preparamos una pieza pensada para YouTube, redes y lanzamiento.",
        seo_paragraph_2: "La direccion, el rodaje, el montaje y el color se ajustan al artista para que el resultado tenga ritmo, presencia y una imagen reconocible sin sobrecargar la produccion.",
        seo_video_title: "Video explicativo de videoclips",
        preview_seconds: 3,
        order: 2,
    },
];

export const faqs = [
    { id: "f1", service_id: BODAS_ID, question: "¿Con cuánta antelación deberíamos reservar?", answer: "Lo ideal es consultar la disponibilidad cuanto antes, especialmente para fechas de temporada alta.", order: 1, is_active: true },
    { id: "f2", service_id: VIDEOCLIPS_ID, question: "¿Podéis desarrollar la idea creativa?", answer: "Sí. Podemos partir de una idea cerrada o construir el concepto visual junto al artista.", order: 1, is_active: true },
];

export const footerData = {
    description: "Arte visual con una mirada propia.",
    copyright: `© ${new Date().getFullYear()} LaeseProd S.L. Todos los derechos reservados.`,
};
