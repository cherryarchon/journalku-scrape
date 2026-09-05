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
 * 1. Ambil SEMUA data journals yang memiliki sinta_url dari Database 1 (Database Utama)
 * Menggunakan paginasi batch (PAGE_SIZE = 1000) agar tidak terpotong oleh batasan default Supabase/PostgREST.
 */
export async function fetchMainJournalsSintaUrls(limit?: number) {
  const PAGE_SIZE = 1000;
  let from = 0;
  let hasMore = true;
  const allJournals: { id: string; name: string; sinta_url: string }[] = [];

  while (hasMore) {
    const to = limit !== undefined && limit !== null && limit > 0
      ? Math.min(from + PAGE_SIZE - 1, limit - 1)
      : from + PAGE_SIZE - 1;

    const { data, error } = await supabaseMain
      .from('journals')
      .select('id, name, sinta_url')
      .not('sinta_url', 'is', null)
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Gagal mengambil data journals dari Database 1: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const j of data) {
      if (j.sinta_url && typeof j.sinta_url === 'string' && j.sinta_url.trim().length > 0) {
        allJournals.push(j);
      }
    }

    if (
      data.length < (to - from + 1) ||
      (limit !== undefined && limit !== null && limit > 0 && allJournals.length >= limit)
    ) {
      hasMore = false;
    } else {
      from += PAGE_SIZE;
    }
  }

  return allJournals;
}

/**
 * Normalisasi URL SINTA agar konsisten:
 * - Menghilangkan trailing slash (misal /profile/1234/ -> /profile/1234)
 * - Menghasilkan variasi domain kemdikbud vs kemdiktisaintek serta http/https
 */
export function getSintaUrlVariants(url: string): string[] {
  const clean = url.trim().replace(/\/+$/, '');
  if (!clean) return [];

  const variants = new Set<string>();
  variants.add(clean);
  variants.add(clean + '/');

  // Variasi domain kemdikbud vs kemdiktisaintek
  if (clean.includes('sinta.kemdikbud.go.id')) {
    const alt = clean.replace('sinta.kemdikbud.go.id', 'sinta.kemdiktisaintek.go.id');
    variants.add(alt);
    variants.add(alt + '/');
  } else if (clean.includes('sinta.kemdiktisaintek.go.id')) {
    const alt = clean.replace('sinta.kemdiktisaintek.go.id', 'sinta.kemdikbud.go.id');
    variants.add(alt);
    variants.add(alt + '/');
  }

  // Variasi http vs https
  const currentVariants = Array.from(variants);
  for (const v of currentVariants) {
    if (v.startsWith('https://')) {
      variants.add(v.replace('https://', 'http://'));
    } else if (v.startsWith('http://')) {
      variants.add(v.replace('http://', 'https://'));
    }
  }

  return Array.from(variants);
}

/**
 * 2. Cek apakah link SINTA sudah ada di database sync_sinta
 * Menggunakan variasi URL (domain lama/baru, trailing slash, http/https) agar deteksi 100% akurat
 */
export async function checkIfLinkExistsInSyncSinta(link: string): Promise<boolean> {
  const variants = getSintaUrlVariants(link);
  if (variants.length === 0) return false;

  try {
    const { data, error } = await supabaseAdmin
      .from('sync_sinta')
      .select('id')
      .in('link', variants)
      .limit(1);

    if (!error && data && data.length > 0) {
      return true;
    }
  } catch (err) {
    console.warn('[Sync Sinta] Check exists error:', err);
  }

  // Cek juga di fallback store
  const variantSet = new Set(variants);
  for (const item of memorySyncStore.values()) {
    if (item.link && variantSet.has(item.link)) return true;
  }

  return false;
}

/**
 * Statistik komparasi Database Utama vs Database Sync SINTA
 */
export async function getSyncSintaStats() {
  try {
    const [
      { count: totalJournals },
      { count: withSintaUrl },
      { count: totalSyncSinta }
    ] = await Promise.all([
      supabaseMain.from('journals').select('*', { count: 'exact', head: true }),
      supabaseMain.from('journals').select('*', { count: 'exact', head: true }).not('sinta_url', 'is', null),
      supabaseAdmin.from('sync_sinta').select('*', { count: 'exact', head: true }),
    ]);

    const total = totalJournals ?? 0;
    const filled = withSintaUrl ?? 0;
    const withoutSinta = Math.max(0, total - filled);
    const synced = totalSyncSinta ?? 0;

    return {
      totalJournals: total,
      withSintaUrl: filled,
      withoutSintaUrl: withoutSinta,
      syncedInDb2: synced,
    };
  } catch (err: any) {
    console.warn('[Sync Sinta] Stats fetch warning:', err.message);
    return null;
  }
}

/**
 * 3. Tarik SEMUA link sinta dari Database 1 ke tabel sync_sinta di Database 2
 * - Tidak dibatasi 100, menarik seluruh data yang ada di Database 1
 * - Jika link sudah ada di Database 2, otomatis DI-SKIP
 * - source = 'database'
 * - created_by = null (karena hasil sync otomatis)
 */
