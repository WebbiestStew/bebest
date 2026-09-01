import { NextRequest, NextResponse } from 'next/server';
import { verifyPasswordResetToken } from '@/lib/passwordReset';
import { hashPassword } from '@/lib/auth';
import { updateRecord } from '@/lib/airtable';
import { reportServerError } from '@/lib/errorMonitor';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: 'Token y contraseña son requeridos' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    const payload = await verifyPasswordResetToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Este enlace ya no es válido. Solicita uno nuevo.' },
        { status: 401 }
      );
    }

    const passwordHash = await hashPassword(password);
    await updateRecord('users', payload.sub, { Password_hash: passwordHash });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    reportServerError('POST /api/auth/reset-password', error);
    return NextResponse.json({ error: 'Error al restablecer la contraseña' }, { status: 500 });
  }
}
