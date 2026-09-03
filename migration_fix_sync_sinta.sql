-- ============================================================
-- QUERY PERBAIKAN TABEL SYNC_SINTA (DATABASE 2 / WEB SCRAPER)
-- ============================================================
-- Jalankan query ini di SQL Editor Supabase Database 2
-- (Database Web Scraper: kqcxegvyochmtoerxmtt.supabase.co)
--
-- Workflow:
-- 1. Menyimpan daftar link SINTA yang unik (link text unique).
-- 2. source:
--    - 'database' : jika ditarik dari Database 1 (Database Utama)
--    - 'scrape'   : jika hasil dari proses scraping manual / form
-- 3. created_by:
--    - NULL : jika hasil sync dari Database 1
--    - user_id (UUID) : jika hasil dari proses scraping pengguna
-- 4. created_at : waktu pencatatan
-- 5. Menghindari duplikasi & otomatis di-skip saat proses scrape.
-- ============================================================

-- 1. Hapus tabel sync_sinta lama jika ingin struktur yang bersih & ringan
drop table if exists public.sync_sinta cascade;

-- 2. Buat tabel sync_sinta baru yang ringkas & spesifik
create table public.sync_sinta (
    id uuid primary key default gen_random_uuid(),
    link text not null unique,
    source text not null default 'database', -- 'database' (dari DB1) atau 'scrape' (dari scraping manual)
    created_by uuid references public.users(id) on delete set null, -- NULL jika hasil sync, atau user ID jika hasil scraping
    created_at timestamptz not null default now()
);

-- 3. Index untuk optimasi pencarian cepat saat proses skip URL
create unique index if not exists sync_sinta_link_idx on public.sync_sinta(link);
create index if not exists sync_sinta_source_idx on public.sync_sinta(source);
create index if not exists sync_sinta_created_by_idx on public.sync_sinta(created_by);

-- 4. Kebijakan Keamanan (Row Level Security)
-- Aktifkan RLS dan berikan akses penuh agar backend server dapat mengelola data dengan aman
alter table public.sync_sinta enable row level security;
create policy "Allow all access on sync_sinta" on public.sync_sinta for all using (true) with check (true);
