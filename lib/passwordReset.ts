import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

// Time-limited (1 hour), not single-use — same trade-off most apps make
// (Gmail, GitHub, etc.) rather than adding persistent state just to track
// whether a link was already used. `purpose` stops a leaked/reused token
// from being replayed against a different endpoint that also verifies JWTs
// signed with this same secret.
export interface PasswordResetPayload {
  sub: string;
  email: string;
  purpose: 'password_reset';
}

export async function createPasswordResetToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ sub: userId, email, purpose: 'password_reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

export async function verifyPasswordResetToken(token: string): Promise<PasswordResetPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.purpose !== 'password_reset') return null;
    return payload as unknown as PasswordResetPayload;
  } catch {
    return null;
  }
}
