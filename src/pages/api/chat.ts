import type { APIRoute } from "astro";

const disabledResponse = () => new Response(
    JSON.stringify({ error: "Chat en vivo desactivado" }),
    {
        status: 410,
        headers: { "Content-Type": "application/json" },
    }
);

export const GET: APIRoute = async () => disabledResponse();
export const POST: APIRoute = async () => disabledResponse();
