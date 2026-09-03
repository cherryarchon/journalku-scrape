import { NextRequest, NextResponse } from "next/server";
import { getOutputFileBuffer, deleteSingleOutputFile } from "@/lib/storage";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/auth/db";

interface RouteParams {
  params: Promise<{
    filename: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { filename } = await params;
  if (!filename) {
    return NextResponse.json({ error: "Filename wajib diisi" }, { status: 400 });
  }

  const result = await getOutputFileBuffer(filename);
  if (!result) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  return new NextResponse(result.buffer as any, {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `inline; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { filename } = await params;
  if (!filename) {
    return NextResponse.json({ error: "Filename wajib diisi" }, { status: 400 });
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await validateSessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Jika Editor (Role 3), periksa kepemilikan file di tabel scrapes
  if (user.role === 3) {
    try {
      const { data: scrapeRecord } = await supabaseAdmin
        .from('scrapes')
        .select('user_id')
        .eq('filename', filename)
        .maybeSingle();

      if (scrapeRecord && scrapeRecord.user_id !== user.id) {
        return NextResponse.json(
          { error: "Forbidden: Editor hanya dapat menghapus hasil scraping miliknya sendiri." },
          { status: 403 }
        );
      }
    } catch (e) {
      console.warn('Gagal verifikasi kepemilikan file scrapes:', e);
    }
  }

  const success = await deleteSingleOutputFile(filename);

  if (success) {
    // Hapus juga catatan di tabel scrapes
    try {
      await supabaseAdmin.from('scrapes').delete().eq('filename', filename);
    } catch (e) {
      console.warn('Gagal menghapus catatan scrapes:', e);
    }

    return NextResponse.json({ success: true, message: `File ${filename} berhasil dihapus` });
  }

  return NextResponse.json({ error: "Gagal menghapus file atau file tidak ditemukan" }, { status: 500 });
}
