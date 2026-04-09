import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';

/**
 * GET - List templates
 */
export const GET: APIRoute = async () => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500 });

    const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify(data), { status: 200 });
};

/**
 * POST - Create template
 */
export const POST: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500 });

    try {
        const { title, content, admin_fields, client_fields } = await request.json();

        if (!title || !content) {
            return new Response(JSON.stringify({ error: 'Título y contenido requeridos' }), { status: 400 });
        }

        const { data, error } = await supabase
            .from('contract_templates')
            .insert({
                title,
                content,
                admin_fields: admin_fields || [],
                client_fields: client_fields || []
            })
            .select()
            .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), { status: 201 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};

/**
 * PATCH - Update template
 */
export const PATCH: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500 });

    try {
        const { id, title, content, admin_fields, client_fields } = await request.json();

        if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

        const { data, error } = await supabase
            .from('contract_templates')
            .update({
                title,
                content,
                admin_fields,
                client_fields
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};

/**
 * DELETE - Remove template
 */
export const DELETE: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500 });

    try {
        const { id } = await request.json();
        if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });

        const { error } = await supabase.from('contract_templates').delete().eq('id', id);
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
