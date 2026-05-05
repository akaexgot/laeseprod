/**
 * Admin API — FAQs
 * POST / PUT / DELETE /api/admin/faqs
 */
import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';
import { invalidateCache } from '../../../lib/data';

export const POST: APIRoute = async ({ request }) => {
    const sb = getServiceSupabase();
    if (!sb) return new Response(JSON.stringify({ error: 'DB not configured' }), { status: 500 });

    try {
        const body = await request.json();
        
        // Whitelist valid columns
        const allowed = ['question', 'answer', 'order', 'is_active'];
        const filteredBody: any = {};
        for (const key of allowed) {
            if (key in body) filteredBody[key] = body[key];
        }

        const { data, error } = await sb.from('faqs').insert(filteredBody).select().single();
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        invalidateCache("faqs");
        return new Response(JSON.stringify(data), { status: 201 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};

export const PUT: APIRoute = async ({ request }) => {
    const sb = getServiceSupabase();
    if (!sb) return new Response(JSON.stringify({ error: 'DB not configured' }), { status: 500 });

    try {
        const body = await request.json();
        const { id } = body;
        if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

        // Whitelist valid columns
        const allowed = ['question', 'answer', 'order', 'is_active'];
        const updates: any = {};
        for (const key of allowed) {
            if (key in body) updates[key] = body[key];
        }

        const { data, error } = await sb.from('faqs').update(updates).eq('id', id).select().single();
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        invalidateCache("faqs");
        return new Response(JSON.stringify(data), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};

export const DELETE: APIRoute = async ({ request }) => {
    const sb = getServiceSupabase();
    if (!sb) return new Response(JSON.stringify({ error: 'DB not configured' }), { status: 500 });

    try {
        const { id } = await request.json();
        if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

        const { error } = await sb.from('faqs').delete().eq('id', id);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        invalidateCache("faqs");
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
