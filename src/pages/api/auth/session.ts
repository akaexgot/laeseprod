import type { APIRoute } from 'astro';

async function handleSessionRequest(request: Request) {
  try {
    const body = await request.json();
    const access_token = body?.access_token || null;
    const refresh_token = body?.refresh_token || null;
    const expires_in = body?.expires_in || null;

    if (!access_token || !refresh_token) {
      return new Response(JSON.stringify({ error: 'missing_tokens' }), { status: 400 });
    }

    // Determine maxAge
    const maxAge = typeof expires_in === 'number' && expires_in > 0 ? expires_in : 60 * 60 * 24 * 7; // default 7 days

    const isProd = import.meta.env.PROD;

    // Build cookie attributes
    const cookieAttrs = `Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}` + (isProd ? '; Secure' : '');

    const cookies = [
      `sb-access-token=${encodeURIComponent(access_token)}; ${cookieAttrs}`,
      `sb-refresh-token=${encodeURIComponent(refresh_token)}; ${cookieAttrs}`,
    ];

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    // Append multiple Set-Cookie headers
    cookies.forEach(c => headers.append('Set-Cookie', c));

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400 });
  }
}

// Export both lowercase and uppercase to satisfy different dev servers
export const post: APIRoute = async ({ request }) => handleSessionRequest(request);
export const POST: APIRoute = async ({ request }) => handleSessionRequest(request);
