import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { getOutputDir } from "@/lib/scraper/engine";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedFiles = searchParams.get("files");

    const outputDir = getOutputDir();
    if (!fs.existsSync(outputDir)) {
      return NextResponse.json(
        { error: "Folder output tidak ditemukan." },
        { status: 404 }
      );
    }

    let allFiles = fs
      .readdirSync(outputDir)
      .filter((file) => file.endsWith(".json"));

    if (requestedFiles) {
      const fileList = requestedFiles.split(",").map((f) => f.trim());
      allFiles = allFiles.filter((f) => fileList.includes(f));
    }

    // Limit ZIP contents to max 100 items/files as specified
    const limitedFiles = allFiles.slice(0, 100);

    if (limitedFiles.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada file JSON yang valid untuk di-ZIP." },
        { status: 400 }
      );
    }

    const zip = new JSZip();

    for (const fileName of limitedFiles) {
      const filePath = path.join(outputDir, fileName);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        zip.file(fileName, content);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const zipFilename = `web-scrape-outputs-${timestamp}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal membuat file ZIP" },
      { status: 500 }
    );
  }
}
