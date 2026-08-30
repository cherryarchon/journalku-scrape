import { NextResponse, NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { getOutputDir } from "@/lib/scraper/engine";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    const outputDir = getOutputDir();
    const filePath = path.join(outputDir, filename);

    if (!fs.existsSync(filePath) || !filename.endsWith(".json")) {
      return NextResponse.json(
        { error: "File tidak ditemukan" },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengambil file" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    const outputDir = getOutputDir();
    const filePath = path.join(outputDir, filename);

    if (fs.existsSync(filePath) && filename.endsWith(".json")) {
      fs.unlinkSync(filePath);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "File tidak ditemukan" },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal menghapus file" },
      { status: 500 }
    );
  }
}
