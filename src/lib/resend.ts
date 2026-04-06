import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const defaultFromEmail = import.meta.env.RESEND_FROM_EMAIL || 'info@videomarketingsevilla.es';

export interface ContactFormData {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    message: string;
    adminEmail?: string; // Optional override from settings
}

/** Send contact form notification to admin */
export async function sendContactNotification(data: ContactFormData) {
    const { name, email, phone, company, message, adminEmail } = data;
    const toEmail = adminEmail || defaultFromEmail;

    return resend.emails.send({
        from: defaultFromEmail,
        to: toEmail,
        replyTo: email,
        subject: `Nuevo contacto: ${name}${company ? ` - ${company}` : ''}`,
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #9B1B30;">Nuevo mensaje de contacto</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold;">Nombre:</td><td style="padding: 8px;">${name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${email}</td></tr>
          ${phone ? `<tr><td style="padding: 8px; font-weight: bold;">Teléfono:</td><td style="padding: 8px;">${phone}</td></tr>` : ''}
          ${company ? `<tr><td style="padding: 8px; font-weight: bold;">Empresa:</td><td style="padding: 8px;">${company}</td></tr>` : ''}
        </table>
        <div style="margin-top: 20px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
          <p style="font-weight: bold; margin-bottom: 8px;">Mensaje:</p>
          <p>${message}</p>
        </div>
      </div>
    `
    });
}

/** Send auto-reply to contact */
export async function sendContactAutoReply(data: ContactFormData) {
    return resend.emails.send({
        from: defaultFromEmail,
        to: data.email,
        subject: 'Hemos recibido tu mensaje - VideoMarketing Sevilla',
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #9B1B30;">¡Gracias por contactarnos, ${data.name}!</h2>
        <p>Hemos recibido tu mensaje y te responderemos lo antes posible.</p>
        <p>Si necesitas una respuesta inmediata, puedes contactarnos por WhatsApp.</p>
        <br/>
        <p style="color: #666;">— El equipo de VideoMarketing Sevilla</p>
      </div>
    `
    });
}
