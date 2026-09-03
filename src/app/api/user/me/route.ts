import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken, SESSION_COOKIE_NAME, mapRoleIntToString } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: 'unauthorized', user: null }, { status: 401 });
  }

  const user = await validateSessionToken(token);

  if (!user) {
    return NextResponse.json({ error: 'invalid_session', user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      sso_user_id: user.sso_user_id,
      email: user.email,
      display_name: user.display_name,
      username: user.username,
      avatar_url: user.avatar_url,
      role: user.role,
      role_label: mapRoleIntToString(user.role),
      isAdmin: user.role === 2,
      isEditor: user.role === 3,
    },
  });
}
