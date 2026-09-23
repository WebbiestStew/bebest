import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials } from '@/lib/auth';
import { createSessionToken, SESSION_MAX_AGE_SECONDS } from '@/lib/session';
import { createPendingTwoFactorToken, generateTwoFactorCode } from '@/lib/twoFactor';
import { sendTwoFactorCode } from '@/lib/email';
import { checkRateLimit, recordFailedLogin, clearRateLimit } from '@/lib/rateLimit';
import { reportServerError } from '@/lib/errorMonitor';

// 2FA is gated behind an env var rather than always-on: the hardcoded admin
// account (lib/auth.ts HARDCODED_ADMIN) logs in as diego@bebest.com, and
// that address doesn't receive mail anywhere — turning this on unconditionally
// would lock that account out on its own login code. Leave off until either
// HARDCODED_ADMIN.email points at a real inbox or diego@bebest.com forwards
// there (see lib/email.ts sendTwoFactorCode for the same note).
const REQUIRE_2FA = process.env.REQUIRE_2FA === 'true';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const rateLimit = await checkRateLimit(email);
    if (rateLimit.blocked) {
      return NextResponse.json(
        {
          error: `Demasiados intentos fallidos. Intenta de nuevo en ${rateLimit.retryAfterMinutes} minuto${
            rateLimit.retryAfterMinutes === 1 ? '' : 's'
          }.`,
        },
        { status: 429 }
      );
    }

    const user = await verifyCredentials(email, password);
    if (!user) {
      await recordFailedLogin(email);
      return NextResponse.json(
        { error: 'Correo o contraseña incorrectos' },
        { status: 401 }
      );
    }

    await clearRateLimit(email);

    if (REQUIRE_2FA) {
      const code = generateTwoFactorCode();
      const pendingToken = await createPendingTwoFactorToken(
        { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
        code
      );
      const sent = await sendTwoFactorCode(user.email, user.nombre, code);
      if (!sent) {
        return NextResponse.json(
          { error: 'No se pudo enviar el código de verificación. Intenta de nuevo.' },
          { status: 500 }
        );
      }

      const response = NextResponse.json({ requires2FA: true, email: user.email }, { status: 200 });
      response.cookies.set('consulta_2fa_pending', pendingToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10, // 10 minutes
      });
      return response;
    }

    // Create a simple session cookie
    const response = NextResponse.json(
      { success: true, user },
      { status: 200 }
    );

    // Set a signed session cookie — a plain JSON cookie could be edited by
    // the browser's own owner (e.g. to set rol: "admin"), so it's signed
    // with a server-side secret and verified on every request.
    const sessionToken = await createSessionToken({
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    });

    response.cookies.set('consulta_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    reportServerError('POST /api/auth/login', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
