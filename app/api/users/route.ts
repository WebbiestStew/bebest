import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isAdmin } from '@/lib/session';
import { findRecords, createRecord, updateRecord, deleteRecord, getRecord } from '@/lib/airtable';
import { User } from '@/lib/types';
import { hashPassword } from '@/lib/auth';
import { logAccess } from '@/lib/auditLog';

// The hardcoded primary admin (see lib/auth.ts) has no backing Airtable
// record — nothing to delete, and no other account should be able to.
const PRIMARY_ADMIN_ID = 'admin_001';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user || !(await isAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rol = searchParams.get('rol');

    let filterFormula = '';
    if (rol === 'user') {
      filterFormula = "{Rol} = 'user'";
    } else if (rol === 'admin') {
      filterFormula = "{Rol} = 'admin'";
    }

    const users = await findRecords<User & { Password_hash?: string }>('users', filterFormula);
    // Never send password hashes to the client — the account list has no use
    // for them, and there's no reason to put them on the wire at all.
    const sanitized = users.map(({ Password_hash, ...rest }) => rest);

    return NextResponse.json({ users: sanitized });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user || !(await isAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.nombre || !body.email || !body.password) {
      return NextResponse.json(
        { error: 'Nombre, email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(body.password);

    const newUser = await createRecord<User & { Password_hash?: string }>('users', {
      Nombre: body.nombre,
      Email: body.email,
      Password_hash: passwordHash,
      Rol: body.rol || 'user',
      ...(body.escuela ? { Escuela: body.escuela } : {}),
      ...(body.generacion ? { Generacion: body.generacion } : {}),
      ...(body.telefono ? { Telefono: body.telefono } : {}),
    });
    const { Password_hash, ...sanitizedUser } = newUser;

    logAccess(user.nombre, `usuario_creado:rol ${body.rol || 'user'}`, newUser.id, body.nombre);

    return NextResponse.json({ user: sanitizedUser }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error al crear usuario' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user || !(await isAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }
    if (id === PRIMARY_ADMIN_ID) {
      return NextResponse.json(
        { error: 'La cuenta principal no se puede editar aquí.' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // An admin/developer editing their own role away from admin/developer
    // would lock themselves out of this very page with no way back short of
    // someone else's account — same spirit as the self-delete guard below.
    if (id === user.id && body.rol && body.rol !== 'admin' && body.rol !== 'developer') {
      return NextResponse.json(
        { error: 'No puedes quitarte tu propio acceso de administrador.' },
        { status: 400 }
      );
    }

    const fields: Record<string, any> = {};
    if (body.nombre !== undefined) fields.Nombre = body.nombre.trim();
    if (body.email !== undefined) fields.Email = body.email.trim();
    if (body.rol !== undefined) fields.Rol = body.rol;
    if (body.escuela !== undefined) fields.Escuela = body.escuela.trim();
    if (body.generacion !== undefined) fields.Generacion = body.generacion.trim();
    if (body.telefono !== undefined) fields.Telefono = body.telefono.trim();
    if (body.password) fields.Password_hash = await hashPassword(body.password);

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    const updated = await updateRecord<User & { Password_hash?: string }>('users', id, fields);
    const { Password_hash, ...sanitizedUser } = updated;

    return NextResponse.json({ user: sanitizedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user || !(await isAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }
    if (id === PRIMARY_ADMIN_ID) {
      return NextResponse.json(
        { error: 'No se puede eliminar la cuenta principal.' },
        { status: 400 }
      );
    }
    if (id === user.id) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propia cuenta mientras tienes sesión iniciada.' },
        { status: 400 }
      );
    }

    const deletedUser = await getRecord<any>('users', id);
    await deleteRecord('users', id);

    logAccess(user.nombre, 'usuario_eliminado', id, deletedUser?.Nombre);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}
