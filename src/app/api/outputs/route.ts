import { NextRequest, NextResponse } from "next/server";
import { listAllOutputFiles, cleanupAllOutputFiles } from "@/lib/storage";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/auth/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? await validateSessionToken(token) : null;

    const result = await listAllOutputFiles();

    if (!user) {
      return NextResponse.json(result);
    }

    // Role 2 (Admin) melihat semua file
    if (user.role === 2) {
      return NextResponse.json({
        ...result,
        currentUserRole: 2,
        isAdmin: true,
      });
    }

    // Role 3 (Editor): filter hanya file yang tercatat milik editor di tabel scrapes
    try {
      const { data: userScrapes } = await supabaseAdmin
        .from('scrapes')
        .select('filename')
        .eq('user_id', user.id);

      const allowedFilenames = new Set((userScrapes || []).map((s: any) => s.filename));

      const filteredFiles = result.files.filter((f) => allowedFilenames.has(f.name));

      return NextResponse.json({
        ...result,
        files: filteredFiles,
        currentUserRole: 3,
        isAdmin: false,
      });
    } catch {
      // If table query fails, return files
      return NextResponse.json(result);
    }
  } catch (error: any) {
    console.error("Gagal mendapatkan daftar file output:", error);
    return NextResponse.json(
      { error: "Gagal membaca daftar file output", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? await validateSessionToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Hanya Admin (Role 2) yang boleh melakukan cleanup all
    if (user.role !== 2) {
      return NextResponse.json(
        { error: "Forbidden: Hanya Administrator yang berhak membersihkan seluruh hasil scraping." },
        { status: 403 }
      );
    }

    const result = await cleanupAllOutputFiles();

    // Hapus juga riwayat di tabel scrapes
    try {
      await supabaseAdmin.from('scrapes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      console.warn('Gagal membersihkan tabel scrapes:', e);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Gagal menghapus file output:", error);
    return NextResponse.json(
      { error: "Gagal menghapus file output", details: error.message },
      { status: 500 }
    );
  }
}
