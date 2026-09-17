import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/session';
import { getRecord, updateRecord } from '@/lib/airtable';
import { hashPassword, verifyPassword, HARDCODED_ADMIN } from '@/lib/auth';
import { logAccess } from '@/lib/auditLog';

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // The hardcoded admin account has no Airtable record — its password lives
  // in the ADMIN_PASSWORD_HASH environment variable, which nothing at
  // runtime can rewrite. There's no self-service path for this one account;
  // it has to be regenerated and pasted into the deployment's env vars by
  // hand, same as when it was first set up.
  if (user.id === HARDCODED_ADMIN.id) {
    return NextResponse.json(
      {
        error:
          'Esta cuenta usa una contraseña fija de configuración del servidor y no se puede cambiar desde aquí. Pide a quien administre el hosting que actualice la variable de entorno ADMIN_PASSWORD_HASH.',
      },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Completa ambos campos.' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
    }

    const record = await getRecord<any>('users', user.id);
    if (!record?.Password_hash) {
      return NextResponse.json({ error: 'No se encontró la cuenta.' }, { status: 404 });
    }

    const matches = await verifyPassword(currentPassword, record.Password_hash);
    if (!matches) {
      return NextResponse.json({ error: 'La contraseña actual no es correcta.' }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await updateRecord('users', user.id, { Password_hash: newHash });

    logAccess(user.nombre, 'contrasena_cambiada', '', user.nombre);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Error al cambiar la contraseña' }, { status: 500 });
  }
}
