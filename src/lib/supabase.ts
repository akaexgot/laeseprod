import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Supabase client — returns null if not configured
 * This allows the site to run with fallback data during development
 */
export const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Server-side Supabase client with service role key
 * Use this for admin operations only
 */
export function getServiceSupabase(): SupabaseClient | null {
    const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceKey) return null;
    return createClient(supabaseUrl, serviceKey);
}
