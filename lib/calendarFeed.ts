import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

// A calendar app subscribes to this URL ONCE and re-fetches it on its own
// schedule — so the token must be the same every time it's generated for a
// given user (a different token per visit to "get my link" would silently
// break the subscription). Deliberately signs with NO time-based claims
// (no iat/exp) — HMAC-SHA256 is a pure function of (header, payload,
// secret), so omitting anything that varies makes the output fully
// deterministic. Calendar feed links are long-lived by nature (same
// tradeoff Google Calendar's own secret iCal address makes); there's no
// built-in expiry or revocation here.
export async function getCalendarFeedToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, purpose: 'calendar_feed' })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);
}

export async function verifyCalendarFeedToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.purpose !== 'calendar_feed' || typeof payload.sub !== 'string') return null;
    return payload.sub;
  } catch {
    return null;
  }
}
