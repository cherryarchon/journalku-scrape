import * as XLSX from "xlsx";

export interface JournalExcelItem {
  name: string;
  fields: string[] | string;
  sinta_level: number | string;
  scopus_quartile?: string | null;
  wos_quartile?: string | null;
  apc: number | string;
  is_free: boolean | string;
  currency: string;
  frequency: number | string;
  publish_month: number[] | string;
  e_issn: string;
  p_issn?: string | null;
  publisher: string;
  link: string;
  submission_url: string;
  editor_url: string;
  garuda_url: string;
  sinta_url: string;
  template_url: string;
  oai_url: string;
  estimated_review_min?: number | string | null;
  estimated_review_max?: number | string | null;
  submission_status?: string | null;
  submission_deadline?: string | null;
  is_published?: boolean | string | null;
}

export interface ValidationResult {
  valid: boolean;
  item?: JournalExcelItem;
  errors: string[];
  rawItem: any;
  index: number;
}

export const EXAMPLE_FORMAT_JOURNAL: JournalExcelItem = {
  name: "Jurnal Teknik Sipil Indonesia",
  fields: ["Teknik", "Sains"],
  sinta_level: 2,
  scopus_quartile: "Q3",
  wos_quartile: null,
  apc: 500000,
  is_free: false,
  currency: "IDR",
  frequency: 4,
  publish_month: [3, 6, 9, 12],
  e_issn: "1234-5678",
  p_issn: "8765-4321",
  publisher: "Universitas Indonesia",
  link: "https://journal.ui.ac.id",
  submission_url: "https://journal.ui.ac.id/submit",
  editor_url: "https://journal.ui.ac.id/editorial",
  garuda_url: "https://garuda.kemdikbud.go.id/journal/view/1234",
  sinta_url: "https://sinta.kemdikbud.go.id/journals/detail?id=1234",
  template_url: "https://journal.ui.ac.id/template.docx",
  oai_url: "https://journal.ui.ac.id/index.php/jtsi/oai",
  estimated_review_min: 30,
  estimated_review_max: 90,
  submission_status: "open",
  submission_deadline: "2025-12-31",
  is_published: false,
};

export const EXCEL_HEADERS = [
  "name",
  "fields",
  "sinta_level",
  "scopus_quartile",
  "wos_quartile",
  "apc",
  "is_free",
  "currency",
  "frequency",
  "publish_month",
  "e_issn",
  "p_issn",
  "publisher",
  "link",
  "submission_url",
  "editor_url",
  "garuda_url",
  "sinta_url",
  "template_url",
  "oai_url",
  "estimated_review_min",
  "estimated_review_max",
  "submission_status",
  "submission_deadline",
  "is_published",
];

export const EXCEL_GUIDE_ROW = [
  "Nama jurnal (wajib)",
  "Bidang ilmu, pisahkan koma. Pilihan: Pertanian, Seni, Ekonomi, Pendidikan, Teknik, Kesehatan, Humaniora, Agama, Sains, Sosial, Multidisiplin",
  "Tingkatan SINTA. Angka 1–6. Kosongkan jika tidak terindeks SINTA",
  "Kuartil Scopus. Pilihan: Q1 / Q2 / Q3 / Q4. Kosongkan jika tidak terindeks Scopus",
  "Kuartil Web of Science. Pilihan: Q1 / Q2 / Q3 / Q4. Kosongkan jika tidak terindeks WoS",
  "Nominal APC (angka). 0 jika gratis atau tidak tercantum",
  "TRUE jika gratis, FALSE jika berbayar/tidak tercantum",
  "IDR atau USD",
  "Frekuensi terbit per tahun (angka 1–12)",
  "Bulan terbit, pisahkan koma. Contoh: 1,4,7,10",
  "E-ISSN. Format: 1234-5678",
  "P-ISSN. Format: 1234-5678",
  "Nama penerbit/institusi",
  "URL website jurnal (wajib)",
  "URL halaman submission",
  "URL halaman editorial",
  "URL di Garuda (opsional)",
  "URL halaman jurnal di SINTA (opsional)",
  "URL template penulisan artikel (opsional)",
  "URL endpoint OAI-PMH untuk pemanenan metadata (opsional)",
  "Estimasi review minimum (hari, angka)",
  "Estimasi review maksimum (hari, angka)",
  "Status submission: open / closed / rolling / unknown",
  "Deadline submission. Format: YYYY-MM-DD (opsional)",
  "Status publikasi: TRUE (dipublikasikan) atau FALSE (draft). Default: FALSE",
];

