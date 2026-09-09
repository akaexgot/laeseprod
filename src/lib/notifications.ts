import { resend } from './resend';

function cleanEnvValue(value: unknown) {
    return String(value || '')
        .trim()
        .replace(/^['"]|['"]$/g, '');
}

function cleanEmailValue(value: unknown) {
    return cleanEnvValue(value)
        .replace(/^mailto:/i, '')
        .replace(/\\([@._-])/g, '$1');
}

function truncate(value: string, max: number) {
    return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

const PUSHOVER_EMAIL = cleanEmailValue(import.meta.env.PUSHOVER_EMAIL);
const PUSHOVER_API_TOKEN = cleanEnvValue(import.meta.env.PUSHOVER_API_TOKEN || import.meta.env.PUSHOVER_APP_TOKEN);
const PUSHOVER_USER_KEY = cleanEnvValue(import.meta.env.PUSHOVER_USER_KEY);
const PUSHOVER_DEVICE = cleanEnvValue(import.meta.env.PUSHOVER_DEVICE);
const RESEND_FROM_EMAIL = cleanEmailValue(import.meta.env.RESEND_FROM_EMAIL || 'no-reply@laeseprod.com');
const publicSiteUrl = (import.meta.env.PUBLIC_SITE_URL || 'https://laeseprod.com').replace(/\/+$/, '');

/**
 * Sends a notification to the owner via Pushover.
 * Uses the official Pushover API when configured and falls back to the email bridge.
 */
export async function sendOwnerNotification(title: string, message: string) {
    const formattedMessage = `${message}\n\nPanel: ${publicSiteUrl}/admin`;
    const safeTitle = truncate(`[LaeseProd S.L.] ${title}`, 250);
    const safeMessage = truncate(formattedMessage, 1024);

    if ((PUSHOVER_API_TOKEN || PUSHOVER_USER_KEY) && (!PUSHOVER_API_TOKEN || !PUSHOVER_USER_KEY)) {
        console.warn('Pushover API notification skipped: PUSHOVER_API_TOKEN and PUSHOVER_USER_KEY must both be configured');
    }

    if (PUSHOVER_API_TOKEN && PUSHOVER_USER_KEY) {
        try {
            const params = new URLSearchParams({
                token: PUSHOVER_API_TOKEN,
                user: PUSHOVER_USER_KEY,
                title: safeTitle,
                message: safeMessage,
                priority: '0',
                sound: 'pushover',
                url: `${publicSiteUrl}/admin`,
                url_title: 'Abrir panel de Laese',
            });

            if (PUSHOVER_DEVICE) {
                params.set('device', PUSHOVER_DEVICE);
            }

            const response = await fetch('https://api.pushover.net/1/messages.json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params,
            });

            if (!response.ok) {
                const details = await response.text().catch(() => '');
                throw new Error(`Pushover API returned ${response.status}: ${details}`);
            }

            console.info('Pushover notification sent through API');
            return;
        } catch (error) {
            console.error('Error sending Pushover API notification:', error);
            return;
        }
    }

    if (!PUSHOVER_EMAIL || !import.meta.env.RESEND_API_KEY) {
        console.warn('Pushover notification skipped: Missing PUSHOVER_API_TOKEN/PUSHOVER_USER_KEY or PUSHOVER_EMAIL/RESEND_API_KEY');
        return;
    }

    try {
        const result = await resend.emails.send({
            from: `LaeseProd S.L. <${RESEND_FROM_EMAIL}>`,
            to: PUSHOVER_EMAIL,
            subject: safeTitle,
            text: safeMessage,
        });

        if (result.error) {
            throw new Error(result.error.message);
        }

        if (!result.data?.id) {
            throw new Error('Resend no devolvio un ID de email');
        }

        console.info('Pushover notification sent through email bridge');
    } catch (error) {
        console.error('Error sending Pushover notification:', error);
    }
}
