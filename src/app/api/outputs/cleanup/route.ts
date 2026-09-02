import { NextResponse } from "next/server";
import { cleanupAllOutputFiles, listAllOutputFiles } from "@/lib/storage";

async function executeCleanup(req: Request) {
  try {
    const result = await cleanupAllOutputFiles();

    return NextResponse.json({
      success: true,
      message: `Berhasil membersihkan ${result.deletedCount} file output dari ${result.storageProvider === "cloudinary" ? "Cloudinary" : "server"}.`,
      deletedCount: result.deletedCount,
      deletedFiles: result.deletedFiles,
      storageProvider: result.storageProvider,
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

  const { files, storageProvider, storageLocation } = await listAllOutputFiles();

  return NextResponse.json({
    status: "ready",
    endpoint: "/api/outputs/cleanup",
    supportedMethods: ["DELETE", "POST", "GET?action=execute"],
    currentFilesCount: files.length,
    storageProvider,
    storageLocation,
    description: "Endpoint untuk menghapus seluruh file JSON di direktori Cloudinary / local storage",
  });
}
