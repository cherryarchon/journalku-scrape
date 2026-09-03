import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import {
  pullSintaToDb2,
  getSyncSintaList,
  deleteSyncSintaItem,
} from '@/lib/sync/sinta';

export const dynamic = 'force-dynamic';

async function getAuthUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return await validateSessionToken(token);
}

// GET: Tampilkan daftar sync sinta di Database 2
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const items = await getSyncSintaList(user.id, user.role);
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Tarik sinta_url dari Database 1 (Database Utama) ke Database 2
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { pulledCount } = await pullSintaToDb2();
    const items = await getSyncSintaList(user.id, user.role);

    return NextResponse.json({
      success: true,
      message: `Berhasil menarik ${pulledCount} link Sinta dari Database Utama ke Database Scraper.`,
      items,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Hapus item sync sinta beserta file output scraping terkait
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Parameter id wajib diisi' }, { status: 400 });
  }

  try {
    const success = await deleteSyncSintaItem(id, user.id, user.role);
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
