import { Resend } from 'resend';
import { findRecords } from './airtable';

// Lightweight error monitoring built on the Resend setup already in the app,
// rather than adding a new third-party account (e.g. Sentry) that would need
// its own signup before doing anything useful. This won't give stack traces,
// breadcrumbs, or a dashboard the way Sentry would — it emails an admin the
// moment something breaks on a route that calls it, which is the actually
// load-bearing gap right now (errors currently only go to console.error,
// which nobody is watching). Wired into the auth routes first since that's
// the most security-sensitive surface; extending it to more routes is just
// adding the same one-line call to their catch blocks.

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const HARDCODED_ADMIN_EMAIL = 'diego@bebest.com';

async function getAdminEmails(): Promise<string[]> {
  try {
    const users = await findRecords<any>('users', "OR({Rol} = 'admin', {Rol} = 'developer')");
    return Array.from(new Set([HARDCODED_ADMIN_EMAIL, ...users.map((u) => u.Email).filter(Boolean)]));
  } catch {
    return [HARDCODED_ADMIN_EMAIL];
  }
}

// Fire-and-forget: never awaited by callers in a way that blocks the actual
// error response, and never throws itself — a broken monitor shouldn't take
// down the route it's supposed to be watching.
export function reportServerError(context: string, error: unknown): void {
  console.error(`[${context}]`, error);

  if (!resend) return; // no key configured — console.error is still there

  const to = process.env.ALERT_SANDBOX_RECIPIENT ? [process.env.ALERT_SANDBOX_RECIPIENT] : null;
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  (async () => {
    try {
      const recipients = to || (await getAdminEmails());
      if (recipients.length === 0) return;

      await resend!.emails.send({
        from: process.env.ALERT_EMAIL_FROM || 'Consulta <onboarding@resend.dev>',
        to: recipients,
        subject: `⚠ Error en Consulta: ${context}`,
        html: `
          <div style="font-family: sans-serif; color: #1a1a1a;">
            <h2 style="margin-bottom: 4px;">Error inesperado</h2>
            <p style="color: #555; margin-top: 0;">Ruta/contexto: <code>${context}</code></p>
            <pre style="background: #f4f4f4; padding: 12px; border-radius: 6px; white-space: pre-wrap; font-size: 13px;">${message}${
              stack ? '\n\n' + stack : ''
            }</pre>
          </div>
        `,
      });
    } catch (sendError) {
      console.error('Error reporting server error via email:', sendError);
    }
  })();
}
