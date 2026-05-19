import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';

/**
 * API for User Management (Workers)
 * Uses service_role to manage Auth users
 */

// GET: List all users from Auth and merge with their profiles
export const GET: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });

    try {
        // 1. Fetch all Auth users
        const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        // 2. Fetch all profiles
        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('*');

        if (pError) throw pError;

        // 3. Merge: Every Auth user gets their profile data (or defaults)
        const combined = authUsers.map(u => {
            const profile = profiles.find(p => p.id === u.id);
            return {
                id: u.id,
                email: u.email,
                is_admin: profile?.is_admin || false,
                permissions: profile?.permissions || [],
                created_at: u.created_at,
                has_profile: !!profile
            };
        });

        // Filter out portal clients if they use a different naming/role convention 
        // (For now show everyone as requested)
        return new Response(JSON.stringify(combined), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};

// POST: Create a new worker
export const POST: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });

    try {
        const body = await request.json();
        const { email, password, permissions, is_admin } = body;

        // Validation
        if (!email || !password) {
            return new Response(JSON.stringify({ error: 'Email y contraseña son obligatorios' }), { status: 400 });
        }

        if (password.length < 6) {
            return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }), { status: 400 });
        }

        // 1. Create User in Supabase Auth
        const { data, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (authError) {
            console.error('Error al crear usuario en Auth:', authError);
            return new Response(JSON.stringify({ error: authError.message }), { status: authError.status || 400 });
        }

        if (!data?.user) {
            console.error('No se devolvió usuario después de crear en Auth');
            return new Response(JSON.stringify({ error: 'Fallo al crear usuario en Auth (respuesta vacía)' }), { status: 500 });
        }

        // 2. Create/Update Profile (using upsert to avoid conflict with DB triggers)
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: data.user.id,
                email,
                is_admin: is_admin || false,
                permissions: permissions || [],
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (profileError) {
            console.error('Error al crear perfil en DB:', profileError);
            // Si el perfil falla, informamos pero el usuario ya existe en Auth
            return new Response(JSON.stringify({ 
                error: 'Usuario creado en Auth pero falló el perfil: ' + profileError.message,
                user: data.user 
            }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true, user: data.user }), { status: 201 });
    } catch (err: any) {
        console.error('Error crítico en POST /api/admin/users:', err);
        return new Response(JSON.stringify({ error: 'Error interno del servidor: ' + err.message }), { status: 500 });
    }
};

// PATCH: Update worker permissions or admin status
export const PATCH: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });

    try {
        const { id, email, permissions, is_admin, password } = await request.json();

        // 1. Upsert Profile (create if missing, update if exists)
        const { error: pError } = await supabase
            .from('profiles')
            .upsert({
                id,
                email, // Ensure email is saved too
                permissions,
                is_admin,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (pError) throw pError;

        // 2. If password provided, update it in Auth
        if (password) {
            const { error: aError } = await supabase.auth.admin.updateUserById(id, {
                password
            });
            if (aError) throw aError;
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};

// DELETE: Remove worker
export const DELETE: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });

    try {
        const { id } = await request.json();

        // 1. Delete Auth user (Cascade will handle profile if foreign key set, 
        // but we'll be explicit as a safety measure)
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError) throw authError;

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
