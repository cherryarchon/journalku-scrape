
-- 1. Tabel Riwayat Scraping per User
create table if not exists public.scrapes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    filename text not null unique,
    sinta_url text not null,
    item_count int default 0,
    file_url text,
    created_at timestamptz not null default now()
);

create index if not exists scrapes_user_id_idx on public.scrapes(user_id);
create index if not exists scrapes_created_at_idx on public.scrapes(created_at desc);

-- 2. Tabel Sync Sinta (Integrasi 2 Database)
create table if not exists public.sync_sinta (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade,
    source text not null,
    link text not null,
    journal_id uuid,
    status text not null default 'pending',
    output_filename text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists sync_sinta_user_id_idx on public.sync_sinta(user_id);
create index if not exists sync_sinta_status_idx on public.sync_sinta(status);

alter table public.scrapes enable row level security;
alter table public.sync_sinta enable row level security;
