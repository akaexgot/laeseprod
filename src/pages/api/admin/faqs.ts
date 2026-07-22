import type { APIRoute } from "astro";
import { getServiceSupabase } from "../../../lib/supabase";
import { invalidateCache } from "../../../lib/data";

const fields = ["service_id", "question", "answer", "order", "is_active"];
function pick(body: Record<string, unknown>) {
    const data: Record<string, unknown> = {};
    for (const key of fields) if (key in body) data[key] = body[key];
    return data;
}
function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export const POST: APIRoute = async ({ request }) => {
    const sb = getServiceSupabase();
    if (!sb) return json({ error: "DB not configured" }, 500);
    const body = await request.json();
    if (!body.service_id || !body.question || !body.answer) return json({ error: "Servicio, pregunta y respuesta son obligatorios." }, 400);
    const { data, error } = await sb.from("faqs").insert(pick(body)).select().single();
    if (error) return json({ error: error.message }, 400);
    invalidateCache("faqs");
    return json(data, 201);
};

export const PUT: APIRoute = async ({ request }) => {
    const sb = getServiceSupabase();
    if (!sb) return json({ error: "DB not configured" }, 500);
    const body = await request.json();
    if (!body.id) return json({ error: "id required" }, 400);
    const { data, error } = await sb.from("faqs").update(pick(body)).eq("id", body.id).select().single();
    if (error) return json({ error: error.message }, 400);
    invalidateCache("faqs");
    return json(data);
};

export const PATCH: APIRoute = async ({ request }) => {
    const sb = getServiceSupabase();
    if (!sb) return json({ error: "DB not configured" }, 500);
    const { orderedIds } = await request.json();
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return json({ error: "orderedIds array required" }, 400);
    }

    const updates = orderedIds.map((id: string, index: number) =>
        sb.from("faqs").update({ order: index + 1 }).eq("id", id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed?.error) return json({ error: failed.error.message }, 400);

    invalidateCache("faqs");
    return json({ ok: true });
};

export const DELETE: APIRoute = async ({ request }) => {
    const sb = getServiceSupabase();
    if (!sb) return json({ error: "DB not configured" }, 500);
    const { id } = await request.json();
    if (!id) return json({ error: "id required" }, 400);
    const { error } = await sb.from("faqs").delete().eq("id", id);
    if (error) return json({ error: error.message }, 400);
    invalidateCache("faqs");
    return json({ ok: true });
};
