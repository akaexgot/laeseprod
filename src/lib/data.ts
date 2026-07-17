/**
 * Data fetching layer
 * Tries Supabase first, falls back to static data for development
 */
import { supabase, getServiceSupabase } from './supabase';
import * as fallback from '../data/fallback';

const PUBLIC_DATA_TTL_MS = Number(import.meta.env.PUBLIC_DATA_TTL_MS || 30 * 60 * 1000);
const PUBLIC_QUERY_TIMEOUT_MS = Number(import.meta.env.SUPABASE_QUERY_TIMEOUT_MS || 2500);
const PUBLIC_ERROR_COOLDOWN_MS = Number(import.meta.env.PUBLIC_ERROR_COOLDOWN_MS || 60 * 1000);

type CacheEntry<T> = {
    value?: T;
    expiresAt: number;
    retryAt: number;
    promise?: Promise<T>;
};

const publicDataCache = new Map<string, CacheEntry<unknown>>();

class PublicQueryTimeoutError extends Error {}

async function withPublicTimeout<T>(promise: PromiseLike<T>): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new PublicQueryTimeoutError('Public query timeout')), PUBLIC_QUERY_TIMEOUT_MS);
    });

    const result = await Promise.race([promise, timeout]);
    if (timeoutId) clearTimeout(timeoutId);

    return result;
}

function publicQuery<T>(
    key: string,
    queryFactory: () => PromiseLike<{ data: T | null; error: unknown }>,
    fallbackValue: T
): Promise<T> {
    const now = Date.now();
    const entry = publicDataCache.get(key) as CacheEntry<T> | undefined;

    if (entry?.value !== undefined && entry.expiresAt > now) {
        return Promise.resolve(entry.value);
    }

    if (entry?.promise) {
        return entry.promise.catch(() => entry.value ?? fallbackValue);
    }

    if (entry && now < entry.retryAt) {
        return Promise.resolve(entry.value ?? fallbackValue);
    }

    const promise = (async () => {
        const { data, error } = await withPublicTimeout(queryFactory());

        if (error) throw error;
        if (data === null) throw new Error(`${key} returned no data`);

        publicDataCache.set(key, {
            value: data,
            expiresAt: Date.now() + PUBLIC_DATA_TTL_MS,
            retryAt: 0,
        });

        return data;
    })().catch(() => {
        const previous = publicDataCache.get(key) as CacheEntry<T> | undefined;
        const value = previous?.value ?? fallbackValue;

        publicDataCache.set(key, {
            value,
            expiresAt: previous?.value !== undefined ? previous.expiresAt : Date.now() + PUBLIC_ERROR_COOLDOWN_MS,
            retryAt: Date.now() + PUBLIC_ERROR_COOLDOWN_MS,
        });

        return value;
    });

    publicDataCache.set(key, {
        value: entry?.value,
        expiresAt: entry?.expiresAt ?? 0,
        retryAt: entry?.retryAt ?? 0,
        promise,
    });

    return promise;
}

/** Fetch site settings */
export async function getSettings() {
    if (!supabase) return fallback.siteSettings;
    const sb = supabase;

    return publicQuery(
        'settings',
        () => sb.from('settings').select('*').single(),
        fallback.siteSettings
    );
}

/** Fetch custom SEO metadata for a public page */
export async function getPageSeo(pagePath: string) {
    if (!supabase) return null;
    const sb = supabase;

    const normalizedPath = pagePath.length > 1 ? pagePath.replace(/\/+$/, '') : '/';

    return publicQuery<{
        title: string | null;
        description: string | null;
        canonical_url: string | null;
        og_image: string | null;
        no_index: boolean | null;
    } | null>(
        `page-seo:${normalizedPath}`,
        () => sb.from('pages_seo').select('*').eq('page_path', normalizedPath).maybeSingle(),
        null
    );
}

/** Fetch navigation items */
export async function getNavigation() {
    if (!supabase) return fallback.navigation;
    const sb = supabase;

    return publicQuery(
        'navigation',
        () => sb.from('navigation').select('*').order('order', { ascending: true }),
        fallback.navigation
    );
}

