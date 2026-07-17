/**
 * API - Portal Clients Code Verification
 * POST /api/portal/verify
 */
import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';
import { verifyPassword } from '../../../lib/passwords';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { id, password, code } = body;
        const portalCode = String(password || code || '').trim();

        if (!portalCode) {
            return new Response(JSON.stringify({ error: 'Faltan credenciales' }), { status: 400 });
        }

        const supabase = getServiceSupabase();
        if (!supabase) {
            return new Response(JSON.stringify({ error: 'Base de datos no configurada' }), { status: 500 });
        }

        if (!id) {
            const { data: clients } = await supabase
                .from('portal_clients')
                .select('id, client_name, password_hash, dropbox_link, is_active')
                .eq('is_active', true);

            for (const client of clients || []) {
                if (await verifyPassword(portalCode, client.password_hash)) {
                    return new Response(JSON.stringify({
                        ok: true,
                        client_name: client.client_name,
                        dropbox_link: client.dropbox_link,
                    }), { status: 200 });
                }
            }

            return new Response(JSON.stringify({ error: 'Codigo incorrecto' }), { status: 401 });
        }

        const { data: client } = await supabase
            .from('portal_clients')
            .select('id, client_name, password_hash, dropbox_link, is_active')
            .eq('id', id)
            .eq('is_active', true)
            .maybeSingle();

        if (!client) {
            return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404 });
        }

        if (await verifyPassword(portalCode, client.password_hash)) {
            return new Response(JSON.stringify({
                ok: true,
                client_name: client.client_name,
                dropbox_link: client.dropbox_link,
            }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: 'Contrasena incorrecta' }), { status: 401 });
    } catch {
        return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500 });
    }
};
