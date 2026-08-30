import type { APIRoute } from "astro";
import { getServiceSupabase } from "../../../lib/supabase";
import { invalidateCache } from "../../../lib/data";

export const PUT: APIRoute = async ({ request }) => {
    const sb = getServiceSupabase();
    if (!sb) return new Response(JSON.stringify({ error: "DB not configured" }), { status: 500 });
    try {
        const body = await request.json();
        if (!body.id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
        const allowed = [
            "title",
            "description",
            "video",
            "video_vertical",
            "hero_kicker",
            "hero_title",
            "seo_video",
            "seo_video_mobile",
            "seo_eyebrow",
            "seo_title",
            "seo_paragraph_1",
            "seo_paragraph_2",
            "seo_video_title",
            "preview_seconds",
            "order",
        ];
        const updates: Record<string, unknown> = {};
        for (const key of allowed) if (key in body) updates[key] = body[key];
        const { data, error } = await sb.from("services").update(updates).eq("id", body.id).select().single();
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        invalidateCache("services");
        return new Response(JSON.stringify(data), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500 });
    }
};

const fixedServices: APIRoute = async () => new Response(
    JSON.stringify({ error: "LaeseProd S.L. utiliza únicamente los servicios Bodas y Videoclips." }),
    { status: 405, headers: { Allow: "PUT" } },
);

export const POST = fixedServices;
export const DELETE = fixedServices;
