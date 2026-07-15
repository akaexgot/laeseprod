/**
 * Admin API — Projects
 * POST / PUT / DELETE /api/admin/projects
 */
import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';
import { invalidateCache } from '../../../lib/data';
import { deleteCloudinaryImage } from '../../../lib/cloudinary-admin';

const PROJECT_COLUMNS = [
    'title',
    'subtitle',
    'slug',
    'description',
    'video_project',
    'video_explanation_desktop',
    'video_explanation_mobile',
    'thumbnail',
    'client_name',
    'client_logo',
    'featured_home',
    'order',
] as const;

function pickProjectColumns(body: Record<string, unknown>) {
    const filtered: Record<string, unknown> = {};
    for (const key of PROJECT_COLUMNS) {
        if (Object.prototype.hasOwnProperty.call(body, key)) filtered[key] = body[key];
    }
    return filtered;
}

function createSlug(title: string) {
    return title
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export const POST: APIRoute = async ({ request }) => {
    const sb = getServiceSupabase();
    if (!sb) return new Response(JSON.stringify({ error: 'DB not configured' }), { status: 500 });

    try {
        const body = await request.json();
        const payload = pickProjectColumns(body);
        // Auto-generate slug from title if not provided
        if (!payload.slug && typeof payload.title === 'string' && payload.title.trim()) {
            payload.slug = createSlug(payload.title);
        }
        const { data, error } = await sb.from('projects').insert(payload).select().single();
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        invalidateCache("projects");
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
        const updates = pickProjectColumns(body);

        if (!updates.slug && typeof updates.title === 'string' && updates.title.trim()) {
            updates.slug = createSlug(updates.title);
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'thumbnail') && updates.thumbnail === null) {
            const { data: existingProject, error: readError } = await sb
                .from('projects')
                .select('thumbnail')
                .eq('id', id)
                .single();

            if (readError) return new Response(JSON.stringify({ error: readError.message }), { status: 400 });

            try {
                await deleteCloudinaryImage(existingProject?.thumbnail);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'No se pudo eliminar la miniatura de Cloudinary.';
                console.warn(`[projects] Miniatura limpiada en BD, pero no se pudo borrar el archivo remoto: ${message}`);
            }
        }

        const { data, error } = await sb.from('projects').update(updates).eq('id', id).select().single();
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        invalidateCache("projects");
        return new Response(JSON.stringify(data), { status: 200 });
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

        // Update each project's order based on its position in the array
        const updates = orderedIds.map((id: string, index: number) =>
            sb.from('projects').update({ order: index }).eq('id', id)
        );
        await Promise.all(updates);

        invalidateCache("projects");
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

        const { data: existingProject, error: readError } = await sb
            .from('projects')
            .select('thumbnail')
            .eq('id', id)
            .single();

        if (readError) return new Response(JSON.stringify({ error: readError.message }), { status: 400 });

        const { data, error } = await sb.from('projects').delete().eq('id', id).select('id').single();
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

        try {
            await deleteCloudinaryImage(existingProject?.thumbnail);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo eliminar la miniatura de Cloudinary.';
            console.warn(`[projects] Proyecto eliminado en BD, pero no se pudo borrar la miniatura remota: ${message}`);
        }

        invalidateCache("projects");
        return new Response(JSON.stringify({ ok: true, id: data.id }), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
