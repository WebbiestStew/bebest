import { findRecords, createRecord, updateRecord } from './airtable';

// Login attempt tracking lives in Airtable rather than in-memory — this app
// deploys to Vercel's serverless model, where each function invocation can
// land on a different instance with its own memory, so an in-memory counter
// would silently under-count and give a false sense of protection. Airtable
// is already the single shared source of truth for everything else here.

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

function escapeForFormula(value: string): string {
  return value.replace(/'/g, "\\'");
}

async function findAttemptRecord(email: string) {
  const records = await findRecords<any>(
    'login_attempts',
    `{email} = '${escapeForFormula(email.toLowerCase())}'`
  );
  return records[0] || null;
}

export interface RateLimitStatus {
  blocked: boolean;
  retryAfterMinutes?: number;
}

// Call before verifying credentials — blocks the request entirely (even with
// a correct password) once the window's attempt count is exhausted, which is
// the standard posture: it stops an attacker who eventually guesses right
// from succeeding, not just the guessing itself.
export async function checkRateLimit(email: string): Promise<RateLimitStatus> {
  try {
    const record = await findAttemptRecord(email);
    if (!record) return { blocked: false };

    const windowStart = new Date(record.window_start).getTime();
    const elapsed = Date.now() - windowStart;
    if (elapsed > WINDOW_MS) return { blocked: false };

    if ((record.attempts || 0) >= MAX_ATTEMPTS) {
      const retryAfterMinutes = Math.max(1, Math.ceil((WINDOW_MS - elapsed) / 60000));
      return { blocked: true, retryAfterMinutes };
    }
    return { blocked: false };
  } catch (error) {
    // If Airtable is unreachable, fail open on rate limiting rather than
    // blocking every login in the clinic — this is a defense-in-depth
    // measure, not the only line of defense.
    console.error('Error checking rate limit:', error);
    return { blocked: false };
  }
}

export async function recordFailedLogin(email: string): Promise<void> {
  try {
    const record = await findAttemptRecord(email);
    const now = new Date().toISOString();

    if (!record) {
      await createRecord('login_attempts', { email: email.toLowerCase(), attempts: 1, window_start: now });
      return;
    }

    const windowStart = new Date(record.window_start).getTime();
    if (Date.now() - windowStart > WINDOW_MS) {
      await updateRecord('login_attempts', record.id, { attempts: 1, window_start: now });
    } else {
      await updateRecord('login_attempts', record.id, { attempts: (record.attempts || 0) + 1 });
    }
  } catch (error) {
    console.error('Error recording failed login:', error);
  }
}

export async function clearRateLimit(email: string): Promise<void> {
  try {
    const record = await findAttemptRecord(email);
    if (record) {
      await updateRecord('login_attempts', record.id, { attempts: 0 });
    }
  } catch (error) {
    console.error('Error clearing rate limit:', error);
  }
}
