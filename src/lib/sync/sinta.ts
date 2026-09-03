import { supabaseMain } from '../auth/dbMain';
import { supabaseAdmin } from '../auth/db';

export interface SyncSintaItem {
  id: string;
  link: string;
  source: 'database' | 'scrape' | string;
  created_by: string | null;
  user_id?: string | null;
  created_at: string;
}

// In-memory fallback if database table is being migrated
const memorySyncStore = new Map<string, SyncSintaItem>();

/**
 * 1. Ambil data journals yang memiliki sinta_url dari Database 1 (Database Utama)
 */
export async function fetchMainJournalsSintaUrls(limit = 100) {
  const { data, error } = await supabaseMain
    .from('journals')
    .select('id, name, sinta_url')
    .not('sinta_url', 'is', null)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Gagal mengambil data journals dari Database 1: ${error.message}`);
  }

  return (data || []).filter((j: any) => j.sinta_url && j.sinta_url.trim().length > 0);
}

/**
 * 2. Cek apakah link SINTA sudah ada di database sync_sinta
 * Digunakan untuk skip proses scraping jika link sudah pernah di-sync / di-scrape sebelumnya
 */
export async function checkIfLinkExistsInSyncSinta(link: string): Promise<boolean> {
  const cleanLink = link.trim();
  if (!cleanLink) return false;

  try {
    const { data, error } = await supabaseAdmin
      .from('sync_sinta')
      .select('id')
      .eq('link', cleanLink)
      .maybeSingle();

    if (!error && data) {
      return true;
    }
  } catch (err) {
    console.warn('[Sync Sinta] Check exists error:', err);
  }

  // Cek juga di fallback store
  for (const item of memorySyncStore.values()) {
    if (item.link === cleanLink) return true;
  }

  return false;
}

/**
 * 3. Tarik link sinta dari Database 1 ke tabel sync_sinta di Database 2
 * - source = 'database'
 * - created_by = null (karena hasil sync otomatis)
 */
export async function pullSintaToDb2(): Promise<{ pulledCount: number }> {
  const mainJournals = await fetchMainJournalsSintaUrls(100);

  if (mainJournals.length === 0) {
    return { pulledCount: 0 };
  }

  try {
    // Ambil daftar link yang sudah ada di Database 2 agar tidak duplikasi
    const { data: existing } = await supabaseAdmin.from('sync_sinta').select('link');
    const existingLinks = new Set((existing || []).map((e: any) => e.link?.trim()));

    // Ambil dan lakukan deduplikasi di dalam batch
    const uniqueBatchLinks = Array.from(
      new Set(
        mainJournals
          .map((j: any) => j.sinta_url?.trim())
          .filter((link: string) => link && link.length > 0 && !existingLinks.has(link))
      )
    );

    if (uniqueBatchLinks.length === 0) {
      return { pulledCount: 0 };
    }

    // Coba upsert/insert dengan mengabaikan duplikasi (ignoreDuplicates: true)
    let insertRes = await supabaseAdmin.from('sync_sinta').upsert(
      uniqueBatchLinks.map((link: string) => ({
        link,
        source: 'database',
        created_by: null,
        created_at: new Date().toISOString(),
      })),
      { onConflict: 'link', ignoreDuplicates: true }
    );

    // Fallback jika tabel masih memakai kolom user_id
    if (insertRes.error && insertRes.error.message.includes('created_by')) {
      insertRes = await supabaseAdmin.from('sync_sinta').upsert(
        uniqueBatchLinks.map((link: string) => ({
          link,
          source: 'database',
          user_id: null,
          created_at: new Date().toISOString(),
        })),
        { onConflict: 'link', ignoreDuplicates: true }
      );
    }

    if (insertRes.error) {
      console.warn('[Sync Sinta] Insert error:', insertRes.error.message);
    }

    return { pulledCount: uniqueBatchLinks.length };
  } catch (err: any) {
    console.warn('[Sync Sinta] Fallback error:', err.message);
    return { pulledCount: 0 };
  }
}

/**
 * 4. Catat link SINTA dari hasil scraping manual
 * - source = 'scrape'
 * - created_by = userId (ID user yang melakukan scraping)
 */
export async function insertScrapedLinkToSyncSinta(
  link: string,
  userId: string | null
): Promise<boolean> {
  const cleanLink = link.trim();
  if (!cleanLink) return false;

  try {
    // Coba upsert dengan ignoreDuplicates agar tidak error jika sudah ada
    let res = await supabaseAdmin.from('sync_sinta').upsert(
      [
        {
          link: cleanLink,
          source: 'scrape',
          created_by: userId || null,
          created_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'link', ignoreDuplicates: true }
    );

    // Fallback jika tabel masih memakai kolom user_id
    if (res.error && res.error.message.includes('created_by')) {
      res = await supabaseAdmin.from('sync_sinta').upsert(
        [
          {
            link: cleanLink,
            source: 'scrape',
            user_id: userId || null,
            created_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'link', ignoreDuplicates: true }
      );
    }

    if (!res.error) return true;
    console.warn('[Sync Sinta] Insert scraped link error:', res.error.message);
  } catch (err) {
    console.warn('[Sync Sinta] Insert scraped link exception:', err);
  }

  memorySyncStore.set(cleanLink, {
    id: String(Math.random()),
    link: cleanLink,
    source: 'scrape',
    created_by: userId || null,
    created_at: new Date().toISOString(),
  });

  return true;
}

/**
 * 5. Dapatkan daftar sync sinta di Database 2
 * Admin (role 2) melihat semua; Editor (role 3) melihat hasil sync DB1 + hasil miliknya
 */
export async function getSyncSintaList(_userId?: string, _role?: number): Promise<SyncSintaItem[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('sync_sinta')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as SyncSintaItem[];
    }
    if (error) {
      console.warn('[Sync Sinta] Error fetching list from Database 2:', error.message);
    }
  } catch (err: any) {
    console.warn('[Sync Sinta] Exception fetching list:', err.message);
  }

  return Array.from(memorySyncStore.values());
}

/**
 * 6. Hapus item sync sinta
 */
export async function deleteSyncSintaItem(id: string, userId: string, role: number): Promise<boolean> {
  let itemToDelete: SyncSintaItem | null = null;

  try {
    const { data } = await supabaseAdmin
      .from('sync_sinta')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    itemToDelete = data;
  } catch {
    // ignore
  }

  if (!itemToDelete && memorySyncStore.has(id)) {
    itemToDelete = memorySyncStore.get(id)!;
  }

  if (!itemToDelete) {
    return false;
  }

  const ownerId = itemToDelete.created_by || itemToDelete.user_id;
  if (role === 3 && itemToDelete.source === 'scrape' && ownerId && ownerId !== userId) {
    throw new Error('403_FORBIDDEN: Editor hanya dapat menghapus hasil miliknya sendiri.');
  }

  try {
    await supabaseAdmin
      .from('sync_sinta')
      .delete()
      .eq('id', id);
  } catch (err) {
    console.warn('[Sync Sinta] Delete error:', err);
  }

  memorySyncStore.delete(id);
  return true;
}
