import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../lib/supabase';

/**
 * POST /api/chat — Send a chat message or create a conversation
 * Body: { action: 'create' | 'send', visitor_id?, visitor_name?, conversation_id?, message? }
 *
 * GET /api/chat?conversation_id=X — Get messages for a conversation
 * GET /api/chat?list=1 — List all conversations (admin)
 */

export const GET: APIRoute = async ({ url }) => {
    const supabase = getServiceSupabase();
    if (!supabase) {
        return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });
    }

    const conversationId = url.searchParams.get('conversation_id');
    const listAll = url.searchParams.get('list');

    if (listAll) {
        // List all conversations with last message
        const { data, error } = await supabase
            .from('chat_conversations')
            .select('*, chat_messages(message, created_at, sender_type)')
            .order('updated_at', { ascending: false });

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        // Format: include last message
        const conversations = (data || []).map((conv: any) => {
            const msgs = conv.chat_messages || [];
            const lastMsg = msgs.sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];
            return {
                id: conv.id,
                visitor_name: conv.visitor_name,
                status: conv.status,
                created_at: conv.created_at,
                updated_at: conv.updated_at,
                last_message: lastMsg?.message || '',
                last_sender: lastMsg?.sender_type || '',
                unread: msgs.filter((m: any) => m.sender_type === 'visitor').length > 0
            };
        });

        return new Response(JSON.stringify(conversations), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (conversationId) {
        // Get messages for a conversation
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        return new Response(JSON.stringify(data || []), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
};

export const POST: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) {
        return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
        // Create a new conversation
        const { visitor_id, visitor_name } = body;
        if (!visitor_id) {
            return new Response(JSON.stringify({ error: 'visitor_id required' }), { status: 400 });
        }

        // Check if visitor already has an active conversation
        const { data: existing } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('visitor_id', visitor_id)
            .eq('status', 'active')
            .single();

        if (existing) {
            return new Response(JSON.stringify({ conversation_id: existing.id }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { data, error } = await supabase
            .from('chat_conversations')
            .insert({ visitor_id, visitor_name: visitor_name || 'Visitante' })
            .select()
            .single();

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        return new Response(JSON.stringify({ conversation_id: data.id }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (action === 'send') {
        // Send a message
        const { conversation_id, sender_type, message } = body;
        if (!conversation_id || !sender_type || !message) {
            return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
        }

        const { data, error } = await supabase
            .from('chat_messages')
            .insert({ conversation_id, sender_type, message })
            .select()
            .single();

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        // Update conversation timestamp
        await supabase
            .from('chat_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversation_id);

        return new Response(JSON.stringify(data), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
};
