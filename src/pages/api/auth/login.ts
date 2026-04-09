import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();
  const redirectTo = formData.get('redirectTo')?.toString() || '/admin';

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email y contraseña son obligatorios.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data?.session) {
    return new Response(JSON.stringify({ error: 'Credenciales incorrectas.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: false, // Forzado a false para que funcione siempre en local sin HTTPS
    sameSite: 'lax' as const,
    maxAge: data.session.expires_in || 60 * 60 * 24 * 7,
  };

  cookies.set('sb-access-token', data.session.access_token, cookieOptions);
  cookies.set('sb-refresh-token', data.session.refresh_token, cookieOptions);

  // Para asegurar que Astro mande las cookies en un Response manual,
  // a veces es necesario construir los headers explícitamente o usar la respuesta de cookies.
  
  return new Response(JSON.stringify({ 
    success: true, 
    redirect: redirectTo 
  }), { 
    status: 200, 
    headers: { 
      'Content-Type': 'application/json'
    } 
  });
};
