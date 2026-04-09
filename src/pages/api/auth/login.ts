import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const { email, password, redirectTo = '/admin' } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email y contraseña son obligatorios.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ 
        error: 'Servidor no configurado. Verifica las variables de entorno PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY.' 
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data?.session) {
      return new Response(JSON.stringify({ error: 'Credenciales incorrectas o usuario no autorizado.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const isProd = import.meta.env.PROD;
    
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: isProd, // Solo secure en producción (HTTPS)
      sameSite: 'lax' as const,
      maxAge: data.session.expires_in || 60 * 60 * 24 * 7,
    };

    cookies.set('sb-access-token', data.session.access_token, cookieOptions);
    cookies.set('sb-refresh-token', data.session.refresh_token, cookieOptions);

    return new Response(JSON.stringify({ 
      success: true, 
      redirect: redirectTo 
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    console.error('Login error:', e);
    return new Response(JSON.stringify({ error: `Error interno del servidor: ${e.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
