import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const user = await verifyCredentials(email, password);
    if (!user) {
      return NextResponse.json(
        { error: 'Correo o contraseña incorrectos' },
        { status: 401 }
      );
    }

    // Create a simple session cookie
    const response = NextResponse.json(
      { success: true, user },
      { status: 200 }
    );

    // Set a secure session cookie
    const sessionData = JSON.stringify({
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    });

    response.cookies.set('consulta_session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
