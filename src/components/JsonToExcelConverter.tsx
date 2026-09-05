"use client";

import React, { useState, useRef } from "react";
import {
  FileSpreadsheet,
  FileJson,
  UploadCloud,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Eye,
  Info,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  ArrowRight,
  ShieldCheck,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  EXAMPLE_FORMAT_JOURNAL,
  normalizeJsonInput,
  validateJournalItem,
  createWorkbookFromValidJournals,
  JournalExcelItem,
} from "@/lib/excel/converter";

interface SkippedItem {
  index: number;
  name: string;
  errors: string[];
  rawItem: any;
}

export default function JsonToExcelConverter() {
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [jsonText, setJsonText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCopiedExample, setIsCopiedExample] = useState(false);
  const [isCopiedPrompt, setIsCopiedPrompt] = useState(false);
  const [isCopiedRaw, setIsCopiedRaw] = useState(false);
  const [showExampleJson, setShowExampleJson] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Conversion Results
  const [hasProcessed, setHasProcessed] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [validItems, setValidItems] = useState<JournalExcelItem[]>([]);
  const [skippedItems, setSkippedItems] = useState<SkippedItem[]>([]);
  const [inspectingRaw, setInspectingRaw] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formattedExampleString = JSON.stringify(EXAMPLE_FORMAT_JOURNAL, null, 2);

  const handleCopyExample = () => {
    navigator.clipboard.writeText(formattedExampleString);
    setIsCopiedExample(true);
    setTimeout(() => setIsCopiedExample(false), 2000);
  };

  const handleCopyPrompt = async () => {
    try {
      const res = await fetch("/prompt.md");
      const text = await res.text();
      navigator.clipboard.writeText(text);
      setIsCopiedPrompt(true);
      setTimeout(() => setIsCopiedPrompt(false), 2000);
    } catch {
      alert("Gagal membaca file prompt.md");
    }
  };

  const handleCopyRawSample = async () => {
    try {
      const res = await fetch("/raw_sinta_sample.json");
      const text = await res.text();
      navigator.clipboard.writeText(text);
      setIsCopiedRaw(true);
      setTimeout(() => setIsCopiedRaw(false), 2000);
    } catch {
      alert("Gagal membaca file raw_sinta_sample.json");
    }
  };

  const handleUseExample = () => {
    setInputMode("text");
    setJsonText(JSON.stringify([EXAMPLE_FORMAT_JOURNAL], null, 2));
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".json")) {
        setSelectedFile(file);
      } else {
        alert("Harap pilih file dengan ekstensi .json");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setJsonText("");
    setHasProcessed(false);
    setValidItems([]);
    setSkippedItems([]);
    setTotalCount(0);
    setInspectingRaw(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processJsonContent = (rawJson: any) => {
    const rawItems = normalizeJsonInput(rawJson);

    if (!rawItems || rawItems.length === 0) {
      alert("Tidak ada entri data jurnal yang ditemukan di dalam file JSON.");
      setIsProcessing(false);
      return;
    }

    const valid: JournalExcelItem[] = [];
    const skipped: SkippedItem[] = [];

    rawItems.forEach((item, idx) => {
      const validation = validateJournalItem(item, idx + 1);
      if (validation.valid && validation.item) {
        valid.push(validation.item);
      } else {
        const fallbackName =
          (item && typeof item === "object" && (item.name || item.title)) ||
          `Entri #${idx + 1}`;
        skipped.push({
          index: idx + 1,
          name: String(fallbackName),
          errors: validation.errors,
          rawItem: item,
        });
      }
    });

    setTotalCount(rawItems.length);
    setValidItems(valid);
    setSkippedItems(skipped);
    setHasProcessed(true);
    setIsProcessing(false);
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      if (inputMode === "file") {
        if (!selectedFile) {
          alert("Silakan pilih file JSON terlebih dahulu.");
          setIsProcessing(false);
          return;
        }
        const text = await selectedFile.text();
        const parsed = JSON.parse(text);
        processJsonContent(parsed);
      } else {
        if (!jsonText.trim()) {
          alert("Silakan tempel teks JSON terlebih dahulu.");
          setIsProcessing(false);
          return;
        }
        const parsed = JSON.parse(jsonText);
        processJsonContent(parsed);
      }
    } catch (err: any) {
      alert(`Gagal memproses JSON: Format JSON tidak valid (${err.message}).`);
      setIsProcessing(false);
    }
  };

  const handleDownloadExcel = () => {
    if (validItems.length === 0) {
      alert("Tidak ada data jurnal yang valid untuk diekspor ke Excel.");
      return;
    }

    const wb = createWorkbookFromValidJournals(validItems);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `jurnal_import_${timestamp}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e1eaf2] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold flex items-center gap-2 text-slate-900">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Alur Konversi: Raw Scraping &rarr; AI Ekstraktor &rarr; Excel Import
            </h2>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              Panduan lengkap mengubah data scraping mentah SINTA menjadi JSON rapi menggunakan AI (seperti GLM https://z.ai/, ChatGPT, Gemini),
              kemudian divalidasi dan diekspor ke spreadsheet Excel (<code className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono text-[11px]">template.xlsx</code>)
              siap impor ke sistem.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/format.json"
              download="format.json"
              className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-sky-200"
              title="Unduh file format.json sebagai contoh target output AI"
            >
              <FileJson className="w-3.5 h-3.5" />
              Unduh format.json
            </a>

            <a
              href="/template.xlsx"
              download="template.xlsx"
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-emerald-200"
              title="Unduh file template.xlsx kosong dengan panduan"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh template.xlsx
            </a>
          </div>
        </div>
      </div>

      {/* WORKFLOW STEPPER CARDS (3 LANGKAH KERJA) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e1eaf2] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 font-mono font-bold text-xs flex items-center justify-center">
                1
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400">Tahap Input</span>
            </div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-sky-600" />
              Dapatkan JSON Mentah (Raw)
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Jalankan scraping SINTA atau gunakan file mentah yang tersimpan di root project:{" "}
              <code className="text-slate-800 font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">raw_sinta_sample.json</code>.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            <a
              href="/raw_sinta_sample.json"
              download="raw_sinta_sample.json"
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors"
            >
              <Download className="w-3 h-3" /> Unduh Raw JSON
            </a>
            <button
              type="button"
              onClick={handleCopyRawSample}
              className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors border border-sky-200"
            >
              {isCopiedRaw ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              {isCopiedRaw ? "Tersalin!" : "Salin Raw"}
            </button>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-indigo-100 bg-indigo-50/10 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-800 font-mono font-bold text-xs flex items-center justify-center">
                2
              </span>
              <span className="text-[10px] uppercase font-bold text-indigo-600">Proses AI</span>
            </div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-600" />
              Proses di AI (GLM / GPT / Gemini)
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Buka <strong>GLM AI</strong> (<a href="https://z.ai/" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">https://z.ai/</a>) atau ChatGPT.
              Kirimkan <strong>System Prompt</strong> (<code className="font-mono text-[10px] text-indigo-700">prompt.md</code>), lalu tempelkan data JSON mentah Anda.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            <a
              href="https://z.ai/"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors shadow-xs"
            >
              <ExternalLink className="w-3 h-3" /> Buka GLM (z.ai)
            </a>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors border border-slate-200"
            >
              {isCopiedPrompt ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              {isCopiedPrompt ? "Prompt Tersalin!" : "Salin prompt.md"}
            </button>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 bg-emerald-50/10 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 font-mono font-bold text-xs flex items-center justify-center">
                3
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-600">Hasil &amp; Ekspor</span>
            </div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Validasi &amp; Ekspor ke Excel
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Salin JSON rapi dari balasan AI, lalu upload atau tempel pada formulir di bawah.
              Sistem akan memvalidasi semua field wajib, melewati entri yang cacat, dan menghasilkan Excel siap impor.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Format Excel Sesuai template.xlsx</span>
          </div>
        </div>
      </div>

      {/* ATURAN VALIDASI KETAT ALERT CARD */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-amber-200/80 shadow-xs bg-amber-50/30 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Aturan Validasi Wajib vs Opsional
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              Untuk menjamin data dapat diimpor tanpa kegagalan ke database, sistem menerapkan aturan validasi berikut:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px]">
              <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-1">
                <span className="font-bold text-rose-800 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Semua Field Ini WAJIB Ada &amp; Valid:
                </span>
                <p className="text-slate-600 leading-relaxed">
                  <code className="font-mono text-rose-700">name</code>,{" "}
                  <code className="font-mono text-rose-700">fields</code>,{" "}
                  <code className="font-mono text-rose-700">sinta_level</code>,{" "}
                  <code className="font-mono text-rose-700">apc</code>,{" "}
                  <code className="font-mono text-rose-700">is_free</code>,{" "}
                  <code className="font-mono text-rose-700">currency</code>,{" "}
                  <code className="font-mono text-rose-700">frequency</code>,{" "}
                  <code className="font-mono text-rose-700">publish_month</code>,{" "}
                  <code className="font-mono text-rose-700">e_issn</code>,{" "}
                  <code className="font-mono text-rose-700">publisher</code>,{" "}
                  <code className="font-mono text-rose-700">link</code>,{" "}
                  <code className="font-mono text-rose-700">submission_url</code>,{" "}
                  <code className="font-mono text-rose-700">editor_url</code>,{" "}
                  <code className="font-mono text-rose-700">garuda_url</code>,{" "}
                  <code className="font-mono text-rose-700">sinta_url</code>,{" "}
                  <code className="font-mono text-rose-700">template_url</code>, dan{" "}
                  <code className="font-mono text-rose-700 font-bold">oai_url</code>.
                  <span className="block text-[10px] text-slate-500 mt-1">
                    (Jika ada satu saja field di atas yang hilang/kosong, entri <strong>otomatis di-skip</strong>).
                  </span>
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1">
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  HANYA 5 Field Ini yang OPSIONAL (Boleh Ada / Tidak):
                </span>
                <ul className="text-slate-600 list-disc list-inside space-y-0.5 font-mono text-[11px]">
                  <li>estimated_review_min</li>
                  <li>estimated_review_max</li>
                  <li>submission_status</li>
                  <li>submission_deadline</li>
                  <li>is_published</li>
                </ul>
                <p className="text-[10px] text-slate-500 pt-1">
                  Jika kelima field ini tidak ada di JSON, sistem tetap menganggap entri valid dan memberi nilai default.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion Contoh Format JSON */}
      <div className="bg-white rounded-3xl border border-[#e1eaf2] shadow-xs overflow-hidden">
        <div
          onClick={() => setShowExampleJson(!showExampleJson)}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Pratinjau Format JSON Terformat Target (format.json)
              </h3>
              <p className="text-[11px] text-slate-500">
                Klik untuk melihat atau menyalin contoh data JSON terformat siap impor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyExample();
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors border border-slate-200"
            >
              {isCopiedExample ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {isCopiedExample ? "Tersalin!" : "Salin Contoh JSON"}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUseExample();
              }}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors border border-sky-200"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Gunakan Contoh
            </button>

            <span className="p-1 text-slate-400">
              {showExampleJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </div>
        </div>

        {showExampleJson && (
          <div className="p-5 pt-0 border-t border-slate-100 bg-[#f8fafc]/50">
            <div className="mt-3 relative bg-slate-900 rounded-2xl p-4 border border-slate-800 text-slate-200 font-mono text-xs overflow-auto max-h-72">
              <pre>{formattedExampleString}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Input Section (Upload File or Paste Text) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e1eaf2] shadow-xs space-y-5">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInputMode("file")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                inputMode === "file"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Upload File JSON
            </button>
            <button
              type="button"
              onClick={() => setInputMode("text")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                inputMode === "text"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tempel Teks JSON
            </button>
          </div>

          {(selectedFile || jsonText.trim()) && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Input
            </button>
          )}
        </div>

        {/* File Mode */}
        {inputMode === "file" && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
              dragActive
                ? "border-sky-500 bg-sky-50/50"
                : selectedFile
                ? "border-emerald-300 bg-emerald-50/20"
                : "border-slate-200 hover:border-sky-400 bg-[#f8fafc]/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Klik untuk mengganti file
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Tarik &amp; lepas file <span className="text-sky-600 font-mono">.json</span> dari AI ke sini
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    atau klik untuk memilih file dari komputer Anda
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Text Mode */}
        {inputMode === "text" && (
          <div className="space-y-2">
            <textarea
              rows={9}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='[&#10;  {&#10;    "name": "Jurnal Teknik Sipil Indonesia",&#10;    "fields": ["Teknik", "Sains"],&#10;    "sinta_level": 2,&#10;    "link": "https://journal.ui.ac.id",&#10;    "oai_url": "https://journal.ui.ac.id/index.php/jtsi/oai",&#10;    ...&#10;  }&#10;]'
              className="w-full p-4 rounded-2xl border border-slate-200 bg-white font-mono text-xs text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all outline-none"
            />
          </div>
        )}

        {/* Process Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleProcess}
            disabled={isProcessing || (inputMode === "file" ? !selectedFile : !jsonText.trim())}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-sky-600/20"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Memvalidasi &amp; Memproses...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Validasi &amp; Konversi ke Excel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* RESULTS DISPLAY */}
      {hasProcessed && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-[#e1eaf2] shadow-xs">
              <p className="text-[11px] text-slate-400 font-bold uppercase">Total Entri Ditemukan</p>
              <p className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                {totalCount} <span className="text-xs text-slate-500 font-normal">entri</span>
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-emerald-200/70 shadow-xs bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-emerald-800 font-bold uppercase">Entri Valid (Siap Impor)</p>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-700 font-mono mt-1">
                {validItems.length} <span className="text-xs text-emerald-600 font-normal">jurnal</span>
              </p>
            </div>

            <div className={`bg-white rounded-3xl p-5 border shadow-xs ${
              skippedItems.length > 0 ? "border-rose-200 bg-rose-50/20" : "border-[#e1eaf2]"
            }`}>
              <div className="flex items-center justify-between">
                <p className={`text-[11px] font-bold uppercase ${
                  skippedItems.length > 0 ? "text-rose-800" : "text-slate-400"
                }`}>
                  Entri Dilewati (Skipped)
                </p>
                {skippedItems.length > 0 ? (
                  <XCircle className="w-4 h-4 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <p className={`text-2xl font-extrabold font-mono mt-1 ${
                skippedItems.length > 0 ? "text-rose-700" : "text-slate-700"
              }`}>
                {skippedItems.length} <span className="text-xs font-normal opacity-80">entri</span>
              </p>
            </div>
          </div>

          {/* Skipped Items Alert & Detail List */}
          {skippedItems.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-rose-200 shadow-xs space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-900">
                    Pemberitahuan: Terdapat {skippedItems.length} Entri yang Salah / Tidak Lengkap dan Dilewati
                  </h3>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Entri di bawah ini tidak memiliki field wajib lengkap (misal: <strong>oai_url</strong> tidak ada, nama kosong, atau link tidak valid),
                    sehingga otomatis tidak dimasukkan ke dalam file Excel.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-rose-100 rounded-2xl bg-rose-50/30">
                <table className="w-full text-left text-xs">
                  <thead className="bg-rose-100/50 text-rose-900 uppercase font-semibold border-b border-rose-200/60">
                    <tr>
                      <th className="p-3 w-16 text-center">No.</th>
                      <th className="p-3">Nama Jurnal</th>
                      <th className="p-3">Alasan Dilewati (Field yang Salah / Tidak Ada)</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100 text-slate-700">
                    {skippedItems.map((s) => (
                      <tr key={s.index} className="hover:bg-rose-50/70 transition-colors">
                        <td className="p-3 text-center font-mono font-bold text-slate-500">
                          #{s.index}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 max-w-xs truncate" title={s.name}>
                          {s.name}
                        </td>
                        <td className="p-3 space-y-1">
                          {s.errors.map((err, errIdx) => (
                            <span
                              key={errIdx}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-white border border-rose-200 px-2 py-0.5 rounded-md mr-1.5"
                            >
                              <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                              {err}
                            </span>
                          ))}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setInspectingRaw(s.rawItem)}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                            title="Lihat data mentah entri ini"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Raw</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Valid Items Action Card & Table Preview */}
          {validItems.length > 0 ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e1eaf2] shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Data Siap Diekspor ke Excel ({validItems.length} Jurnal)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    File Excel yang dihasilkan menggunakan struktur header dan sheet yang persis sama dengan <code className="font-mono text-emerald-700">template.xlsx</code>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Excel (.xlsx)</span>
                </button>
              </div>

              {/* Table Preview */}
              <div className="overflow-x-auto border border-[#e1eaf2] rounded-2xl bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] text-slate-600 uppercase font-semibold border-b border-[#e1eaf2]">
                    <tr>
                      <th className="p-3 w-12 text-center">No.</th>
                      <th className="p-3">Nama Jurnal</th>
                      <th className="p-3">SINTA</th>
                      <th className="p-3">Bidang (Fields)</th>
                      <th className="p-3">OAI URL</th>
                      <th className="p-3">Penerbit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e1eaf2] text-slate-700">
                    {validItems.slice(0, 15).map((item, idx) => (
                      <tr key={idx} className="hover:bg-sky-50/30 transition-colors">
                        <td className="p-3 text-center font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-bold text-slate-900 max-w-xs">
                          <p className="truncate" title={item.name}>{item.name}</p>
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-sky-600 hover:underline font-mono truncate block mt-0.5"
                          >
                            {item.link}
                          </a>
                        </td>
                        <td className="p-3">
                          {item.sinta_level ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              SINTA {item.sinta_level}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 max-w-[150px] truncate" title={Array.isArray(item.fields) ? item.fields.join(", ") : (item.fields || "-")}>
                          {Array.isArray(item.fields) ? item.fields.join(", ") : (item.fields || "-")}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-sky-700 max-w-[200px] truncate" title={item.oai_url}>
                          {item.oai_url}
                        </td>
                        <td className="p-3 max-w-[160px] truncate text-slate-500" title={item.publisher || "-"}>
                          {item.publisher || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {validItems.length > 15 && (
                <p className="text-center text-[11px] text-slate-400">
                  Menampilkan 15 dari {validItems.length} entri valid. Seluruh entri akan disertakan lengkap saat Anda mengklik tombol download Excel.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-rose-200 text-center space-y-2">
              <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">
                Tidak Ada Entri Valid untuk Dikonversi
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Semua entri yang Anda berikan tidak memiliki field wajib lengkap (seperti nama jurnal, link, atau oai_url).
                Periksa tabel kesalahan di atas untuk memperbaiki data.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal Inspect Raw JSON */}
      {inspectingRaw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-sky-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Inspeksi Data Mentah Entri
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectingRaw(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-auto flex-1 bg-[#f8fafc]">
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-slate-200 font-mono text-xs overflow-auto">
                <pre>{JSON.stringify(inspectingRaw, null, 2)}</pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingRaw(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
