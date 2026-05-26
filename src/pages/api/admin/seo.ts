/**
 * Admin API - Page SEO metadata
 * POST /api/admin/seo
 */
import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
    const sb = getServiceSupabase();
    if (!sb) return new Response(JSON.stringify({ error: 'DB not configured' }), { status: 500 });

    try {
        const body = await request.json();
        const pagePath = typeof body.page_path === 'string' ? body.page_path.trim() : '';

        if (!pagePath.startsWith('/')) {
            return new Response(JSON.stringify({ error: 'Invalid page path' }), { status: 400 });
        }

        const payload = {
            page_path: pagePath.length > 1 ? pagePath.replace(/\/+$/, '') : '/',
            title: body.title?.trim() || null,
            description: body.description?.trim() || null,
            og_image: body.og_image?.trim() || null,
            canonical_url: body.canonical_url?.trim() || null,
            no_index: Boolean(body.no_index),
        };

        const { data, error } = await sb
            .from('pages_seo')
            .upsert(payload, { onConflict: 'page_path' })
            .select()
            .single();

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || 'Internal error' }), { status: 500 });
    }
};
