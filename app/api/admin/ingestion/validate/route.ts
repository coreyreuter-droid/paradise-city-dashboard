/**
 * Ingestion Validate API
 * 
 * POST /api/admin/ingestion/validate - Validate file with column mappings
 * 
 * This endpoint:
 * 1. Fetches the raw file from storage
 * 2. Applies the provided column mappings
 * 3. Validates all rows using the shared parseRow module
 * 4. Returns validation summary and sample errors
 * 5. Creates an ingestion_job record in 'validated' status
 */

import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseService";
import {
  DatasetType,
  ColumnMappings,
  COAConfig,
  IngestionProfile,
  ImportMode,
} from "@/lib/ingestion/types";
import {
  parseRow,
  summarizeValidation,
  ParseRowOptions,
} from "@/lib/ingestion/parseRow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 minutes for large file validation

// ============================================================================
// POST - Validate file with mappings
// ============================================================================

interface ValidateBody {
  raw_file_id: string;
  column_mappings: ColumnMappings;
  header_row_index?: number;
  skip_rows_after_header?: number;
  coa_config?: COAConfig;
  import_mode?: ImportMode;
  replace_target_year?: number;
  save_profile?: boolean;
  profile_name?: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  try {
    const body = (await req.json()) as ValidateBody;

    // Validate required fields
    if (!body.raw_file_id) {
      return NextResponse.json(
        { error: "raw_file_id is required" },
        { status: 400 }
      );
    }

    if (!body.column_mappings || Object.keys(body.column_mappings).length === 0) {
      return NextResponse.json(
        { error: "column_mappings is required" },
        { status: 400 }
      );
    }

    // Fetch raw file record
    const { data: rawFile, error: rawFileError } = await supabaseAdmin
      .from("raw_files")
      .select("*")
      .eq("id", body.raw_file_id)
      .single();

    if (rawFileError || !rawFile) {
      return NextResponse.json(
        { error: "Raw file not found" },
        { status: 404 }
      );
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("raw-uploads")
      .download(rawFile.storage_path);

    if (downloadError || !fileData) {
      console.error("Error downloading file:", downloadError);
      return NextResponse.json(
        { error: "Failed to download file from storage" },
        { status: 500 }
      );
    }

    const content = await fileData.text();

    // Parse CSV
    const { headers, rows } = parseCSV(
      content,
      body.header_row_index ?? 1,
      body.skip_rows_after_header ?? 0
    );

    if (headers.length === 0) {
      return NextResponse.json(
        { error: "Could not parse CSV headers" },
        { status: 400 }
      );
    }

    // Get fiscal year config from portal_settings
    const { data: settings } = await supabaseAdmin
      .from("portal_settings")
      .select("fiscal_year_start_month")
      .eq("id", 1)
      .maybeSingle();

    const fyStartMonth = settings?.fiscal_year_start_month ?? 7;

    // Build parse options
    const parseOptions: ParseRowOptions = {
      datasetType: rawFile.dataset_type as DatasetType,
      columnMappings: body.column_mappings,
      coaConfig: body.coa_config,
      fyStartMonth,
    };

    // Validate all rows
    const parsedRows = rows.map((row, index) =>
      parseRow(
        (body.header_row_index ?? 1) + (body.skip_rows_after_header ?? 0) + index + 1,
        row,
        headers,
        parseOptions
      )
    );

    // Generate validation summary
    const summary = summarizeValidation(parsedRows, 50);

    // Detect fiscal years in the data
    const detectedYears = new Set<number>();
    for (const row of parsedRows) {
      if (row.isValid && row.data.fiscal_year) {
        detectedYears.add(Number(row.data.fiscal_year));
      }
    }

    // Calculate delete preview for replace modes
    let deletePreview = null;
    if (body.import_mode === "replace_year" && body.replace_target_year) {
      const { count } = await supabaseAdmin
        .from(rawFile.dataset_type)
        .select("*", { count: "exact", head: true })
        .eq("fiscal_year", body.replace_target_year);

      deletePreview = {
        mode: body.import_mode,
        target_year: body.replace_target_year,
        rows_to_delete: count ?? 0,
        fiscal_years_affected: [body.replace_target_year],
      };
    } else if (body.import_mode === "replace_all") {
      const { count } = await supabaseAdmin
        .from(rawFile.dataset_type)
        .select("*", { count: "exact", head: true });

      // Get all existing years
      const { data: existingYears } = await supabaseAdmin
        .from(rawFile.dataset_type)
        .select("fiscal_year")
        .limit(1000);

      const yearsSet = new Set(
        (existingYears ?? [])
          .map((r: { fiscal_year?: number }) => r.fiscal_year)
          .filter((y): y is number => typeof y === "number")
      );

      deletePreview = {
        mode: body.import_mode,
        rows_to_delete: count ?? 0,
        fiscal_years_affected: Array.from(yearsSet).sort((a, b) => b - a),
      };
    }

    // Build profile snapshot
    const profileSnapshot: Partial<IngestionProfile> = {
      dataset_type: rawFile.dataset_type,
      column_mappings: body.column_mappings,
      header_row_index: body.header_row_index ?? 1,
      skip_rows_after_header: body.skip_rows_after_header ?? 0,
      coa_enabled: body.coa_config?.enabled ?? false,
      coa_source_column: body.coa_config?.sourceColumn,
      coa_delimiter: body.coa_config?.delimiter,
      coa_segment_order: body.coa_config?.segmentOrder,
      coa_expected_segments: body.coa_config?.expectedSegments,
    };

    // Create or update ingestion job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("ingestion_jobs")
      .insert({
        raw_file_id: body.raw_file_id,
        profile_snapshot: profileSnapshot,
        dataset_type: rawFile.dataset_type,
        status: summary.invalidRows > 0 ? "validated" : "validated",
        import_mode: body.import_mode ?? "append",
        replace_target_year: body.replace_target_year ?? null,
        rows_total: rows.length,
        rows_validated: rows.length,
        rows_rejected: summary.invalidRows,
        rows_warned: summary.warningRows,
        detected_years: Array.from(detectedYears).sort((a, b) => b - a),
        delete_preview: deletePreview,
      })
      .select()
      .single();

    if (jobError) {
      console.error("Error creating ingestion job:", jobError);
      return NextResponse.json(
        { error: "Failed to create validation job" },
        { status: 500 }
      );
    }

    // Store errors in ingestion_row_errors table
    const errorRecords = parsedRows
      .flatMap((row) => row.errors)
      .slice(0, 1000) // Limit to first 1000 errors
      .map((err) => ({
        job_id: job.id,
        row_number: err.row_number,
        error_code: err.error_code,
        error_level: err.error_level,
        message: err.message,
        field_name: err.field_name ?? null,
        field_value: err.field_value ?? null,
      }));

    if (errorRecords.length > 0) {
      const { error: errorsError } = await supabaseAdmin
        .from("ingestion_row_errors")
        .insert(errorRecords);

      if (errorsError) {
        console.warn("Non-fatal: error storing row errors:", errorsError);
      }
    }

    // Optionally save the profile
    if (body.save_profile) {
      const { error: profileError } = await supabaseAdmin
        .from("mapping_profiles")
        .upsert(
          {
            dataset_type: rawFile.dataset_type,
            name: body.profile_name ?? "Default",
            column_mappings: body.column_mappings,
            header_row_index: body.header_row_index ?? 1,
            skip_rows_after_header: body.skip_rows_after_header ?? 0,
            coa_enabled: body.coa_config?.enabled ?? false,
            coa_source_column: body.coa_config?.sourceColumn,
            coa_delimiter: body.coa_config?.delimiter,
            coa_segment_order: body.coa_config?.segmentOrder,
            coa_expected_segments: body.coa_config?.expectedSegments,
            is_active: true,
            created_by: auth.data.user.id,
          },
          { onConflict: "dataset_type" }
        );

      if (profileError) {
        console.warn("Non-fatal: error saving profile:", profileError);
      }
    }

    // Return validation results
    return NextResponse.json({
      ok: true,
      job_id: job.id,
      validation: {
        ...summary,
        detected_years: Array.from(detectedYears).sort((a, b) => b - a),
      },
      delete_preview: deletePreview,
      can_import: summary.invalidRows === 0,
    });
  } catch (err) {
    console.error("Ingestion validate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// CSV PARSING HELPERS
// ============================================================================

interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

/**
 * Parse full CSV content using PapaParse for robust handling of:
 * - Quoted fields with commas
 * - Quoted fields with embedded newlines
 * - Escaped quotes ("")
 * - Windows/Mac/Unix line endings
 */
function parseCSV(
  content: string,
  headerRowIndex: number,
  skipRowsAfterHeader: number
): ParsedCSV {
  const result = Papa.parse<string[]>(content, {
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    console.warn("[validate] CSV parse warnings:", result.errors.slice(0, 5));
  }

  const allRows = result.data;
  const headers: string[] = [];
  const rows: string[][] = [];

  let dataStarted = false;
  let rowsSkipped = 0;

  for (let lineIndex = 0; lineIndex < allRows.length; lineIndex++) {
    const row = allRows[lineIndex];
    const rowNumber = lineIndex + 1; // 1-indexed

    // Skip empty rows
    if (!row || row.length === 0 || (row.length === 1 && !row[0]?.trim())) {
      continue;
    }

    if (rowNumber === headerRowIndex) {
      headers.push(...row.map(h => h?.trim() ?? ""));
      dataStarted = true;
      continue;
    }

    if (dataStarted) {
      if (rowsSkipped < skipRowsAfterHeader) {
        rowsSkipped++;
        continue;
      }
      rows.push(row.map(cell => cell?.trim() ?? ""));
    }
  }

  return { headers, rows };
}
