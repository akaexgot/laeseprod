import { resend } from './resend';

const PUSHOVER_EMAIL = import.meta.env.PUSHOVER_EMAIL;

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
        await resend.emails.send({
            from: 'VideoMarketing Sevilla <notificaciones@videomarketingsevilla.reviseo.es>',
            to: PUSHOVER_EMAIL,
            subject: title,
            text: message,
        });
        console.log(`Notification sent to Pushover: ${title}`);
    } catch (error) {
        console.error('Error sending Pushover notification:', error);
    }
}
