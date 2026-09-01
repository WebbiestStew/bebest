import { SignJWT, jwtVerify } from 'jose';

// Kept separate from lib/session.ts (which middleware imports on the Edge
// runtime) even though both sign JWTs with the same secret — this file is
// only ever used from Node-runtime API routes, so there's no Edge-compat
// constraint here, but keeping the two apart avoids ever having to think
// about it. Uses Web Crypto (crypto.subtle / crypto.getRandomValues) rather
// than Node's `crypto` module so it would still be Edge-safe if that changed.

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
const MAX_ATTEMPTS = 5;
const PENDING_EXPIRY = '10m';

export interface PendingTwoFactorPayload {
  sub: string;
  email: string;
  nombre: string;
  rol: string;
  codeHash: string;
  attemptsLeft: number;
}

async function hashCode(code: string): Promise<string> {
  // Salted with the server secret so the hash alone (visible to anyone who
  // can read the JWT payload, since JWTs are signed, not encrypted) can't be
  // matched against a precomputed table of all 900,000 possible codes.
  const data = new TextEncoder().encode(`${code}:${process.env.NEXTAUTH_SECRET}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateTwoFactorCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (100000 + (buf[0] % 900000)).toString();
}

export async function createPendingTwoFactorToken(
  user: { id: string; email: string; nombre: string; rol: string },
  code: string
): Promise<string> {
  const codeHash = await hashCode(code);
  return new SignJWT({
    sub: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    codeHash,
    attemptsLeft: MAX_ATTEMPTS,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(PENDING_EXPIRY)
    .sign(secret);
}

export async function verifyPendingTwoFactorToken(
  token: string
): Promise<PendingTwoFactorPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as PendingTwoFactorPayload;
  } catch {
    return null;
  }
}

// Re-signs the pending token with a decremented attempt count, keeping the
// same code hash — used after a wrong guess so brute-forcing is capped
// without needing any server-side storage for the attempt counter.
export async function reissuePendingTwoFactorToken(
  payload: PendingTwoFactorPayload,
  attemptsLeft: number
): Promise<string> {
  return new SignJWT({ ...payload, attemptsLeft })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(PENDING_EXPIRY)
    .sign(secret);
}

export async function checkTwoFactorCode(
  payload: PendingTwoFactorPayload,
  submittedCode: string
): Promise<boolean> {
  const submittedHash = await hashCode(submittedCode);
  return submittedHash === payload.codeHash;
}
