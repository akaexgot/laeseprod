/**
 * Contact Form API Endpoint
 * POST /api/contact
 */
import type { APIRoute } from 'astro';
import { validateCaptcha } from '../../lib/captcha';

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const {
            name,
            email,
            phone,
            idea,
            captchaToken,
            captchaAnswer,
            "cf-turnstile-response": turnstileToken,
            website,
            formStartedAt,
        } = data;

        if (!await validateCaptcha({ token: captchaToken, answer: captchaAnswer, website, startedAt: formStartedAt, turnstileToken })) {
            return new Response(JSON.stringify({ error: 'Verificacion anti-spam incorrecta' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Validate required fields
        if (!name || !email || !phone) {
            return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(JSON.stringify({ error: 'Email inválido' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Store in Supabase (if configured)
        const { getServiceSupabase } = await import('../../lib/supabase');
        const supabase = getServiceSupabase();
        if (supabase) {
            await supabase.from('contacts').insert({
                name,
                email,
                phone: phone || null,
                idea: idea || null,
            });
        }

        // Send email notifications (if Resend is configured)
        if (import.meta.env.RESEND_API_KEY) {
            const { getSettings } = await import('../../lib/data');
            const settings = await getSettings();
            const { sendContactNotification, sendContactAutoReply } = await import('../../lib/resend');
            const { sendOwnerNotification } = await import('../../lib/notifications');
            
            await Promise.allSettled([
                sendContactNotification({ 
                    name, email, phone, idea,
                    adminEmail: settings.email 
                }),
                sendContactAutoReply({ name, email, phone, idea }),
                sendOwnerNotification(
                    `Nuevo Lead: ${name}`,
                    `Mensaje de ${name} (${email}).\nTel: ${phone}\n${String(idea || 'Sin idea descrita').substring(0, 100)}`
                )
            ]);
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Contact form error:', error);
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
