import bcrypt from 'bcryptjs';
import { User } from '@/lib/types';
import { findRecords, createRecord, escapeAirtableFormula } from '@/lib/airtable';

export const HARDCODED_ADMIN = {
  id: 'admin_001',
  email: 'diego@bebest.com',
  nombre: 'Diego',
  rol: 'admin' as const,
};

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Find user by email
export async function findUserByEmail(email: string): Promise<(User & { id: string }) | null> {
  if (email === HARDCODED_ADMIN.email) {
    return {
      id: HARDCODED_ADMIN.id,
      email: HARDCODED_ADMIN.email,
      nombre: HARDCODED_ADMIN.nombre,
      rol: HARDCODED_ADMIN.rol,
    } as User & { id: string };
  }

  const matches = await findRecords<any>('users', `{Email} = '${escapeAirtableFormula(email)}'`);
  const user = matches[0];
  if (!user) return null;
  return {
    id: user.id,
    email: user.Email,
    nombre: user.Nombre,
    rol: user.Rol,
  } as User & { id: string };
}

// Create user in the Airtable users table
export async function createUser(
  nombre: string,
  email: string,
  password: string,
  rol: 'admin' | 'user'
): Promise<User & { id: string }> {
  const passwordHash = await hashPassword(password);
  return createRecord<User>('users', {
    Nombre: nombre,
    Email: email,
    Password_hash: passwordHash,
    Rol: rol,
  });
}

// Verify user credentials
export async function verifyCredentials(email: string, password: string): Promise<(User & { id: string }) | null> {
  if (email === HARDCODED_ADMIN.email) {
    const adminHash = process.env.ADMIN_PASSWORD_HASH;
    if (!adminHash) {
      throw new Error('ADMIN_PASSWORD_HASH is not set');
    }
    if (await verifyPassword(password, adminHash)) {
      return {
        id: HARDCODED_ADMIN.id,
        email: HARDCODED_ADMIN.email,
        nombre: HARDCODED_ADMIN.nombre,
        rol: HARDCODED_ADMIN.rol,
      } as User & { id: string };
    }
    return null;
  }

  const matches = await findRecords<User>('users', `{Email} = '${escapeAirtableFormula(email)}'`);
  const user = matches[0] as (User & { id: string; Password_hash?: string }) | undefined;
  if (!user || !user.Password_hash) return null;

  if (await verifyPassword(password, user.Password_hash)) {
    return {
      id: user.id,
      email: (user as any).Email,
      nombre: (user as any).Nombre,
      rol: (user as any).Rol,
    } as User & { id: string };
  }
  return null;
}
