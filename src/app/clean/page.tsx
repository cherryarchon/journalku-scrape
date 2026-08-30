"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trash2,
  RefreshCw,
  FolderArchive,
  FileJson,
  ArrowLeft,
  HardDrive,
  Eye,
  ExternalLink,
  Download,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import {
  ConfirmModal,
  AlertModal,
  JsonPreviewModal,
} from "@/components/ModalDialog";

interface OutputFile {
  name: string;
  path: string;
  sizeBytes: number;
  updatedAt: string;
  itemCount: number;
}

export default function CleanStoragePage() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Scraper Journalku.online";
  const uploaderUrl = process.env.NEXT_PUBLIC_UPLOADER_URL || "http://localhost:8000";

  const [files, setFiles] = useState<OutputFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewingJson, setViewingJson] = useState<{ name: string; content: string } | null>(null);

  // Modal & Toast States
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "warning" | "danger" | "info" | "success";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string[];
    type: "warning" | "danger" | "info" | "success";
    confirmText?: string;
    isProcessing?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    onConfirm: () => {},
  });

  const [toast, setToast] = useState<{
    show: boolean;
    title: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (title: string, type: "success" | "error" | "info" = "success") => {
    setToast({ show: true, title, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const showAlert = (
    title: string,
    message: string,
    type: "warning" | "danger" | "info" | "success" = "info"
  ) => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  const showConfirm = ({
    title,
    message,
    details,
    type = "warning",
    confirmText = "Ya, Lanjutkan",
    onConfirm,
  }: {
    title: string;
    message: string;
    details?: string[];
    type?: "warning" | "danger" | "info" | "success";
    confirmText?: string;
    onConfirm: () => void;
  }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      details,
      type,
      confirmText,
      onConfirm,
    });
  };

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/outputs");
      const data = await res.json();
      if (res.ok) {
        setFiles(data.files || []);
      }
    } catch (err: any) {
      showToast(`Gagal memuat file output: ${err.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Delete all files
  const handleDeleteAll = () => {
    if (files.length === 0) return;

    showConfirm({
      title: "Bersihkan Seluruh Storage Output",
      message: `PERINGATAN: Anda akan menghapus SELURUH (${files.length}) file output di folder web-scrape/output/.`,
      details: [
        `Jumlah file yang akan dihapus: ${files.length} file`,
        "Tindakan ini akan mengosongkan kapasitas storage server secara permanen.",
      ],
      type: "danger",
      confirmText: "Ya, Bersihkan Seluruh Storage",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isProcessing: true }));
        try {
          const res = await fetch("/api/outputs/cleanup", { method: "DELETE" });
          const data = await res.json();

          if (res.ok && data.success) {
            setConfirmModal((prev) => ({ ...prev, isOpen: false, isProcessing: false }));
            showToast(`Berhasil membersihkan ${data.deletedCount} file output.`, "success");
            setSelectedFiles([]);
            fetchFiles();
          } else {
            setConfirmModal((prev) => ({ ...prev, isProcessing: false }));
            showAlert("Gagal Membersihkan", data.error || "Gagal membersihkan storage output.", "danger");
          }
        } catch (err: any) {
          setConfirmModal((prev) => ({ ...prev, isProcessing: false }));
          showAlert("Kesalahan Jaringan", `Error: ${err.message}`, "danger");
        }
      },
    });
  };

  // Delete single file
  const handleDeleteSingle = (fileName: string) => {
    showConfirm({
      title: "Hapus File Output",
      message: `Apakah Anda yakin ingin menghapus file "${fileName}" dari storage server?`,
      details: ["File ini akan dihapus secara permanen."],
      type: "danger",
      confirmText: "Ya, Hapus File",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/outputs/${fileName}`, { method: "DELETE" });
          if (res.ok) {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            showToast(`File ${fileName} berhasil dihapus`, "success");
            setSelectedFiles((prev) => prev.filter((f) => f !== fileName));
            fetchFiles();
          } else {
            showAlert("Gagal Menghapus", "Gagal menghapus file dari server.", "danger");
          }
        } catch (err: any) {
          showAlert("Kesalahan Server", `Error: ${err.message}`, "danger");
        }
      },
    });
  };

  // Delete selected files
  const handleDeleteSelected = () => {
    if (selectedFiles.length === 0) return;

    showConfirm({
      title: "Hapus File Terpilih",
      message: `Apakah Anda yakin ingin menghapus ${selectedFiles.length} file yang Anda pilih?`,
      details: [`Total terpilih: ${selectedFiles.length} file`],
      type: "danger",
      confirmText: `Ya, Hapus (${selectedFiles.length}) File`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isProcessing: true }));
        let successCount = 0;

        for (const fileName of selectedFiles) {
          try {
            const res = await fetch(`/api/outputs/${fileName}`, { method: "DELETE" });
            if (res.ok) successCount++;
          } catch {}
        }

        setConfirmModal((prev) => ({ ...prev, isOpen: false, isProcessing: false }));
        showToast(`Berhasil menghapus ${successCount} dari ${selectedFiles.length} file terpilih`, "success");
        setSelectedFiles([]);
        fetchFiles();
      },
    });
  };

  // View JSON
  const handleViewJson = async (filename: string) => {
    try {
      const res = await fetch(`/api/outputs/${filename}`);
      const content = await res.text();
      setViewingJson({ name: filename, content });
    } catch {
      showAlert("Gagal Membaca File", "Gagal membaca isi file JSON dari server.", "danger");
    }
  };

  // Select all checkbox
  const toggleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map((f) => f.name));
    }
  };

  const toggleSelectFile = (fileName: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileName) ? prev.filter((f) => f !== fileName) : [...prev, fileName]
    );
  };

  // Calculate total disk size
  const totalSizeBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);
  const totalSizeFormatted =
    totalSizeBytes > 1024 * 1024
      ? `${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(totalSizeBytes / 1024).toFixed(1)} KB`;

  const totalJournalEntries = files.reduce((acc, f) => acc + f.itemCount, 0);

  return (
    <div className="min-h-screen bg-[#f1f6fa] text-slate-800 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-top-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-semibold ${
              toast.type === "success"
                ? "bg-white border-emerald-200 text-emerald-800"
                : toast.type === "error"
                ? "bg-white border-rose-200 text-rose-800"
                : "bg-white border-sky-200 text-sky-800"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {toast.type === "error" && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {toast.type === "info" && <ShieldAlert className="w-4 h-4 text-sky-600 shrink-0" />}
            <span>{toast.title}</span>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-white border-b border-[#e1eaf2] shadow-xs sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <img
                src="/logo.png"
                alt="Logo Journalku"
                className="w-9 h-9 object-contain group-hover:scale-105 transition-transform drop-shadow-xs"
              />
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-slate-900 leading-tight">
                  Pembersihan Storage Output
                </h1>
                <p className="text-[11px] text-slate-400 font-mono">
                  {appName}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-slate-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Dashboard
            </Link>

            <a
              href={uploaderUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Portal Uploader
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Overview Stats Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#e1eaf2] shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Status Direktori Storage
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Lokasi: web-scrape/output/
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase">Total File</p>
                <p className="text-lg font-extrabold text-slate-900 font-mono">
                  {files.length} <span className="text-xs text-slate-500 font-normal">file</span>
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase">Total Entri</p>
                <p className="text-lg font-extrabold text-sky-700 font-mono">
                  {totalJournalEntries} <span className="text-xs text-slate-500 font-normal">jurnal</span>
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase">Ukuran Disk</p>
                <p className="text-lg font-extrabold text-slate-900 font-mono">
                  {totalSizeFormatted}
                </p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <button
                onClick={fetchFiles}
                disabled={isLoading}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                Segarkan Daftar
              </button>

              {selectedFiles.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all border border-rose-300"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  Hapus Terpilih ({selectedFiles.length})
                </button>
              )}
            </div>

            {files.length > 0 ? (
              <button
                onClick={handleDeleteAll}
                disabled={isLoading}
                className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-600/20"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Seluruh File ({files.length})
              </button>
            ) : (
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Storage Bersih (0 File)
              </span>
            )}
          </div>
        </div>

        {/* Files Table / List */}
        <div className="bg-white rounded-3xl p-6 border border-[#e1eaf2] shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FolderArchive className="w-4 h-4 text-sky-600" />
              Daftar File Output JSON
            </h3>

            {files.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={selectedFiles.length === files.length && files.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>Pilih Semua</span>
                </label>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
              <p className="text-xs">Memuat daftar file output...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              <FolderArchive className="w-12 h-12 stroke-1 mb-2 opacity-40 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Folder Output Kosong</p>
              <p className="text-xs text-slate-500 mt-1">
                Tidak ada file JSON atau ZIP yang tersimpan di direktori server. Storage Anda dalam kondisi bersih.
              </p>
              <div className="mt-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-all"
                >
                  Mulai Scraping Jurnal
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#e1eaf2] rounded-2xl bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] text-slate-600 uppercase tracking-wider font-semibold border-b border-[#e1eaf2]">
                  <tr>
                    <th className="p-3.5 w-10 text-center">Pilih</th>
                    <th className="p-3.5">Nama File</th>
                    <th className="p-3.5">Jumlah Entri</th>
                    <th className="p-3.5">Ukuran File</th>
                    <th className="p-3.5">Waktu Pembuatan</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e1eaf2] text-slate-700">
                  {files.map((file) => (
                    <tr key={file.name} className="hover:bg-sky-50/30 transition-colors">
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.name)}
                          onChange={() => toggleSelectFile(file.name)}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <FileJson className="w-4 h-4 text-sky-600 shrink-0" />
                        {file.name}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-sky-50 text-sky-700 border border-sky-200 font-mono font-bold">
                          {file.itemCount} Jurnal
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono">
                        {(file.sizeBytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {new Date(file.updatedAt).toLocaleString("id-ID")}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewJson(file.name)}
                            title="Lihat Pratinjau JSON"
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`/api/outputs/${file.name}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Unduh File JSON"
                            className="p-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 transition-all border border-sky-200"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleDeleteSingle(file.name)}
                            title="Hapus File Ini"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e1eaf2] bg-white py-6 text-center text-xs text-slate-600 mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-bold text-slate-800">{appName} V 1.0.0</p>
          <p className="font-medium text-slate-500">© {new Date().getFullYear()} Journalku.online - Seluruh Hak Cipta Dilindungi</p>
        </div>
      </footer>

      {/* Modern Custom JSON Preview Modal */}
      {viewingJson && (
        <JsonPreviewModal
          isOpen={!!viewingJson}
          fileName={viewingJson.name}
          jsonContent={viewingJson.content}
          onClose={() => setViewingJson(null)}
          onDownload={() => window.open(`/api/outputs/${viewingJson.name}`, "_blank")}
        />
      )}

      {/* Modern Custom Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Modern Custom Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        details={confirmModal.details}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        isProcessing={confirmModal.isProcessing}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