/** Fetch all projects */
export async function getProjects() {
    if (!supabase) return fallback.projects;
    const sb = supabase;

    return publicQuery(
        'projects',
        () => sb.from('projects').select('*').order('order', { ascending: true }),
        fallback.projects
    );
}

/** Fetch featured projects for home page */
export async function getFeaturedProjects() {
    if (!supabase) return fallback.projects.filter(p => p.featured_home).slice(0, 3);
    const sb = supabase;

    return publicQuery(
        'featured-projects',
        () => sb.from('projects').select('*').eq('featured_home', true).order('order', { ascending: true }).limit(3),
        fallback.projects.filter(p => p.featured_home).slice(0, 3)
    );
}

/** Fetch single project by slug */
export async function getProjectBySlug(slug: string) {
    if (!supabase) return fallback.projects.find(p => p.slug === slug) || null;
    const sb = supabase;

    return publicQuery(
        `project:${slug}`,
        () => sb.from('projects').select('*').eq('slug', slug).single(),
        null
    );
}

/** Fetch all services */
export async function getServices() {
    if (!supabase) return fallback.services;
    const sb = supabase;

    return publicQuery(
        'services',
        () => sb.from('services').select('*').order('order', { ascending: true }),
        fallback.services
    );
}

/** Fetch single service by slug */
export async function getServiceBySlug(slug: string) {
    if (!supabase) return fallback.services.find(s => s.slug === slug) || null;
    const sb = supabase;

    return publicQuery(
        `service:${slug}`,
        () => sb.from('services').select('*').eq('slug', slug).single(),
        null
    );
}

/** Fetch FAQs */
export async function getFaqs(serviceId?: string, includeInactive = false) {
    const fallbackFaqs = (fallback.faqs || []).filter((faq) =>
        (!serviceId || faq.service_id === serviceId) && (includeInactive || faq.is_active)
    );
    if (!supabase) return fallbackFaqs;
    const sb = supabase;

    return publicQuery(
        `faqs:${serviceId || 'all'}:${includeInactive ? 'admin' : 'public'}`,
        () => {
            let query = sb.from('faqs').select('*, services(title, slug)').order('order', { ascending: true });
            if (serviceId) query = query.eq('service_id', serviceId);
            if (!includeInactive) query = query.eq('is_active', true);
            return query;
        },
        fallbackFaqs
    );
}

/** Fetch footer data */
export async function getFooterData() {
    if (!supabase) return fallback.footerData;
    const sb = supabase;

    return publicQuery(
        'footer',
        () => sb.from('footer').select('*').single(),
        fallback.footerData
    );
}

/** Fetch portal clients (public — RLS filters active only) */
export async function getPortalClients() {
    if (!supabase) return [];
    const sb = supabase;

    return publicQuery(
        'portal-clients',
        () => sb
            .from('portal_clients_public')
            .select('*')
            .order('order', { ascending: true })
            .order('created_at', { ascending: true })
            .order('id', { ascending: true }),
        []
    );
}

/** Fetch ALL portal clients (admin — bypasses RLS) */
export async function getPortalClientsAdmin() {
    const sb = getServiceSupabase();
    if (!sb) return [];

    const { data, error } = await sb
        .from('portal_clients')
        .select('*')
        .order('order', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });

    if (error || !data) return [];
    return data;
}

/** Invalidate in-memory public data cache after admin mutations */
export function invalidateCache(tag?: string) {
    if (!tag) {
        publicDataCache.clear();
        return;
    }

    publicDataCache.delete(tag);

    if (tag === 'projects') {
        publicDataCache.delete('featured-projects');
        for (const key of publicDataCache.keys()) {
            if (key.startsWith('project:')) publicDataCache.delete(key);
        }
    }

    if (tag === 'portal-clients') {
        publicDataCache.delete('portal-clients');
    }

    if (tag === 'services') {
        for (const key of publicDataCache.keys()) {
            if (key === 'services' || key.startsWith('service:')) publicDataCache.delete(key);
        }
    }

    if (tag === 'faqs') {
        for (const key of publicDataCache.keys()) {
            if (key.startsWith('faqs:')) publicDataCache.delete(key);
        }
    }
}
