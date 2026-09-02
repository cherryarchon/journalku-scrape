import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import path from "path";
import fs from "fs";
import JSZip from "jszip";
import { getOutputDir, saveRawResult as saveRawResultLocal } from "./scraper/engine";
import { CleanedJournalResult } from "./scraper/transform";

export interface StoredOutputFile {
  name: string;
  path: string;
  sizeBytes: number;
  updatedAt: string;
  itemCount: number;
  url?: string;
  storageProvider: "cloudinary" | "local";
}

export function isCloudinaryConfigured(): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  return Boolean(
    cloudName &&
    apiKey &&
    apiSecret &&
    cloudName !== "your_cloud_name" &&
    apiKey !== "your_api_key" &&
    apiSecret !== "your_api_secret"
  );
}

function getCloudinaryFolder(): string {
  return (process.env.CLOUDINARY_FOLDER || "web-scrape/outputs").replace(/^\/+|\/+$/g, "");
}

function configureCloudinary() {
  if (isCloudinaryConfigured()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
      api_key: process.env.CLOUDINARY_API_KEY?.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
      secure: true,
    });
  }
}

/**
 * Upload a JSON string or object to Cloudinary as a raw file resource.
 */
export async function uploadJsonToCloudinary(filename: string, jsonContent: any): Promise<any> {
  configureCloudinary();
  const folder = getCloudinaryFolder();
  const cleanFilename = filename.endsWith(".json") ? filename : `${filename}.json`;
  const publicId = `${folder}/${cleanFilename}`;

  const jsonString = typeof jsonContent === "string" ? jsonContent : JSON.stringify(jsonContent, null, 2);
  const base64Data = `data:application/json;base64,${Buffer.from(jsonString, "utf-8").toString("base64")}`;

  const uploadResult = await cloudinary.uploader.upload(base64Data, {
    resource_type: "raw",
    public_id: publicId,
    overwrite: true,
    invalidate: true,
  });

  return uploadResult;
}

/**
 * Fetch raw JSON file content from Cloudinary
 */
