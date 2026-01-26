/**
 * Ingestion Upload API
 * 
 * POST /api/admin/ingestion/upload - Upload CSV file, detect columns, return preview
 * 
 * This endpoint:
 * 1. Receives file via FormData
 * 2. Computes SHA-256 checksum
 * 3. Stores file in raw-uploads bucket
 * 4. Creates raw_files record
 * 5. Parses header row and sample data
 * 6. Auto-detects column mappings
 * 7. Returns preview data for the mapping UI
 */

import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseService";
import { DatasetType } from "@/lib/ingestion/types";
import { autoDetectMappings } from "@/lib/ingestion/parseRow";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 1 minute for large file uploads

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const PREVIEW_ROWS = 10; // Number of sample rows to return

// ============================================================================
// POST - Upload file and detect columns
// ============================================================================

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const datasetType = formData.get("dataset_type") as DatasetType | null;

    // Validate inputs
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

    const validDatasetTypes = [
      "budgets",
      "actuals",
      "transactions",
      "revenues",
      "funds_lookup",
      "departments_lookup",
    ];

    if (!validDatasetTypes.includes(datasetType)) {
      return NextResponse.json(
        { error: `Invalid dataset_type: ${datasetType}` },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
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

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const content = buffer.toString("utf-8");

    // Compute checksum
    const checksum = createHash("sha256").update(buffer).digest("hex");

    // Check for duplicate (same file already uploaded)
    const { data: existingFile } = await supabaseAdmin
      .from("raw_files")
      .select("id, filename, uploaded_at, storage_path")
      .eq("checksum", checksum)
      .maybeSingle();

    if (existingFile) {
      // Check if all jobs for this file have failed or don't exist
      const { data: jobs } = await supabaseAdmin
        .from("ingestion_jobs")
        .select("id, status")
        .eq("raw_file_id", existingFile.id);

      const allJobsFailed = !jobs || jobs.length === 0 || 
        jobs.every(job => job.status === "failed");

      if (allJobsFailed) {
        // Clean up the old file and allow re-upload
        console.log(`[upload] Cleaning up failed file ${existingFile.id} to allow re-upload`);
        
        // Delete jobs first (foreign key constraint)
        if (jobs && jobs.length > 0) {
          await supabaseAdmin
            .from("ingestion_jobs")
            .delete()
            .eq("raw_file_id", existingFile.id);
        }
        
        // Delete raw_files record
        await supabaseAdmin
          .from("raw_files")
          .delete()
          .eq("id", existingFile.id);
        
        // Delete from storage
        if (existingFile.storage_path) {
          await supabaseAdmin.storage
            .from("raw-uploads")
            .remove([existingFile.storage_path]);
        }
        
        // Continue with upload (don't return error)
      } else {
        // File has a successful or in-progress job - block re-upload
        return NextResponse.json(
          {
            error: "Duplicate file",
            message: `This exact file was already uploaded as "${existingFile.filename}" on ${new Date(existingFile.uploaded_at).toLocaleDateString()}`,
            existing_file_id: existingFile.id,
          },
          { status: 409 }
        );
      }
    }

    // Parse CSV to get headers and preview rows
    const { headers, rows, totalRows } = parseCSVPreview(content, PREVIEW_ROWS);

    if (headers.length === 0) {
      return NextResponse.json(
        { error: "Could not parse CSV headers. File may be empty or malformed." },
        { status: 400 }
      );
    }

    // Generate storage path
    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${datasetType}/${timestamp}_${safeFilename}`;

    // Upload to raw-uploads bucket
    const { error: uploadError } = await supabaseAdmin.storage
      .from("raw-uploads")
      .upload(storagePath, buffer, {
        contentType: "text/csv",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading to storage:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      );
    }

    // Create raw_files record
    const { data: rawFile, error: insertError } = await supabaseAdmin
      .from("raw_files")
      .insert({
        dataset_type: datasetType,
        filename: file.name,
        file_size_bytes: file.size,
        checksum,
        storage_path: storagePath,
        row_count: totalRows,
        uploaded_by: auth.data.user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating raw_files record:", insertError);
      // Try to clean up uploaded file
      await supabaseAdmin.storage.from("raw-uploads").remove([storagePath]);
      return NextResponse.json(
        { error: "Failed to create file record" },
        { status: 500 }
      );
    }

    // Auto-detect column mappings
    const detectedMappings = autoDetectMappings(headers, datasetType);

    // Get active profile for this dataset type (if exists)
    const { data: activeProfile } = await supabaseAdmin
      .from("mapping_profiles")
      .select("*")
      .eq("dataset_type", datasetType)
      .eq("is_active", true)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      raw_file: rawFile,
      preview: {
        headers,
        sample_rows: rows,
        total_rows: totalRows,
      },
      detected_mappings: detectedMappings,
      active_profile: activeProfile,
    });
  } catch (err) {
    console.error("Ingestion upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// CSV PARSING HELPERS
// ============================================================================

interface CSVPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

/**
 * Parse CSV content and return headers + sample rows
 * Uses PapaParse for robust handling of:
 * - Quoted fields with commas
 * - Quoted fields with embedded newlines
 * - Escaped quotes ("")
 * - Windows/Mac/Unix line endings
 */
function parseCSVPreview(content: string, maxRows: number): CSVPreview {
  const result = Papa.parse<string[]>(content, {
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    console.warn("[upload] CSV parse warnings:", result.errors.slice(0, 5));
  }

  const allRows = result.data;
  const headers: string[] = [];
  const rows: string[][] = [];
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
      if (rows.length < maxRows) {
        rows.push(row.map(cell => cell?.trim() ?? ""));
      }
    }
  }

  return { headers, rows, totalRows };
}