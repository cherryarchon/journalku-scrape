-- ==============================================================================
-- FILE: fix-database.sql
-- DESKRIPSI: SKRIP LENGKAP STRUKTUR DATABASE 2 (DATABASE WEB SCRAPER)
-- JALANKAN DI: SQL Editor Supabase Database 2 (kqcxegvyochmtoerxmtt.supabase.co)
-- ==============================================================================

-- Aktifkan ekstensi pgcrypto untuk pembuatan UUID jika belum aktif
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 1. TABEL PENGGUNA LOKAL (public.users)
-- Menyimpan profil pengguna yang masuk via SSO Gateway Web B
-- ==============================================================================
create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),
    sso_user_id uuid not null,
    email text not null,
    display_name text,
    username text,
    avatar_url text,
    role int2 not null default 1, -- 1 = User Biasa, 2 = Administrator, 3 = Editor
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Constraint & Index Users
alter table public.users drop constraint if exists users_sso_user_id_unique;
alter table public.users add constraint users_sso_user_id_unique unique (sso_user_id);

create index if not exists users_email_idx on public.users(email);
create index if not exists users_role_idx on public.users(role);

-- ==============================================================================
-- 2. TABEL SESI LOKAL (public.sessions)
-- Menyimpan hash SHA-256 session token dari cookie HttpOnly (journalku_session)
-- ==============================================================================
create table if not exists public.sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    token_hash text not null,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

-- Constraint & Index Sessions
alter table public.sessions drop constraint if exists sessions_token_hash_unique;
alter table public.sessions add constraint sessions_token_hash_unique unique (token_hash);

create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_expires_at_idx on public.sessions(expires_at);

-- ==============================================================================
-- 3. TABEL RIWAYAT SCRAPING (public.scrapes)
-- Mencatat kepemilikan hasil file output JSON per user (Admin vs Editor)
-- ==============================================================================
create table if not exists public.scrapes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    filename text not null,
    sinta_url text not null,
    item_count int default 0,
    file_url text,
    created_at timestamptz not null default now()
);

-- Constraint & Index Scrapes
alter table public.scrapes drop constraint if exists scrapes_filename_unique;
alter table public.scrapes add constraint scrapes_filename_unique unique (filename);

create index if not exists scrapes_user_id_idx on public.scrapes(user_id);
create index if not exists scrapes_created_at_idx on public.scrapes(created_at desc);

-- ==============================================================================
-- 4. TABEL SINKRONISASI SINTA (public.sync_sinta)
-- Menyimpan daftar link SINTA unik untuk mencegah duplikasi & auto-skip
-- - link: URL profil jurnal SINTA (wajib unik)
-- - source: 'database' (ditarik dari DB1) atau 'scrape' (hasil scraping manual)
-- - created_by: NULL (jika sync DB1) atau ID user (jika scraping manual)
-- ==============================================================================
create table if not exists public.sync_sinta (
    id uuid primary key default gen_random_uuid(),
    link text not null,
    source text not null default 'database',
    created_by uuid references public.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- Migrasi kolom jika tabel lama masih menggunakan nama user_id
do $$
begin
    if exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' and table_name = 'sync_sinta' and column_name = 'user_id'
    ) and not exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' and table_name = 'sync_sinta' and column_name = 'created_by'
    ) then
        alter table public.sync_sinta rename column user_id to created_by;
    end if;
end $$;

-- Pastikan kolom created_by ada
alter table public.sync_sinta add column if not exists created_by uuid references public.users(id) on delete set null;

-- Hapus duplikasi link yang mungkin ada sebelumnya sebelum membuat unique constraint
delete from public.sync_sinta a
using public.sync_sinta b
where a.id > b.id and a.link = b.link;

-- Terapkan Unique Constraint pada link
alter table public.sync_sinta drop constraint if exists sync_sinta_link_key;
alter table public.sync_sinta add constraint sync_sinta_link_key unique (link);

-- Index Pencarian Cepat
create unique index if not exists sync_sinta_link_idx on public.sync_sinta(link);
create index if not exists sync_sinta_source_idx on public.sync_sinta(source);
create index if not exists sync_sinta_created_by_idx on public.sync_sinta(created_by);
create index if not exists sync_sinta_created_at_idx on public.sync_sinta(created_at desc);

-- ==============================================================================
-- 5. KEBIJAKAN KEAMANAN & HAK AKSES (Row Level Security)
-- Mengaktifkan RLS dengan policy full access untuk service role backend
-- ==============================================================================
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.scrapes enable row level security;
alter table public.sync_sinta enable row level security;

-- Buat policy full access (idempotent)
drop policy if exists "Allow full access on users" on public.users;
create policy "Allow full access on users" on public.users for all using (true) with check (true);

drop policy if exists "Allow full access on sessions" on public.sessions;
create policy "Allow full access on sessions" on public.sessions for all using (true) with check (true);

drop policy if exists "Allow full access on scrapes" on public.scrapes;
create policy "Allow full access on scrapes" on public.scrapes for all using (true) with check (true);

drop policy if exists "Allow full access on sync_sinta" on public.sync_sinta;
create policy "Allow full access on sync_sinta" on public.sync_sinta for all using (true) with check (true);