export async function getCloudinaryJsonContent(filename: string): Promise<any[] | null> {
  configureCloudinary();
  const folder = getCloudinaryFolder();
  const cleanFilename = filename.endsWith(".json") ? filename : `${filename}.json`;
  const publicId = `${folder}/${cleanFilename}`;

  try {
    const resource = await cloudinary.api.resource(publicId, { resource_type: "raw" });
    if (!resource || !resource.secure_url) return null;

    const response = await axios.get(resource.secure_url, {
      timeout: 10000,
      headers: { "Cache-Control": "no-cache" },
      params: { _t: Date.now() },
    });

    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (err: any) {
    if (err.error?.http_code === 404 || err.response?.status === 404) {
      return null;
    }
    console.warn(`Gagal membaca file ${filename} dari Cloudinary:`, err.message || err);
    return null;
  }
}

/**
 * Save scraping result to either Cloudinary or Local Storage
 */
export async function saveScrapeResult(
  data: CleanedJournalResult,
  batchSize: number = 5,
  customName?: string
): Promise<{ savedFile: string; storageProvider: "cloudinary" | "local"; url?: string }> {
  if (isCloudinaryConfigured()) {
    try {
      configureCloudinary();
      const folder = getCloudinaryFolder();

      let targetFilename: string;
      let existing: any[] = [];

      if (customName) {
        targetFilename = customName.endsWith(".json") ? customName : `${customName}.json`;
        const fetched = await getCloudinaryJsonContent(targetFilename);
        if (fetched && Array.isArray(fetched)) {
          existing = fetched;
        }
      } else {
        // Batching calculation on Cloudinary
        const listRes = await cloudinary.api.resources({
          type: "upload",
          resource_type: "raw",
          prefix: `${folder}/`,
          max_results: 500,
        });

        const files: string[] = (listRes.resources || [])
          .map((r: any) => {
            const base = path.basename(r.public_id);
            return base.endsWith(".json") ? base : `${base}.json`;
          })
          .filter((f: string) => /^\d+\.json$/.test(f))
          .sort((a: string, b: string) => parseInt(a.replace(".json", ""), 10) - parseInt(b.replace(".json", ""), 10));

        if (files.length === 0) {
          targetFilename = "1.json";
        } else {
          const latestFilename = files[files.length - 1];
          const latestContent = await getCloudinaryJsonContent(latestFilename);

          if (latestContent && Array.isArray(latestContent) && latestContent.length >= batchSize) {
            const nextNum = parseInt(latestFilename.replace(".json", ""), 10) + 1;
            targetFilename = `${nextNum}.json`;
            existing = [];
          } else {
            targetFilename = latestFilename;
            existing = latestContent || [];
          }
        }
      }

      existing.push(data);
      const uploadRes = await uploadJsonToCloudinary(targetFilename, existing);

      return {
        savedFile: targetFilename,
        storageProvider: "cloudinary",
        url: uploadRes.secure_url,
      };
    } catch (err: any) {
      console.warn("Cloudinary save gagal, beralih ke local storage:", err.message || err);
      // Fallback to local
    }
  }

  // Local storage fallback
  const localSaved = saveRawResultLocal(data, batchSize, customName);
  return {
    savedFile: path.basename(localSaved),
    storageProvider: "local",
  };
}

/**
 * List all output files from active storage provider (Cloudinary or Local)
 */
export async function listAllOutputFiles(): Promise<{
  files: StoredOutputFile[];
  storageProvider: "cloudinary" | "local";
  storageLocation: string;
}> {
  if (isCloudinaryConfigured()) {
    try {
      configureCloudinary();
      const folder = getCloudinaryFolder();

      const listRes = await cloudinary.api.resources({
        type: "upload",
        resource_type: "raw",
        prefix: `${folder}/`,
        max_results: 500,
      });

      const rawResources = (listRes.resources || []).filter((r: any) =>
        r.public_id.endsWith(".json") || r.format === "json"
      );

      // Fetch items count in parallel
      const filePromises = rawResources.map(async (r: any) => {
        const rawName = path.basename(r.public_id);
        const name = rawName.endsWith(".json") ? rawName : `${rawName}.json`;
        let itemCount = 0;

        try {
          const res = await axios.get(r.secure_url, {
            timeout: 5000,
            headers: { "Cache-Control": "no-cache" },
            params: { _t: Date.now() },
          });
          if (Array.isArray(res.data)) {
            itemCount = res.data.length;
          } else if (res.data && typeof res.data === "object") {
            itemCount = 1;
          }
        } catch {
          itemCount = 0;
        }

        return {
          name,
          path: r.secure_url,
          sizeBytes: r.bytes || 0,
          updatedAt: r.created_at || new Date().toISOString(),
          itemCount,
          url: r.secure_url,
          storageProvider: "cloudinary" as const,
        };
      });

      const files = await Promise.all(filePromises);

      // Sort files logically: numbers first, then alphabetical
      files.sort((a, b) => {
        const numA = parseInt(a.name.replace(".json", ""), 10);
        const numB = parseInt(b.name.replace(".json", ""), 10);

        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.name.localeCompare(b.name);
      });

      return {
        files,
        storageProvider: "cloudinary",
        storageLocation: `Cloudinary (${folder}/)`,
      };
    } catch (err: any) {
      console.warn("Gagal membaca file dari Cloudinary, menggunakan local storage:", err.message || err);
    }
  }

  // Local Storage listing
  const outputDir = getOutputDir();
  if (!fs.existsSync(outputDir)) {
    return {
      files: [],
      storageProvider: "local",
      storageLocation: outputDir,
    };
  }

  const fileNames = fs
    .readdirSync(outputDir)
    .filter((file) => file.endsWith(".json"));

  const files: StoredOutputFile[] = fileNames.map((fileName) => {
    const filePath = path.join(outputDir, fileName);
    const stats = fs.statSync(filePath);
    let itemCount = 0;

    try {
      const content = fs.readFileSync(/*turbopackIgnore: true*/ filePath, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        itemCount = parsed.length;
      } else if (parsed && typeof parsed === "object") {
        itemCount = 1;
      }
    } catch {
      itemCount = 0;
    }

    return {
      name: fileName,
      path: filePath,
      sizeBytes: stats.size,
      updatedAt: stats.mtime.toISOString(),
      itemCount,
      storageProvider: "local",
    };
  });

  files.sort((a, b) => {
    const numA = parseInt(a.name.replace(".json", ""), 10);
    const numB = parseInt(b.name.replace(".json", ""), 10);

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.name.localeCompare(b.name);
  });

  return {
    files,
    storageProvider: "local",
    storageLocation: outputDir,
  };
}

/**
 * Get single file buffer for download/preview
 */
export async function getOutputFileBuffer(filename: string): Promise<{
  buffer: Buffer;
  filename: string;
  contentType: string;
} | null> {
  const cleanFilename = filename.endsWith(".json") ? filename : `${filename}.json`;

  if (isCloudinaryConfigured()) {
    try {
      configureCloudinary();
      const folder = getCloudinaryFolder();
      const publicId = `${folder}/${cleanFilename}`;

      const resource = await cloudinary.api.resource(publicId, { resource_type: "raw" });
      if (resource && resource.secure_url) {
        const response = await axios.get(resource.secure_url, {
          responseType: "arraybuffer",
          timeout: 10000,
          params: { _t: Date.now() },
        });

        return {
          buffer: Buffer.from(response.data),
          filename: cleanFilename,
          contentType: "application/json; charset=utf-8",
        };
      }
    } catch (err: any) {
      console.warn(`Gagal mengambil ${cleanFilename} dari Cloudinary:`, err.message || err);
    }
  }

  // Local fallback
  const outputDir = getOutputDir();
  const filePath = path.join(outputDir, cleanFilename);
  if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
    const fileBuffer = fs.readFileSync(/*turbopackIgnore: true*/ filePath);
    return {
      buffer: fileBuffer,
      filename: cleanFilename,
      contentType: "application/json; charset=utf-8",
    };
  }

  return null;
}

