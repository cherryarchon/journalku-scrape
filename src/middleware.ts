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

  // Periksa cookie session
  const sessionToken = req.cookies.get('journalku_session')?.value;

  if (!sessionToken) {
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
