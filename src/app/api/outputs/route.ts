import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getOutputDir } from "@/lib/scraper/engine";

export async function GET() {
  try {
    const outputDir = getOutputDir();
    if (!fs.existsSync(outputDir)) {
      return NextResponse.json({ files: [], outputDir });
    }

    const fileNames = fs
      .readdirSync(outputDir)
      .filter((file) => file.endsWith(".json"));

    const files = fileNames.map((fileName) => {
      const filePath = path.join(outputDir, fileName);
      const stats = fs.statSync(filePath);
      let itemCount = 0;

      try {
        const content = fs.readFileSync(filePath, "utf-8");
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
      };
    });

    // Sort files logically: numbers first, then alphabetical
    files.sort((a, b) => {
      const numA = parseInt(a.name.replace(".json", ""), 10);
      const numB = parseInt(b.name.replace(".json", ""), 10);

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ files, outputDir });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengambil daftar file output" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const outputDir = getOutputDir();
    if (!fs.existsSync(outputDir)) {
      return NextResponse.json({ success: true, deletedCount: 0 });
    }

    const fileNames = fs.readdirSync(outputDir);
    let count = 0;
    for (const file of fileNames) {
      const p = path.join(outputDir, file);
      if (fs.statSync(p).isFile()) {
        fs.unlinkSync(p);
        count++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menghapus seluruh (${count}) file output.`,
      deletedCount: count,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal menghapus seluruh file output" },
      { status: 500 }
    );
  }
}
