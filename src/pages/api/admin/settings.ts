/**
 * Admin API — Settings
 * PUT /api/admin/settings
 */
import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';

export const PUT: APIRoute = async ({ request }) => {
    const sb = getServiceSupabase();
    if (!sb) return new Response(JSON.stringify({ error: 'DB not configured' }), { status: 500 });

    try {
        const body = await request.json();

        // Get existing settings row id
        const { data: existing } = await sb.from('settings').select('id').single();
        if (!existing) {
            return new Response(JSON.stringify({ error: 'No settings row found' }), { status: 404 });
        }

        const { data, error } = await sb
            .from('settings')
            .update(body)
            .eq('id', existing.id)
            .select()
            .single();

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        return new Response(JSON.stringify(data), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
