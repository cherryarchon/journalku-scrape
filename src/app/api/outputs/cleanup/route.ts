import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getOutputDir } from "@/lib/scraper/engine";

function executeCleanup(req: Request) {
  try {
    const outputDir = getOutputDir();

    if (!fs.existsSync(outputDir)) {
      return NextResponse.json({
        success: true,
        message: "Direktori output belum dibuat atau sudah kosong.",
        deletedCount: 0,
        deletedFiles: [],
        timestamp: new Date().toISOString(),
      });
    }

    // Read all files in outputDir
    const allFiles = fs.readdirSync(outputDir);
    const deletedFiles: string[] = [];
    const failedFiles: { file: string; error: string }[] = [];

    for (const fileName of allFiles) {
      const filePath = path.join(outputDir, fileName);
      try {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          fs.unlinkSync(filePath);
          deletedFiles.push(fileName);
        }
      } catch (err: any) {
        failedFiles.push({ file: fileName, error: err.message || "Gagal menghapus file" });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil membersihkan ${deletedFiles.length} file output dari server.`,
      deletedCount: deletedFiles.length,
      deletedFiles,
      failedCount: failedFiles.length,
      failedFiles: failedFiles.length > 0 ? failedFiles : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal membersihkan direktori output",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/outputs/cleanup
export async function DELETE(req: Request) {
  return executeCleanup(req);
}

// POST /api/outputs/cleanup (Allows webhook / cron triggers)
export async function POST(req: Request) {
  return executeCleanup(req);
}

// GET /api/outputs/cleanup (Status / info or manual trigger)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "execute" || action === "purge") {
    return executeCleanup(req);
  }

  const outputDir = getOutputDir();
  const fileCount = fs.existsSync(outputDir) ? fs.readdirSync(outputDir).length : 0;

  return NextResponse.json({
    status: "ready",
    endpoint: "/api/outputs/cleanup",
    supportedMethods: ["DELETE", "POST", "GET?action=execute"],
    currentFilesCount: fileCount,
    description: "Endpoint khusus untuk menghapus seluruh file JSON dan ZIP di direktori public/output/",
  });
}
