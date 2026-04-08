import type { APIRoute } from 'astro';

export const get: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie') || '';
  return new Response(JSON.stringify({ cookie }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
