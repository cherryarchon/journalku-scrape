import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Database,
  Sparkles,
  Layers,
  Zap,
  Globe,
  CheckCircle2,
  Lock,
  ExternalLink,
  ShieldAlert,
  Search,
} from 'lucide-react';

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = await searchParams;
  const error = resolvedParams?.error;

  const webBBaseUrl = (
    process.env.SSO_WEB_B_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://auth.journalku.online'
  ).replace(/\/$/, '');

  const ssoLoginUrl = `${webBBaseUrl}/auth/sso/web-c`;

  const errorMessages: Record<string, string> = {
    missing_code: 'Kode otorisasi tidak ditemukan pada callback SSO.',
    exchange_failed: 'Gagal menukarkan kode otorisasi atau kode telah kadaluarsa.',
    invalid_grant: 'Kode otorisasi tidak valid atau telah digunakan sebelumnya (replay blocked).',
    unauthorized_client: 'Klien Web Scraper tidak diotorisasi oleh Gateway SSO.',
    invalid_identity: 'Identitas pengguna dari server pusat tidak valid.',
    unauthorized_role: 'Akses Ditolak: Hanya pengguna dengan Role Administrator (2) atau Editor (3) yang diizinkan masuk ke Web Scraper.',
    server_error: 'Terjadi kendala pada server saat proses komunikasi autentikasi SSO.',
  };

  const currentErrorMessage = error ? (errorMessages[error] || 'Autentikasi SSO gagal. Silakan coba kembali.') : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans relative overflow-hidden">
      {/* Decorative Blue & Indigo Ambient Glows (Light Mode) */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] bg-indigo-300/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-sky-200/25 rounded-full blur-3xl pointer-events-none" />

      {/* Top Simple Brand Navbar */}
      <header className="w-full border-b border-blue-100/80 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-sm flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Logo Journalku"
                className="w-full h-full object-contain filter drop-shadow-xs"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base">
                  Scraper Journalku
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                SINTA, Garuda &amp; OJS Metadata Automation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SSO Gateway Aktif
            </span>

            <a
              href="https://journalku.online"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <span>Journalku.online</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 flex items-center justify-center relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Hero & Feature Highlights (6 cols) */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Portal Ekstraksi &amp; Sinkronisasi Jurnal Ilmiah</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Ekstraksi Metadata Jurnal Lebih{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700">
                Cepat, Tepat &amp; Terintegrasi
              </span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
              Otomatisasi pengumpulan metadata artikel dari profil SINTA Kemdiktisaintek, portal Garuda, dan Open Journal Systems (OJS) dengan autentikasi tunggal terpadu.
            </p>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-left">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all group">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                  <Database className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-slate-900">Integrasi 2 Database</h2>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Sinkronisasi link SINTA dari Database Utama secara otomatis dengan deteksi anti-duplikasi.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all group">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                  <Zap className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-slate-900">Auto-Skip Duplikasi</h2>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Sistem otomatis melewati link yang sudah pernah di-scrape untuk menghemat waktu &amp; memori.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all group">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                  <Layers className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-slate-900">Hak Akses Role</h2>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Pemisahan hak akses: Administrator (akses penuh) &amp; Editor (pengelolaan data pribadi).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all group">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-slate-900">Keamanan Sesi SSO</h2>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Opaque token 256-bit dengan hash SHA-256 dan proteksi cookie HttpOnly Secure terisolasi.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login Portal Card (6 cols) */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-white rounded-3xl p-8 sm:p-9 border border-blue-100 shadow-xl shadow-blue-600/5 relative overflow-hidden">
              {/* Subtle top card accent bar */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500" />

              {/* Card Header */}
              <div className="text-center pb-6 border-b border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Portal Masuk Terpadu
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Masuk menggunakan akun SSO resmi Journalku
                </p>

                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/80 text-blue-700 border border-blue-200/60 text-[11px] font-bold">
                  <span>Khusus Role Administrator &amp; Editor</span>
                </div>
              </div>

              {/* Error Alert Message if Any */}
              {currentErrorMessage && (
                <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-900 uppercase tracking-wider text-[10px]">Autentikasi Gagal</p>
                    <p className="mt-0.5 leading-relaxed font-medium text-rose-800">{currentErrorMessage}</p>
                  </div>
                </div>
              )}

              {/* Action Area */}
              <div className="pt-6 space-y-4">
                <a
                  href={ssoLoginUrl}
                  className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group cursor-pointer"
                >
                  <span>Masuk melalui Journalku (SSO)</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>

                <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Otentikasi aman via server-to-server token exchange</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Tanpa memasukkan username &amp; password berulang</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Proteksi sesi aktif dengan isolasi database lokal</span>
                  </div>
                </div>
              </div>

              {/* Gateway Note */}
              <div className="pt-5 border-t border-slate-100 mt-6 flex items-center justify-center gap-2 text-center text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Terhubung ke Gateway <strong>auth.journalku.online</strong></span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-semibold text-slate-700">
            &copy; {new Date().getFullYear()} Journalku.online. Seluruh hak cipta dilindungi.
          </p>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <a href="https://journalku.online" target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors">
              Pusat Jurnal
            </a>
            <span>&bull;</span>
            <span className="text-slate-400">Sistem Otomasi SINTA v2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
