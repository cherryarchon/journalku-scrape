import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  normalizeJsonInput,
  validateJournalItem,
  createWorkbookFromValidJournals,
  JournalExcelItem,
} from "@/lib/excel/converter";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    let rawContent: any = null;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "File JSON tidak ditemukan pada upload formulir." },
          { status: 400 }
        );
      }
      const text = await file.text();
      try {
        rawContent = JSON.parse(text);
      } catch (err: any) {
        return NextResponse.json(
          { error: "Isi file tidak dapat diparsing sebagai JSON yang valid.", details: err.message },
          { status: 400 }
        );
      }
    } else {
      try {
        rawContent = await req.json();
      } catch (err: any) {
        return NextResponse.json(
          { error: "Payload request bukan JSON yang valid.", details: err.message },
          { status: 400 }
        );
      }
    }

    const items = normalizeJsonInput(rawContent);

    if (!items || items.length === 0) {
      return NextResponse.json(
        {
          error: "Tidak ada entri data jurnal yang ditemukan di dalam JSON.",
          details: "Pastikan format JSON berisi objek jurnal atau array objek jurnal.",
        },
        { status: 400 }
      );
    }

    const validItems: JournalExcelItem[] = [];
    const skippedItems: { index: number; name: string; errors: string[]; rawItem: any }[] = [];

    items.forEach((item, idx) => {
      const validation = validateJournalItem(item, idx + 1);
      if (validation.valid && validation.item) {
        validItems.push(validation.item);
      } else {
        const fallbackName =
          (item && typeof item === "object" && (item.name || item.title)) ||
          `Entri #${idx + 1}`;
        skippedItems.push({
          index: idx + 1,
          name: String(fallbackName),
          errors: validation.errors,
          rawItem: item,
        });
      }
    });

    const url = new URL(req.url);
    const shouldDownloadDirect = url.searchParams.get("download") === "true";

    if (shouldDownloadDirect) {
      if (validItems.length === 0) {
        return NextResponse.json(
          {
            error: "Semua entri dalam JSON tidak valid. Tidak ada data untuk diekspor ke Excel.",
            skippedCount: skippedItems.length,
            skipped: skippedItems,
          },
          { status: 422 }
        );
      }

      const wb = createWorkbookFromValidJournals(validItems);
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `jurnal_import_${timestamp}.xlsx`;

      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      total: items.length,
      validCount: validItems.length,
      skippedCount: skippedItems.length,
      validItems,
      skipped: skippedItems,
      hasValidData: validItems.length > 0,
    });
  } catch (error: any) {
    console.error("Gagal memproses konversi JSON ke Excel:", error);
    return NextResponse.json(
      { error: "Gagal memproses file JSON ke Excel", details: error.message },
      { status: 500 }
    );
  }
}
