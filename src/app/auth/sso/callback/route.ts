import { NextRequest, NextResponse } from 'next/server';
import {
  upsertSsoUser,
  createLocalSession,
  mapRoleStringToInt,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const loginUrl = new URL('/login', appBaseUrl);

  // Test 7: Direct callback tanpa code -> REJECT
  if (!code) {
    console.warn('[SSO Callback] Missing authorization code in callback request');
    loginUrl.searchParams.set('error', 'missing_code');
    return NextResponse.redirect(loginUrl);
  }

  const webBBaseUrl = (
    process.env.SSO_WEB_B_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://auth.journalku.online'
  ).replace(/\/$/, '');

  const clientId = process.env.SSO_WEB_C_CLIENT_ID || 'web-c';

  try {
    // Server-to-server token exchange ke Web B
    const tokenEndpoint = `${webBBaseUrl}/auth/sso/web-c/token`;

    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: clientId,
      }),
      cache: 'no-store',
    });

    if (!tokenRes.ok) {
      let errData = { error: 'exchange_failed', message: 'Token exchange failed' };
      try {
        errData = await tokenRes.json();
      } catch {
        // ignore
      }
      console.warn('[SSO Callback] Web B rejected token exchange:', errData.error || errData.message);
      loginUrl.searchParams.set('error', errData.error || 'exchange_failed');
      return NextResponse.redirect(loginUrl);
    }

    const payload = await tokenRes.json();

    if (!payload.user || !payload.user.id) {
      console.warn('[SSO Callback] Web B returned invalid payload (missing user)');
      loginUrl.searchParams.set('error', 'invalid_identity');
      return NextResponse.redirect(loginUrl);
    }

    // ATURAN: Hanya role 2 (admin) dan role 3 (editor) yang boleh login ke sini!
    const roleInt = mapRoleStringToInt(payload.user.role);
    if (![2, 3].includes(roleInt)) {
      console.warn(`[SSO Callback] User ${payload.user.email} with role ${roleInt} is not authorized (only admin & editor allowed).`);
      loginUrl.searchParams.set('error', 'unauthorized_role');
      return NextResponse.redirect(loginUrl);
    }

    // Upsert user ke Database B (menggunakan payload.user.id sebagai sso_user_id)
    const localUser = await upsertSsoUser(payload.user);

    // Buat session lokal di Database B
    const rawSessionToken = await createLocalSession(localUser.id);

    // Redirect ke dashboard utama Web C dengan HttpOnly Secure cookie
    const targetUrl = new URL('/', appBaseUrl);
    const response = NextResponse.redirect(targetUrl);

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: rawSessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err: any) {
    console.error('[SSO Callback] Unexpected error during SSO handshake:', err.message || err);
    loginUrl.searchParams.set('error', 'server_error');
    return NextResponse.redirect(loginUrl);
  }
}
