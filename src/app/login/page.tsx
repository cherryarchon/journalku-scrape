import React from 'react';
import Link from 'next/link';
import { BookOpen, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

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
    missing_code: 'Kode otorisasi tidak ditemukan.',
    exchange_failed: 'Gagal menukarkan kode otorisasi atau kode telah kadaluarsa.',
    invalid_grant: 'Kode otorisasi tidak valid atau telah digunakan sebelumnya.',
    unauthorized_client: 'Klien Web C tidak diizinkan oleh Web B.',
    invalid_identity: 'Data identitas pengguna dari Web B tidak valid.',
    unauthorized_role: 'Akses Ditolak: Hanya pengguna dengan Role Administrator (2) atau Editor (3) yang diizinkan masuk ke Web Scraper.',
    server_error: 'Terjadi kendala pada server saat proses autentikasi SSO.',
  };

  const currentErrorMessage = error ? (errorMessages[error] || 'Autentikasi SSO gagal. Silakan coba kembali.') : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white font-sans">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-8 shadow-2xl text-white relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center mb-8 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4 ring-4 ring-white/10">
            <BookOpen className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Web Scraper Journalku</h1>
          <p className="text-xs text-slate-300 mt-1.5 font-medium">
            Khusus Akun Administrator &amp; Editor
          </p>
        </div>

        {currentErrorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-100 text-xs flex items-start gap-3 relative z-10">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-200 uppercase tracking-wider text-[10px]">Autentikasi Gagal</p>
              <p className="mt-0.5 text-red-100 leading-relaxed font-medium">{currentErrorMessage}</p>
            </div>
          </div>
        )}

        <div className="space-y-4 relative z-10">
          <a
            href={ssoLoginUrl}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Masuk melalui Journalku</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Terproteksi SSO Terpadu Journalku.online</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-8">
        &copy; {new Date().getFullYear()} Journalku.online. Seluruh hak cipta dilindungi.
      </p>
    </div>
  );
}
