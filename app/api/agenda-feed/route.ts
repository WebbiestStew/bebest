import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/session';
import { getCalendarFeedToken } from '@/lib/calendarFeed';

// Returns the current user's own subscribable calendar feed URL — normal
// cookie-authenticated route, only used to hand the link to its owner once
// so they can paste it into their phone's calendar app.
export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await getCalendarFeedToken(user.id);
  const base = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  const httpsUrl = `${base}/api/agenda-feed/${token}`;
  // webcal:// is the scheme calendar apps recognize as "subscribe to this",
  // as opposed to https:// which most of them just try to download once.
  const webcalUrl = httpsUrl.replace(/^https?:\/\//, 'webcal://');

  return NextResponse.json({ url: httpsUrl, webcalUrl });
}
