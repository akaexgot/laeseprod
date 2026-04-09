import type { APIRoute } from 'astro';

function clearCookie(name: string) {
  return `${name}=; Path=/; Max-Age=0; SameSite=Strict`;
}

async function handle() {
  const headers = new Headers();
  headers.append('Set-Cookie', clearCookie('sb-access-token'));
  headers.append('Set-Cookie', clearCookie('sb-refresh-token'));
  // clear debug cookie too
  headers.append('Set-Cookie', `sb-access-token-debug=; Path=/; Max-Age=0; SameSite=Lax`);

  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

export const post: APIRoute = async () => handle();
export const POST: APIRoute = async () => handle();
export const get: APIRoute = async () => handle();
export const GET: APIRoute = async () => handle();
