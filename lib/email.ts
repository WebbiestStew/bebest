import { Resend } from 'resend';
import { findRecords } from '@/lib/airtable';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// This is the notification recipient, not a login credential — unrelated to
// HARDCODED_ADMIN.email in lib/auth.ts (diego@bebest.com), which is the
// login identifier and doesn't actually receive mail anywhere. Kept as
// Diego's real inbox instead, so admin notifications (alerts, sugerencias)
// have somewhere to actually land now that ALERT_SANDBOX_RECIPIENT is gone.
const HARDCODED_ADMIN_EMAIL = 'dvillarreal@bebest.mx';

// Shared visual shell for every outbound email — matches the app's actual
// palette (tailwind.config.js) and serif/sans pairing instead of the
// unstyled default browser look. Email clients strip <style> blocks and
// external fonts unreliably, so everything here is inline and falls back to
// system fonts on purpose.
function emailLayout({
  eyebrow,
  title,
  bodyHtml,
  ctaHref,
  ctaLabel,
}: {
  eyebrow: string;
  title: string;
  bodyHtml: string;
  ctaHref?: string;
  ctaLabel?: string;
}): string {
  return `
    <div style="background:#F6F3EC;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #E3DDCE;border-radius:16px;overflow:hidden;">
        <div style="height:4px;line-height:4px;font-size:0;background:#709527;">&nbsp;</div>
        <div style="padding:36px 36px 32px;">
          <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;color:#435E1C;text-transform:uppercase;margin:0 0 22px;">
            Consulta
          </div>
          <div style="font-size:11px;font-weight:600;letter-spacing:0.1em;color:#5B6B62;text-transform:uppercase;margin:0 0 8px;">
            ${eyebrow}
          </div>
          <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:600;color:#24312B;margin:0 0 16px;">
            ${title}
          </h1>
          <div style="font-size:15px;line-height:1.6;color:#5B6B62;">
            ${bodyHtml}
          </div>
          ${
            ctaHref
              ? `<div style="margin-top:28px;">
                  <a href="${ctaHref}" style="display:inline-block;background:#435E1C;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;padding:12px 26px;border-radius:999px;">
                    ${ctaLabel}
                  </a>
                </div>`
              : ''
          }
        </div>
        <div style="border-top:1px solid #E3DDCE;padding:16px 36px;">
          <p style="font-size:12px;color:#5B6B62;margin:0;">Consulta &middot; panel interno de bebest</p>
        </div>
      </div>
    </div>
  `;
}

// Everyone who should hear about a new alert: the hardcoded admin account
// plus any Airtable user with an admin/developer role.
async function getAdminEmails(): Promise<string[]> {
  const users = await findRecords<any>('users', "OR({Rol} = 'admin', {Rol} = 'developer')");
  const emails = new Set<string>([HARDCODED_ADMIN_EMAIL, ...users.map((u) => u.Email).filter(Boolean)]);
  return Array.from(emails);
}

interface AlertEmailInput {
  pacienteNombre: string;
  pasoIncompleto: string;
  usuarioNombre: string;
  // The assigned therapist's own email, when known — added to the admin
  // recipient list so they hear about it too, not just admins.
  terapeutaEmail?: string;
}

// Fires when a new alert is created (no-show streak, missing intake step,
// etc). Best-effort: a missing API key or a send failure is logged and
// swallowed rather than blocking the alert itself from being created.
export async function sendAlertEmail(alert: AlertEmailInput): Promise<boolean> {
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping alert email');
    return false;
  }

  try {
    const to = Array.from(new Set([...(await getAdminEmails()), ...(alert.terapeutaEmail ? [alert.terapeutaEmail] : [])]));
    if (to.length === 0) return false;

    const { error } = await resend.emails.send({
      from: process.env.ALERT_EMAIL_FROM || 'Consulta <onboarding@resend.dev>',
      to,
      subject: `Nueva alerta: ${alert.pacienteNombre}`,
      html: emailLayout({
        eyebrow: 'Nueva alerta',
        title: alert.pacienteNombre,
        bodyHtml: `
          <p style="margin:0 0 16px;">Generada por ${alert.usuarioNombre}</p>
          <div style="background:#F6F3EC;border-left:3px solid #709527;border-radius:8px;padding:14px 16px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#24312B;">
              <tr>
                <td style="padding:4px 12px 4px 0;color:#5B6B62;">Paciente</td>
                <td style="padding:4px 0;font-weight:600;">${alert.pacienteNombre}</td>
              </tr>
              <tr>
                <td style="padding:4px 12px 4px 0;color:#5B6B62;">Motivo</td>
                <td style="padding:4px 0;">${alert.pasoIncompleto}</td>
              </tr>
            </table>
          </div>
        `,
        ctaHref: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/alertas`,
        ctaLabel: 'Ver alertas →',
      }),
    });

    if (error) {
      console.error('Resend rejected alert email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending alert email:', error);
    return false;
  }
}

interface SugerenciaEmailInput {
  mensaje: string;
  usuarioNombre: string;
  usuarioRol: string;
  pagina?: string;
}

// Fires when someone submits a new sugerencia, so admins don't have to keep
// checking the page for new ones. Same best-effort caveat as sendAlertEmail
// above.
export async function sendSugerenciaEmail(input: SugerenciaEmailInput): Promise<boolean> {
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping sugerencia email');
    return false;
  }

  try {
    const to = await getAdminEmails();
    if (to.length === 0) return false;

    const { error } = await resend.emails.send({
      from: process.env.ALERT_EMAIL_FROM || 'Consulta <onboarding@resend.dev>',
      to,
      subject: `Nueva sugerencia de ${input.usuarioNombre}`,
      html: emailLayout({
        eyebrow: 'Nueva sugerencia',
        title: `De ${input.usuarioNombre}`,
        bodyHtml: `
          <p style="margin:0 0 4px;color:#24312B;">
            <span style="font-weight:600;">${input.usuarioNombre}</span>
            <span style="color:#5B6B62;"> · ${input.usuarioRol}</span>
          </p>
          <div style="background:#F6F3EC;border-left:3px solid #709527;border-radius:8px;padding:16px;margin-top:12px;white-space:pre-wrap;color:#24312B;">
            ${input.mensaje}
          </div>
          ${input.pagina ? `<p style="font-size:13px;color:#5B6B62;margin-top:14px;">Enviada desde: ${input.pagina}</p>` : ''}
        `,
        ctaHref: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sugerencias`,
        ctaLabel: 'Ver sugerencias →',
      }),
    });

    if (error) {
      console.error('Resend rejected sugerencia email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending sugerencia email:', error);
    return false;
  }
}

