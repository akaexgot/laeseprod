import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';

export const GET: APIRoute = async () => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500 });
    
    try {
        // 1. Get unread messages count (Contacts)
        const { count: unreadMessages } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'nuevo');

        // 2. Get active chats count
        const { count: activeChats } = await supabase
            .from('chat_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        return new Response(JSON.stringify({
            messages: unreadMessages || 0,
            chats: activeChats || 0
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
