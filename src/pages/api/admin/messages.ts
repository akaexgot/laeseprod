import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';

export const DELETE: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500 });
    
    try {
        const { id } = await request.json();
        if (!id) return new Response(JSON.stringify({ error: 'Falta el ID' }), { status: 400 });

        const { error } = await supabase.from('contacts').delete().eq('id', id);
        if (error) throw error;
        
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};

// PUT to mark as 'leido'
export const PUT: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500 });
    
    try {
        const { id, status } = await request.json();
        if (!id) return new Response(JSON.stringify({ error: 'Falta el ID' }), { status: 400 });

        const { error } = await supabase.from('contacts').update({ status }).eq('id', id);
        if (error) throw error;
        
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
