const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

function parseCookie(header: string | null) {
  if (!header) return {} as Record<string,string>;
  return Object.fromEntries(header.split(';').map(c => {
    const [k, ...v] = c.trim().split('=');
    return [k, decodeURIComponent(v.join('='))];
  }));
}

export async function getUserFromCookie(cookieHeader: string | null) {
  const cookies = parseCookie(cookieHeader || '');
  const accessToken = cookies['sb-access-token'] || cookies['sb-access-token-debug'] || null;
  if (!SUPABASE_URL) return { user: null, error: 'missing_supabase_url' };
  if (!accessToken) return { user: null, error: 'no_token' };

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON || '',
      },
    });
    if (!res.ok) {
      const body = await res.text();
      return { user: null, error: `supabase_status_${res.status}`, body };
    }
    const json = await res.json();
    return { user: json?.user || null, error: null, body: json };
  } catch (e) {
    return { user: null, error: String(e) };
  }
}
