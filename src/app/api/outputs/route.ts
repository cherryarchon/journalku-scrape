import { NextResponse } from "next/server";
import { listAllOutputFiles, cleanupAllOutputFiles } from "@/lib/storage";

export async function GET() {
  try {
    const { files, storageProvider, storageLocation } = await listAllOutputFiles();
    return NextResponse.json({
      files,
      outputDir: storageLocation,
      storageProvider,
      storageLocation,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengambil daftar file output" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const result = await cleanupAllOutputFiles();
    return NextResponse.json({
      success: true,
      message: `Berhasil menghapus seluruh (${result.deletedCount}) file output dari ${result.storageProvider === "cloudinary" ? "Cloudinary" : "server"}.`,
      deletedCount: result.deletedCount,
      deletedFiles: result.deletedFiles,
      storageProvider: result.storageProvider,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal menghapus seluruh file output" },
      { status: 500 }
    );
  }
}
