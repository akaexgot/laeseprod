import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const defaultFromEmail = 'no-reply@videomarketingsevilla.com';

export interface ContactFormData {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    message: string;
    adminEmail?: string;
}

const EMAIL_STYLES = `
  body { margin: 0; padding: 0; background-color: #f7f9fa; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  .email-wrapper { width: 100%; table-layout: fixed; background-color: #f7f9fa; padding: 40px 20px; box-sizing: border-box; }
  .email-content { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: left; }
  .email-header { background-color: #1A1A1A; padding: 30px; text-align: center; }
  .email-header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
  .email-header span { color: #E8364F; }
  .email-body { padding: 40px 30px; color: #333333; line-height: 1.6; }
  .email-title { font-size: 20px; font-weight: 600; color: #1A1A1A; margin-top: 0; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px; margin-bottom: 25px; }
  .data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
  .data-table td { padding: 12px 15px; border-bottom: 1px solid #f0f0f0; }
  .data-label { width: 35%; font-weight: 600; color: #666666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
  .data-value { width: 65%; color: #1A1A1A; font-weight: 500; font-size: 15px;}
  .message-box { background-color: #f9f9f9; border-left: 4px solid #E8364F; padding: 20px; border-radius: 0 8px 8px 0; margin-top: 10px; font-style: italic; color: #444444; }
  .email-footer { background-color: #f5f5f5; padding: 25px; text-align: center; color: #888888; font-size: 13px; border-top: 1px solid #eeeeee; }
  .cta-button { display: inline-block; padding: 14px 28px; background-color: #E8364F; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; margin-bottom: 10px; text-align: center; }
`;

function getEmailShell(title: string, contentHtml: string) {
    return `<!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>${EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="email-wrapper">
        <table align="center" class="email-content" style="width:100%; max-width:600px; border-spacing: 0;">
          <tr>
            <td class="email-header">
              <h1>VideoMarketing <span>Sevilla</span></h1>
            </td>
          </tr>
          <tr>
            <td class="email-body">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td class="email-footer">
              <p>Este es un mensaje automático generado desde tu sitio web.</p>
              <p>&copy; ${new Date().getFullYear()} VideoMarketing Sevilla</p>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>`;
}

/** Notificación al Administrador (Formulario Contacto) */
export async function sendContactNotification(data: ContactFormData) {
    const { name, email, phone, company, message, adminEmail } = data;
    const toEmail = adminEmail || 'info@videomarketingsevilla.es';

    const content = `
        <h2 class="email-title">Nueva Solicitud de Presupuesto</h2>
        <table class="data-table">
          <tr><td class="data-label">Nombre</td><td class="data-value">${name}</td></tr>
          <tr><td class="data-label">Email</td><td class="data-value"><a href="mailto:${email}" style="color: #E8364F; text-decoration: none;">${email}</a></td></tr>
          ${phone ? `<tr><td class="data-label">Teléfono</td><td class="data-value">${phone}</td></tr>` : ''}
          ${company ? `<tr><td class="data-label">Empresa</td><td class="data-value">${company}</td></tr>` : ''}
        </table>
        <p style="font-weight: 600; color: #1A1A1A; margin-bottom: 5px;">Cuerpo del mensaje:</p>
        <div class="message-box">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <div style="text-align: center; margin-top: 30px;">
           <a href="mailto:${email}" class="cta-button">Responder de inmediato</a>
        </div>
    `;

    return resend.emails.send({
        from: `VideoMarketing Sevilla <${defaultFromEmail}>`,
        to: toEmail,
        replyTo: email,
        subject: `🔥 Nuevo Lead Web: ${name}${company ? ` (${company})` : ''}`,
        html: getEmailShell('Nuevo mensaje de contacto', content)
    });
}

/** Notificación al Administrador (Chat en Vivo) */
export async function sendChatNotification(visitorName: string, message: string, adminEmail: string) {
    const toEmail = adminEmail || 'info@videomarketingsevilla.es';

    const content = `
        <h2 class="email-title">¡Alguien te ha escrito por el Chat!</h2>
        <p style="font-size: 16px; margin-bottom: 20px;">Un visitante llamado <strong>${visitorName}</strong> acaba de iniciar una conversación de chat en tu página web y está esperando respuesta en tiempo real.</p>
        
        <p style="font-weight: 600; color: #1A1A1A; margin-bottom: 5px;">Primer mensaje del cliente:</p>
        <div class="message-box">
          ${message.replace(/\n/g, '<br>')}
        </div>
        
        <div style="text-align: center; margin-top: 40px;">
           <a href="https://videomarketingsevilla.com/admin" class="cta-button">Abrir Panel de Control</a>
           <p style="font-size: 13px; color: #888; margin-top: 10px;">Inicia sesión para responder a ${visitorName} directamente desde el panel.</p>
        </div>
    `;

    return resend.emails.send({
        from: `Chat en Vivo <${defaultFromEmail}>`,
        to: toEmail,
        subject: `💬 Nuevo chat web: ${visitorName}`,
        html: getEmailShell('Nuevo chat iniciado', content)
    });
}

/** Auto-respuesta cordial de Cortesía al Cliente */
export async function sendContactAutoReply(data: ContactFormData) {
    const content = `
        <h2 class="email-title" style="border: none;">¡Gracias por contactarnos, ${data.name}!</h2>
        <p>Hemos recibido tu mensaje de forma exitosa y estamos analizándolo con detenimiento en nuestras oficinas.</p>
        <p>Nuestro equipo contactará contigo lo antes posible con una respuesta totalmente a medida para tu caso.</p>
        <br/>
        <p style="font-size: 15px; color: #E8364F; font-weight: 600;">¿Necesitas urgencia?</p>
        <p>Puedes escribirnos directamente a nuestro WhatsApp oficial para agilizar cualquier detalle previo.</p>
        <br/>
        <p style="color: #666; font-style: italic;">— Producción Visual VideoMarketing Sevilla</p>
    `;

    return resend.emails.send({
        from: `VideoMarketing Sevilla <${defaultFromEmail}>`,
        to: data.email,
        subject: 'Hemos recibido tu solicitud de presupuesto',
        html: getEmailShell('Notificación VideoMarketing Sevilla', content)
    });
}
