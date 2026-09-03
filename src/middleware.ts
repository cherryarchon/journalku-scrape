import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Lewati static assets, next internals, favicon, image, output downloads
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api/outputs') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Lewati endpoint publik auth (login, callback)
  if (
    pathname === '/login' ||
    pathname.startsWith('/auth/sso/callback') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  // Lewati endpoint yang menangani autentikasinya sendiri secara komprehensif
  if (pathname.startsWith('/api/sync-sinta')) {
    return NextResponse.next();
  }

  // Periksa autentikasi: Cookie session, Authorization header, atau API secret
  const sessionToken = req.cookies.get('journalku_session')?.value;
  const authHeader = req.headers.get('authorization');
  const customSessionToken = req.headers.get('x-session-token');
  const apiSecret = req.headers.get('x-api-secret');

  const hasAuth = !!sessionToken || !!authHeader || !!customSessionToken || !!apiSecret;

  if (!hasAuth) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized', message: 'Silakan login terlebih dahulu.' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
