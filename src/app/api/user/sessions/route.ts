import { NextRequest, NextResponse } from 'next/server';
import {
  validateSessionToken,
  SESSION_COOKIE_NAME,
  getUserSessions,
  deleteUserSession,
  deleteAllOtherSessions,
  mapRoleIntToString,
} from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

async function getAuthContext(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const user = await validateSessionToken(token);
  if (!user) return null;
  return { token, user };
}

// GET: Ambil daftar seluruh sesi milik pengguna
export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const sessions = await getUserSessions(auth.user.id, auth.token);

    return NextResponse.json({
      user: {
        id: auth.user.id,
        email: auth.user.email,
        display_name: auth.user.display_name,
        username: auth.user.username,
        role: auth.user.role,
        role_label: mapRoleIntToString(auth.user.role),
      },
      sessions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Hapus sesi tertentu atau hapus semua sesi lain
export async function DELETE(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('id');
  const allOther = searchParams.get('all_other') === 'true';

  try {
    if (allOther) {
      const success = await deleteAllOtherSessions(auth.user.id, auth.token);
      return NextResponse.json({
        success,
        message: 'Seluruh sesi perangkat lain berhasil dihapus.',
      });
    }

    if (sessionId) {
      const success = await deleteUserSession(sessionId, auth.user.id);
      return NextResponse.json({
        success,
        message: 'Sesi berhasil dihapus.',
      });
    }

    return NextResponse.json(
      { error: 'Parameter id atau all_other wajib diisi.' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
