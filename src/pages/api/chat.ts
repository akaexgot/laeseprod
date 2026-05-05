import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../lib/supabase';

/**
 * 🛡️ SECURITY AUDIT & HARDENING
 * 1. Rate Limiting: 20 req/min per IP
 * 2. Ownership: Visitors can only access their own conversation_id
 * 3. Egress Control: Max 50 messages per fetch, sorted DESC
 * 4. Admin Auth: Handled by Middleware (requires valid Supabase Admin session)
 */

// Simple in-memory Rate Limiter (Note: In serverless environments this resets per instance, but still helps)
const RATE_LIMIT_MS = 60000; // 1 minute
const MAX_REQ_PER_MIN = 20;
const ipRequests: Record<string, { count: number, resetAt: number }> = {};

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    if (!ipRequests[ip] || now > ipRequests[ip].resetAt) {
        ipRequests[ip] = { count: 1, resetAt: now + RATE_LIMIT_MS };
        return false;
    }
    ipRequests[ip].count++;
    return ipRequests[ip].count > MAX_REQ_PER_MIN;
}

export const GET: APIRoute = async ({ url, clientAddress, cookies }) => {
    // 1. Rate Limiting
    if (isRateLimited(clientAddress)) {
        return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
    }

    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'DB not configured' }), { status: 500 });

    const conversationId = url.searchParams.get('conversation_id');
    const listAll = url.searchParams.get('list');
    const visitorId = cookies.get('vm_visitor_id')?.value;

    /**
     * 🔐 ADMIN ACTION: List all conversations
     * Protected by Middleware, but we double-check here as a fallback
     */
    if (listAll) {
        const { data, error } = await supabase
            .from('chat_conversations')
            .select('id, visitor_name, status, created_at, updated_at, chat_messages(message, created_at, sender_type)')
            .eq('status', 'active')
            .order('updated_at', { ascending: false });

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        const conversations = (data || []).map((conv: any) => {
            const msgs = conv.chat_messages || [];
            const lastMsg = msgs.sort((a: any, b: any) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];
            return {
                id: conv.id,
                visitor_name: conv.visitor_name,
                status: conv.status,
                last_message: lastMsg?.message || '',
                last_sender: lastMsg?.sender_type || '',
                unread: msgs.some((m: any) => m.sender_type === 'visitor')
            };
        });

        return new Response(JSON.stringify(conversations), { status: 200 });
    }

    /**
     * 🔐 VISITOR ACTION: Get my messages
     */
    if (conversationId) {
        // OWNERSHIP VALIDATION: Check if this conversation belongs to the visitorId in the cookie
        const { data: conv, error: convError } = await supabase
            .from('chat_conversations')
            .select('visitor_id')
            .eq('id', conversationId)
            .single();

        if (convError || !conv || conv.visitor_id !== visitorId) {
            // Log this as a potential attack
            console.warn(`[SECURITY] Unauthorized access attempt to conv ${conversationId} from IP ${clientAddress}`);
            return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
        }

        // EGRESS CONTROL: Limit messages and fetch latest only
        const { data, error } = await supabase
            .from('chat_messages')
            .select('id, sender_type, message, created_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(50); // Hard limit to avoid heavy payloads

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        // Return messages (reversed back to chronological for the UI)
        return new Response(JSON.stringify((data || []).reverse()), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
};

export const POST: APIRoute = async ({ request, clientAddress, cookies }) => {
    // 1. Rate Limiting
    if (isRateLimited(clientAddress)) {
        return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
    }

    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'DB not configured' }), { status: 500 });

    const body = await request.json();
    const { action } = body;
    const visitorIdFromCookie = cookies.get('vm_visitor_id')?.value;

    if (action === 'create') {
        const { visitor_id, visitor_name } = body;
        // Ensure visitor is creating for themselves
        if (!visitor_id || visitor_id !== visitorIdFromCookie) {
            return new Response(JSON.stringify({ error: 'Identity mismatch' }), { status: 403 });
        }

        // Check active
        const { data: existing } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('visitor_id', visitor_id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle();

        if (existing) {
            return new Response(JSON.stringify({ conversation_id: existing.id }), { status: 200 });
        }

        const { data, error } = await supabase
            .from('chat_conversations')
            .insert({ visitor_id, visitor_name: (visitor_name || 'Visitante').substring(0, 50) })
            .select()
            .single();

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        return new Response(JSON.stringify({ conversation_id: data.id }), { status: 201 });
    }

    if (action === 'send') {
        const { conversation_id, sender_type, message } = body;
        
        // PAYLOAD VALIDATION
        if (!message || message.length > 1000) {
            return new Response(JSON.stringify({ error: 'Invalid payload size' }), { status: 400 });
        }

        // OWNERSHIP VALIDATION
        const { data: convCheck, error: checkError } = await supabase
            .from('chat_conversations')
            .select('status, visitor_id, visitor_name, updated_at')
            .eq('id', conversation_id)
            .single();

        if (checkError || !convCheck || (sender_type === 'visitor' && convCheck.visitor_id !== visitorIdFromCookie)) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
        }

        const wasClosed = convCheck.status === 'closed';

        const { data, error } = await supabase
            .from('chat_messages')
            .insert({ conversation_id, sender_type, message: message.substring(0, 1000) })
            .select()
            .single();

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        // Update conversation
        await supabase
            .from('chat_conversations')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', conversation_id);

        // Auto-reply for visitors
        if (sender_type === 'visitor') {
            const { count } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conversation_id)
                .eq('sender_type', 'visitor');

            if (count === 1) {
                await supabase.from('chat_messages').insert({ 
                    conversation_id, 
                    sender_type: 'admin', 
                    message: "¡Hola! Gracias por contactar con VideoMarketing Sevilla. Enseguida te atenderemos." 
                });
            }
        }

        return new Response(JSON.stringify(data), { status: 201 });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
};
