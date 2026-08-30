import * as cheerio from "cheerio";
import axios from "axios";

export interface OjsPage {
  url: string;
  text: string;
  external_template_urls?: Array<{
    url: string;
    text: string;
    source_page: string;
  }>;
}

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
};

const PRIORITY_KEYWORDS = [
  "about",
  "submission",
  "submissions",
  "author",
  "authors",
  "author-guidelines",
  "authorguidelines",
  "guideline",
  "guidelines",
  "editorial",
  "editorialteam",
  "editorial-team",
  "focus",
  "scope",
  "publication",
  "publications",
  "fee",
  "fees",
  "charge",
  "charges",
  "apc",
  "processing",
  "payment",
  "cost",
  "costs",
  "template",
  "contact",
  "policy",
  "policies",
  "login",
  "register",
  "drive",
];

const BLOCKED_PATTERNS = [
  "search",
  "user",
  "article/view",
  "article/download",
  "download",
  ".pdf",
  "issue/view",
  "citationstylelanguage",
  "statistics",
  "password",
];

export async function crawlOjs(ojsUrl: string, maxPages: number = 20): Promise<OjsPage[]> {
  if (!ojsUrl) return [];

  let baseDomain = "";
  try {
    baseDomain = new URL(ojsUrl).hostname.toLowerCase();
  } catch {
    return [];
  }

  const visited = new Set<string>();
  const toVisit: string[] = [ojsUrl];
  const collectedPages: OjsPage[] = [];

  const externalTemplateUrls = new Set<string>();
  const externalTemplateItems: Array<{ url: string; text: string; source_page: string }> = [];

  while (toVisit.length > 0 && visited.size < maxPages) {
    const currentUrl = toVisit.shift()!;
    if (visited.has(currentUrl)) continue;

    if (isBlockedUrl(currentUrl)) continue;
    if (!isSameDomain(currentUrl, baseDomain)) continue;

    let html = "";
    try {
      const response = await axios.get(currentUrl, {
        headers: DEFAULT_HEADERS,
        timeout: 15000,
      });
      if (typeof response.data === "string") {
        html = response.data;
      }
    } catch {
      visited.add(currentUrl);
      continue;
    }

    visited.add(currentUrl);
    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();

    const isHomepage = sameUrl(currentUrl, ojsUrl);
    const pageData: OjsPage = {
      url: currentUrl,
      text: text.slice(0, 10000),
      external_template_urls: [],
    };

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href")?.trim();
      const linkText = $(el).text().replace(/\s+/g, " ").trim();

      if (!href) return;

      const nextUrl = normalizeUrl(currentUrl, href);
      if (!nextUrl) return;

      if (!isSameDomain(nextUrl, baseDomain)) {
        if (isHomepage && isTemplateExternalUrl(nextUrl, linkText)) {
          if (!externalTemplateUrls.has(nextUrl)) {
            externalTemplateUrls.add(nextUrl);
            const item = {
              url: nextUrl,
              text: linkText || "External template URL",
              source_page: currentUrl,
            };
            externalTemplateItems.push(item);
            pageData.external_template_urls!.push(item);
          }
        }
        return;
      }

      if (visited.has(nextUrl) || toVisit.includes(nextUrl)) return;
      if (isBlockedUrl(nextUrl)) return;
      if (!isRelevantLink(nextUrl, linkText)) return;

      toVisit.push(nextUrl);
    });

    collectedPages.push(pageData);
  }

  collectedPages.sort((a, b) => pagePriority(a) - pagePriority(b));

  if (externalTemplateItems.length > 0) {
    collectedPages.unshift({
      url: "external_template_urls",
      text: externalTemplateItems.map((item) => item.url).join("\n"),
      external_template_urls: externalTemplateItems,
    });
  }

  return collectedPages;
}

function normalizeUrl(baseUrl: string, href: string): string | null {
  try {
    const url = new URL(href, baseUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function isSameDomain(url: string, baseDomain: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase() === baseDomain;
  } catch {
    return false;
  }
}

function isBlockedUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return BLOCKED_PATTERNS.some((pattern) => lower.includes(pattern));
}

function isRelevantLink(url: string, text: string): boolean {
  const combined = `${url} ${text}`.toLowerCase();
  return PRIORITY_KEYWORDS.some((keyword) => combined.includes(keyword));
}

function sameUrl(a: string, b: string): boolean {
  return a.replace(/\/+$/, "") === b.replace(/\/+$/, "");
}

function isTemplateExternalUrl(url: string, linkText: string = ""): boolean {
  const combined = `${url} ${linkText}`.toLowerCase();
  const cleanUrl = url.toLowerCase().split("?")[0];

  const allowedDomains = [
    "drive.google.com",
    "docs.google.com",
    "bit.ly",
    "s.id",
    "onedrive.live.com",
    "1drv.ms",
    "dropbox.com",
  ];

  const templateKeywords = [
    "template",
    "manuscript template",
    "journal template",
    "download template",
    "article template",
    "author template",
    "format artikel",
    "format naskah",
    "template artikel",
    "template jurnal",
    "template naskah",
    "pedoman penulisan",
    "panduan penulis",
    "petunjuk penulis",
  ];

  const fileExtensions = [".doc", ".docx", ".pdf"];

  return (
    allowedDomains.some((d) => combined.includes(d)) ||
    templateKeywords.some((k) => combined.includes(k)) ||
    fileExtensions.some((ext) => cleanUrl.endsWith(ext))
  );
}

function pagePriority(page: OjsPage): number {
  const combined = `${page.url} ${page.text}`.toLowerCase();

  const highPriority = [
    "author fee",
    "author fees",
    "publication fee",
    "publication fees",
    "article processing charge",
    "apc",
    "biaya publikasi",
    "template",
    "journal template",
    "manuscript template",
  ];

  const mediumPriority = [
    "submission",
    "author guideline",
    "about",
    "focus and scope",
    "editorial team",
    "contact",
  ];

  if (highPriority.some((k) => combined.includes(k))) return 0;
  if (mediumPriority.some((k) => combined.includes(k))) return 1;
  return 2;
}
