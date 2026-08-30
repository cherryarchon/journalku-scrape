"use client";

import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Globe,
  FileSpreadsheet,
  Download,
  FolderArchive,
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileJson,
  Layers,
  AlertTriangle,
  Search,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Server,
  Activity,
  ShieldAlert,
  Plus,
  Sparkles,
  Clock,
  ExternalLink,
  Timer,
  Hourglass,
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

interface ServerStatus {
  isOnline: boolean;
  message: string;
  timestamp?: string;
  lastChecked?: string;
}

interface UrlItemStatus {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  name?: string;
  savedFile?: string;
  sintaLevel?: string;
  publisher?: string;
  ojsPages?: number;
}

export default function ScraperDashboard() {
  const [activeTab, setActiveTab] = useState<"single" | "batch" | "outputs">("single");

  // Server Backend Configuration & Ping States
  const defaultBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  const uploaderUrl = process.env.NEXT_PUBLIC_UPLOADER_URL || "http://localhost:8000";
  const mainSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://journalku.online";
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Scraper Journalku.online";
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "V 1.0.0";

  const [backendUrl, setBackendUrl] = useState(defaultBackendUrl);
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    isOnline: false,
    message: "Server belum di-ping (IDLE). Klik 'Ping Server Backend' untuk memeriksa koneksi.",
  });
  const [isPinging, setIsPinging] = useState(false);

  // Dynamic Form URL Scraper States (1 to 10 URLs)
  const [formUrls, setFormUrls] = useState<string[]>([""]);
  const [urlStatuses, setUrlStatuses] = useState<Record<number, UrlItemStatus>>({});
  const [singleGarudaUrl, setSingleGarudaUrl] = useState("");
  const [singleOjsUrl, setSingleOjsUrl] = useState("");
  const [showManualInputs, setShowManualInputs] = useState(false);
  const [isFormScraping, setIsFormScraping] = useState(false);
  const [singleResult, setSingleResult] = useState<any>(null);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [formProgress, setFormProgress] = useState({
    current: 0,
    total: 0,
    success: 0,
    failed: 0,
  });
  const [formLogs, setFormLogs] = useState<string[]>([]);
  const formLogsEndRef = useRef<HTMLDivElement>(null);

  // Real-time Loading & Progress States
  const [scrapingElapsed, setScrapingElapsed] = useState<number>(0);
  const [scrapingStageIndex, setScrapingStageIndex] = useState<number>(0);
  const [currentProcessingItemUrl, setCurrentProcessingItemUrl] = useState<string>("");

  // Batch Excel Scraper States
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [batchUrls, setBatchUrls] = useState<{ no: number; url: string }[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({
    current: 0,
    total: 0,
    success: 0,
    failed: 0,
  });
  const [batchLogs, setBatchLogs] = useState<string[]>([]);
  const isCancelledRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Output Files States
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);
  const [isOutputLoading, setIsOutputLoading] = useState(false);
  const [viewingJson, setViewingJson] = useState<{ name: string; content: string } | null>(null);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [isZipLoading, setIsZipLoading] = useState(false);

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

  // Helper format MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Real-time Timer Effect during scraping
  useEffect(() => {
    let interval: any = null;
    if (isFormScraping || isBatchRunning) {
      setScrapingElapsed(0);
      setScrapingStageIndex(0);
      interval = setInterval(() => {
        setScrapingElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isFormScraping, isBatchRunning]);

  // Stage progression simulator for single URL scraping
  useEffect(() => {
    if (!isFormScraping || formUrls.length > 1) return;
    if (scrapingElapsed >= 1 && scrapingElapsed < 3) {
      setScrapingStageIndex(1);
    } else if (scrapingElapsed >= 3 && scrapingElapsed < 6) {
      setScrapingStageIndex(2);
    } else if (scrapingElapsed >= 6) {
      setScrapingStageIndex(3);
    }
  }, [scrapingElapsed, isFormScraping, formUrls.length]);

  // Auto-scroll batch log console
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [batchLogs]);

  // Auto-scroll form batch log console
  useEffect(() => {
    formLogsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [formLogs]);

  // Load outputs on tab change or mount
  useEffect(() => {
    if (activeTab === "outputs") {
      fetchOutputs();
    }
  }, [activeTab]);

  // Ping Backend Server Function
  const handlePingServer = async () => {
    setIsPinging(true);
    const targetUrl = backendUrl.trim().replace(/\/+$/, "");

    try {
      const res = await fetch(`${targetUrl}/api/ping`, { method: "GET" });
      const data = await res.json();

      if (res.ok && data.status === "online") {
        setServerStatus({
          isOnline: true,
          message: data.message || "Backend Flask Python Server terhubung (ONLINE)",
          timestamp: data.timestamp,
          lastChecked: new Date().toLocaleTimeString(),
        });
        showToast("Backend Server Flask terhubung (ONLINE)", "success");
      } else {
        setServerStatus({
          isOnline: false,
          message: data.error || "Server tidak merespons status ONLINE",
          lastChecked: new Date().toLocaleTimeString(),
        });
        showToast("Server tidak merespons status ONLINE", "error");
      }
    } catch (err: any) {
      setServerStatus({
        isOnline: false,
        message: `Gagal terhubung ke ${targetUrl}. Pastikan server Flask backend sudah dijalankan (python backend/app.py).`,
        lastChecked: new Date().toLocaleTimeString(),
      });
      showToast(`Gagal terhubung ke ${targetUrl}`, "error");
    } finally {
      setIsPinging(false);
    }
  };

  const fetchOutputs = async () => {
    setIsOutputLoading(true);
    try {
      const res = await fetch("/api/outputs");
      const data = await res.json();
      if (res.ok) {
        setOutputFiles(data.files || []);
      }
    } catch (err) {
      console.error("Gagal mengambil file output:", err);
    } finally {
      setIsOutputLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Dynamic Form URLs Handlers (Max 10 URLs)
  // -------------------------------------------------------------
  const handleAddUrl = () => {
    if (formUrls.length < 10) {
      setFormUrls((prev) => [...prev, ""]);
    }
  };

  const handleRemoveUrl = (indexToRemove: number) => {
    if (formUrls.length > 1) {
      setFormUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
      setUrlStatuses((prev) => {
        const next: Record<number, UrlItemStatus> = {};
        let newIdx = 0;
        Object.keys(prev).forEach((k) => {
          const oldIdx = parseInt(k, 10);
          if (oldIdx !== indexToRemove) {
            next[newIdx] = prev[oldIdx];
            newIdx++;
          }
        });
        return next;
      });
    }
  };

  const handleUrlChange = (index: number, value: string) => {
    setFormUrls((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleResetUrls = () => {
    setFormUrls([""]);
    setUrlStatuses({});
    setSingleResult(null);
    setSingleError(null);
    setFormLogs([]);
    setSingleGarudaUrl("");
    setSingleOjsUrl("");
    setShowManualInputs(false);
    showToast("Form input URL telah di-reset", "info");
  };

  const handleFillSampleUrls = () => {
    setFormUrls([
      "https://sinta.kemdikbud.go.id/journals/profile/2034",
      "https://sinta.kemdikbud.go.id/journals/profile/532",
      "https://sinta.kemdikbud.go.id/journals/profile/987",
    ]);
    setUrlStatuses({});
    setSingleResult(null);
    setSingleError(null);
    setFormLogs([]);
    showToast("Contoh 3 URL SINTA berhasil diisi", "success");
  };

  // Run Form Scraping (Single or Multi-URL Batch 1-10)
  const handleFormScrape = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!serverStatus.isOnline) {
      showAlert(
        "Server Backend Belum Terhubung",
        "Harap lakukan 'Ping Server Backend' dan pastikan server berstatus ONLINE sebelum memulai proses scraping jurnal.",
        "warning"
      );
      return;
    }

    // Filter valid non-empty URLs
    const validItems = formUrls
      .map((u, originalIdx) => ({ url: u.trim(), originalIdx }))
      .filter((item) => item.url.length > 0);

    if (validItems.length === 0) {
      showAlert(
        "URL SINTA Belum Diisi",
        "Silakan masukkan minimal 1 URL SINTA yang valid untuk memulai scraping.",
        "warning"
      );
      return;
    }

    setIsFormScraping(true);
    isCancelledRef.current = false;
    setSingleError(null);
    setSingleResult(null);

    // Initial status reset for valid items
    const initialStatuses: Record<number, UrlItemStatus> = {};
    validItems.forEach((item) => {
      initialStatuses[item.originalIdx] = { status: "idle" };
    });
    setUrlStatuses(initialStatuses);

    // CASE 1: Exactly 1 URL -> Single Scraping Mode
    if (validItems.length === 1) {
      const targetItem = validItems[0];
      setCurrentProcessingItemUrl(targetItem.url);
      setUrlStatuses({
        [targetItem.originalIdx]: { status: "loading" },
      });

      try {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sintaUrl: targetItem.url,
            garudaUrlManual: singleGarudaUrl || undefined,
            ojsUrlManual: singleOjsUrl || undefined,
            backendUrl: backendUrl.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Gagal scraping jurnal.");
        }

        setSingleResult(data);
        setUrlStatuses({
          [targetItem.originalIdx]: {
            status: "success",
            name: data.data?.sinta_data?.name || "Jurnal",
            savedFile: data.savedFile ? data.savedFile.split(/[\\/]/).pop() : undefined,
            sintaLevel: data.data?.sinta_data?.sinta_level,
            publisher: data.data?.sinta_data?.publisher,
            ojsPages: data.data?.ojs_pages?.length || 0,
          },
        });
        showToast(`Berhasil mengekstraksi jurnal: ${data.data?.sinta_data?.name || "Jurnal"}`, "success");
        fetchOutputs();
      } catch (err: any) {
        const msg = err.message || "Terjadi kesalahan sistem.";
        setSingleError(msg);
        setUrlStatuses({
          [targetItem.originalIdx]: {
            status: "error",
            message: msg,
          },
        });
        showToast(`Gagal scraping: ${msg}`, "error");
      } finally {
        setIsFormScraping(false);
        setCurrentProcessingItemUrl("");
      }
      return;
    }

    // CASE 2: Multi-URL (2 to 10 URLs) -> Multi-URL Batch Scraping Mode
    setFormProgress({
      current: 0,
      total: validItems.length,
      success: 0,
      failed: 0,
    });
    setFormLogs([
      `🚀 Memulai proses batch untuk ${validItems.length} URL form input...`,
    ]);

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validItems.length; i++) {
      if (isCancelledRef.current) {
        setFormLogs((prev) => [...prev, `⛔ Proses scraping dihentikan oleh pengguna.`]);
        break;
      }

      const item = validItems[i];
      setCurrentProcessingItemUrl(item.url);

      // Update item status to loading
      setUrlStatuses((prev) => ({
        ...prev,
        [item.originalIdx]: { status: "loading" },
      }));

      setFormLogs((prev) => [
        ...prev,
        `[${i + 1}/${validItems.length}] Mengambil: ${item.url}`,
      ]);

      try {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sintaUrl: item.url,
            backendUrl: backendUrl.trim(),
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          successCount++;
          const journalName = data.data?.sinta_data?.name || "Jurnal";
          const savedFileName = data.savedFile ? data.savedFile.split(/[\\/]/).pop() : "output.json";

          setUrlStatuses((prev) => ({
            ...prev,
            [item.originalIdx]: {
              status: "success",
              name: journalName,
              savedFile: savedFileName,
              sintaLevel: data.data?.sinta_data?.sinta_level,
              publisher: data.data?.sinta_data?.publisher,
              ojsPages: data.data?.ojs_pages?.length || 0,
            },
          }));

          setFormLogs((prev) => [
            ...prev,
            `  ✅ Sukses [${journalName}] -> Tersimpan di ${savedFileName}`,
          ]);
        } else {
          failedCount++;
          const errorMsg = data.error || "Gagal scraping jurnal";
          setUrlStatuses((prev) => ({
            ...prev,
            [item.originalIdx]: {
              status: "error",
              message: errorMsg,
            },
          }));
          setFormLogs((prev) => [...prev, `  ❌ Gagal: ${errorMsg}`]);
        }
      } catch (err: any) {
        failedCount++;
        const errorMsg = err.message || "Gagal menghubungi server";
        setUrlStatuses((prev) => ({
          ...prev,
          [item.originalIdx]: {
            status: "error",
            message: errorMsg,
          },
        }));
        setFormLogs((prev) => [...prev, `  ❌ Exception: ${errorMsg}`]);
      }

      setFormProgress({
        current: i + 1,
        total: validItems.length,
        success: successCount,
        failed: failedCount,
      });
    }

    setFormLogs((prev) => [
      ...prev,
      `🎉 Selesai! Berhasil: ${successCount} | Gagal: ${failedCount}`,
    ]);
    setIsFormScraping(false);
    setCurrentProcessingItemUrl("");
    showToast(`Batch selesai: ${successCount} berhasil, ${failedCount} gagal`, successCount > 0 ? "success" : "error");
    fetchOutputs();
  };

  const handleStopFormScrape = () => {
    isCancelledRef.current = true;
    showToast("Menghentikan proses scraping...", "info");
  };

  // -------------------------------------------------------------
  // Excel Template Download Handler
  // -------------------------------------------------------------
  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      const wsData = [
        ["no", "link_sinta"],
        [1, "https://sinta.kemdikbud.go.id/journals/profile/2034"],
        [2, "https://sinta.kemdikbud.go.id/journals/profile/532"],
        [3, "https://sinta.kemdikbud.go.id/journals/profile/987"],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set optimal column widths
      ws["!cols"] = [{ wch: 8 }, { wch: 65 }];

      XLSX.utils.book_append_sheet(wb, ws, "Template_SINTA");
      XLSX.writeFile(wb, "template_batch_sinta.xlsx");
      showToast("Template Excel (template_batch_sinta.xlsx) berhasil diunduh", "success");
    } catch (err) {
      console.error("Gagal mendownload template Excel:", err);
      showAlert("Gagal Download Template", "Terjadi kendala saat membuat file template Excel.", "danger");
    }
  };

  // -------------------------------------------------------------
  // Batch Scraping from Excel File Upload
  // -------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const parsedList: { no: number; url: string }[] = [];
        data.forEach((row, idx) => {
          let sintaUrl = "";
          Object.keys(row).forEach((colKey) => {
            const keyLower = colKey.trim().toLowerCase().replace(/\s+/g, "_");
            if (["link_sinta", "sinta_url", "url", "sinta", "link"].includes(keyLower)) {
              sintaUrl = String(row[colKey]).trim();
            }
          });

          if (sintaUrl && sintaUrl.startsWith("http")) {
            parsedList.push({
              no: idx + 1,
              url: sintaUrl,
            });
          }
        });

        // Limit to max 100 items
        const maxLimited = parsedList.slice(0, 100);
        setBatchUrls(maxLimited);
        setBatchLogs([
          `📁 Berhasil membaca file: ${file.name}`,
          `🔍 Ditemukan ${parsedList.length} URL valid.`,
          parsedList.length > 100
            ? `⚠️ Batas maksimal batch adalah 100 item. Mengambil 100 URL pertama.`
            : `✅ Siap memproses ${maxLimited.length} item.`,
        ]);
        showToast(`Berhasil membaca ${maxLimited.length} URL dari file ${file.name}`, "success");
      } catch (err) {
        showAlert("Format File Tidak Valid", "Gagal membaca file Excel/CSV. Pastikan format tabel memiliki kolom link_sinta.", "danger");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Run Batch Scraping
  const handleStartBatch = async () => {
    if (batchUrls.length === 0) return;

    if (!serverStatus.isOnline) {
      showAlert(
        "Server Backend Belum Terhubung",
        "Harap lakukan 'Ping Server Backend' dan pastikan server berstatus ONLINE sebelum memulai proses batch scraping.",
        "warning"
      );
      return;
    }

    setIsBatchRunning(true);
    isCancelledRef.current = false;
    setBatchProgress({
      current: 0,
      total: batchUrls.length,
      success: 0,
      failed: 0,
    });

    setBatchLogs((prev) => [...prev, `🚀 Memulai batch scraping (${batchUrls.length} item)...`]);

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < batchUrls.length; i++) {
      if (isCancelledRef.current) {
        setBatchLogs((prev) => [...prev, `⛔ Batch scraping dihentikan oleh pengguna.`]);
        break;
      }

      const item = batchUrls[i];
      setCurrentProcessingItemUrl(item.url);

      setBatchLogs((prev) => [
        ...prev,
        `[${i + 1}/${batchUrls.length}] Scraping: ${item.url}`,
      ]);

      try {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sintaUrl: item.url,
            backendUrl: backendUrl.trim(),
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          successCount++;
          setBatchLogs((prev) => [
            ...prev,
            `  ✅ Sukses [${data.data?.sinta_data?.name || "Jurnal"}] -> Tersimpan di ${data.savedFile}`,
          ]);
        } else {
          failedCount++;
          setBatchLogs((prev) => [...prev, `  ❌ Gagal: ${data.error || "Error unknown"}`]);
        }
      } catch (err: any) {
        failedCount++;
        setBatchLogs((prev) => [...prev, `  ❌ Exception: ${err.message || err}`]);
      }

      setBatchProgress({
        current: i + 1,
        total: batchUrls.length,
        success: successCount,
        failed: failedCount,
      });
    }

    setBatchLogs((prev) => [
      ...prev,
      `🎉 Selesai! Berhasil: ${successCount} | Gagal: ${failedCount}`,
    ]);
    setIsBatchRunning(false);
    setCurrentProcessingItemUrl("");
    showToast(`Batch Excel selesai: ${successCount} berhasil, ${failedCount} gagal`, successCount > 0 ? "success" : "error");
    fetchOutputs();
  };

  const handleStopBatch = () => {
    isCancelledRef.current = true;
    showToast("Menghentikan batch scraping...", "info");
  };

  // View JSON content
  const handleViewJson = async (filename: string) => {
    try {
      const res = await fetch(`/api/outputs/${filename}`);
      const content = await res.text();
      setViewingJson({ name: filename, content });
    } catch {
      showAlert("Gagal Membaca File", "Gagal membaca isi file JSON dari server.", "danger");
    }
  };

  // Delete output file
  const handleDeleteFile = (filename: string) => {
    showConfirm({
      title: "Hapus File Output",
      message: `Apakah Anda yakin ingin menghapus file output "${filename}" dari server?`,
      details: ["File yang dihapus tidak dapat dipulihkan kembali."],
      type: "danger",
      confirmText: "Ya, Hapus File",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/outputs/${filename}`, { method: "DELETE" });
          if (res.ok) {
            showToast(`File ${filename} berhasil dihapus`, "success");
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            fetchOutputs();
          } else {
            showAlert("Gagal Menghapus", "Terjadi kesalahan saat menghapus file di server.", "danger");
          }
        } catch (err: any) {
          showAlert("Kesalahan Server", `Error: ${err.message}`, "danger");
        }
      },
    });
  };

  // Delete all output files (Purge storage)
  const handleDeleteAllOutputs = () => {
    if (outputFiles.length === 0) return;

    showConfirm({
      title: "Bersihkan Seluruh Storage Output",
      message: `PERINGATAN: Anda akan menghapus SELURUH (${outputFiles.length}) file output di folder web-scrape/output/.`,
      details: [
        `Jumlah file yang akan dihapus: ${outputFiles.length} file`,
        "Tindakan ini akan mengosongkan kapasitas storage server secara permanen.",
      ],
      type: "danger",
      confirmText: "Ya, Bersihkan Seluruh Storage",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/outputs/cleanup", { method: "DELETE" });
          const data = await res.json();
          if (res.ok && data.success) {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            showToast(`Berhasil membersihkan ${data.deletedCount} file output`, "success");
            setSelectedFileNames([]);
            fetchOutputs();
          } else {
            showAlert("Gagal Membersihkan", data.error || "Gagal membersihkan seluruh file output.", "danger");
          }
        } catch (err: any) {
          showAlert("Kesalahan Jaringan", `Gagal menghubungi server: ${err.message}`, "danger");
        }
      },
    });
  };

  // Download single output file
  const handleDownloadSingle = (filename: string) => {
    window.open(`/api/outputs/${filename}`, "_blank");
  };

  // Download ZIP output files
  const handleDownloadZip = async (filesToZip?: string[]) => {
    setIsZipLoading(true);
    try {
      const query = filesToZip && filesToZip.length > 0 ? `?files=${filesToZip.join(",")}` : "";
      window.open(`/api/download-zip${query}`, "_blank");
      showToast("Memulai pengunduhan file ZIP...", "info");
    } catch (err) {
      showAlert("Gagal Mengunduh ZIP", "Terjadi kesalahan saat membuat file arsip ZIP.", "danger");
    } finally {
      setIsZipLoading(false);
    }
  };

  const toggleSelectFile = (filename: string) => {
    setSelectedFileNames((prev) =>
      prev.includes(filename) ? prev.filter((f) => f !== filename) : [...prev, filename]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFileNames.length === outputFiles.length) {
      setSelectedFileNames([]);
    } else {
      setSelectedFileNames(outputFiles.map((f) => f.name));
    }
  };

  const filledUrlCount = formUrls.filter((u) => u.trim().length > 0).length;

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

      {/* Top Header & Brand Bar */}
      <header className="bg-white border-b border-[#e1eaf2] shadow-xs sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo Journalku"
              className="w-10 h-10 object-contain drop-shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                  {appName}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 font-mono">
                  {appVersion}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Ekstraksi Metadata Jurnal SINTA, Garuda, dan OJS secara Otomatis
              </p>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <a
              href="/clean"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all border border-slate-200"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              Bersihkan Storage (/clean)
            </a>

            <a
              href={uploaderUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Buka Portal Uploader
            </a>

            <a
              href={mainSiteUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl flex items-center gap-1.5 transition-all border border-slate-200"
            >
              <Globe className="w-3.5 h-3.5" />
              Journalku.online
            </a>
          </div>
        </div>
      </header>

      {/* Main Body Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* SERVER BACKEND PING & STATUS BAR */}
        <div className="bg-white rounded-3xl p-6 border border-[#e1eaf2] shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
                  serverStatus.isOnline
                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                    : "bg-amber-50 border-amber-200 text-amber-600"
                }`}
              >
                <Server className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-slate-900">
                    Flask Backend Server Connection
                  </h2>

                  {serverStatus.isOnline ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      ONLINE (Aktif)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      OFFLINE / IDLE
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-0.5">
                  {serverStatus.message}
                  {serverStatus.lastChecked && (
                    <span className="text-slate-400 ml-2 font-mono">
                      (Diperiksa: {serverStatus.lastChecked})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-full sm:w-60">
                <input
                  type="url"
                  placeholder="http://localhost:5000"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs font-mono text-slate-900 transition-all outline-none"
                />
              </div>

              <button
                onClick={handlePingServer}
                disabled={isPinging}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-xs whitespace-nowrap"
              >
                <Activity className={`w-3.5 h-3.5 ${isPinging ? "animate-spin" : ""}`} />
                {isPinging ? "Pinging..." : "Ping Server Backend"}
              </button>
            </div>
          </div>

          {!serverStatus.isOnline && (
            <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Perhatian:</strong> Fitur scraping memerlukan server backend. Klik tombol{" "}
                <strong>Ping Server Backend</strong> dan pastikan status <strong>ONLINE</strong> sebelum memulai scraping.
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1.5 bg-white border border-[#e1eaf2] rounded-2xl max-w-fit flex-wrap shadow-xs">
          <button
            onClick={() => setActiveTab("single")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "single"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Form Input URL (1 - 10 URL)
            {formUrls.length > 1 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded bg-white/20 text-white font-mono">
                {formUrls.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("batch")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "batch"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Batch Scraping (Excel)
            {batchUrls.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded bg-white/20 text-white font-mono">
                {batchUrls.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("outputs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "outputs"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            Output JSON & ZIP
            {outputFiles.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded bg-slate-100 text-slate-700 font-mono font-bold">
                {outputFiles.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: FORM INPUT URL (1 TO 10 URLs DYNAMIC) */}
        {activeTab === "single" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e1eaf2] shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="text-base font-bold flex items-center gap-2 text-slate-900">
                    <Search className="w-4 h-4 text-sky-600" />
                    Input URL SINTA (1 s/d 10)
                  </h2>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
                      formUrls.length >= 10
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-sky-50 border-sky-200 text-sky-700"
                    }`}
                  >
                    {formUrls.length}/10 URL
                  </span>
                </div>

                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Input 1 URL untuk scraping tunggal, atau klik tombol{" "}
                  <strong className="text-sky-600">+ Tambah URL</strong> untuk memproses hingga maksimal 10 URL
                  sekaligus secara batch tanpa file Excel.
                </p>

                {/* Quick actions row */}
                <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={handleFillSampleUrls}
                    disabled={isFormScraping}
                    className="flex items-center gap-1.5 text-sky-600 hover:text-sky-700 font-medium transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    Isi Contoh URL
                  </button>

                  {formUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={handleResetUrls}
                      disabled={isFormScraping}
                      className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Reset Form ({formUrls.length})
                    </button>
                  )}
                </div>

                <form onSubmit={handleFormScrape} className="space-y-4">
                  {/* Dynamic URL Inputs */}
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {formUrls.map((url, index) => {
                      const itemStatus = urlStatuses[index];
                      return (
                        <div
                          key={index}
                          className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#e1eaf2] hover:border-slate-300 transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-[10px] font-mono">
                                #{index + 1}
                              </span>
                              SINTA Journal URL
                              {index === 0 && <span className="text-rose-500 font-bold">*</span>}
                            </span>

                            {/* Item Status Badge */}
                            {itemStatus && (
                              <div className="text-[11px]">
                                {itemStatus.status === "loading" && (
                                  <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1 font-medium">
                                    <RefreshCw className="w-3 h-3 animate-spin" /> Scraping...
                                  </span>
                                )}
                                {itemStatus.status === "success" && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-medium">
                                    <CheckCircle2 className="w-3 h-3" /> Sukses
                                  </span>
                                )}
                                {itemStatus.status === "error" && (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 font-medium">
                                    <XCircle className="w-3 h-3" /> Gagal
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              required={index === 0}
                              disabled={isFormScraping}
                              placeholder="https://sinta.kemdikbud.go.id/journals/profile/..."
                              value={url}
                              onChange={(e) => handleUrlChange(index, e.target.value)}
                              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs font-mono text-slate-900 transition-all outline-none"
                            />

                            {formUrls.length > 1 && (
                              <button
                                type="button"
                                disabled={isFormScraping}
                                onClick={() => handleRemoveUrl(index)}
                                title="Hapus URL ini"
                                className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Quick result details per item */}
                          {itemStatus?.status === "success" && itemStatus.name && (
                            <div className="text-[11px] text-emerald-700 pl-1 flex items-center justify-between gap-2">
                              <span className="truncate font-medium">📖 {itemStatus.name}</span>
                              {itemStatus.savedFile && (
                                <span className="text-[10px] font-mono text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                  {itemStatus.savedFile}
                                </span>
                              )}
                            </div>
                          )}
                          {itemStatus?.status === "error" && itemStatus.message && (
                            <div className="text-[11px] text-rose-600 pl-1 truncate">
                              ⚠️ {itemStatus.message}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add URL Button (+ Button up to 10) */}
                  <div className="pt-1">
                    {formUrls.length < 10 ? (
                      <button
                        type="button"
                        disabled={isFormScraping}
                        onClick={handleAddUrl}
                        className="w-full py-2.5 px-3 rounded-xl border border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/50 hover:bg-sky-50 text-sky-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah URL (+ {formUrls.length}/10)
                      </button>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center flex items-center justify-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Batas maksimal 10 URL tercapai
                      </div>
                    )}
                  </div>

                  {/* Manual Garuda/OJS Override (Only relevant when 1 URL is used) */}
                  {formUrls.length === 1 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowManualInputs(!showManualInputs)}
                        className="flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-800 py-1"
                      >
                        {showManualInputs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Override Manual Garuda / OJS URL (Opsional 1 URL)
                      </button>

                      {showManualInputs && (
                        <div className="mt-3 space-y-3 p-3.5 rounded-2xl bg-[#f8fafc] border border-[#e1eaf2]">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              Garuda URL (Manual)
                            </label>
                            <input
                              type="url"
                              placeholder="https://garuda.kemdiktisaintek.go.id/journal/view/..."
                              value={singleGarudaUrl}
                              onChange={(e) => setSingleGarudaUrl(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              OJS / Website URL (Manual)
                            </label>
                            <input
                              type="url"
                              placeholder="https://ejournal.unri.ac.id/index.php/..."
                              value={singleOjsUrl}
                              onChange={(e) => setSingleOjsUrl(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    {!isFormScraping ? (
                      <button
                        type="submit"
                        disabled={filledUrlCount === 0 || !serverStatus.isOnline}
                        className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-2xl text-xs transition-all shadow-md shadow-sky-600/20 flex items-center justify-center gap-2"
                      >
                        {!serverStatus.isOnline ? (
                          <>
                            <ShieldAlert className="w-4 h-4" />
                            Server Offline (Lakukan Ping Terlebih Dahulu)
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current" />
                            {filledUrlCount > 1
                              ? `Mulai Batch Scraping (${filledUrlCount} URL)`
                              : "Mulai Scraping URL"}
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopFormScrape}
                        className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-2xl text-xs transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 animate-pulse"
                      >
                        <Square className="w-4 h-4 fill-current" />
                        Hentikan Proses Scraping ({formatTime(scrapingElapsed)})
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* Result & Batch Progress Column */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e1eaf2] shadow-xs h-full flex flex-col">
                {/* Result header */}
                <h2 className="text-base font-bold mb-4 flex items-center justify-between text-slate-900">
                  <span className="flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-sky-600" />
                    {formUrls.length > 1 ? "Aktivitas & Log Batch Form" : "Hasil Scraping Jurnal"}
                  </span>
                  {singleResult?.savedFile && (
                    <span className="text-xs text-emerald-700 font-mono bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Tersimpan di: {singleResult.savedFile.split(/[\\/]/).pop()}
                    </span>
                  )}
                </h2>

                {/* Progress Bar for Multi-URL Mode */}
                {formUrls.length > 1 && (isFormScraping || formProgress.total > 0) && (
                  <div className="mb-4 p-4 rounded-2xl bg-[#f8fafc] border border-[#e1eaf2] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700 font-semibold">
                          Proses: <strong>{formProgress.current}</strong> / {formProgress.total} item
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-mono font-bold text-[11px]">
                          {formProgress.total > 0
                            ? Math.round((formProgress.current / formProgress.total) * 100)
                            : 0}
                          %
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                          <Timer className="w-3.5 h-3.5 text-sky-600" />
                          {formatTime(scrapingElapsed)}
                        </span>
                        <span className="text-emerald-700 flex items-center gap-1 font-mono font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {formProgress.success}
                        </span>
                        <span className="text-rose-600 flex items-center gap-1 font-mono font-bold">
                          <XCircle className="w-3.5 h-3.5" /> {formProgress.failed}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 via-blue-500 to-emerald-500 rounded-full transition-all duration-300 relative overflow-hidden"
                        style={{
                          width: `${
                            formProgress.total > 0
                              ? (formProgress.current / formProgress.total) * 100
                              : 0
                          }%`,
                        }}
                      >
                        {isFormScraping && <div className="absolute inset-0 bg-white/25 animate-pulse" />}
                      </div>
                    </div>

                    {isFormScraping && currentProcessingItemUrl && (
                      <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 pt-0.5">
                        <RefreshCw className="w-3 h-3 text-sky-600 animate-spin shrink-0" />
                        <span className="truncate">Sedang memproses: <strong className="text-slate-700">{currentProcessingItemUrl}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {/* Multi-URL Logs Console */}
                {formUrls.length > 1 && (
                  <div className="flex-1 flex flex-col min-h-[300px]">
                    <div className="h-64 lg:h-80 bg-slate-900 rounded-2xl p-4 border border-slate-800 overflow-y-auto font-mono text-xs space-y-1.5 flex-1 text-slate-300">
                      {formLogs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                          <Clock className="w-8 h-8 stroke-1 mb-2 opacity-40" />
                          <p>Klik &quot;Mulai Batch Scraping&quot; untuk menjalankan {filledUrlCount} URL yang diinput.</p>
                        </div>
                      ) : (
                        formLogs.map((log, index) => (
                          <div
                            key={index}
                            className={`${
                              log.includes("Sukses")
                                ? "text-emerald-400 font-medium"
                                : log.includes("Gagal") || log.includes("Exception")
                                ? "text-rose-400 font-semibold"
                                : log.includes("Mengambil") || log.includes("Scraping")
                                ? "text-sky-300"
                                : "text-slate-300"
                            }`}
                          >
                            {log}
                          </div>
                        ))
                      )}
                      <div ref={formLogsEndRef} />
                    </div>
                  </div>
                )}

                {/* Single URL Result View / Active Loading Card */}
                {formUrls.length === 1 && (
                  <>
                    {/* ACTIVE SCRAPING PROGRESS & LOADING CARD (CERTAINTY INDICATOR) */}
                    {isFormScraping ? (
                      <div className="flex-1 flex flex-col justify-center p-6 bg-white rounded-2xl border border-sky-200 shadow-xs space-y-5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center">
                              <Activity className="w-5 h-5 animate-spin text-sky-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">
                                Sedang Mengekstrak Data Jurnal...
                              </h3>
                              <p className="text-xs text-slate-500 font-mono truncate max-w-[220px] sm:max-w-xs">
                                {formUrls[0]}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full font-mono flex items-center gap-1">
                              <Timer className="w-3.5 h-3.5 text-sky-600" />
                              {formatTime(scrapingElapsed)}
                            </span>
                          </div>
                        </div>

                        {/* Dynamic Animated Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-sky-800">
                              {scrapingStageIndex === 0 && "Langkah 1: Mengambil Profil & Akreditasi SINTA"}
                              {scrapingStageIndex === 1 && "Langkah 2: Mengekstrak Garuda & ID Pengindeks"}
                              {scrapingStageIndex === 2 && "Langkah 3: Deep Crawling Halaman OJS & Editorial"}
                              {scrapingStageIndex === 3 && "Langkah 4: Memvalidasi & Menyimpan Output JSON"}
                            </span>
                            <span className="font-mono text-sky-700 font-bold">
                              {scrapingStageIndex === 0 && "25%"}
                              {scrapingStageIndex === 1 && "50%"}
                              {scrapingStageIndex === 2 && "75%"}
                              {scrapingStageIndex === 3 && "90%"}
                            </span>
                          </div>

                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                            <div
                              className="h-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-500 relative overflow-hidden"
                              style={{
                                width:
                                  scrapingStageIndex === 0
                                    ? "25%"
                                    : scrapingStageIndex === 1
                                    ? "50%"
                                    : scrapingStageIndex === 2
                                    ? "75%"
                                    : "90%",
                              }}
                            >
                              <div className="absolute inset-0 bg-white/30 animate-pulse" />
                            </div>
                          </div>
                        </div>

                        {/* Stage Step Indicators */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {[
                            { label: "SINTA Profil", stage: 0 },
                            { label: "Garuda Data", stage: 1 },
                            { label: "OJS Crawl", stage: 2 },
                            { label: "Simpan JSON", stage: 3 },
                          ].map((step, sIdx) => {
                            const isPassed = scrapingStageIndex > step.stage;
                            const isCurrent = scrapingStageIndex === step.stage;
                            return (
                              <div
                                key={sIdx}
                                className={`p-2.5 rounded-xl border text-center transition-all ${
                                  isPassed
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold"
                                    : isCurrent
                                    ? "bg-sky-50 border-sky-300 text-sky-800 font-bold shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                                }`}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  {isPassed ? (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  ) : isCurrent ? (
                                    <RefreshCw className="w-3 h-3 text-sky-600 animate-spin" />
                                  ) : (
                                    <span className="w-3 h-3 rounded-full bg-slate-200 text-[9px] flex items-center justify-center font-mono">
                                      {sIdx + 1}
                                    </span>
                                  )}
                                  <span className="text-[11px] truncate">{step.label}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100 text-[11px] text-sky-800 flex items-center gap-2">
                          <Hourglass className="w-4 h-4 text-sky-600 shrink-0" />
                          <span>
                            Proses ekstraksi komprehensif rata-rata berlangsung 5–15 detik tergantung respon web OJS jurnal tujuan.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {singleError && (
                          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 mb-4">
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Gagal Scraping</p>
                              <p className="opacity-90">{singleError}</p>
                            </div>
                          </div>
                        )}

                        {singleResult ? (
                          <div className="flex-1 flex flex-col space-y-4">
                            <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#e1eaf2] text-xs space-y-2">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Nama Jurnal:</span>
                                <span className="font-bold text-slate-900">
                                  {singleResult.data?.sinta_data?.name || "-"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Akreditasi:</span>
                                <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                  {singleResult.data?.sinta_data?.sinta_level
                                    ? `SINTA ${singleResult.data.sinta_data.sinta_level}`
                                    : "-"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Penerbit:</span>
                                <span className="text-slate-700">
                                  {singleResult.data?.sinta_data?.publisher || "-"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">OJS Pages Crawled:</span>
                                <span className="text-sky-700 font-mono font-bold">
                                  {singleResult.data?.ojs_pages?.length || 0} Halaman
                                </span>
                              </div>
                            </div>

                            <div className="relative flex-1 min-h-[260px] bg-slate-900 rounded-2xl p-4 border border-slate-800 overflow-auto font-mono text-xs text-slate-200">
                              <pre>{JSON.stringify(singleResult.data, null, 2)}</pre>
                            </div>
                          </div>
                        ) : (
                          !singleError && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                              <Search className="w-12 h-12 stroke-1 mb-3 opacity-40 text-slate-400" />
                              <p className="text-sm font-semibold text-slate-700">Masukkan SINTA URL dan klik &quot;Mulai Scraping&quot;</p>
                              <p className="text-xs text-slate-500 mt-1">
                                Hasil JSON dari Python Backend akan disimpan di folder web-scrape/output/
                              </p>
                            </div>
                          )
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BATCH SCRAPING (EXCEL) */}
        {activeTab === "batch" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e1eaf2] shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2 text-slate-900">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    Upload File Excel / CSV (.xlsx, .xls, .csv)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Excel berisi kolom <code className="text-emerald-700 font-mono bg-emerald-50 px-1 py-0.5 rounded">link_sinta</code> (atau{" "}
                    <code className="text-emerald-700 font-mono bg-emerald-50 px-1 py-0.5 rounded">sinta_url</code>). Maksimal batch:{" "}
                    <strong>100 item</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Download Template Excel Button */}
                  <button
                    onClick={handleDownloadTemplate}
                    type="button"
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all border border-slate-200 flex items-center gap-2 shadow-xs"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    Download Template Excel (.xlsx)
                  </button>

                  <label className="cursor-pointer px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Pilih File Excel
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Status / Alert limit */}
              {batchUrls.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#e1eaf2] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Layers className="w-4 h-4 text-sky-600" />
                      <span className="text-sm font-semibold text-slate-800">
                        URL Ditemukan: <strong className="text-sky-700">{batchUrls.length} Item</strong>
                      </span>
                      {batchUrls.length === 100 && (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3 h-3" /> Max Limit Reached (100)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isBatchRunning ? (
                        <button
                          onClick={handleStartBatch}
                          disabled={!serverStatus.isOnline}
                          className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Mulai Batch Scraping
                        </button>
                      ) : (
                        <button
                          onClick={handleStopBatch}
                          className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs animate-pulse"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          Hentikan Process ({formatTime(scrapingElapsed)})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {isBatchRunning || batchProgress.current > 0 ? (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700">
                            Proses: <strong>{batchProgress.current}</strong> / {batchProgress.total} item
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-mono font-bold text-[11px]">
                            {batchProgress.total > 0
                              ? Math.round((batchProgress.current / batchProgress.total) * 100)
                              : 0}
                            %
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5 text-sky-600" />
                            {formatTime(scrapingElapsed)}
                          </span>
                          <span className="text-emerald-700 flex items-center gap-1 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sukses: {batchProgress.success}
                          </span>
                          <span className="text-rose-600 flex items-center gap-1 font-bold">
                            <XCircle className="w-3.5 h-3.5 text-rose-500" /> Gagal: {batchProgress.failed}
                          </span>
                        </div>
                      </div>

                      {/* Animated Progress Bar */}
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 via-blue-500 to-emerald-500 rounded-full transition-all duration-300 relative overflow-hidden"
                          style={{
                            width: `${
                              batchProgress.total > 0
                                ? (batchProgress.current / batchProgress.total) * 100
                                : 0
                            }%`,
                          }}
                        >
                          {isBatchRunning && <div className="absolute inset-0 bg-white/25 animate-pulse" />}
                        </div>
                      </div>

                      {isBatchRunning && currentProcessingItemUrl && (
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 pt-0.5">
                          <RefreshCw className="w-3 h-3 text-sky-600 animate-spin shrink-0" />
                          <span className="truncate">Sedang memproses: <strong className="text-slate-700">{currentProcessingItemUrl}</strong></span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Logs Console */}
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Terminal Live Logs & Activity Console
                </h3>

                <div className="h-64 bg-slate-900 rounded-2xl p-4 border border-slate-800 overflow-y-auto font-mono text-xs space-y-1.5 text-slate-300">
                  {batchLogs.length === 0 ? (
                    <p className="text-slate-500">
                      Silakan upload file Excel atau gunakan template untuk memulai batch scraping...
                    </p>
                  ) : (
                    batchLogs.map((log, index) => (
                      <div
                        key={index}
                        className={`${
                          log.includes("Sukses")
                            ? "text-emerald-400"
                            : log.includes("Gagal") || log.includes("Exception")
                            ? "text-rose-400 font-semibold"
                            : log.includes("Scraping")
                            ? "text-sky-300"
                            : "text-slate-300"
                        }`}
                      >
                        {log}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: OUTPUT FILES & ZIP DOWNLOAD */}
        {activeTab === "outputs" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e1eaf2] shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2 text-slate-900">
                    <FolderArchive className="w-5 h-5 text-sky-600" />
                    Manajemen File Output (.json & .zip)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    File tersimpan mandiri di <code className="text-sky-700 font-mono bg-sky-50 px-1 py-0.5 rounded">web-scrape/output/</code>.
                    Batas download individual: 20 file, atau hingga 100 file dikompresi menjadi format{" "}
                    <strong>.zip</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={fetchOutputs}
                    disabled={isOutputLoading}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all border border-slate-200"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isOutputLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>

                  <button
                    onClick={() => handleDownloadZip(selectedFileNames.length > 0 ? selectedFileNames : undefined)}
                    disabled={isZipLoading || outputFiles.length === 0}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    {selectedFileNames.length > 0
                      ? `Download ZIP Terpilih (${selectedFileNames.length})`
                      : `Download Semua ZIP (${outputFiles.length} file)`}
                  </button>

                  {outputFiles.length > 0 && (
                    <button
                      onClick={handleDeleteAllOutputs}
                      title="Hapus seluruh file output dari server"
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all border border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      Bersihkan Storage Output
                    </button>
                  )}
                </div>
              </div>

              {outputFiles.length > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedFileNames.length === outputFiles.length && outputFiles.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="font-medium text-slate-700">Pilih Semua ({outputFiles.length} File)</span>
                  </div>

                  <span>Indikasi ZIP: s/d 100 Item</span>
                </div>
              )}

              {/* Table list */}
              {isOutputLoading ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
                  <p className="text-xs">Memuat daftar file output...</p>
                </div>
              ) : outputFiles.length === 0 ? (
                <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  <FolderArchive className="w-12 h-12 stroke-1 mb-2 opacity-40 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">Belum ada file JSON di folder web-scrape/output/</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Lakukan scraping single atau batch untuk membuat file output.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#e1eaf2] rounded-2xl bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8fafc] text-slate-600 uppercase tracking-wider font-semibold border-b border-[#e1eaf2]">
                      <tr>
                        <th className="p-3.5 w-10 text-center">Pilih</th>
                        <th className="p-3.5">Nama File JSON</th>
                        <th className="p-3.5">Jumlah Item Jurnal</th>
                        <th className="p-3.5">Ukuran File</th>
                        <th className="p-3.5">Terakhir Diperbarui</th>
                        <th className="p-3.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e1eaf2] text-slate-700">
                      {outputFiles.map((file) => (
                        <tr key={file.name} className="hover:bg-sky-50/30 transition-colors">
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={selectedFileNames.includes(file.name)}
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
                              {file.itemCount} Item
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
                              <button
                                onClick={() => handleDownloadSingle(file.name)}
                                title="Download JSON Individual"
                                className="p-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 transition-all border border-sky-200"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.name)}
                                title="Hapus File"
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
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#e1eaf2] bg-white py-6 text-center text-xs text-slate-600 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-bold text-slate-800">{appName} {appVersion}</p>
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
          onDownload={() => handleDownloadSingle(viewingJson.name)}
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
