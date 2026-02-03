/**
 * Preview Headers API
 * 
 * POST /api/admin/ingestion/preview-headers
 * 
 * Parses a CSV file and returns headers + sample rows WITHOUT storing the file.
 * Used for creating mapping profiles.
 */

import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for preview
const PREVIEW_ROWS = 5;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const datasetType = formData.get("dataset_type") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!datasetType) {
      return NextResponse.json(
        { error: "dataset_type is required" },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large for preview. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Check file type
    const allowedTypes = ["text/csv", "application/vnd.ms-excel", "text/plain"];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a CSV file." },
        { status: 400 }
      );
    }

    // Read and parse file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const content = buffer.toString("utf-8");

    // Parse CSV
    const result = Papa.parse<string[]>(content, {
      skipEmptyLines: true,
    });

    if (result.errors.length > 0) {
      console.warn("[preview-headers] CSV parse warnings:", result.errors.slice(0, 5));
    }

    const allRows = result.data;
    const headers: string[] = [];
    const sampleRows: string[][] = [];
    let totalRows = 0;

    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];

      // Skip empty rows
      if (!row || row.length === 0 || (row.length === 1 && !row[0]?.trim())) {
        continue;
      }

      if (headers.length === 0) {
        // First non-empty row is headers
        headers.push(...row.map(h => h?.trim() ?? ""));
      } else {
        totalRows++;
        if (sampleRows.length < PREVIEW_ROWS) {
          sampleRows.push(row.map(cell => cell?.trim() ?? ""));
        }
      }
    }

    if (headers.length === 0) {
      return NextResponse.json(
        { error: "Could not parse CSV headers. File may be empty or malformed." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      filename: file.name,
      headers,
      sample_rows: sampleRows,
      total_rows: totalRows,
    });
  } catch (err) {
    console.error("Preview headers error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}
