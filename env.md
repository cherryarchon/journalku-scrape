# DAFTAR ENVIRONMENT VARIABLES (ENV) WEB SCRAPER (WEB C)

Dokumen ini berisi seluruh daftar variabel lingkungan (environment variables) yang dibutuhkan oleh **Web C (Web Scraper)** agar seluruh fitur autentikasi SSO, integrasi 2 database (Database Utama & Database Scraper), dan engine scraping dapat berjalan dengan normal.

Simpan variabel-variabel ini pada file:
`D:\project\haruna-bot\web-scrape\.env.local`

---

## 1. Konfigurasi Aplikasi & Domain Web C

| Nama Variabel | Wajib | Nilai Default / Contoh | Keterangan & Tujuan |
|---|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | Ya | `"Scraper Journalku"` | Nama aplikasi yang ditampilkan di browser & header. |
| `NEXT_PUBLIC_APP_URL` | Ya | `http://localhost:3000` (Dev) / `https://journalku-scrape.vercel.app` (Prod) | Base URL aplikasi Web C untuk callback redirect SSO. |
| `NEXT_PUBLIC_SITE_URL` | Opsional | `https://journalku.online` | Tautan navigasi ke situs utama Journalku. |
| `NEXT_PUBLIC_UPLOADER_URL`| Opsional | `http://localhost:3000/uploader` | Tautan navigasi ke portal uploader. |

---

## 2. SSO Gateway Terpadu (Integrasi dengan Web B)

| Nama Variabel | Wajib | Nilai Default / Contoh | Keterangan & Tujuan |
|---|---|---|---|
| `SSO_WEB_B_BASE_URL` | Ya | `http://localhost:3001` (Dev) / `https://auth.journalku.online` (Prod) | URL Web B (Gateway SSO) tempat Web C menukarkan *one-time authorization code* via server-to-server. |
| `SSO_WEB_C_CLIENT_ID` | Ya | `web-c` | Identifier klien Web C yang sudah terdaftar dan diotorisasi di Web B. |

---

## 3. Database 2: Database Khusus Web Scraper (Database B)

Database ini digunakan untuk menyimpan tabel autentikasi pengguna lokal (`public.users`, `public.sessions`), riwayat hasil scraping per user (`public.scrapes`), dan tabel sinkronisasi SINTA (`public.sync_sinta`).

| Nama Variabel | Wajib | Nilai Contoh | Keterangan & Tujuan |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Ya | `https://kqcxegvyochmtoerxmtt.supabase.co` | Endpoint URL Supabase untuk Database 2. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ya | `sb_publishable_...` | Anon/Publishable key Supabase Database 2. |
| `SUPABASE_SERVICE_ROLE_KEY` | Ya | `eyJhbGciOiJIUzI1NiIsInR5cCI...` | **Service Role Key (Secret)** Database 2. Wajib ada agar server dapat melakukan operasi tabel `users`, `sessions`, `scrapes`, dan `sync_sinta` secara leluasa. |
| `SUPABASE_DB_PASSWORD` | Opsional | `Hakimlnh11-` | Password database PostgreSQL Database 2 jika mengakses via pooling/direct connection. |

---

## 4. Database 1: Database Utama Journalku (Database A - Read-Only)

Database ini digunakan untuk fitur **Sync SINTA (2 Database)**, yaitu mengambil data `sinta_url` dan nama jurnal dari tabel `journals`.

| Nama Variabel | Wajib | Nilai Contoh | Keterangan & Tujuan |
|---|---|---|---|
| `DATABASE_MAIN_SUPABASE_URL` | Ya | `https://whownprbppajhpfqzsku.supabase.co` | Endpoint URL Supabase untuk Database 1 (Database Utama). |
| `DATABASE_MAIN_SERVICE_ROLE_KEY` | Ya | `eyJhbGciOiJIUzI1NiIsInR5cCI...` | **Service Role Key** Database 1 (Database Utama) agar server Web C dapat membaca data `sinta_url` dari tabel `journals`. |

> [!IMPORTANT]
> Jika Anda baru saja menambahkan atau mengubah variabel `DATABASE_MAIN_*` pada `.env.local`, pastikan untuk **me-restart dev server Next.js** (`npm run dev`) agar nilai env terbaru terbaca oleh Node.js runtime.

---

## 5. Backend Engine Scraping (Python / Flask)

| Nama Variabel | Wajib | Nilai Default / Contoh | Keterangan & Tujuan |
|---|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Ya | `https://journalku-backend.vercel.app` atau `http://localhost:5000` | URL service backend Flask Python yang menjalankan bot scraper. Di Web UI, URL ini dirahasiakan / masked. |
| `BACKEND_API_SECRET` | Ya | `jrn-sec-7f9a2b...` | API Key / Secret shared token untuk autentikasi komunikasi antara Next.js dan backend Flask. |
| `API_TIMEOUT_MS` | Opsional | `60000` | Batas waktu request scraping ke backend Python (dalam milidetik, default 60 detik). |
| `MAX_BATCH_URL_LIMIT` | Opsional | `10` | Batas maksimal URL yang dapat diproses dalam 1 kali batch submission. |

---

## 6. Cloudinary Storage (Penyimpanan Output File JSON Scraping)

| Nama Variabel | Wajib | Nilai Contoh | Keterangan & Tujuan |
|---|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | Ya | `dfksa9jsz` | Nama Cloud di Cloudinary tempat menyimpan file output JSON. |
| `CLOUDINARY_API_KEY` | Ya | `682247698726524` | API Key Cloudinary. |
| `CLOUDINARY_API_SECRET` | Ya | `QTPPCp2rBC4uSw...` | API Secret Cloudinary. |
| `CLOUDINARY_FOLDER` | Opsional | `web-scrape/outputs` | Nama sub-folder penyimpanan di Cloudinary. |

---

## Contoh Lengkap Isi `.env.local`:

```env
# 1. Aplikasi & Domain
NEXT_PUBLIC_APP_NAME="Scraper Journalku"
NEXT_PUBLIC_SITE_URL="https://journalku.online"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_UPLOADER_URL="http://localhost:3000/uploader"

# 2. SSO Gateway Web B
SSO_WEB_B_BASE_URL="http://localhost:3001"
SSO_WEB_C_CLIENT_ID="web-c"

# 3. Database 2 (Database Web Scraper)
NEXT_PUBLIC_SUPABASE_URL="https://kqcxegvyochmtoerxmtt.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI..."
SUPABASE_DB_PASSWORD="your-db-password"

# 4. Database 1 (Database Utama - Read-only untuk tabel journals)
DATABASE_MAIN_SUPABASE_URL="https://whownprbppajhpfqzsku.supabase.co"
DATABASE_MAIN_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI..."

# 5. Backend Engine Scraping
NEXT_PUBLIC_BACKEND_URL="https://journalku-backend.vercel.app"
BACKEND_API_SECRET="jrn-sec-7f9a2b8c3d1e4f5a6b7c8d9e0f1a2b3c"
API_TIMEOUT_MS=60000
MAX_BATCH_URL_LIMIT=10

# 6. Cloudinary
CLOUDINARY_CLOUD_NAME="dfksa9jsz"
CLOUDINARY_API_KEY="682247698726524"
CLOUDINARY_API_SECRET="QTPPCp2rBC4uSw..."
CLOUDINARY_FOLDER="web-scrape/outputs"
```
