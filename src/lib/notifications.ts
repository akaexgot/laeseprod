import { resend } from './resend';

const PUSHOVER_EMAIL = import.meta.env.PUSHOVER_EMAIL;
const publicSiteUrl = (import.meta.env.PUBLIC_SITE_URL || 'https://laeseprod.com').replace(/\/+$/, '');

/**
 * Sends a notification to the owner via Pushover (using the email-to-notification bridge).
 * @param title Short title for the notification
 * @param message The main content of the notification
 */
export async function sendOwnerNotification(title: string, message: string) {
    if (!PUSHOVER_EMAIL || !import.meta.env.RESEND_API_KEY) {
        console.warn('Pushover notification skipped: Missing PUSHOVER_EMAIL or RESEND_API_KEY');
        return;
    }

    try {
        const formattedMessage = `${message}\n\nPanel: ${publicSiteUrl}/admin`;

        await resend.emails.send({
            from: `LaeseProd S.L. <${import.meta.env.RESEND_FROM_EMAIL || 'no-reply@laeseprod.com'}>`,
            to: PUSHOVER_EMAIL,
            subject: `[LaeseProd S.L.] ${title}`,
            text: formattedMessage,
        });
    } catch (error) {
        console.error('Error sending Pushover notification:', error);
    }
}
