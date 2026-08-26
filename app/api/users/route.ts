import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest, isAdmin } from '@/lib/session';
import { findRecords, createRecord } from '@/lib/airtable';
import { User } from '@/lib/types';
import { hashPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
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

    const users = await findRecords<User>('users', filterFormula);

    return NextResponse.json({ users });
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

    const newUser = await createRecord<User>('users', {
      Nombre: body.nombre,
      Email: body.email,
      Password_hash: passwordHash,
      Rol: body.rol || 'user',
    });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}
