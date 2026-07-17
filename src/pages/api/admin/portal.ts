/**
 * Admin API — Portal Clients
 * POST / PUT / DELETE /api/admin/portal
 */
import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';
import { invalidateCache } from '../../../lib/data';
import { hashPassword } from '../../../lib/passwords';

const PORTAL_CLIENT_COLUMNS = [
    'client_name',
    'image',
    'dropbox_link',
    'password_hash',
    'is_active',
    'image_type',
    'order',
] as const;

function pickPortalClientColumns(body: Record<string, unknown>) {
    const filtered: Record<string, unknown> = {};
    for (const key of PORTAL_CLIENT_COLUMNS) {
        if (Object.prototype.hasOwnProperty.call(body, key)) filtered[key] = body[key];
    }
    return filtered;
}

async function getNextPortalClientOrder(sb: NonNullable<ReturnType<typeof getServiceSupabase>>) {
    const { data } = await sb
        .from('portal_clients')
        .select('order')
        .order('order', { ascending: false })
        .limit(1)
        .maybeSingle();

    const current = typeof data?.order === 'number' ? data.order : -1;
    return current + 1;
}

export const POST: APIRoute = async ({ request }) => {
    const sb = getServiceSupabase();
    if (!sb) return new Response(JSON.stringify({ error: 'DB not configured' }), { status: 500 });

    try {
        const body = await request.json();

        const filteredBody = pickPortalClientColumns(body);

        if (typeof filteredBody.password_hash !== 'string' || !filteredBody.password_hash) {
            return new Response(JSON.stringify({ error: 'password required' }), { status: 400 });
        }
        filteredBody.password_hash = await hashPassword(filteredBody.password_hash);
        if (!Object.prototype.hasOwnProperty.call(filteredBody, 'order')) {
            filteredBody.order = await getNextPortalClientOrder(sb);
        }

        const { data, error } = await sb.from('portal_clients').insert(filteredBody).select().single();
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        invalidateCache("portal-clients");
        const { password_hash: _passwordHash, ...safeData } = data;
        return new Response(JSON.stringify(safeData), { status: 201 });
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

        const updates = pickPortalClientColumns(body);
        if (typeof updates.password_hash === 'string' && updates.password_hash) {
            updates.password_hash = await hashPassword(updates.password_hash);
        } else {
            delete updates.password_hash;
        }

        const { data, error } = await sb.from('portal_clients').update(updates).eq('id', id).select().single();
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        invalidateCache("portal-clients");
        const { password_hash: _passwordHash, ...safeData } = data;
        return new Response(JSON.stringify(safeData), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};

export const PATCH: APIRoute = async ({ request }) => {
    const sb = getServiceSupabase();
    if (!sb) return new Response(JSON.stringify({ error: 'DB not configured' }), { status: 500 });

    try {
        const { orderedIds } = await request.json();
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return new Response(JSON.stringify({ error: 'orderedIds array required' }), { status: 400 });
        }

        const updates = orderedIds.map((id: string, index: number) =>
            sb.from('portal_clients').update({ order: index }).eq('id', id)
        );
        const results = await Promise.all(updates);
        const failed = results.find(result => result.error);
        if (failed?.error) return new Response(JSON.stringify({ error: failed.error.message }), { status: 400 });

        invalidateCache("portal-clients");
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
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

        const { error } = await sb.from('portal_clients').delete().eq('id', id);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        invalidateCache("portal-clients");
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
