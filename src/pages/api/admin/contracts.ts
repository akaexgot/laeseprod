import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';

/**
 * GET - List contracts (Admin)
 */
export const GET: APIRoute = async () => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500 });

    const { data, error } = await supabase
        .from('contracts')
        .select('*, contract_templates(title)')
        .order('created_at', { ascending: false });

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify(data), { status: 200 });
};

/**
 * POST - Create new contract instance
 */
export const POST: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500 });

    try {
        const { template_id, admin_data, total_amount, amount_to_pay } = await request.json();

        if (!template_id || !admin_data) {
            return new Response(JSON.stringify({ error: 'Faltan datos requeridos' }), { status: 400 });
        }

        const { data, error } = await supabase
            .from('contracts')
            .insert({
                template_id,
                admin_data,
                total_amount: total_amount || 0,
                amount_to_pay: amount_to_pay || total_amount || 0,
                status: 'pending_client'
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
 * DELETE - Remove contract instance
 */
export const DELETE: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500 });

    try {
        const { id } = await request.json();
        if (!id) return new Response(JSON.stringify({ error: 'Falta el ID' }), { status: 400 });

        const { error } = await supabase.from('contracts').delete().eq('id', id);
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
