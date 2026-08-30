import fs from "fs";
import path from "path";
import { CleanedJournalResult } from "./transform";

export interface ScrapeOptions {
  sintaUrl: string;
  garudaUrlManual?: string;
  ojsUrlManual?: string;
  batchSize?: number;
  customOutputName?: string;
}

export function getOutputDir(): string {
  // Completely standalone output folder inside web-scrape/output
  const localOutputDir = path.resolve(process.cwd(), "output");
  if (!fs.existsSync(localOutputDir)) {
    fs.mkdirSync(localOutputDir, { recursive: true });
  }
  return localOutputDir;
}

export function saveRawResult(
  data: CleanedJournalResult,
  batchSize: number = 5,
  customName?: string
): string {
  const outputDir = getOutputDir();

  let targetFile: string;

  if (customName) {
    targetFile = path.join(outputDir, customName.endsWith(".json") ? customName : `${customName}.json`);
  } else {
    targetFile = getCurrentBatchFile(outputDir, batchSize);
  }

  let existing: any[] = [];
  if (fs.existsSync(targetFile)) {
    try {
      const content = fs.readFileSync(targetFile, "utf-8");
      existing = JSON.parse(content);
      if (!Array.isArray(existing)) {
        existing = [];
      }
    } catch {
      existing = [];
    }
  }

  existing.push(data);

  fs.writeFileSync(targetFile, JSON.stringify(existing, null, 2), "utf-8");
  return targetFile;
}

function getCurrentBatchFile(outputDir: string, batchSize: number): string {
  const files = fs
    .readdirSync(outputDir)
    .filter((f) => f.endsWith(".json") && /^\d+\.json$/.test(f))
    .sort((a, b) => parseInt(a.replace(".json", ""), 10) - parseInt(b.replace(".json", ""), 10));

  if (files.length === 0) {
    return path.join(outputDir, "1.json");
  }

  const latestFile = path.join(outputDir, files[files.length - 1]);
  try {
    const content = fs.readFileSync(latestFile, "utf-8");
    const existing = JSON.parse(content);
    if (Array.isArray(existing) && existing.length >= batchSize) {
      const nextNum = parseInt(files[files.length - 1].replace(".json", ""), 10) + 1;
      return path.join(outputDir, `${nextNum}.json`);
    }
  } catch {
    // If corrupt, start new batch file
  }

  return latestFile;
}
