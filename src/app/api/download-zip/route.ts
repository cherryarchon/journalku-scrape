import { NextResponse } from "next/server";
import { generateOutputsZip } from "@/lib/storage";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedFilesParam = searchParams.get("files");
    const requestedFiles = requestedFilesParam
      ? requestedFilesParam.split(",").map((f) => f.trim())
      : undefined;

    const { zipBuffer, filename } = await generateOutputsZip(requestedFiles);

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal membuat file ZIP" },
      { status: 500 }
    );
  }
}