export const PANDUAN_SHEET_DATA = [
  ["Kolom", "Nilai yang Valid", "Catatan"],
  [
    "fields",
    "Pertanian, Seni, Ekonomi, Pendidikan, Teknik, Kesehatan, Humaniora, Agama, Sains, Sosial, Multidisiplin",
    "Bisa lebih dari satu, pisahkan koma",
  ],
  ["sinta_level", "1 / 2 / 3 / 4 / 5 / 6", "Kosongkan jika tidak terindeks SINTA"],
  ["scopus_quartile", "Q1 / Q2 / Q3 / Q4", "Kosongkan jika tidak terindeks Scopus"],
  ["wos_quartile", "Q1 / Q2 / Q3 / Q4", "Kosongkan jika tidak terindeks WoS"],
  ["submission_status", "open / closed / rolling / unknown", "Default: unknown"],
  ["is_free", "TRUE / FALSE", ""],
  ["currency", "IDR / USD", ""],
  ["publish_month", "1–12 dipisah koma", "Contoh: 1,4,7,10 = Jan,Apr,Jul,Okt"],
  ["submission_deadline", "YYYY-MM-DD", "Contoh: 2025-12-31"],
  ["oai_url", "URL valid (https://...)", "URL endpoint OAI-PMH jurnal"],
  ["is_published", "TRUE / FALSE", "TRUE = langsung publish, FALSE = draft (default: FALSE)"],
];

/**
 * Validates a single journal item according to format.json requirements.
 * ALL fields are required EXCEPT:
 * - estimated_review_min
 * - estimated_review_max
 * - submission_status
 * - submission_deadline
 * - is_published
 */
