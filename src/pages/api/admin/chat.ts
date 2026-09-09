import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';
import { insertChatMessage } from '../../../lib/live-chat';

const jsonHeaders = { 'Content-Type': 'application/json' };

function cleanText(value: unknown, max = 1600) {
    return String(value || '').trim().slice(0, max);
}

export const GET: APIRoute = async () => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500, headers: jsonHeaders });

    try {
        const { data: conversations, error } = await supabase
            .from('chat_conversations')
            .select('*')
            .order('last_message_at', { ascending: false });

        if (error) throw error;

        const ids = (conversations || []).map((conversation) => conversation.id);
        let messages: any[] = [];

        if (ids.length > 0) {
            const { data: messagesData, error: messagesError } = await supabase
                .from('chat_messages')
                .select('id, conversation_id, sender, message, created_at')
                .in('conversation_id', ids)
                .order('created_at', { ascending: true });

            if (messagesError) throw messagesError;
            messages = messagesData || [];
        }

        const conversationsWithMessages = (conversations || []).map((conversation) => ({
            ...conversation,
            messages: messages.filter((message) => message.conversation_id === conversation.id),
        }));

        return new Response(JSON.stringify({ conversations: conversationsWithMessages }), {
            status: 200,
            headers: jsonHeaders,
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: jsonHeaders });
    }
};

export const POST: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500, headers: jsonHeaders });

    try {
        const { conversationId, message } = await request.json();
        const id = cleanText(conversationId, 80);
        const reply = cleanText(message);

        if (!id || !reply) {
            return new Response(JSON.stringify({ error: 'Faltan datos de respuesta' }), { status: 400, headers: jsonHeaders });
        }

        const { data: newMessage, error: insertError } = await insertChatMessage(
            supabase,
            {
                conversation_id: id,
                sender: 'admin',
                message: reply,
            },
            id,
        );

        if (insertError) throw insertError;

        const now = new Date().toISOString();
        const { error: updateError } = await supabase
            .from('chat_conversations')
            .update({ status: 'en_curso', last_message_at: now, updated_at: now })
            .eq('id', id);

        if (updateError) {
            const isLegacyStatusConstraint = updateError.code === '23514'
                && String(updateError.message || '').includes('chat_conversations_status_check');

            if (isLegacyStatusConstraint) {
                const { error: legacyUpdateError } = await supabase
                    .from('chat_conversations')
                    .update({ status: 'open', last_message_at: now, updated_at: now })
                    .eq('id', id);

                if (legacyUpdateError) throw legacyUpdateError;
            } else {
                throw updateError;
            }
        }

        return new Response(JSON.stringify({ message: newMessage }), { status: 201, headers: jsonHeaders });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: jsonHeaders });
    }
};

export const PATCH: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500, headers: jsonHeaders });

    try {
        const { conversationId, status } = await request.json();
        const id = cleanText(conversationId, 80);
        const nextStatus = cleanText(status, 20);

        if (!id || !['nuevo', 'en_curso', 'cerrado', 'open', 'closed'].includes(nextStatus)) {
            return new Response(JSON.stringify({ error: 'Estado no valido' }), { status: 400, headers: jsonHeaders });
        }

        const { error } = await supabase
            .from('chat_conversations')
            .update({ status: nextStatus, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            const isLegacyStatusConstraint = error.code === '23514'
                && String(error.message || '').includes('chat_conversations_status_check');
            const legacyStatus = nextStatus === 'cerrado' ? 'closed' : nextStatus === 'en_curso' ? 'open' : null;

            if (isLegacyStatusConstraint && legacyStatus) {
                const { error: legacyError } = await supabase
                    .from('chat_conversations')
                    .update({ status: legacyStatus, updated_at: new Date().toISOString() })
                    .eq('id', id);

                if (legacyError) throw legacyError;
            } else {
                throw error;
            }
        }

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: jsonHeaders });
    }
};

export const DELETE: APIRoute = async ({ request }) => {
    const supabase = getServiceSupabase();
    if (!supabase) return new Response(JSON.stringify({ error: 'Supabase no configurado' }), { status: 500, headers: jsonHeaders });

    try {
        const { conversationId } = await request.json();
        const id = cleanText(conversationId, 80);

        if (!id) {
            return new Response(JSON.stringify({ error: 'Falta el ID' }), { status: 400, headers: jsonHeaders });
        }

        const { error } = await supabase
            .from('chat_conversations')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: jsonHeaders });
    }
};
