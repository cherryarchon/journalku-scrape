import { NextRequest, NextResponse } from 'next/server';
import { destroySession, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    try {
      await destroySession(token);
    } catch (err) {
      console.warn('[Auth Logout] Error destroying session:', err);
    }
  }

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const response = NextResponse.redirect(new URL('/login', appBaseUrl));

  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