export function validateJournalItem(rawItem: any, index: number): ValidationResult {
  const errors: string[] = [];

  if (!rawItem || typeof rawItem !== "object") {
    return {
      valid: false,
      errors: ["Entri bukan merupakan objek JSON yang valid."],
      rawItem,
      index,
    };
  }

  // Helper url check
  const isValidUrl = (url: any) => typeof url === "string" && /^https?:\/\//i.test(url.trim());

  // 1. name (Wajib)
  const name = typeof rawItem.name === "string" ? rawItem.name.trim() : "";
  if (!name) {
    errors.push("Field 'name' (Nama Jurnal) wajib diisi.");
  }

  // 2. fields (Wajib)
  const fields = rawItem.fields;
  const hasFields =
    (Array.isArray(fields) && fields.length > 0) ||
    (typeof fields === "string" && fields.trim().length > 0);
  if (!hasFields) {
    errors.push("Field 'fields' (Bidang ilmu) wajib diisi (misal: ['Teknik', 'Sains'] atau 'Pendidikan').");
  }

  // 3. sinta_level (Wajib)
  if (rawItem.sinta_level === undefined || rawItem.sinta_level === null || rawItem.sinta_level === "") {
    errors.push("Field 'sinta_level' wajib diisi (angka 1-6).");
  }

  // 4. apc (Wajib)
  if (rawItem.apc === undefined || rawItem.apc === null || rawItem.apc === "") {
    errors.push("Field 'apc' wajib diisi (angka nominal APC, 0 jika gratis).");
  }

  // 5. is_free (Wajib)
  if (typeof rawItem.is_free !== "boolean" && rawItem.is_free !== "true" && rawItem.is_free !== "false") {
    errors.push("Field 'is_free' wajib diisi (boolean true atau false).");
  }

  // 6. currency (Wajib)
  const currency = typeof rawItem.currency === "string" ? rawItem.currency.trim() : "";
  if (!currency) {
    errors.push("Field 'currency' wajib diisi (misal: 'IDR').");
  }

  // 7. frequency (Wajib)
  if (!rawItem.frequency && rawItem.frequency !== 0) {
    errors.push("Field 'frequency' (Frekuensi terbit per tahun) wajib diisi.");
  }

  // 8. publish_month (Wajib)
  const pMonth = rawItem.publish_month;
  const hasPublishMonth =
    (Array.isArray(pMonth) && pMonth.length > 0) ||
    (typeof pMonth === "string" && pMonth.trim().length > 0) ||
    typeof pMonth === "number";
  if (!hasPublishMonth) {
    errors.push("Field 'publish_month' (Bulan terbit) wajib diisi (misal: [3, 6, 9, 12] atau '3,6,9,12').");
  }

  // 9. e_issn (Wajib)
  const eIssn = typeof rawItem.e_issn === "string" ? rawItem.e_issn.trim() : "";
  if (!eIssn) {
    errors.push("Field 'e_issn' wajib diisi (Format ISSN elektronik jurnal).");
  }

  // 10. publisher (Wajib)
  const publisher = typeof rawItem.publisher === "string" ? rawItem.publisher.trim() : "";
  if (!publisher) {
    errors.push("Field 'publisher' (Penerbit/Institusi) wajib diisi.");
  }

  // 11. link (Wajib)
  const link = typeof rawItem.link === "string" ? rawItem.link.trim() : "";
  if (!link) {
    errors.push("Field 'link' (URL Website Jurnal) wajib diisi.");
  } else if (!isValidUrl(link)) {
    errors.push("Field 'link' harus berupa URL valid yang diawali http:// atau https://.");
  }

  // 12. submission_url (Wajib)
  const submissionUrl = typeof rawItem.submission_url === "string" ? rawItem.submission_url.trim() : "";
  if (!submissionUrl) {
    errors.push("Field 'submission_url' (URL halaman submission) wajib diisi.");
  } else if (!isValidUrl(submissionUrl)) {
    errors.push("Field 'submission_url' harus berupa URL valid yang diawali http:// atau https://.");
  }

  // 13. editor_url (Wajib)
  const editorUrl = typeof rawItem.editor_url === "string" ? rawItem.editor_url.trim() : "";
  if (!editorUrl) {
    errors.push("Field 'editor_url' (URL halaman editorial team) wajib diisi.");
  } else if (!isValidUrl(editorUrl)) {
    errors.push("Field 'editor_url' harus berupa URL valid yang diawali http:// atau https://.");
  }

  // 14. garuda_url (Wajib)
  const garudaUrl = typeof rawItem.garuda_url === "string" ? rawItem.garuda_url.trim() : "";
  if (!garudaUrl) {
    errors.push("Field 'garuda_url' (URL profil di Garuda) wajib diisi.");
  } else if (!isValidUrl(garudaUrl)) {
    errors.push("Field 'garuda_url' harus berupa URL valid yang diawali http:// atau https://.");
  }

  // 15. sinta_url (Wajib)
  const sintaUrl = typeof rawItem.sinta_url === "string" ? rawItem.sinta_url.trim() : "";
  if (!sintaUrl) {
    errors.push("Field 'sinta_url' (URL profil di SINTA) wajib diisi.");
  } else if (!isValidUrl(sintaUrl)) {
    errors.push("Field 'sinta_url' harus berupa URL valid yang diawali http:// atau https://.");
  }

  // 16. template_url (Wajib)
  const templateUrl = typeof rawItem.template_url === "string" ? rawItem.template_url.trim() : "";
  if (!templateUrl) {
    errors.push("Field 'template_url' (URL template penulisan naskah) wajib diisi.");
  } else if (!isValidUrl(templateUrl)) {
    errors.push("Field 'template_url' harus berupa URL valid yang diawali http:// atau https://.");
  }

  // 17. oai_url (Wajib)
  const oaiUrl = typeof rawItem.oai_url === "string" ? rawItem.oai_url.trim() : "";
  if (!oaiUrl) {
    errors.push("Field 'oai_url' (URL endpoint OAI-PMH) wajib diisi.");
  } else if (!isValidUrl(oaiUrl)) {
    errors.push("Field 'oai_url' harus berupa URL valid yang diawali http:// atau https://.");
  }

  // 18. scopus_quartile & wos_quartile & p_issn (Wajib key ada di object, tapi nilainya boleh null jika tidak terindeks)
  if (!("scopus_quartile" in rawItem)) {
    errors.push("Field 'scopus_quartile' wajib ada di JSON (isi null jika tidak terindeks Scopus).");
  }
  if (!("wos_quartile" in rawItem)) {
    errors.push("Field 'wos_quartile' wajib ada di JSON (isi null jika tidak terindeks WoS).");
  }
  if (!("p_issn" in rawItem)) {
    errors.push("Field 'p_issn' wajib ada di JSON (isi null jika tidak memiliki P-ISSN).");
  }

  // Jika ada error pada field wajib di atas
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      rawItem,
      index,
    };
  }

  // Item VALID: 5 field berikut bersifat OPSIONAL (bisa ada, bisa tidak)
  return {
    valid: true,
    item: {
      name,
      fields: rawItem.fields,
      sinta_level: rawItem.sinta_level,
      scopus_quartile: rawItem.scopus_quartile ?? null,
      wos_quartile: rawItem.wos_quartile ?? null,
      apc: typeof rawItem.apc === "number" ? rawItem.apc : (rawItem.apc ? Number(rawItem.apc) : 0),
      is_free: rawItem.is_free === true || rawItem.is_free === "true",
      currency: currency || "IDR",
      frequency: Number(rawItem.frequency),
      publish_month: rawItem.publish_month,
      e_issn: eIssn,
      p_issn: rawItem.p_issn || null,
      publisher,
      link,
      submission_url: submissionUrl,
      editor_url: editorUrl,
      garuda_url: garudaUrl,
      sinta_url: sintaUrl,
      template_url: templateUrl,
      oai_url: oaiUrl,
      // 5 FIELD OPSIONAL (Bisa ada, bisa tidak)
      estimated_review_min: rawItem.estimated_review_min ? Number(rawItem.estimated_review_min) : null,
      estimated_review_max: rawItem.estimated_review_max ? Number(rawItem.estimated_review_max) : null,
      submission_status: rawItem.submission_status || "unknown",
      submission_deadline: rawItem.submission_deadline || null,
      is_published: rawItem.is_published === true || rawItem.is_published === "true",
    },
    errors: [],
    rawItem,
    index,
  };
}

