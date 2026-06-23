import nodemailer from "nodemailer";
import { Resend } from "resend";
import { logger } from "./logger";

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getSmtpTransport(): ReturnType<typeof nodemailer.createTransport> | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const resend = getResendClient();

  if (resend) {
    const from = process.env.RESEND_FROM ?? "Clientum <noreply@clientum.com.ar>";
    try {
      await resend.emails.send({ from, to: opts.to, subject: opts.subject, html: opts.html });
    } catch (err) {
      logger.error({ err, to: opts.to, subject: opts.subject }, "Resend email failed");
    }
    return;
  }

  const transport = getSmtpTransport();
  if (!transport) {
    logger.warn({ to: opts.to, subject: opts.subject }, "Email not sent: no RESEND_API_KEY or SMTP config found");
    return;
  }
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "no-reply@clientum.com.ar";
  try {
    await transport.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html });
  } catch (err) {
    logger.error({ err, to: opts.to, subject: opts.subject }, "SMTP email failed");
  }
}

export async function sendWelcomeEmail(to: string, name: string, trialDays: number): Promise<void> {
  await sendEmail({
    to,
    subject: "¡Bienvenido/a a Clientum! Tu prueba gratuita comenzó",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#0D2461;">¡Hola, ${name || "bienvenido/a"}! 👋</h1>
        <p>Tu cuenta de <strong>Clientum</strong> ya está activa.</p>
        <p>Tenés <strong>${trialDays} días de prueba gratuita</strong> en el plan Starter para explorar todas las funciones: chatbot con IA, CRM, widget web y más.</p>
        <div style="margin:24px 0;padding:16px;background:#f4f7fc;border-radius:12px;">
          <p style="margin:0;font-weight:bold;color:#0D2461;">¿Qué podés hacer ahora?</p>
          <ul style="color:#444;margin-top:8px;">
            <li>Configurar tu chatbot de IA</li>
            <li>Conectar WhatsApp Business</li>
            <li>Instalar el widget en tu sitio web</li>
          </ul>
        </div>
        <a href="https://clientum.com.ar/app" style="display:inline-block;padding:12px 24px;background:#1A3A80;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">
          Ir al Dashboard →
        </a>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#9ca3af;">Clientum · IA para PyMEs · <a href="https://wa.me/5492984510883">WhatsApp</a></p>
      </div>
    `,
  });
}

export async function sendTrialExpiringEmail(to: string, name: string, daysLeft: number): Promise<void> {
  await sendEmail({
    to,
    subject: `Tu prueba gratuita de Clientum vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#dc2626;">⏰ Tu prueba está por vencer</h1>
        <p>Hola ${name || ""},</p>
        <p>Te quedan <strong>${daysLeft} día${daysLeft !== 1 ? "s" : ""}</strong> de prueba gratuita en Clientum.</p>
        <p>Para no perder acceso al chatbot, CRM y el widget, suscribite ahora:</p>
        <a href="https://clientum.com.ar/app/cuenta" style="display:inline-block;padding:12px 24px;background:#1A3A80;color:white;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
          Ver planes →
        </a>
        <p style="font-size:12px;color:#9ca3af;">Clientum · IA para PyMEs</p>
      </div>
    `,
  });
}

export function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string): Promise<void> {
  await sendEmail({
    to: toEmail,
    subject: "Recuperar contraseña — Clientum",
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#0D2461;padding:28px 40px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1px;">CLIENTUM</p>
            <p style="margin:4px 0 0;color:#93c5fd;font-size:12px;">IA para PyMEs</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Recuperar contraseña</h1>
            <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
              Recibimos una solicitud para restablecer la contraseña de la cuenta asociada a <strong style="color:#111827;">${toEmail}</strong>.
            </p>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
              El enlace es válido por <strong style="color:#111827;">30 minutos</strong>.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
              <tr>
                <td style="background:#E8470A;border-radius:10px;">
                  <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                    Restablecer contraseña
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;line-height:1.5;">
              Si no solicitaste este cambio, ignorá este email. Tu contraseña no se modificará.
            </p>
            <p style="margin:0;font-size:12px;color:#d1d5db;word-break:break-all;">
              O copiá este enlace:<br/>
              <a href="${resetUrl}" style="color:#6b7280;">${resetUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:18px 40px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Clientum · IA para PyMEs</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  });
}

export async function sendPlanExpiredEmail(to: string, name: string, plan: string): Promise<void> {
  const planNames: Record<string, string> = { starter: "Starter", pro: "Pro", business: "Business", enterprise: "Enterprise" };
  await sendEmail({
    to,
    subject: "Tu suscripción a Clientum venció — pasaste al plan Free",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <div style="background:#0D2461;padding:20px 24px;border-radius:12px 12px 0 0;">
          <p style="margin:0;color:#fff;font-size:16px;font-weight:700;letter-spacing:1px;">CLIENTUM</p>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:12px;">IA para PyMEs</p>
        </div>
        <div style="padding:28px 24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h1 style="margin:0 0 12px;font-size:20px;color:#111827;">Tu plan ${planNames[plan] ?? plan} venció</h1>
          <p style="color:#6b7280;line-height:1.6;">Hola${name ? ` ${name}` : ""},</p>
          <p style="color:#6b7280;line-height:1.6;">
            Tu suscripción al plan <strong style="color:#111827;">${planNames[plan] ?? plan}</strong> venció y tu cuenta pasó automáticamente al <strong style="color:#111827;">plan Free</strong>.
          </p>
          <p style="color:#6b7280;line-height:1.6;">Podés renovar tu suscripción en cualquier momento desde el dashboard para recuperar todas las funciones.</p>
          <div style="margin:24px 0;">
            <a href="https://clientum.com.ar/app/cuenta"
               style="display:inline-block;padding:13px 28px;background:#1A3A80;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
              Renovar suscripción →
            </a>
          </div>
          <p style="font-size:12px;color:#9ca3af;margin:0;">
            ¿Tenés alguna duda? Escribinos por <a href="https://wa.me/5492984510883" style="color:#1A3A80;">WhatsApp</a>.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendWidgetActivatedEmail(to: string, name: string): Promise<void> {
  await sendEmail({
    to,
    subject: "🎉 Tu chatbot de Clientum está activo",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <div style="background:#0D2461;padding:20px 24px;border-radius:12px 12px 0 0;">
          <p style="margin:0;color:#fff;font-size:16px;font-weight:700;letter-spacing:1px;">CLIENTUM</p>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:12px;">IA para PyMEs</p>
        </div>
        <div style="padding:28px 24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h1 style="margin:0 0 12px;font-size:20px;color:#111827;">🎉 Tu chatbot está activo</h1>
          <p style="color:#6b7280;line-height:1.6;">Hola${name ? ` ${name}` : ""},</p>
          <p style="color:#6b7280;line-height:1.6;">
            Tu chatbot de IA ya está funcionando. Desde el dashboard podés ver las conversaciones, configurar la base de conocimiento y conectar WhatsApp.
          </p>
          <div style="margin:20px 0;padding:16px;background:#f0f7ff;border-radius:10px;">
            <p style="margin:0 0 8px;font-weight:700;color:#0D2461;font-size:13px;">Próximos pasos</p>
            <ul style="margin:0;padding-left:18px;color:#374151;font-size:14px;line-height:1.8;">
              <li>Cargá tu base de conocimiento con información de tu negocio</li>
              <li>Personalizá el nombre y color del widget</li>
              <li>Instalá el widget en tu sitio web</li>
              <li>Conectá WhatsApp Business para responder por ese canal</li>
            </ul>
          </div>
          <a href="https://clientum.com.ar/app"
             style="display:inline-block;padding:13px 28px;background:#1A3A80;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
            Ir al Dashboard →
          </a>
          <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;">
            ¿Necesitás ayuda? <a href="https://wa.me/5492984510883" style="color:#1A3A80;">Escribinos por WhatsApp</a>.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendPaymentConfirmEmail(to: string, name: string, plan: string, amount: number): Promise<void> {
  const planNames: Record<string, string> = { starter: "Starter", pro: "Pro", business: "Business", enterprise: "Enterprise" };
  await sendEmail({
    to,
    subject: "✅ Pago confirmado — Clientum",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h1 style="color:#16a34a;">✅ ¡Pago confirmado!</h1>
        <p>Hola ${name || ""},</p>
        <p>Tu suscripción al plan <strong>${planNames[plan] ?? plan}</strong> está activa.</p>
        <p style="color:#6b7280;">Monto: <strong>$${amount?.toLocaleString("es-AR") ?? "—"} ARS</strong></p>
        <a href="https://clientum.com.ar/app" style="display:inline-block;padding:12px 24px;background:#1A3A80;color:white;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
          Ir al Dashboard →
        </a>
        <p style="font-size:12px;color:#9ca3af;">Clientum · IA para PyMEs</p>
      </div>
    `,
  });
}
