import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/auth';
import { createPasswordResetToken } from '@/lib/passwordReset';
import { sendPasswordResetEmail } from '@/lib/email';
import { reportServerError } from '@/lib/errorMonitor';
import { checkRateLimit, recordFailedLogin } from '@/lib/rateLimit';

// Always returns the same generic message regardless of whether the email
// matched an account — otherwise the response itself would let someone probe
// which emails have accounts here.
const GENERIC_RESPONSE = {
  message: 'Si ese correo tiene una cuenta, te enviamos un enlace para restablecer tu contraseña.',
};

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Correo requerido' }, { status: 400 });
    }

    // Reuses the login rate limiter keyed by "forgot:<email>" so this can't
    // be used to spam an inbox or hammer Airtable lookups either.
    const rateLimitKey = `forgot:${email}`;
    const rateLimit = await checkRateLimit(rateLimitKey);
    if (rateLimit.blocked) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
    }

    // Counts toward the rate limit every time, whether or not the email
    // matches an account — otherwise this endpoint could be used to spam a
    // real user's inbox with reset emails without ever tripping the limiter.
    await recordFailedLogin(rateLimitKey);

    const user = await findUserByEmail(email);

    // The hardcoded admin account's password lives in an env var, not
    // Airtable — there's no record for reset-password to update, so it's
    // deliberately excluded here (silently, to avoid confirming the email
    // exists at all).
    if (user && user.id.startsWith('rec')) {
      const token = await createPasswordResetToken(user.id, user.email);
      // NEXT_PUBLIC_APP_URL isn't set in local dev, and the fallback below
      // goes straight into an email — a recipient's inbox can never reach
      // localhost, so the fallback is the real deployed URL, not localhost,
      // even though every other "not set locally" fallback in this app
      // would normally be localhost.
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bebest.vercel.app';
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, user.nombre, resetUrl);
    }

    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  } catch (error) {
    reportServerError('POST /api/auth/forgot-password', error);
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }
}
