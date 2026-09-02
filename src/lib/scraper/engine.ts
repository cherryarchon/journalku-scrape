import fs from "fs";
import path from "path";
import os from "os";
import { CleanedJournalResult } from "./transform";

export interface ScrapeOptions {
  sintaUrl: string;
  garudaUrlManual?: string;
  ojsUrlManual?: string;
  batchSize?: number;
  customOutputName?: string;
}

export function getOutputDir(): string {
  // If running on Vercel or Serverless (where filesystem is read-only except /tmp)
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION) {
    const tmpOutputDir = path.join(os.tmpdir(), "output");
    if (!fs.existsSync(tmpOutputDir)) {
      try {
        fs.mkdirSync(tmpOutputDir, { recursive: true });
      } catch (err) {
        console.error("Gagal membuat direktori /tmp/output:", err);
      }
    }
    return tmpOutputDir;
  }

  // Local development / Self-hosted server
  const localOutputDir = path.resolve(process.cwd(), "public", "output");
  try {
    if (!fs.existsSync(localOutputDir)) {
      fs.mkdirSync(localOutputDir, { recursive: true });
    }
    return localOutputDir;
  } catch {
    // Fallback to tmpdir if writing to public/output fails for any reason
    const fallbackDir = path.join(os.tmpdir(), "output");
    if (!fs.existsSync(fallbackDir)) {
      try {
        fs.mkdirSync(fallbackDir, { recursive: true });
      } catch (err) {
        console.error("Gagal membuat direktori fallback output:", err);
      }
    }
    return fallbackDir;
  }
}

export function saveRawResult(
  data: CleanedJournalResult,
  batchSize: number = 5,
  customName?: string
): string {
  const outputDir = getOutputDir();

  let targetFile: string;

  if (customName) {
    targetFile = path.join(/*turbopackIgnore: true*/ outputDir, customName.endsWith(".json") ? customName : `${customName}.json`);
  } else {
    targetFile = getCurrentBatchFile(outputDir, batchSize);
  }

  let existing: any[] = [];
  if (fs.existsSync(/*turbopackIgnore: true*/ targetFile)) {
    try {
      const content = fs.readFileSync(/*turbopackIgnore: true*/ targetFile, "utf-8");
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
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const files = fs
      .readdirSync(outputDir)
      .filter((f) => f.endsWith(".json") && /^\d+\.json$/.test(f))
      .sort((a, b) => parseInt(a.replace(".json", ""), 10) - parseInt(b.replace(".json", ""), 10));

    if (files.length === 0) {
      return path.join(outputDir, "1.json");
    }

    const latestFile = path.join(outputDir, files[files.length - 1]);
    try {
      const content = fs.readFileSync(/*turbopackIgnore: true*/ latestFile, "utf-8");
      const existing = JSON.parse(content);
      if (Array.isArray(existing) && existing.length >= batchSize) {
        const nextNum = parseInt(files[files.length - 1].replace(".json", ""), 10) + 1;
        return path.join(outputDir, `${nextNum}.json`);
      }
    } catch {
      // If corrupt, start new batch file
    }

    return latestFile;
  } catch {
    return path.join(outputDir, "1.json");
  }
}
