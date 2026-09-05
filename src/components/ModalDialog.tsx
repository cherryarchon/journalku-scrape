"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  X,
  Copy,
  Check,
  Download,
  FileJson,
  Layers,
  ExternalLink,
  BookOpen,
  Building,
  Globe,
} from "lucide-react";

// ==========================================
// 1. CONFIRMATION MODAL
// ==========================================
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  details?: string[];
  type?: "danger" | "warning" | "info" | "success";
  confirmText?: string;
  cancelText?: string;
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  details,
  type = "warning",
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  isProcessing = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colorScheme = {
    danger: {
      iconBg: "bg-rose-50 border-rose-200 text-rose-600",
      buttonBg: "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20",
      icon: <XCircle className="w-6 h-6" />,
    },
    warning: {
      iconBg: "bg-amber-50 border-amber-200 text-amber-600",
      buttonBg: "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20",
      icon: <AlertTriangle className="w-6 h-6" />,
    },
    info: {
      iconBg: "bg-sky-50 border-sky-200 text-sky-600",
      buttonBg: "bg-sky-600 hover:bg-sky-500 shadow-sky-600/20",
      icon: <Info className="w-6 h-6" />,
    },
    success: {
      iconBg: "bg-emerald-50 border-emerald-200 text-emerald-600",
      buttonBg: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20",
      icon: <CheckCircle2 className="w-6 h-6" />,
    },
  }[type];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#e1eaf2] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${colorScheme.iconBg}`}>
            {colorScheme.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {details && details.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#e1eaf2] text-xs space-y-1.5 text-slate-600">
            {details.map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-sky-600 font-bold">•</span>
                <span className="leading-tight">{d}</span>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 ${colorScheme.buttonBg} disabled:opacity-50`}
          >
            {isProcessing && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. ALERT / INFO MODAL
// ==========================================
interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: "danger" | "warning" | "info" | "success";
  onClose: () => void;
}

export function AlertModal({
  isOpen,
  title,
  message,
  type = "info",
  onClose,
}: AlertModalProps) {
  if (!isOpen) return null;

  const colorScheme = {
    danger: {
      iconBg: "bg-rose-50 border-rose-200 text-rose-600",
      buttonBg: "bg-rose-600 hover:bg-rose-500",
      icon: <XCircle className="w-6 h-6" />,
    },
    warning: {
      iconBg: "bg-amber-50 border-amber-200 text-amber-600",
      buttonBg: "bg-amber-600 hover:bg-amber-500",
      icon: <AlertTriangle className="w-6 h-6" />,
    },
    info: {
      iconBg: "bg-sky-50 border-sky-200 text-sky-600",
      buttonBg: "bg-sky-600 hover:bg-sky-500",
      icon: <Info className="w-6 h-6" />,
    },
    success: {
      iconBg: "bg-emerald-50 border-emerald-200 text-emerald-600",
      buttonBg: "bg-emerald-600 hover:bg-emerald-500",
      icon: <CheckCircle2 className="w-6 h-6" />,
    },
  }[type];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#e1eaf2] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${colorScheme.iconBg}`}>
            {colorScheme.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-md ${colorScheme.buttonBg}`}
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. INTERACTIVE JSON PREVIEW MODAL
// ==========================================
interface JsonPreviewModalProps {
  isOpen: boolean;
  fileName: string;
  jsonContent: string;
  onClose: () => void;
  onDownload: () => void;
}

export function JsonPreviewModal({
  isOpen,
  fileName,
  jsonContent,
  onClose,
  onDownload,
}: JsonPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "raw">("summary");
  const [copied, setCopied] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);

  useEffect(() => {
    if (jsonContent) {
      try {
        const parsed = JSON.parse(jsonContent);
        if (Array.isArray(parsed)) {
          setParsedData(parsed);
        } else if (parsed && typeof parsed === "object") {
          setParsedData([parsed]);
        } else {
          setParsedData([]);
        }
      } catch {
        setParsedData([]);
      }
    }
  }, [jsonContent]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white border border-[#e1eaf2] rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#e1eaf2] bg-[#f8fafc] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                {fileName}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 font-mono">
                  {parsedData.length} Jurnal
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Ukuran: {(new Blob([jsonContent]).size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all border border-slate-200 shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              {copied ? "Tersalin!" : "Salin JSON"}
            </button>

            <button
              onClick={onDownload}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Unduh
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-[#e1eaf2] bg-white flex gap-3 text-xs">
          <button
            onClick={() => setActiveTab("summary")}
            className={`pb-2.5 font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === "summary"
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Ringkasan Metadata ({parsedData.length})
          </button>
          <button
            onClick={() => setActiveTab("raw")}
            className={`pb-2.5 font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === "raw"
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            Raw JSON Terformat
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-auto flex-1 bg-[#f1f6fa]">
          {activeTab === "summary" ? (
            <div className="space-y-4">
              {parsedData.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-[#e1eaf2]">
                  Format data JSON tidak dapat diparsing sebagai array entri jurnal.
                </div>
              ) : (
                parsedData.map((item, idx) => {
                  let journalName = "Nama Jurnal Tidak Diketahui";
                  let sData = item?.sinta_data || item?.sinta || item;
                  let gData = item?.garuda_data || item?.garuda || {};
                  let ojsPages = item?.ojs_pages || item?.ojs?.ojs_pages || [];
                  let sintaUrl = item?.sinta_url || sData?.sinta_url;
                  let garudaUrl = item?.garuda_url || sData?.garuda_url || gData?.garuda_url;
                  let ojsUrl = item?.ojs_url || item?.ojs?.ojs_url || sData?.link;
                  let oaiUrl = item?.ojs?.oai_url || (sData?.link ? `${sData.link.replace(/\/+$/, "")}/oai` : null);
                  let issn = sData?.issn || (sData?.p_issn || sData?.e_issn ? `${sData?.p_issn || "-"} / ${sData?.e_issn || "-"}` : "-");
                  let fields = gData?.fields || null;

                  const keys = Object.keys(item || {});
                  if (keys.length === 1 && item[keys[0]] && (item[keys[0]].sinta || item[keys[0]].garuda || item[keys[0]].ojs)) {
                    journalName = keys[0];
                    const inner = item[keys[0]];
                    sData = inner.sinta || {};
                    gData = inner.garuda || {};
                    ojsPages = inner.ojs?.ojs_pages || [];
                    sintaUrl = inner.sinta?.sinta_url;
                    garudaUrl = inner.sinta?.garuda_url;
                    ojsUrl = inner.ojs?.ojs_url || inner.sinta?.link;
                    oaiUrl = inner.ojs?.oai_url || (inner.sinta?.link ? `${inner.sinta.link.replace(/\/+$/, "")}/oai` : null);
                    issn = inner.sinta?.issn || "-";
                    fields = inner.garuda?.fields || null;
                  } else if (sData?.name) {
                    journalName = sData.name;
                  }

                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e1eaf2] shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-[11px] font-mono shrink-0 mt-0.5">
                            #{idx + 1}
                          </span>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                              {journalName}
                            </h4>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Building className="w-3.5 h-3.5 text-slate-400" />
                              {sData?.publisher || "Penerbit Tidak Diketahui"}
                            </p>
                          </div>
                        </div>

                        {sData?.sinta_level && (
                          <span className="self-start sm:self-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200 font-mono shrink-0">
                            SINTA {sData.sinta_level}
                          </span>
                        )}
                      </div>

                      {/* Detail Badges & Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">ISSN</span>
                          <span className="font-mono text-slate-700 font-semibold truncate block" title={issn}>
                            {issn}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Bidang / Fields</span>
                          <span className="text-slate-700 font-semibold truncate block" title={fields || "-"}>
                            {fields || "-"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">OJS Crawled</span>
                          <span className="font-mono text-sky-700 font-bold">{ojsPages.length} Halaman</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Garuda DOI</span>
                          <span className="text-slate-700 font-medium truncate block font-mono">
                            {gData?.doi || "-"}
                          </span>
                        </div>
                      </div>

                      {/* External Links */}
                      <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                        {sintaUrl && (
                          <a
                            href={sintaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold flex items-center gap-1 transition-colors border border-sky-200"
                          >
                            <BookOpen className="w-3 h-3" />
                            Profil SINTA
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        )}

                        {garudaUrl && (
                          <a
                            href={garudaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1 transition-colors border border-emerald-200"
                          >
                            <Globe className="w-3 h-3" />
                            Garuda Portal
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        )}

                        {ojsUrl && (
                          <a
                            href={ojsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold flex items-center gap-1 transition-colors border border-purple-200"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Website OJS
                          </a>
                        )}

                        {oaiUrl && (
                          <a
                            href={oaiUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold flex items-center gap-1 transition-colors border border-indigo-200 font-mono"
                          >
                            <ExternalLink className="w-3 h-3" />
                            OAI URL
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-slate-200 font-mono text-xs overflow-auto">
              <pre className="whitespace-pre-wrap leading-relaxed">{jsonContent}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
