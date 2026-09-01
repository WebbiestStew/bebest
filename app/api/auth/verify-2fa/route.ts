import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, SESSION_MAX_AGE_SECONDS } from '@/lib/session';
import {
  verifyPendingTwoFactorToken,
  checkTwoFactorCode,
  reissuePendingTwoFactorToken,
} from '@/lib/twoFactor';
import { reportServerError } from '@/lib/errorMonitor';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 });
    }

    const pendingCookie = req.cookies.get('consulta_2fa_pending');
    if (!pendingCookie) {
      return NextResponse.json(
        { error: 'La sesión de verificación expiró. Inicia sesión de nuevo.' },
        { status: 401 }
      );
    }

    const payload = await verifyPendingTwoFactorToken(pendingCookie.value);
    if (!payload) {
      return NextResponse.json(
        { error: 'La sesión de verificación expiró. Inicia sesión de nuevo.' },
        { status: 401 }
      );
    }

    if (payload.attemptsLeft <= 0) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Solicita un código nuevo.' },
        { status: 429 }
      );
    }

    const matches = await checkTwoFactorCode(payload, code.trim());
    if (!matches) {
      const attemptsLeft = payload.attemptsLeft - 1;
      const response = NextResponse.json(
        {
          error:
            attemptsLeft > 0
              ? `Código incorrecto. Te quedan ${attemptsLeft} intento${attemptsLeft === 1 ? '' : 's'}.`
              : 'Demasiados intentos. Solicita un código nuevo.',
        },
        { status: 401 }
      );
      if (attemptsLeft > 0) {
        const reissued = await reissuePendingTwoFactorToken(payload, attemptsLeft);
        response.cookies.set('consulta_2fa_pending', reissued, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 10,
        });
      } else {
        response.cookies.delete('consulta_2fa_pending');
      }
      return response;
    }

    // Code matches — issue the real session and clear the pending one.
    const sessionToken = await createSessionToken({
      id: payload.sub,
      email: payload.email,
      nombre: payload.nombre,
      rol: payload.rol,
    });

    const response = NextResponse.json(
      { success: true, user: { id: payload.sub, email: payload.email, nombre: payload.nombre, rol: payload.rol } },
      { status: 200 }
    );
    response.cookies.set('consulta_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    response.cookies.delete('consulta_2fa_pending');
    return response;
  } catch (error) {
    reportServerError('POST /api/auth/verify-2fa', error);
    return NextResponse.json({ error: 'Error al verificar el código' }, { status: 500 });
  }
}