export async function pullSintaToDb2(): Promise<{
  pulledCount: number;
  skippedCount: number;
  totalFound: number;
  totalDb1Journals?: number;
  withoutSintaCount?: number;
}> {
  // Ambil data statistik keseluruhan DB1
  const stats = await getSyncSintaStats();

  // Ambil seluruh data jurnal dari Database 1 yang memiliki sinta_url
  const mainJournals = await fetchMainJournalsSintaUrls();
  const totalFound = mainJournals.length;

  if (totalFound === 0) {
    return {
      pulledCount: 0,
      skippedCount: 0,
      totalFound: 0,
      totalDb1Journals: stats?.totalJournals ?? 0,
      withoutSintaCount: stats?.withoutSintaUrl ?? 0,
    };
  }

  try {
    // Ambil SEMUA daftar link yang sudah ada di Database 2
    const existingLinks = new Set<string>();
    let fetchExistingFrom = 0;
    const CHUNK_SIZE = 1000;
    let keepFetchingExisting = true;

    while (keepFetchingExisting) {
      const { data: existingBatch, error: existingErr } = await supabaseAdmin
        .from('sync_sinta')
        .select('link')
        .range(fetchExistingFrom, fetchExistingFrom + CHUNK_SIZE - 1);

      if (existingErr) {
        console.warn('[Sync Sinta] Error fetching existing links from DB2:', existingErr.message);
        break;
      }

      if (!existingBatch || existingBatch.length === 0) {
        break;
      }

      for (const e of existingBatch) {
        if (e.link && typeof e.link === 'string') {
          for (const v of getSintaUrlVariants(e.link)) {
            existingLinks.add(v);
          }
        }
      }

      if (existingBatch.length < CHUNK_SIZE) {
        keepFetchingExisting = false;
      } else {
        fetchExistingFrom += CHUNK_SIZE;
      }
    }

    // Masukkan juga data dari fallback in-memory jika ada
    for (const item of memorySyncStore.values()) {
      if (item.link) {
        for (const v of getSintaUrlVariants(item.link)) {
          existingLinks.add(v);
        }
      }
    }

    // Filter data: skip jika sudah ada di DB2 atau duplikat dalam batch DB1
    let skippedCount = 0;
    const linksToInsertSet = new Set<string>();

    for (const j of mainJournals) {
      const link = j.sinta_url?.trim();
      if (!link) {
        skippedCount++;
        continue;
      }

      if (existingLinks.has(link)) {
        skippedCount++;
        continue;
      }

      if (linksToInsertSet.has(link)) {
        // Duplikat URL di dalam Database 1 itu sendiri
        skippedCount++;
        continue;
      }

      linksToInsertSet.add(link);
    }

    const uniqueBatchLinks = Array.from(linksToInsertSet);
    const pulledCount = uniqueBatchLinks.length;

    if (uniqueBatchLinks.length === 0) {
      return {
        pulledCount: 0,
        skippedCount,
        totalFound,
        totalDb1Journals: stats?.totalJournals ?? 0,
        withoutSintaCount: stats?.withoutSintaUrl ?? 0,
      };
    }

    // Batch insert ke Database 2 (per 500 baris agar tidak melebihi payload limit)
    const INSERT_CHUNK = 500;
    for (let i = 0; i < uniqueBatchLinks.length; i += INSERT_CHUNK) {
      const chunk = uniqueBatchLinks.slice(i, i + INSERT_CHUNK);
      const now = new Date().toISOString();

      let insertRes = await supabaseAdmin.from('sync_sinta').upsert(
        chunk.map((link: string) => ({
          link,
          source: 'database',
          created_by: null,
          created_at: now,
        })),
        { onConflict: 'link', ignoreDuplicates: true }
      );

      // Fallback jika tabel Database 2 masih memakai kolom user_id
      if (insertRes.error && insertRes.error.message.includes('created_by')) {
        insertRes = await supabaseAdmin.from('sync_sinta').upsert(
          chunk.map((link: string) => ({
            link,
            source: 'database',
            user_id: null,
            created_at: now,
          })),
          { onConflict: 'link', ignoreDuplicates: true }
        );
      }

      if (insertRes.error) {
        console.warn(`[Sync Sinta] Insert batch error (chunk ${i} - ${i + chunk.length}):`, insertRes.error.message);
      }
    }

    // Sinkronkan juga ke in-memory store sebagai fallback
    for (const link of uniqueBatchLinks) {
      memorySyncStore.set(link, {
        id: String(Math.random()),
        link,
        source: 'database',
        created_by: null,
        created_at: new Date().toISOString(),
      });
    }

    return {
      pulledCount,
      skippedCount,
      totalFound,
      totalDb1Journals: stats?.totalJournals ?? 0,
      withoutSintaCount: stats?.withoutSintaUrl ?? 0,
    };
  } catch (err: any) {
    console.warn('[Sync Sinta] Pull error:', err.message);
    return {
      pulledCount: 0,
      skippedCount: 0,
      totalFound,
      totalDb1Journals: stats?.totalJournals ?? 0,
      withoutSintaCount: stats?.withoutSintaUrl ?? 0,
    };
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
    const allItems: SyncSintaItem[] = [];
    let from = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabaseAdmin
        .from('sync_sinta')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.warn('[Sync Sinta] Error fetching list from Database 2:', error.message);
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      allItems.push(...(data as SyncSintaItem[]));

      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    }

    if (allItems.length > 0) {
      return allItems;
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
