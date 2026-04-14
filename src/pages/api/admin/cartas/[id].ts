/**
 * Admin API — Detalles de Carta
 * PUT /api/admin/cartas/[id]
 */
import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../../lib/supabase';

export const PUT: APIRoute = async ({ request, params }) => {
    const sb = getServiceSupabase();
    if (!sb) return new Response(JSON.stringify({ error: 'DB not configured' }), { status: 500 });
    
    const cartaId = params.id;
    if (!cartaId) return new Response(JSON.stringify({ error: 'carta id missing' }), { status: 400 });

    try {
        const body = await request.json();
        const { tipo } = body;

        if (tipo === 'imagenes' || tipo === 'pdf') {
            const { imagenes } = body; // Array of { url, orden }
            
            // 1. Delete existing images
            await sb.from('carta_imagenes').delete().eq('carta_id', cartaId);
            
            // 2. Insert new images
            if (imagenes && imagenes.length > 0) {
                const inserts = imagenes.map((img: any) => ({
                    carta_id: cartaId,
                    url: img.url,
                    orden: img.orden || 0
                }));
                const { error } = await sb.from('carta_imagenes').insert(inserts);
                if (error) throw new Error(error.message);
            }
        } 
        else if (tipo === 'manual') {
            const { bloques } = body; // Array of { id (optional), titulo, orden, visible, servicios: [{nombre, precio, descripcion, orden}] }
            
            // For manual, we delete existing blocks (which cascades to services via DB foreign key)
            await sb.from('carta_bloques').delete().eq('carta_id', cartaId);

            if (bloques && bloques.length > 0) {
                for (const bloque of bloques) {
                    // Insert block
                    const { data: bData, error: bErr } = await sb.from('carta_bloques').insert({
                        carta_id: cartaId,
                        titulo: bloque.titulo,
                        orden: bloque.orden || 0,
                        visible: bloque.visible !== false
                    }).select().single();
                    
                    if (bErr) throw new Error(bErr.message);

                    // Insert services for this block
                    if (bloque.servicios && bloque.servicios.length > 0) {
                        const sInserts = bloque.servicios.map((s: any) => ({
                            bloque_id: bData.id,
                            nombre: s.nombre,
                            precio: s.precio || null,
                            descripcion: s.descripcion || null,
                            orden: s.orden || 0
                        }));
                        const { error: sErr } = await sb.from('carta_servicios').insert(sInserts);
                        if (sErr) throw new Error(sErr.message);
                    }
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
