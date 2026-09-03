import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import {
  pullSintaToDb2,
  getSyncSintaList,
  deleteSyncSintaItem,
} from '@/lib/sync/sinta';

export const dynamic = 'force-dynamic';

async function getAuthUser(req: NextRequest) {
  // 1. Cek token dari HttpOnly Cookie
  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  // 2. Cek token dari Authorization Header (Bearer ...)
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7).trim()
    : null;

  // 3. Cek custom token header
  const customHeaderToken = req.headers.get('x-session-token')?.trim();

  const token = cookieToken || bearerToken || customHeaderToken;

  if (token) {
    const user = await validateSessionToken(token);
    if (user) return user;
  }

  // 4. Cek fallback API Secret / Service Role Key (untuk komunikasi server-to-server / Bot Haruna / Cron)
  const apiSecret = req.headers.get('x-api-secret') || bearerToken;
  const configuredSecret = process.env.BACKEND_API_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    apiSecret &&
    ((configuredSecret && apiSecret === configuredSecret) ||
      (serviceRoleKey && apiSecret === serviceRoleKey))
  ) {
    return {
      id: '00000000-0000-0000-0000-000000000000',
      sso_user_id: '00000000-0000-0000-0000-000000000000',
      email: 'system.admin@journalku.online',
      display_name: 'System Admin (API Key)',
      username: 'admin',
      avatar_url: null,
      role: 2, // Admin
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return null;
}

// GET: Tampilkan daftar sync sinta di Database 2
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      {
        error: 'unauthorized',
        message: 'Sesi login tidak valid atau cookie session belum terkirim. Silakan login terlebih dahulu.',
      },
      { status: 401 }
    );
  }

  const role = Number(user.role);
  if (![2, 3].includes(role)) {
    return NextResponse.json(
      {
        error: 'forbidden',
        message: 'Akses Ditolak: Hanya Administrator (Role 2) dan Editor (Role 3) yang diizinkan mengakses Sync SINTA.',
        role,
      },
      { status: 403 }
    );
  }

  try {
    const items = await getSyncSintaList(user.id, role);
    return NextResponse.json({
      items,
      currentUserRole: role,
      isAdmin: role === 2,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Tarik sinta_url dari Database 1 (Database Utama) ke Database 2
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      {
        error: 'unauthorized',
        message: 'Sesi login tidak valid atau belum login. Silakan login terlebih dahulu.',
      },
      { status: 401 }
    );
  }

  const role = Number(user.role);
  // Khusus penarikan database utama: Hanya Administrator (Role 2)
  if (role !== 2) {
    return NextResponse.json(
      {
        error: 'forbidden',
        message: 'Akses Ditolak: Hanya Administrator (Role 2) yang berhak menarik data SINTA dari Database Utama.',
        role,
      },
      { status: 403 }
    );
  }

  try {
    const { pulledCount } = await pullSintaToDb2();
    const items = await getSyncSintaList(user.id, role);

    return NextResponse.json({
      success: true,
      message: `Berhasil menarik ${pulledCount} link Sinta dari Database Utama ke Database Scraper.`,
      items,
      currentUserRole: role,
      isAdmin: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Hapus item sync sinta beserta file output scraping terkait
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      {
        error: 'unauthorized',
        message: 'Sesi login tidak valid atau belum login. Silakan login terlebih dahulu.',
      },
      { status: 401 }
    );
  }

  const role = Number(user.role);
  if (![2, 3].includes(role)) {
    return NextResponse.json(
      {
        error: 'forbidden',
        message: 'Akses Ditolak: Hanya Administrator (Role 2) dan Editor (Role 3) yang diizinkan.',
        role,
      },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Parameter id wajib diisi' }, { status: 400 });
  }

  try {
    const success = await deleteSyncSintaItem(id, user.id, role);
    if (!success) {
      return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Link sinta dan hasil sync berhasil dihapus.' });
  } catch (err: any) {
    const isForbidden = err.message?.includes('403_FORBIDDEN');
    return NextResponse.json(
      { error: err.message },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
