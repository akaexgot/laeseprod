import type { APIRoute } from 'astro';
import { getServiceSupabase } from '../../../lib/supabase';
import { sendOwnerNotification } from '../../../lib/notifications';
import { insertChatConversation, insertChatMessage } from '../../../lib/live-chat';

const jsonHeaders = { 'Content-Type': 'application/json' };
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pendingEmail = 'pendiente@chat.laeseprod.com';
const pendingPhone = 'Pendiente';

function cleanText(value: unknown, max = 200) {
    return String(value || '').trim().slice(0, max);
}

function isValidPhone(value: string) {
    return value.replace(/\D/g, '').length >= 7;
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const supabase = getServiceSupabase();
        const body = await request.json();
        const name = cleanText(body.name, 120);
        const email = cleanText(body.email, 180).toLowerCase();
        const phone = cleanText(body.phone, 60);
        const message = cleanText(body.message, 1600);
        const sourcePath = cleanText(body.sourcePath, 300);
        const userAgent = cleanText(request.headers.get('user-agent'), 300);

        if (!name && !message) {
            return new Response(JSON.stringify({ error: 'Dinos al menos tu nombre para iniciar el chat' }), {
                status: 400,
                headers: jsonHeaders,
            });
        }

        if (email && !emailRegex.test(email)) {
            return new Response(JSON.stringify({ error: 'Email invalido' }), {
                status: 400,
                headers: jsonHeaders,
            });
        }

        if (phone && !isValidPhone(phone)) {
            return new Response(JSON.stringify({ error: 'Telefono invalido' }), {
                status: 400,
                headers: jsonHeaders,
            });
        }

        const initialMessage = message || `Nombre: ${name || 'Visitante'}`;
        const notificationMessage = [
            name ? `Nombre: ${name}` : null,
            email ? `Email: ${email}` : null,
            phone ? `Tel: ${phone}` : null,
            sourcePath ? `Pagina: ${sourcePath}` : null,
            `Mensaje: ${initialMessage.substring(0, 500)}`,
        ].filter(Boolean).join('\n');

        if (!supabase) {
            await sendOwnerNotification('Nuevo chat iniciado', notificationMessage);
            return new Response(JSON.stringify({
                fallback: true,
                message: 'Hemos recibido tus datos. Te contactaremos lo antes posible.',
            }), {
                status: 202,
                headers: jsonHeaders,
            });
        }

        const visitorId = crypto.randomUUID();

        try {
        const { data: conversation, error: conversationError } = await insertChatConversation(
            supabase,
            {
                name: name || null,
                email: email || pendingEmail,
                phone: phone || pendingPhone,
                source_path: sourcePath || null,
                user_agent: userAgent || null,
            },
            {
                visitorId,
                visitorName: name || 'Visitante',
            },
        );

        if (conversationError) throw conversationError;

        const { error: messageError } = await insertChatMessage(
            supabase,
            {
                conversation_id: conversation.id,
                sender: 'visitor',
                message: initialMessage,
            },
            visitorId,
        );

        if (messageError) throw messageError;

        await sendOwnerNotification(
            'Nuevo chat iniciado',
            notificationMessage
        );

        return new Response(JSON.stringify({
            conversation: {
                id: conversation.id,
                token: conversation.client_token,
                name: conversation.name,
                email: conversation.email,
                phone: conversation.phone,
                status: conversation.status,
                created_at: conversation.created_at,
            },
        }), {
            status: 201,
            headers: jsonHeaders,
        });
        } catch (databaseError) {
            console.error('Live chat database fallback:', databaseError);

            const { error: contactError } = await supabase
                .from('contacts')
                .insert({
                    name: name || 'Chat en vivo',
                    email: email || 'chat@laeseprod.com',
                    phone: phone || null,
                    company: 'Chat en vivo',
                    message: `[Chat en vivo - fallback]\n${initialMessage}`,
                });
            if (contactError) {
                console.error('Live chat contact fallback error:', contactError);
            }

            await sendOwnerNotification(
                'Nuevo chat iniciado',
                `${notificationMessage}\n\nAviso: no se pudo crear la conversacion en la tabla de chat.`
            );

            return new Response(JSON.stringify({
                fallback: true,
                message: 'Hemos recibido tus datos. Te contactaremos lo antes posible.',
            }), {
                status: 202,
                headers: jsonHeaders,
            });
        }
    } catch (error: any) {
        console.error('Live chat create error:', error);
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            status: 500,
            headers: jsonHeaders,
        });
    }
};
