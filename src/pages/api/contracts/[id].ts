import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';

/**
 * PUT - Update contract with client data and signature
 */
export const PUT: APIRoute = async ({ params, request }) => {
    const { id } = params;
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500 });

    try {
        const { client_data, signature_svg, status } = await request.json();

        if (!id || !client_data || !signature_svg) {
            return new Response(JSON.stringify({ error: 'Faltan datos requeridos' }), { status: 400 });
        }

        // Before updating, verify it's not already paid/completed
        const { data: contract } = await supabase
            .from('contracts')
            .select('status')
            .eq('id', id)
            .single();

        if (contract?.status === 'completed' || contract?.status === 'paid') {
            return new Response(JSON.stringify({ error: 'El contrato ya está procesado' }), { status: 400 });
        }

        const { data, error } = await supabase
            .from('contracts')
            .update({
                client_data,
                signature_svg,
                status: status || 'pending_payment'
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
