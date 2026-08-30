import * as cheerio from "cheerio";
import axios from "axios";

export interface GarudaData {
  garuda_url: string;
  fields: string | null;
  doi: string | null;
  raw_text?: string | null;
  error?: string;
}

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
};

export async function scrapeGaruda(garudaUrl: string): Promise<GarudaData> {
  if (!garudaUrl) {
    return {
      garuda_url: "",
      fields: null,
      doi: null,
      error: "URL Garuda kosong",
    };
  }

  try {
    const response = await axios.get(garudaUrl, {
      headers: DEFAULT_HEADERS,
      timeout: 20000,
    });

    const html = response.data;
    if (typeof html !== "string") {
      return {
        garuda_url: garudaUrl,
        fields: null,
        doi: null,
        error: "Response Garuda bukan berupa teks HTML",
      };
    }

    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();

    const jMetaPub = extractJMetaPub($);

    return {
      garuda_url: garudaUrl,
      fields: extractCoreSubject(jMetaPub),
      doi: extractDoi(jMetaPub),
      raw_text: text.slice(0, 6000),
    };
  } catch (err: any) {
    return {
      garuda_url: garudaUrl,
      fields: null,
      doi: null,
      error: `Gagal mengambil halaman Garuda: ${err.message || err}`,
    };
  }
}

function extractJMetaPub($: cheerio.CheerioAPI): string[] {
  const results: string[] = [];
  $(".j-meta-pub").each((_, el) => {
    const val = cleanText($(el).text());
    if (val) results.push(val);
  });
  return results;
}

function extractCoreSubject(jMetaPub: string[]): string | null {
  for (const item of jMetaPub) {
    const match = /Core\s+Subject\s*:?\s*(.+)/i.exec(item);
    if (match) {
      const val = cleanText(match[1]).replace(/^,|,$/g, "").trim();
      return val || null;
    }
  }
  return null;
}

function extractDoi(jMetaPub: string[]): string | null {
  for (const item of jMetaPub) {
    const match = /\bDOI\s*:?\s*(https?:\/\/doi\.org\/[^\s]+|10\.\d{4,9}\/[^\s]+)/i.exec(item);
    if (match) {
      return cleanText(match[1]);
    }
  }
  return null;
}

function cleanText(val: string): string {
  return val.replace(/\s+/g, " ").replace(/^[\s\-:;,]+|[\s\-:;,]+$/g, "").trim();
}
