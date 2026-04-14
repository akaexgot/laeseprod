/**
 * Data fetching layer
 * Tries Supabase first, falls back to static data for development
 */
import { supabase, getServiceSupabase } from './supabase';
import * as fallback from '../data/fallback';

/** Fetch site settings */
export async function getSettings() {
    if (!supabase) return fallback.siteSettings;

    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();

    if (error || !data) return fallback.siteSettings;
    return data;
}

/** Fetch navigation items */
export async function getNavigation() {
    if (!supabase) return fallback.navigation;

    const { data, error } = await supabase
        .from('navigation')
        .select('*')
        .order('order', { ascending: true });

    if (error || !data) return fallback.navigation;
    return data;
}

/** Fetch all projects */
export async function getProjects() {
    if (!supabase) return fallback.projects;

    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('order', { ascending: true });

    if (error || !data) return fallback.projects;
    return data;
}

/** Fetch featured projects for home page */
export async function getFeaturedProjects() {
    if (!supabase) return fallback.projects.filter(p => p.featured_home);

    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('featured_home', true)
        .order('order', { ascending: true });

    if (error || !data) return fallback.projects.filter(p => p.featured_home);
    return data;
}

/** Fetch single project by slug */
export async function getProjectBySlug(slug: string) {
    if (!supabase) return fallback.projects.find(p => p.slug === slug) || null;

    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error || !data) return null;
    return data;
}

/** Fetch all services */
export async function getServices() {
    if (!supabase) return fallback.services;

    const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('order', { ascending: true });

    if (error || !data) return fallback.services;
    return data;
}

/** Fetch single service by slug */
export async function getServiceBySlug(slug: string) {
    if (!supabase) return fallback.services.find(s => s.slug === slug) || null;

    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error || !data) return null;
    return data;
}

/** Fetch all sectors */
export async function getSectors() {
    if (!supabase) return fallback.sectors;

    const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .order('order', { ascending: true });

    if (error || !data) return fallback.sectors;
    return data;
}

/** Fetch single sector by slug */
export async function getSectorBySlug(slug: string) {
    if (!supabase) return fallback.sectors.find(s => s.slug === slug) || null;

    const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error || !data) return null;
    return data;
}

/** Fetch companies (logo carousel) */
export async function getCompanies() {
    if (!supabase) return fallback.companies;

    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('order', { ascending: true });

    if (error || !data) return fallback.companies;
    return data;
}

/** Fetch awards (logo carousel) */
export async function getAwards() {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('awards')
        .select('*')
        .order('order', { ascending: true });

    if (error || !data) return [];
    return data;
}

/** Fetch FAQs */
export async function getFaqs() {
    if (!supabase) return fallback.faqs || [];

    const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('order', { ascending: true });

    if (error || !data) return fallback.faqs || [];
    return data;
}

/** Fetch footer data */
export async function getFooterData() {
    if (!supabase) return fallback.footerData;

    const { data, error } = await supabase
        .from('footer')
        .select('*')
        .single();

    if (error || !data) return fallback.footerData;
    return data;
}

/** Fetch portal clients (public — RLS filters active only) */
export async function getPortalClients() {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('portal_clients')
        .select('*')
        .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data;
}

/** Fetch ALL portal clients (admin — bypasses RLS) */
export async function getPortalClientsAdmin() {
    const sb = getServiceSupabase();
    if (!sb) return [];

    const { data, error } = await sb
        .from('portal_clients')
        .select('*')
        .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data;
}
