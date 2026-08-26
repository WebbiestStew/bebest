import { Resend } from 'resend';
import { findRecords } from '@/lib/airtable';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const HARDCODED_ADMIN_EMAIL = 'diego@bebest.com';

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
}

// Fires when a new alert is created (no-show streak, missing intake step,
// etc). Best-effort: a missing API key or a send failure is logged and
// swallowed rather than blocking the alert itself from being created.
//
// NOTE: until bebest.com is verified as a sending domain in Resend, the
// account is sandboxed — Resend will only deliver to the single address the
// account was signed up with, and rejects the whole send if any other
// address is in `to`. ALERT_SANDBOX_RECIPIENT overrides the real admin list
// with just that address for as long as we're sandboxed; remove the env var
// once the domain is verified so real admins start receiving alerts again.
export async function sendAlertEmail(alert: AlertEmailInput): Promise<boolean> {
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping alert email');
    return false;
  }

  try {
    const to = process.env.ALERT_SANDBOX_RECIPIENT
      ? [process.env.ALERT_SANDBOX_RECIPIENT]
      : await getAdminEmails();
    if (to.length === 0) return false;

    const { error } = await resend.emails.send({
      from: process.env.ALERT_EMAIL_FROM || 'Consulta <onboarding@resend.dev>',
      to,
      subject: `Nueva alerta: ${alert.pacienteNombre}`,
      html: `
        <div style="font-family: sans-serif; color: #1a1a1a;">
          <h2 style="margin-bottom: 4px;">Nueva alerta en Consulta</h2>
          <p style="color: #555; margin-top: 0;">Generada por ${alert.usuarioNombre}</p>
          <table style="border-collapse: collapse; margin-top: 12px;">
            <tr>
              <td style="padding: 4px 12px 4px 0; color: #777;">Paciente</td>
              <td style="padding: 4px 0; font-weight: 600;">${alert.pacienteNombre}</td>
            </tr>
            <tr>
              <td style="padding: 4px 12px 4px 0; color: #777;">Motivo</td>
              <td style="padding: 4px 0;">${alert.pasoIncompleto}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/alertas">Ver alertas en Consulta →</a>
          </p>
        </div>
      `,
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
