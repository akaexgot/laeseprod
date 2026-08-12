import { getVideoId, toYouTubeEmbed } from './display';

export type JsonLd = Record<string, any>;

export interface BreadcrumbItem {
    name: string;
    path: string;
}

export function getSiteUrl() {
    return (import.meta.env.PUBLIC_SITE_URL || 'https://laeseprod.com').replace(/\/+$/, '');
}

export function cleanPath(path: string | null | undefined) {
    if (!path) return '/';

    const pathname = path.split(/[?#]/)[0] || '/';
    const withSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;

    return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : '/';
}

export function absoluteUrl(value: string | null | undefined) {
    if (!value) return undefined;
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('//')) return `https:${value}`;

    return `${getSiteUrl()}/${value.replace(/^\/+/, '')}`;
}

export function canonicalFromUrl(value: URL | string) {
    try {
        const url = typeof value === 'string' ? new URL(value, getSiteUrl()) : value;
        const path = cleanPath(url.pathname);
        return `${getSiteUrl()}${path === '/' ? '/' : path}`;
    } catch {
        const path = cleanPath(String(value));
        return `${getSiteUrl()}${path === '/' ? '/' : path}`;
    }
}

export function getVideoThumbnail(videoUrl: string | null | undefined) {
    if (!videoUrl) return undefined;

    if (videoUrl.includes('cloudinary.com') && /\.(mp4|webm)(\?.*)?$/i.test(videoUrl)) {
        return videoUrl.replace(/\.(mp4|webm)(\?.*)?$/i, '.jpg');
    }

    const videoId = getVideoId(videoUrl);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined;
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]): JsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: absoluteUrl(item.path),
        })),
    };
}

export function buildItemListSchema(name: string, items: Array<{ title?: string; name?: string; slug?: string }>, basePath: string): JsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name,
        itemListElement: items
            .filter((item) => item.slug)
            .map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: item.title || item.name,
                url: absoluteUrl(`${basePath}/${item.slug}`),
            })),
    };
}

export function buildServiceSchema(service: any, path: string): JsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'Service',
        '@id': `${absoluteUrl(path)}#service`,
        name: service.title,
        description: service.description,
        serviceType: service.title,
        provider: { '@id': `${getSiteUrl()}/#business` },
        areaServed: [
            { '@type': 'City', name: 'Sevilla' },
            { '@type': 'AdministrativeArea', name: 'Andalucia' },
            { '@type': 'Country', name: 'ES' },
        ],
        url: absoluteUrl(path),
        image: absoluteUrl(service.thumbnail) || getVideoThumbnail(service.video),
    };
}

export function buildProjectSchemas(project: any, path: string): JsonLd[] {
    const image = absoluteUrl(project.thumbnail) || getVideoThumbnail(project.video_project);
    const isNativeVideo = typeof project.video_project === 'string' && /\.(mp4|webm)(\?.*)?$/i.test(project.video_project);
    const embedUrl = toYouTubeEmbed(project.video_project);
    const date = project.updated_at || project.created_at;

    const creativeWork = {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        '@id': `${absoluteUrl(path)}#project`,
        name: project.title,
        headline: project.subtitle || project.title,
        description: project.description || project.subtitle,
        url: absoluteUrl(path),
        image,
        creator: { '@id': `${getSiteUrl()}/#business` },
        client: project.client_name ? { '@type': 'Organization', name: project.client_name } : undefined,
        dateCreated: project.created_at,
        dateModified: project.updated_at || project.created_at,
    };

    const videoObject = project.video_project
        ? {
            '@context': 'https://schema.org',
            '@type': 'VideoObject',
            '@id': `${absoluteUrl(path)}#video`,
            name: project.title,
            description: project.description || project.subtitle || project.title,
            thumbnailUrl: image ? [image] : undefined,
            uploadDate: date,
            contentUrl: isNativeVideo ? absoluteUrl(project.video_project) : undefined,
            embedUrl: embedUrl || undefined,
        }
        : null;

    return [creativeWork, videoObject].filter(Boolean) as JsonLd[];
}

export function buildFaqSchema(faqs: Array<{ question?: string; answer?: string }>): JsonLd | null {
    const mainEntity = faqs
        .filter((faq) => faq.question && faq.answer)
        .map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        }));

    if (mainEntity.length === 0) return null;

    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity,
    };
}
