import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export const DELETE: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return json({ error: 'Supabase no configurado' }, 500);
    
    try {
        const { id } = await request.json();
        if (!id) return json({ error: 'Falta el ID' }, 400);

        const { error } = await supabase.from('contacts').delete().eq('id', id);
        if (error) throw error;
        
        return json({ success: true });
    } catch (e: any) {
        return json({ error: e.message }, 500);
    }
};

// PUT to mark as 'leido'
export const PUT: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return json({ error: 'Supabase no configurado' }, 500);
    
    try {
        const { id, status } = await request.json();
        if (!id) return json({ error: 'Falta el ID' }, 400);
        if (!['nuevo', 'leido'].includes(status)) {
            return json({ error: 'Estado no válido' }, 400);
        }

        const { error } = await supabase
            .from('contacts')
            .update({ status })
            .eq('id', id);
        if (error) throw error;
        
        return json({ success: true, message: { id, status } });
    } catch (e: any) {
        return json({ error: e.message }, 500);
    }
};
