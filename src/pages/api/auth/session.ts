import type { APIRoute } from 'astro';

// POST /api/auth/session
export const post: APIRoute = async ({ request }) => {
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

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookies.join('\n'),
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400 });
  }
};
