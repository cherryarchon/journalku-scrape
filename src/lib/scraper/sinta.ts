import * as cheerio from "cheerio";
import axios from "axios";

export interface SintaData {
  sinta_url: string;
  name: string | null;
  index_type: string;
  sinta_level: number | null;
  issn: string | null;
  publisher: string | null;
  link: string | null;
  editor_url: string | null;
  garuda_url: string | null;
  google_scholar_url: string | null;
  raw_text?: string | null;
  error?: string;
}

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
};

export async function scrapeSinta(sintaUrl: string): Promise<SintaData> {
  try {
    const response = await axios.get(sintaUrl, {
      headers: DEFAULT_HEADERS,
      timeout: 20000,
    });

    const html = response.data;
    if (typeof html !== "string") {
      return {
        sinta_url: sintaUrl,
        index_type: "SINTA",
        name: null,
        sinta_level: null,
        issn: null,
        publisher: null,
        link: null,
        editor_url: null,
        garuda_url: null,
        google_scholar_url: null,
        error: "Response SINTA bukan berupa teks HTML",
      };
    }

    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();

    const affilCodeText = extractAffilCodeText($);
    const profileLinks = extractProfileLinks($, sintaUrl);

    return {
      sinta_url: sintaUrl,
      name: extractName($, text),
      index_type: "SINTA",
      sinta_level: extractSintaLevel(text),
      issn: extractIssnText(affilCodeText, text),
      publisher: extractPublisher($, text),
      link: profileLinks.website_url,
      editor_url: profileLinks.editor_url,
      garuda_url: profileLinks.garuda_url,
      google_scholar_url: profileLinks.google_scholar_url,
      raw_text: text.slice(0, 6000),
    };
  } catch (err: any) {
    return {
      sinta_url: sintaUrl,
      index_type: "SINTA",
      name: null,
      sinta_level: null,
      issn: null,
      publisher: null,
      link: null,
      editor_url: null,
      garuda_url: null,
      google_scholar_url: null,
      error: `Gagal mengambil halaman SINTA: ${err.message || err}`,
    };
  }
}

function extractName($: cheerio.CheerioAPI, text: string): string | null {
  const journalName = $(".univ-name h3 a").first();
  if (journalName.length > 0) {
    const val = cleanText(journalName.text());
    if (val) return val;
  }

  const heading = $("h1, h2, h3").first();
  if (heading.length > 0) {
    const val = cleanText(heading.text());
    if (val && val.length > 3) return val;
  }

  const title = $("title").first();
  if (title.length > 0) {
    let val = title.text().replace(/\s*\|\s*SINTA.*$/i, "");
    val = cleanText(val);
    if (val) return val;
  }

  return null;
}

function extractSintaLevel(text: string): number | null {
  const patterns = [
    /\bSinta\s*([1-6])\b/i,
    /\bSINTA\s*([1-6])\b/i,
    /Current\s+Acreditation\s*Sinta\s*([1-6])/i,
    /Current\s+Accreditation\s*Sinta\s*([1-6])/i,
    /Accred\s*:?\s*Sinta\s*([1-6])/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

function extractAffilCodeText($: cheerio.CheerioAPI): string {
  const selectors = [".meta-profile .affil-code", ".affil-code"];
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length > 0) {
      const val = cleanText(el.text());
      if (val) return val;
    }
  }
  return "";
}

function extractIssnText(affilCodeText: string, rawText: string): string | null {
  if (affilCodeText) {
    const res = findIssnPairText(affilCodeText);
    if (res) return res;
  }
  return findIssnPairText(rawText);
}

function findIssnPairText(text: string): string | null {
  if (!text) return null;

  let pIssn: string | null = null;
  let eIssn: string | null = null;

  const pMatch = /P\s*-?\s*ISSN\s*:?\s*([0-9]{8}|[0-9]{4}-[0-9]{3}[0-9Xx])/i.exec(text);
  const eMatch = /E\s*-?\s*ISSN\s*:?\s*([0-9]{8}|[0-9]{4}-[0-9]{3}[0-9Xx])/i.exec(text);

  if (pMatch) pIssn = pMatch[1];
  if (eMatch) eIssn = eMatch[1];

  const parts: string[] = [];
  if (pIssn) parts.push(`P-ISSN : ${pIssn}`);
  if (eIssn) parts.push(`E-ISSN : ${eIssn}`);

  if (parts.length === 0) return null;
  return parts.join(" ");
}

function extractPublisher($: cheerio.CheerioAPI, text: string): string | null {
  const selectors = [".meta-profile .affil-loc", ".affil-loc"];
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length > 0) {
      const val = cleanText(el.text());
      if (val) return val;
    }
  }

  const patterns = [
    /Publisher\s*:?\s*([^|]{3,120})/i,
    /Penerbit\s*:?\s*([^|]{3,120})/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      return cleanText(match[1]);
    }
  }

  return null;
}

function extractProfileLinks($: cheerio.CheerioAPI, baseUrl: string) {
  const links = {
    website_url: null as string | null,
    editor_url: null as string | null,
    garuda_url: null as string | null,
    google_scholar_url: null as string | null,
  };

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    const label = $(el).text().replace(/\s+/g, " ").trim().toLowerCase();

    if (!href || href === "#!") return;

    try {
      const absoluteUrl = new URL(href, baseUrl).toString();
      const hrefLower = absoluteUrl.toLowerCase();

      if (
        label.includes("editor url") ||
        hrefLower.includes("editorialteam") ||
        hrefLower.includes("editorial-team") ||
        hrefLower.includes("editorial_team")
      ) {
        links.editor_url = absoluteUrl;
        return;
      }

      if (hrefLower.includes("garuda.kemdiktisaintek.go.id") || hrefLower.includes("garuda.kemdikbud.go.id")) {
        links.garuda_url = absoluteUrl;
        return;
      }

      if (hrefLower.includes("scholar.google")) {
        links.google_scholar_url = absoluteUrl;
        return;
      }

      if (label === "website") {
        links.website_url = absoluteUrl;
        return;
      }
    } catch {
      // Ignore invalid URLs
    }
  });

  return links;
}

function cleanText(val: string): string {
  return val.replace(/\s+/g, " ").replace(/^[\s\-:;,]+|[\s\-:;,]+$/g, "").trim();
}