/**
 * Delete a single output file
 */
export async function deleteSingleOutputFile(filename: string): Promise<boolean> {
  const cleanFilename = filename.endsWith(".json") ? filename : `${filename}.json`;

  if (isCloudinaryConfigured()) {
    try {
      configureCloudinary();
      const folder = getCloudinaryFolder();
      const publicId = `${folder}/${cleanFilename}`;

      const res = await cloudinary.uploader.destroy(publicId, {
        resource_type: "raw",
        invalidate: true,
      });

      if (res.result === "ok" || res.result === "not found") {
        return true;
      }
    } catch (err: any) {
      console.warn(`Gagal menghapus ${cleanFilename} di Cloudinary:`, err.message || err);
    }
  }

  // Local fallback
  const outputDir = getOutputDir();
  const filePath = path.join(outputDir, cleanFilename);
  if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }

  return false;
}

/**
 * Cleanup / Delete all output files
 */
export async function cleanupAllOutputFiles(): Promise<{
  deletedCount: number;
  deletedFiles: string[];
  storageProvider: "cloudinary" | "local";
}> {
  if (isCloudinaryConfigured()) {
    try {
      configureCloudinary();
      const folder = getCloudinaryFolder();

      const listRes = await cloudinary.api.resources({
        type: "upload",
        resource_type: "raw",
        prefix: `${folder}/`,
        max_results: 500,
      });

      const rawResources = listRes.resources || [];
      const publicIds = rawResources.map((r: any) => r.public_id);
      const deletedFiles = publicIds.map((p: string) => path.basename(p));

      if (publicIds.length > 0) {
        await cloudinary.api.delete_resources(publicIds, {
          resource_type: "raw",
          invalidate: true,
        });
      }

      return {
        deletedCount: deletedFiles.length,
        deletedFiles,
        storageProvider: "cloudinary",
      };
    } catch (err: any) {
      console.warn("Gagal membersihkan file Cloudinary:", err.message || err);
    }
  }

  // Local Storage cleanup
  const outputDir = getOutputDir();
  if (!fs.existsSync(outputDir)) {
    return {
      deletedCount: 0,
      deletedFiles: [],
      storageProvider: "local",
    };
  }

  const fileNames = fs.readdirSync(outputDir);
  const deletedFiles: string[] = [];

  for (const file of fileNames) {
    const p = path.join(outputDir, file);
    try {
      if (fs.statSync(p).isFile()) {
        fs.unlinkSync(p);
        deletedFiles.push(file);
      }
    } catch (e: any) {
      console.error(`Gagal menghapus file lokal ${file}:`, e);
    }
  }

  return {
    deletedCount: deletedFiles.length,
    deletedFiles,
    storageProvider: "local",
  };
}

/**
 * Generate a ZIP buffer containing JSON outputs
 */
export async function generateOutputsZip(requestedFiles?: string[]): Promise<{
  zipBuffer: Uint8Array;
  filename: string;
  filesCount: number;
}> {
  const { files } = await listAllOutputFiles();

  let targetFiles = files;
  if (requestedFiles && requestedFiles.length > 0) {
    const fileSet = new Set(requestedFiles.map((f) => f.trim()));
    targetFiles = files.filter((f) => fileSet.has(f.name));
  }

  // Limit to 100 files
  targetFiles = targetFiles.slice(0, 100);

  if (targetFiles.length === 0) {
    throw new Error("Tidak ada file JSON yang valid untuk di-ZIP.");
  }

  const zip = new JSZip();

  for (const file of targetFiles) {
    const fileData = await getOutputFileBuffer(file.name);
    if (fileData) {
      zip.file(file.name, fileData.buffer.toString("utf-8"));
    }
  }

  const zipNodeBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const zipFilename = `web-scrape-outputs-${timestamp}.zip`;

  return {
    zipBuffer: new Uint8Array(zipNodeBuffer),
    filename: zipFilename,
    filesCount: targetFiles.length,
  };
}
