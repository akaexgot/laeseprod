import type { APIRoute } from 'astro';

async function handleDebugCookies(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  return new Response(JSON.stringify({ cookie }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const get: APIRoute = async ({ request }) => handleDebugCookies(request);
export const GET: APIRoute = async ({ request }) => handleDebugCookies(request);
