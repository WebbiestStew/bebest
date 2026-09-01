import { NextRequest, NextResponse } from 'next/server';
import {
  verifyPendingTwoFactorToken,
  createPendingTwoFactorToken,
  generateTwoFactorCode,
} from '@/lib/twoFactor';
import { sendTwoFactorCode } from '@/lib/email';
import { reportServerError } from '@/lib/errorMonitor';

export async function POST(req: NextRequest) {
  try {
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

    const code = generateTwoFactorCode();
    const pendingToken = await createPendingTwoFactorToken(
      { id: payload.sub, email: payload.email, nombre: payload.nombre, rol: payload.rol },
      code
    );
    const sent = await sendTwoFactorCode(payload.email, payload.nombre, code);
    if (!sent) {
      return NextResponse.json({ error: 'No se pudo reenviar el código.' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set('consulta_2fa_pending', pendingToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
    });
    return response;
  } catch (error) {
    reportServerError('POST /api/auth/resend-2fa', error);
    return NextResponse.json({ error: 'Error al reenviar el código' }, { status: 500 });
  }
}