/**
 * Normalizes input JSON into an array of items (supports array, single item, or dictionary).
 */
export function normalizeJsonInput(parsed: any): any[] {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === "object") {
    // If it's a single journal object that has 'name' or 'link' or 'oai_url'
    if (parsed.name || parsed.link || parsed.oai_url) {
      return [parsed];
    }
    // If wrapped in an object like { journals: [...] } or { data: [...] }
    if (Array.isArray(parsed.journals)) return parsed.journals;
    if (Array.isArray(parsed.data)) return parsed.data;
    if (Array.isArray(parsed.items)) return parsed.items;

    // Otherwise, could be a keyed dictionary of journals: { "Journal Name": { ... } }
    const values = Object.values(parsed);
    if (values.length > 0 && typeof values[0] === "object") {
      return values;
    }
  }
  return [];
}

/**
 * Creates an XLSX workbook matching template.xlsx
 */
export function createWorkbookFromValidJournals(validJournals: JournalExcelItem[]): XLSX.WorkBook {
  const dataRows = validJournals.map((item) => [
    item.name ?? "",
    Array.isArray(item.fields) ? item.fields.join(",") : (item.fields ?? ""),
    item.sinta_level !== null && item.sinta_level !== undefined ? item.sinta_level : "",
    item.scopus_quartile ?? "",
    item.wos_quartile ?? "",
    typeof item.apc === "number" ? item.apc : (item.apc ? Number(item.apc) : 0),
    Boolean(item.is_free),
    item.currency || "IDR",
    item.frequency !== null && item.frequency !== undefined ? item.frequency : "",
    Array.isArray(item.publish_month) ? item.publish_month.join(",") : (item.publish_month ?? ""),
    item.e_issn ?? "",
    item.p_issn ?? "",
    item.publisher ?? "",
    item.link ?? "",
    item.submission_url ?? "",
    item.editor_url ?? "",
    item.garuda_url ?? "",
    item.sinta_url ?? "",
    item.template_url ?? "",
    item.oai_url ?? "",
    item.estimated_review_min !== null && item.estimated_review_min !== undefined ? item.estimated_review_min : "",
    item.estimated_review_max !== null && item.estimated_review_max !== undefined ? item.estimated_review_max : "",
    item.submission_status || "unknown",
    item.submission_deadline ?? "",
    Boolean(item.is_published),
  ]);

  const wsImport = XLSX.utils.aoa_to_sheet([
    EXCEL_HEADERS,
    EXCEL_GUIDE_ROW,
    ...dataRows,
  ]);

  const wsPanduan = XLSX.utils.aoa_to_sheet(PANDUAN_SHEET_DATA);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsImport, "Template Import");
  XLSX.utils.book_append_sheet(wb, wsPanduan, "Panduan");

  return wb;
}
