import { SintaData } from "./sinta";
import { GarudaData } from "./garuda";
import { OjsPage } from "./ojs";

export interface FormattedSintaData {
  editor_url: string | null;
  garuda_url: string | null;
  google_scholar_url: string | null;
  index_type: string;
  issn: string | null;
  link: string | null;
  publisher: string | null;
  sinta_level: number | null;
  sinta_url: string | null;
}

export interface FormattedGarudaData {
  fields: string | null;
  doi: string | null;
}

export interface FormattedOjsData {
  oai_url: string | null;
  ojs_url?: string | null;
  ojs_pages: OjsPage[];
}

export interface FormattedJournalItem {
  sinta: FormattedSintaData;
  garuda: FormattedGarudaData;
  ojs: FormattedOjsData;
}

export type CleanedJournalResult = Record<string, FormattedJournalItem>;

const FIELD_TRANSLATION: Record<string, string> = {
  Education: "Pendidikan",
  Health: "Kesehatan",
  Economy: "Ekonomi",
  Science: "Sains",
  Social: "Sosial",
  Humanities: "Humaniora",
  Religion: "Agama",
  Art: "Seni",
  Engineering: "Teknik",
  Agriculture: "Pertanian",
  Law: "Hukum",
};

export function translateFields(fieldsStr: string | null): string {
  if (!fieldsStr) return "Multidisiplin";
  const parts = fieldsStr.split(",").map((f) => f.trim());
  const translated: string[] = [];

  for (const p of parts) {
    if (FIELD_TRANSLATION[p]) {
      translated.push(FIELD_TRANSLATION[p]);
    }
  }

  return translated.length > 0 ? translated.join(", ") : "Multidisiplin";
}

export function formatSingleJournalResult(raw: any): Record<string, FormattedJournalItem> {
  if (!raw || typeof raw !== "object") {
    return {
      "Jurnal": {
        sinta: {
          editor_url: null,
          garuda_url: null,
          google_scholar_url: null,
          index_type: "SINTA",
          issn: null,
          link: null,
          publisher: null,
          sinta_level: null,
          sinta_url: null,
        },
        garuda: { fields: null, doi: null },
        ojs: { oai_url: null, ojs_pages: [] },
      },
    };
  }

  // If already formatted as { [journalName]: { sinta, garuda, ojs } }
  const topKeys = Object.keys(raw);
  if (topKeys.length === 1 && raw[topKeys[0]]?.sinta) {
    const jName = topKeys[0];
    const val = raw[jName];
    const sLink = val.sinta?.link || val.ojs?.ojs_url || null;
    const oaiUrl = val.ojs?.oai_url || (sLink ? `${sLink.replace(/\/+$/, "")}/oai` : null);
    return {
      [jName]: {
        sinta: val.sinta,
        garuda: val.garuda,
        ojs: {
          ...val.ojs,
          oai_url: oaiUrl,
        },
      },
    };
  }

  // Extract from raw/legacy format
  const sRaw = raw.sinta_data || raw.sinta || raw;
  const gRaw = raw.garuda_data || raw.garuda || {};

  const journalName = sRaw.name || sRaw.title || raw.name || raw.title || "Jurnal";

  const sintaLink = sRaw.link || raw.ojs_url || null;
  const oaiUrl = sintaLink ? `${sintaLink.replace(/\/+$/, "")}/oai` : null;

  let fields = gRaw.fields || null;
  if (fields) {
    fields = translateFields(fields);
  }

  const sinta: FormattedSintaData = {
    editor_url: sRaw.editor_url || null,
    garuda_url: sRaw.garuda_url || raw.garuda_url || null,
    google_scholar_url: sRaw.google_scholar_url || null,
    index_type: sRaw.index_type || "SINTA",
    issn: sRaw.issn || null,
    link: sRaw.link || null,
    publisher: sRaw.publisher || null,
    sinta_level: typeof sRaw.sinta_level === "number" ? sRaw.sinta_level : (sRaw.sinta_level ? parseInt(sRaw.sinta_level, 10) : null),
    sinta_url: sRaw.sinta_url || raw.sinta_url || null,
  };

  const garuda: FormattedGarudaData = {
    fields: fields,
    doi: gRaw.doi ?? null,
  };

  const ojsPages = raw.ojs?.ojs_pages || raw.ojs_pages || (Array.isArray(raw.ojs) ? raw.ojs : []);
  const ojsUrl = raw.ojs?.ojs_url || raw.ojs_url || sintaLink || null;

  const ojs: FormattedOjsData = {
    oai_url: oaiUrl,
    ojs_url: ojsUrl,
    ojs_pages: ojsPages,
  };

  return {
    [journalName]: {
      sinta,
      garuda,
      ojs,
    },
  };
}

export function formatCleanJournalResult(data: any): any {
  if (Array.isArray(data)) {
    return data.map((item) => formatSingleJournalResult(item));
  }
  return formatSingleJournalResult(data);
}

export function transformResult(
  sintaData: SintaData,
  garudaData: GarudaData,
  ojsPages: OjsPage[],
  resolvedGarudaUrl: string,
  resolvedOjsUrl: string
): CleanedJournalResult {
  const { raw_text: _sintaRaw, ...cleanSinta } = sintaData;
  const { raw_text: _garudaRaw, ...cleanGaruda } = garudaData;

  const journalName = cleanSinta.name || "Jurnal";
  const sintaLink = cleanSinta.link || resolvedOjsUrl || null;
  const oaiUrl = sintaLink ? `${sintaLink.replace(/\/+$/, "")}/oai` : null;

  const fields = cleanGaruda.fields ? translateFields(cleanGaruda.fields) : null;

  return {
    [journalName]: {
      sinta: {
        editor_url: cleanSinta.editor_url || null,
        garuda_url: resolvedGarudaUrl || cleanSinta.garuda_url || null,
        google_scholar_url: cleanSinta.google_scholar_url || null,
        index_type: cleanSinta.index_type || "SINTA",
        issn: cleanSinta.issn || null,
        link: cleanSinta.link || null,
        publisher: cleanSinta.publisher || null,
        sinta_level: cleanSinta.sinta_level ?? null,
        sinta_url: sintaData.sinta_url || cleanSinta.sinta_url || null,
      },
      garuda: {
        fields: fields,
        doi: cleanGaruda.doi || null,
      },
      ojs: {
        oai_url: oaiUrl,
        ojs_url: resolvedOjsUrl || cleanSinta.link || null,
        ojs_pages: ojsPages,
      },
    },
  };
}
