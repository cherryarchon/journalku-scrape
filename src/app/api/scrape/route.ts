import { NextResponse } from "next/server";
import axios from "axios";
import { saveRawResult } from "@/lib/scraper/engine";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
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
      const msg = backendErr.response?.data?.error || backendErr.message || "Gagal menghubungi Python Backend Flask Server";
      return NextResponse.json(
        { error: `Flask Backend Error: ${msg}` },
        { status: 502 }
      );
    }

    if (!responseData) {
      return NextResponse.json(
        { error: "Python Backend tidak mengembalikan data valid" },
        { status: 500 }
      );
    }

    // Save output in public/output/
    const savedFile = saveRawResult(responseData, parseInt(batchSize, 10), customOutputName);

    return NextResponse.json({
      success: true,
      data: responseData,
      savedFile,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memproses scraping jurnal" },
      { status: 500 }
    );
  }
}
