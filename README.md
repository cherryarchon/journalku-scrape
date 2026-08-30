# Scraper Journalku.online V 1.0.0

Dashboard frontend web scraper berbasis **Next.js 16 (App Router)** dengan tema **Biru & Putih (Blue & White)** yang modern, ringan, dan terintegrasi langsung dengan Python Flask Backend Microservice serta Portal Uploader Laravel.

---

## 1. Arsitektur dan Alur Kerja Sistem (Workflow)

```
[User / Admin]
       │
       ▼
┌───────────────────────────────────────────────────────────┐
│ 1. Frontend Scraper (Next.js - Port 3000)                │
│    - Form URL Input (Dinamis 1 s/d 10 URL)               │
│    - Batch Scraping Excel (.xlsx / .csv)                 │
│    - Halaman Pembersihan Storage (/clean)                │
└─────────────────────────────┬─────────────────────────────┘
                              │ Request HTTP POST /api/scrape
                              │ Header: X-API-Secret: [BACKEND_API_SECRET]
                              ▼
┌───────────────────────────────────────────────────────────┐
│ 2. Backend Scraper (Python Flask - Port 5000)             │
│    - Verifikasi Token Keamanan BACKEND_API_SECRET        │
│    - Ekstraksi Data SINTA (Level, Pengindeks, Profil)    │
│    - Ekstraksi Garuda (Publisher, Subjects, ID)           │
│    - Deep Crawling OJS (Editorial Team, Focus & Scope,   │
│      Author Guidelines, Publication Fees, Archive, dll.) │
└─────────────────────────────┬─────────────────────────────┘
                              │ Hasil disimpan di web-scrape/output/*.json
                              ▼
┌───────────────────────────────────────────────────────────┐
│ 3. Portal Uploader (Laravel 13 + Livewire - Port 8000)    │
│    - Multi-Role Auth (Admin & Member dengan Approval)     │
│    - Batch Upload JSON (Maksimal 10 File per batch)       │
│    - Audit, Ownership Scoping, & Interactive JSON Preview │
└───────────────────────────────────────────────────────────┘
```

---

## 2. Konfigurasi File Lingkungan (`.env.local`)

File `.env.local` menjaga keamanan dan komunikasi antar service:

```env
# ==========================================
# SCRAPER JOURNALKU - KONFIGURASI ENVIRONMENT
# ==========================================

# Identitas & URL Aplikasi
NEXT_PUBLIC_APP_NAME="Scraper Journalku.online"
NEXT_PUBLIC_SITE_URL="https://journalku.online"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"
NEXT_PUBLIC_UPLOADER_URL="http://localhost:8000"

# Keamanan & Proteksi Akses Backend Scraper (Sensitif & Restrict)
BACKEND_API_SECRET="jrn-sec-7f9a2b1c8d4e5f60"
API_TIMEOUT_MS=60000
MAX_BATCH_URL_LIMIT=10
```

### Penjelasan Variabel:
- **`NEXT_PUBLIC_APP_NAME`**: Nama resmi aplikasi (`Scraper Journalku.online`).
- **`NEXT_PUBLIC_SITE_URL`**: URL website utama (`https://journalku.online`).
- **`NEXT_PUBLIC_APP_URL`**: URL aplikasi frontend Next.js (`http://localhost:3000`).
- **`NEXT_PUBLIC_BACKEND_URL`**: URL backend Python Flask microservice (`http://localhost:5000`).
- **`NEXT_PUBLIC_UPLOADER_URL`**: URL portal uploader Laravel 13 (`http://localhost:8000`).
- **`BACKEND_API_SECRET`**: Kunci rahasia (token) untuk membatasi dan mengamankan komunikasi API ke Flask Python backend (`X-API-Secret`).
- **`API_TIMEOUT_MS`**: Batas waktu toleransi request scraping backend (default: `60000` ms / 60 detik).
- **`MAX_BATCH_URL_LIMIT`**: Batas restriksi jumlah URL pada form dinamis (default: `10` URL).

---

## 3. Fitur Utama

### A. Form Input URL Dinamis (1 s/d 10 URL)
- Input 1 URL untuk scraping tunggal dengan detail lengkap.
- Tombol **`+ Tambah URL`** untuk menambah hingga maksimal 10 URL secara langsung dari antarmuka tanpa perlu file Excel.
- Tombol **`Isi Contoh URL`** untuk pengujian cepat dengan 3 link SINTA.
- Indikator status per item (*Loading, Sukses, Gagal*), progress bar, dan terminal log live.

### B. Batch Scraping Berbasis Excel
- Tombol **`Download Template Excel (.xlsx)`** langsung membuat file template Excel instan melalui SheetJS (`template_batch_sinta.xlsx`).
- Mendukung upload file Excel/CSV berisi kolom `link_sinta` atau `sinta_url` hingga 100 baris.

### C. Halaman Pembersihan Storage Khusus (`localhost:3000/clean`)
Untuk mencegah penyimpanan server membengkak akibat penumpukan file JSON:
- Akses langsung di browser: **`http://localhost:3000/clean`**.
- Menampilkan status kapasitas disk, total file, dan total entri jurnal.
- Pilihan untuk:
  - **Hapus Seluruh File Output (Purge Storage)** dengan 1 tombol konfirmasi.
  - **Hapus File Terpilih (Checkbox multi-select)**.
  - **Hapus File Individual**.
  - Pratinjau isi JSON (*Preview Modal*) dan unduh file.

### D. Endpoint API Output (Tetap Tersedia di Backend Next.js)
- `GET /api/outputs` : Mengambil list file output.
- `DELETE /api/outputs/[filename]` : Menghapus 1 file output.
- `DELETE /api/outputs/cleanup` : Menghapus seluruh file output dari server.
- `GET /api/download-zip` : Mengunduh seluruh atau sebagian file output dalam bentuk ZIP.

---

## 4. Cara Menjalankan Aplikasi

### Langkah 1: Jalankan Backend Python Flask
```bash
python backend/app.py
```
*(Server backend akan berjalan di `http://127.0.0.1:5000`)*

### Langkah 2: Jalankan Frontend Next.js
```bash
cd web-scrape
npm run dev
```
*(Buka browser di `http://localhost:3000`)*

### Langkah 3: Jalankan Portal Uploader Laravel
```bash
cd uploader
php artisan serve --port=8000
```
*(Buka browser di `http://localhost:8000/login`)*

---

## 5. Rute Halaman Frontend

| URL | Deskripsi |
|-----|-----------|
| `http://localhost:3000/` | Dashboard Scraper (Single & Multi-URL 1-10, Excel Batch, Output Manager) |
| `http://localhost:3000/clean` | Halaman Khusus Pembersihan Storage Output Server |
