import { NextResponse, NextRequest } from "next/server";
import { getOutputFileBuffer, deleteSingleOutputFile } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    const fileResult = await getOutputFileBuffer(filename);

    if (!fileResult) {
      return NextResponse.json(
        { error: "File tidak ditemukan" },
        { status: 404 }
      );
    }

    return new NextResponse(fileResult.buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": fileResult.contentType,
        "Content-Disposition": `attachment; filename="${fileResult.filename}"`,
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
    const deleted = await deleteSingleOutputFile(filename);

    if (deleted) {
      return NextResponse.json({ success: true, filename });
    }

    return NextResponse.json(
      { error: "File tidak ditemukan atau gagal dihapus" },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal menghapus file" },
      { status: 500 }
    );
  }
}
