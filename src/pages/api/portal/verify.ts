/**
 * API — Portal Clients Password Verification
 * POST /api/portal/verify
 */
import type { APIRoute } from 'astro';
import { getPortalClients } from '../../../lib/data';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { id, password } = body;

        if (!id || !password) {
            return new Response(JSON.stringify({ error: 'Faltan credenciales' }), { status: 400 });
        }

        const clients = await getPortalClients();
        const client = clients.find((c: any) => c.id === id);

        if (!client) {
            return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404 });
        }

        // Compare password directly (admin creates it as plain text currently)
        if (client.password_hash === password) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        } else {
            return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), { status: 401 });
        }

    } catch (e: any) {
        return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500 });
    }
};