// Sends a 2FA one-time code to the account's own login email. Delivery
// itself is unrestricted now that bebest.com is a verified sending domain —
// but REQUIRE_2FA stays off regardless (see app/api/auth/login/route.ts):
// the hardcoded admin account logs in as diego@bebest.com, and that address
// doesn't receive mail anywhere, so turning 2FA on would lock that account
// out on its own login code.
export async function sendTwoFactorCode(to: string, nombre: string, code: string): Promise<boolean> {
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping 2FA email');
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.ALERT_EMAIL_FROM || 'Consulta <onboarding@resend.dev>',
      to: [to],
      subject: `Tu código de acceso: ${code}`,
      html: emailLayout({
        eyebrow: 'Código de acceso',
        title: 'Tu código de verificación',
        bodyHtml: `
          <p style="margin:0 0 20px;">Hola ${nombre}, usa este código para iniciar sesión en Consulta:</p>
          <div style="text-align:center;background:#EEF6D9;border-radius:12px;padding:22px;margin:0 0 20px;">
            <span style="font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:700;letter-spacing:8px;color:#435E1C;">${code}</span>
          </div>
          <p style="font-size:13px;color:#5B6B62;margin:0;">Expira en 10 minutos. Si no intentaste iniciar sesión, ignora este correo.</p>
        `,
      }),
    });

    if (error) {
      console.error('Resend rejected 2FA email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending 2FA email:', error);
    return false;
  }
}

// Fires the day before a scheduled cita (see app/api/cron/reminders/route.ts).
export async function sendAppointmentReminderEmail(input: {
  to: string;
  pacienteNombre: string;
  fecha: string;
  hora: string;
  terapeuta?: string;
}): Promise<boolean> {
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping reminder email');
    return false;
  }

  try {
    const fechaFormateada = new Date(input.fecha).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });

    const { error } = await resend.emails.send({
      from: process.env.ALERT_EMAIL_FROM || 'Consulta <onboarding@resend.dev>',
      to: [input.to],
      subject: `Recordatorio: tu cita mañana a las ${input.hora}`,
      html: emailLayout({
        eyebrow: 'Recordatorio de cita',
        title: `Tu cita es mañana a las ${input.hora}`,
        bodyHtml: `
          <p style="margin:0 0 16px;">Hola ${input.pacienteNombre}, tienes una cita programada:</p>
          <div style="background:#F6F3EC;border-left:3px solid #709527;border-radius:8px;padding:14px 16px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#24312B;">
              <tr>
                <td style="padding:4px 12px 4px 0;color:#5B6B62;">Fecha</td>
                <td style="padding:4px 0;font-weight:600;">${fechaFormateada}</td>
              </tr>
              <tr>
                <td style="padding:4px 12px 4px 0;color:#5B6B62;">Hora</td>
                <td style="padding:4px 0;font-weight:600;">${input.hora}</td>
              </tr>
              ${
                input.terapeuta
                  ? `<tr><td style="padding:4px 12px 4px 0;color:#5B6B62;">Terapeuta</td><td style="padding:4px 0;">${input.terapeuta}</td></tr>`
                  : ''
              }
            </table>
          </div>
          <p style="font-size:13px;color:#5B6B62;margin-top:20px;">Si necesitas reagendar, contáctanos lo antes posible.</p>
        `,
      }),
    });

    if (error) {
      console.error('Resend rejected reminder email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending reminder email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, nombre: string, resetUrl: string): Promise<boolean> {
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping password reset email');
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.ALERT_EMAIL_FROM || 'Consulta <onboarding@resend.dev>',
      to: [to],
      subject: 'Restablece tu contraseña',
      html: emailLayout({
        eyebrow: 'Restablecer contraseña',
        title: 'Restablece tu contraseña',
        bodyHtml: `
          <p style="margin:0 0 4px;">Hola ${nombre}, solicitaste restablecer tu contraseña en Consulta.</p>
          <p style="font-size:13px;color:#5B6B62;margin-top:20px;">Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.</p>
        `,
        ctaHref: resetUrl,
        ctaLabel: 'Restablecer contraseña',
      }),
    });

    if (error) {
      console.error('Resend rejected password reset email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}
