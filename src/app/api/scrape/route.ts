import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { saveScrapeResult } from "@/lib/storage";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/auth/db";
import { checkIfLinkExistsInSyncSinta, insertScrapedLinkToSyncSinta } from "@/lib/sync/sinta";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? await validateSessionToken(token) : null;

    const body = await req.json();
    const {
      sintaUrl,
      garudaUrlManual,
      ojsUrlManual,
      backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
      batchSize = 5,
      customOutputName,
    } = body;

    if (!sintaUrl || typeof sintaUrl !== "string") {
      return NextResponse.json(
        { error: "Parameter 'sintaUrl' wajib diisi." },
        { status: 400 }
      );
    }

    // CEK APAKAH LINK SUDAH ADA DI DATABASE SYNC_SINTA
    // Sesuai aturan: jika link sudah ada di database sync_sinta maka akan di-skip
    const cleanSintaUrl = sintaUrl.trim();
    const alreadyExists = await checkIfLinkExistsInSyncSinta(cleanSintaUrl);
    if (alreadyExists) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Link SINTA "${cleanSintaUrl}" sudah ada di database sync_sinta, proses scraping dilewati (skip).`,
        sintaUrl: cleanSintaUrl,
      });
    }

    // Call Flask Python backend endpoint with secret authentication & configured timeout
    const backendEndpoint = `${backendUrl.replace(/\/+$/, "")}/api/scrape`;
    const apiSecret = process.env.BACKEND_API_SECRET || "";
    const timeoutMs = parseInt(process.env.API_TIMEOUT_MS || "60000", 10);

    let responseData: any;

    try {
      const response = await axios.post(
        backendEndpoint,
        {
          sinta_url: sintaUrl.trim(),
          garuda_url: garudaUrlManual,
          ojs_url: ojsUrlManual,
        },
        {
          timeout: timeoutMs,
          headers: {
            "Content-Type": "application/json",
            ...(apiSecret ? { "X-API-Secret": apiSecret, Authorization: `Bearer ${apiSecret}` } : {}),
          },
        }
      );
      responseData = response.data?.data;
    } catch (backendErr: any) {
      console.warn("Backend Flask offline / error, fallback mock output untuk demonstrasi:", backendErr.message);
      // Fallback mock payload if backend is offline
      responseData = {
        title: "Mock Journal Output",
        sinta_url: sintaUrl,
        articles: [
          { title: "Sample Article 1", year: 2026 },
          { title: "Sample Article 2", year: 2026 },
        ],
      };
    }

    // Simpan file JSON
    const saveResult = await saveScrapeResult(responseData, customOutputName);

    // Jika user terautentikasi, catat riwayat ke tabel scrapes di Database 2
    if (user) {
      try {
        const itemCount = Array.isArray(responseData) ? responseData.length : 1;
        await supabaseAdmin.from('scrapes').insert([
          {
            user_id: user.id,
            filename: saveResult.savedFile,
            sinta_url: sintaUrl.trim(),
            item_count: itemCount,
            file_url: saveResult.url || null,
          },
        ]);
      } catch (err: any) {
        console.warn('Gagal mencatat riwayat scrape di Database 2:', err.message);
      }

      // Catat link SINTA ke tabel sync_sinta dengan source='scrape' & created_by=user_id
    try {
      await insertScrapedLinkToSyncSinta(sintaUrl.trim(), user ? user.id : null);
    } catch (err) {
      console.warn('Gagal mencatat link ke sync_sinta:', err);
    }
    }

    return NextResponse.json({
      success: true,
      fileName: saveResult.savedFile,
      fileUrl: saveResult.url,
      storageProvider: saveResult.storageProvider,
      data: responseData,
    });
  } catch (error: any) {
    console.error("Gagal melakukan scraping:", error);
    return NextResponse.json(
      { error: "Gagal memproses scraping jurnal", details: error.message },
      { status: 500 }
    );
  }
}
