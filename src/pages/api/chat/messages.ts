import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';
import { sendOwnerNotification } from '../../../lib/notifications';
import { insertChatMessage } from '../../../lib/live-chat';

const jsonHeaders = { 'Content-Type': 'application/json' };

function cleanText(value: unknown, max = 1600) {
    return String(value || '').trim().slice(0, max);
}

function isValidPhone(value: string) {
    return value.replace(/\D/g, '').length >= 7;
}

async function findConversation(id: string, token: string) {
    const supabase = getServiceSupabase();
    if (!supabase) return { supabase: null, conversation: null, error: 'Supabase no configurado' };

    const { data: conversation, error } = await supabase
        .from('chat_conversations')
        .select('id, client_token, name, email, phone, status, created_at')
        .eq('id', id)
        .eq('client_token', token)
        .maybeSingle();

    if (error) return { supabase, conversation: null, error: error.message };
    if (!conversation) return { supabase, conversation: null, error: 'Conversacion no encontrada' };

    return { supabase, conversation, error: null };
}

export const GET: APIRoute = async ({ url }) => {
    const id = cleanText(url.searchParams.get('conversationId'), 80);
    const token = cleanText(url.searchParams.get('token'), 80);

    if (!id || !token) {
        return new Response(JSON.stringify({ error: 'Faltan datos de conversacion' }), {
            status: 400,
            headers: jsonHeaders,
        });
    }

    const { supabase, conversation, error } = await findConversation(id, token);
    if (!supabase) {
        return new Response(JSON.stringify({ error }), { status: 500, headers: jsonHeaders });
    }
    if (!conversation) {
        return new Response(JSON.stringify({ error }), { status: 404, headers: jsonHeaders });
    }

    const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('id, sender, message, created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

    if (messagesError) {
        return new Response(JSON.stringify({ error: messagesError.message }), {
            status: 500,
            headers: jsonHeaders,
        });
    }

    return new Response(JSON.stringify({ conversation, messages: messages || [] }), {
        status: 200,
        headers: jsonHeaders,
    });
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const id = cleanText(body.conversationId, 80);
        const token = cleanText(body.token, 80);
        const message = cleanText(body.message);
        const field = cleanText(body.field, 20);

        if (!id || !token || !message) {
            return new Response(JSON.stringify({ error: 'Faltan datos del mensaje' }), {
                status: 400,
                headers: jsonHeaders,
            });
        }

        const { supabase, conversation, error } = await findConversation(id, token);
        if (!supabase) {
            return new Response(JSON.stringify({ error }), { status: 500, headers: jsonHeaders });
        }
        if (!conversation) {
            return new Response(JSON.stringify({ error }), { status: 404, headers: jsonHeaders });
        }

        if (field === 'phone' && !isValidPhone(message)) {
            return new Response(JSON.stringify({ error: 'Telefono invalido' }), {
                status: 400,
                headers: jsonHeaders,
            });
        }

        const now = new Date().toISOString();
        const { data: newMessage, error: insertError } = await insertChatMessage(
            supabase,
            {
                conversation_id: conversation.id,
                sender: 'visitor',
                message,
            },
            String(conversation.client_token || conversation.id),
        );

        if (insertError) throw insertError;

        const updates: Record<string, string> = {
            status: conversation.status === 'cerrado' ? 'en_curso' : conversation.status,
            last_message_at: now,
            updated_at: now,
        };

        if (field === 'name') updates.name = message;
        if (field === 'phone') updates.phone = message;

        const { error: updateError } = await supabase
            .from('chat_conversations')
            .update(updates)
            .eq('id', conversation.id);

        if (updateError) {
            console.error('Live chat visitor update error:', updateError);
        }

        await sendOwnerNotification(
            'Nuevo mensaje de chat',
            [
                `Nombre: ${conversation.name || 'Visitante'}`,
                `Tel: ${field === 'phone' ? message : conversation.phone || 'telefono pendiente'}`,
                `Mensaje: ${message.substring(0, 500)}`,
            ].join('\n')
        );

        return new Response(JSON.stringify({ message: newMessage }), {
            status: 201,
            headers: jsonHeaders,
        });
    } catch (error: any) {
        console.error('Live chat message error:', error);
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            status: 500,
            headers: jsonHeaders,
        });
    }
};
