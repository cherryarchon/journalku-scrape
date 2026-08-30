import { SintaData } from "./sinta";
import { GarudaData } from "./garuda";
import { OjsPage } from "./ojs";

export interface CleanedJournalResult {
  scraped_at: string;
  sinta_url: string;
  garuda_url: string | null;
  ojs_url: string | null;
  sinta_data: Omit<SintaData, "raw_text">;
  garuda_data: Omit<GarudaData, "raw_text">;
  ojs_pages: OjsPage[];
}

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

export function transformResult(
  sintaData: SintaData,
  garudaData: GarudaData,
  ojsPages: OjsPage[],
  resolvedGarudaUrl: string,
  resolvedOjsUrl: string
): CleanedJournalResult {
  const { raw_text: _sintaRaw, ...cleanSinta } = sintaData;
  const { raw_text: _garudaRaw, ...cleanGaruda } = garudaData;

  if (cleanGaruda.fields) {
    cleanGaruda.fields = translateFields(cleanGaruda.fields);
  }

  return {
    scraped_at: new Date().toISOString(),
    sinta_url: sintaData.sinta_url,
    garuda_url: resolvedGarudaUrl || cleanSinta.garuda_url || null,
    ojs_url: resolvedOjsUrl || cleanSinta.link || null,
    sinta_data: cleanSinta,
    garuda_data: cleanGaruda,
    ojs_pages: ojsPages,
  };
}
