/**
 * Ingestion Worker API
 * 
 * POST /api/worker/process-ingestion - Process pending ingestion jobs
 * 
 * This endpoint is called by:
 * 1. Vercel Cron (every minute)
 * 2. Direct trigger after job creation (optional)
 * 
 * Security: Requires WORKER_SECRET header or cron authorization
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseService";
import { normalizeCode, normalizeLabel } from "@/lib/normalizeCode";
import {
  DatasetType,
  ColumnMappings,
  COAConfig,
} from "@/lib/ingestion/types";
import { parseRow, ParseRowOptions } from "@/lib/ingestion/parseRow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for large imports

const BATCH_SIZE = 1000; // Rows to process per batch
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes lock timeout

// ============================================================================
// POST - Process pending jobs
// ============================================================================

export async function POST(req: NextRequest) {
  // Verify worker authorization
  const workerSecret = process.env.WORKER_SECRET;
  const providedSecret = req.headers.get("x-worker-secret");
  const cronAuth = req.headers.get("authorization");

  // Allow if: correct secret OR Vercel cron auth
  const isAuthorized =
    (workerSecret && providedSecret === workerSecret) ||
    cronAuth === `Bearer ${process.env.CRON_SECRET}`;

  if (!isAuthorized && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Check if specific job requested
    const body = await req.json().catch(() => ({}));
    const specificJobId = body.job_id;

    // Claim a job (find pending, lock it)
    const job = await claimJob(specificJobId);

    if (!job) {
      return NextResponse.json({
        ok: true,
        message: "No pending jobs to process",
      });
    }

    console.log(`Processing ingestion job ${job.id} for ${job.dataset_type}`);

    try {
      // Process the job
      await processJob(job);

      return NextResponse.json({
        ok: true,
        message: `Job ${job.id} processed successfully`,
        job_id: job.id,
      });
    } catch (err) {
      // Update job with error
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      
      await supabaseAdmin
        .from("ingestion_jobs")
        .update({
          status: "failed",
          last_error: errorMessage,
          finished_at: new Date().toISOString(),
          locked_at: null,
          locked_by: null,
        })
        .eq("id", job.id);

      console.error(`Job ${job.id} failed:`, err);
      
      return NextResponse.json({
        ok: false,
        error: errorMessage,
        job_id: job.id,
      });
    }
  } catch (err) {
    console.error("Worker error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Worker error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// JOB CLAIMING
// ============================================================================

interface IngestionJob {
  id: string;
  raw_file_id: string;
  profile_snapshot: {
    column_mappings: ColumnMappings;
    header_row_index?: number;
    skip_rows_after_header?: number;
    coa_enabled?: boolean;
    coa_source_column?: string;
    coa_delimiter?: string;
    coa_segment_order?: string[];
    coa_expected_segments?: number;
  };
  dataset_type: DatasetType;
  import_mode: string;
  replace_target_year?: number;
  rows_total: number;
  checkpoint_row_number: number;
  delete_applied: boolean;
  attempt_count: number;
}

async function claimJob(specificJobId?: string): Promise<IngestionJob | null> {
  const workerId = `worker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const lockExpiry = new Date(Date.now() - LOCK_TIMEOUT_MS).toISOString();

  // Build query for pending jobs
  let query = supabaseAdmin
    .from("ingestion_jobs")
    .select("*")
    .eq("status", "pending")
    .or(`locked_at.is.null,locked_at.lt.${lockExpiry}`)
    .order("created_at", { ascending: true })
    .limit(1);

  if (specificJobId) {
    query = query.eq("id", specificJobId);
  }

  const { data: jobs, error } = await query;

  if (error || !jobs || jobs.length === 0) {
    return null;
  }

  const job = jobs[0];

  // Try to lock the job
  const { data: updated, error: lockError } = await supabaseAdmin
    .from("ingestion_jobs")
    .update({
      locked_at: new Date().toISOString(),
      locked_by: workerId,
      status: "importing",
      started_at: job.started_at ?? new Date().toISOString(),
      attempt_count: job.attempt_count + 1,
    })
    .eq("id", job.id)
    .eq("status", "pending") // Ensure still pending (prevents race condition)
    .select()
    .single();

  if (lockError || !updated) {
    // Another worker claimed it
    return null;
  }

  return updated as IngestionJob;
}

// ============================================================================
// JOB PROCESSING
// ============================================================================

async function processJob(job: IngestionJob): Promise<void> {
  // 1. Download the raw file
  const { data: rawFile } = await supabaseAdmin
    .from("raw_files")
    .select("*")
    .eq("id", job.raw_file_id)
    .single();

  if (!rawFile) {
    throw new Error("Raw file not found");
  }

  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from("raw-uploads")
    .download(rawFile.storage_path);

  if (downloadError || !fileData) {
    throw new Error("Failed to download file from storage");
  }

  const content = await fileData.text();

  // 2. Parse CSV
  const { headers, rows } = parseCSV(
    content,
    job.profile_snapshot.header_row_index ?? 1,
    job.profile_snapshot.skip_rows_after_header ?? 0
  );

  // 3. Handle delete for replace modes (only once per job)
  if (!job.delete_applied) {
    await handleDelete(job);
    
    // Mark delete as applied
    await supabaseAdmin
      .from("ingestion_jobs")
      .update({ delete_applied: true })
      .eq("id", job.id);
  }

  // 4. Get fiscal config
  const { data: settings } = await supabaseAdmin
    .from("portal_settings")
    .select("fiscal_year_start_month")
    .eq("id", 1)
    .maybeSingle();

  const fyStartMonth = settings?.fiscal_year_start_month ?? 7;

  // 5. Build parse options
  const coaConfig: COAConfig | undefined = job.profile_snapshot.coa_enabled
    ? {
        enabled: true,
        sourceColumn: job.profile_snapshot.coa_source_column,
        delimiter: job.profile_snapshot.coa_delimiter ?? "-",
        segmentOrder: (job.profile_snapshot.coa_segment_order ?? []) as COAConfig["segmentOrder"],
        expectedSegments: job.profile_snapshot.coa_expected_segments,
      }
    : undefined;

  const parseOptions: ParseRowOptions = {
    datasetType: job.dataset_type,
    columnMappings: job.profile_snapshot.column_mappings,
    coaConfig,
    fyStartMonth,
  };

  // 6. Process rows in batches
  let rowsLoaded = 0;
  let rowsRejected = 0;
  const startRow = job.checkpoint_row_number;

  for (let i = startRow; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchStartRow = (job.profile_snapshot.header_row_index ?? 1) +
      (job.profile_snapshot.skip_rows_after_header ?? 0) + i + 1;

    // Parse and validate batch
    const parsedRows = batch.map((row, idx) =>
      parseRow(batchStartRow + idx, row, headers, parseOptions)
    );

    // Build records for valid rows
    const records = parsedRows
      .filter((r) => r.isValid)
      .map((r) => buildRecord(r.data, job));

    // Insert batch
    if (records.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from(job.dataset_type)
        .insert(records);

      if (insertError) {
        throw new Error(`Insert error at row ${i}: ${insertError.message}`);
      }
    }

    rowsLoaded += records.length;
    rowsRejected += parsedRows.filter((r) => !r.isValid).length;

    // Update checkpoint
    await supabaseAdmin
      .from("ingestion_jobs")
      .update({
        checkpoint_row_number: i + batch.length,
        rows_loaded: rowsLoaded,
        rows_rejected: rowsRejected,
      })
      .eq("id", job.id);
  }

  // 7. Calculate coverage (for financial datasets)
  const coverageSummary = await calculateCoverage(job.dataset_type, job.id);

  // 8. Recompute rollups
  await recomputeRollups(job);

  // 9. Mark job complete
  const finalStatus = rowsRejected > 0 ? "completed_with_warnings" : "completed";

  await supabaseAdmin
    .from("ingestion_jobs")
    .update({
      status: finalStatus,
      rows_loaded: rowsLoaded,
      rows_rejected: rowsRejected,
      coverage_summary: coverageSummary,
      finished_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
    })
    .eq("id", job.id);

  console.log(`Job ${job.id} completed: ${rowsLoaded} loaded, ${rowsRejected} rejected`);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseCSV(
  content: string,
  headerRowIndex: number,
  skipRowsAfterHeader: number
): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/);
  const headers: string[] = [];
  const rows: string[][] = [];

  let lineIndex = 0;
  let dataStarted = false;
  let rowsSkipped = 0;

  for (const line of lines) {
    lineIndex++;
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parsedRow = parseCSVLine(trimmed);

    if (lineIndex === headerRowIndex) {
      headers.push(...parsedRow);
      dataStarted = true;
      continue;
    }

    if (dataStarted) {
      if (rowsSkipped < skipRowsAfterHeader) {
        rowsSkipped++;
        continue;
      }
      rows.push(parsedRow);
    }
  }

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

function buildRecord(
  data: Record<string, string | number | null>,
  job: IngestionJob
): Record<string, unknown> {
  const record: Record<string, unknown> = {
    job_id: job.id,
  };

  // Copy all data fields
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) {
      record[key] = value;
    }
  }

  // Store raw account string if COA parsing was used
  if (job.profile_snapshot.coa_enabled && job.profile_snapshot.coa_source_column) {
    record.account_string_raw = data[job.profile_snapshot.coa_source_column];
  }

  return record;
}

async function handleDelete(job: IngestionJob): Promise<void> {
  if (job.import_mode === "append") {
    return; // No delete needed
  }

  if (job.import_mode === "replace_year" && job.replace_target_year) {
    const { error } = await supabaseAdmin
      .from(job.dataset_type)
      .delete()
      .eq("fiscal_year", job.replace_target_year);

    if (error) {
      throw new Error(`Failed to delete existing data: ${error.message}`);
    }
  } else if (job.import_mode === "replace_all") {
    const { error } = await supabaseAdmin
      .from(job.dataset_type)
      .delete()
      .gte("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (error) {
      throw new Error(`Failed to delete existing data: ${error.message}`);
    }
  }
}

async function calculateCoverage(
  datasetType: DatasetType,
  jobId: string
): Promise<Record<string, unknown>> {
  // Only calculate for financial datasets
  if (!["budgets", "actuals", "transactions", "revenues"].includes(datasetType)) {
    return {};
  }

  // Count distinct codes
  const { data: fundCodes } = await supabaseAdmin
    .from(datasetType)
    .select("fund_code")
    .eq("job_id", jobId)
    .not("fund_code", "is", null);

  const { data: deptCodes } = await supabaseAdmin
    .from(datasetType)
    .select("department_code")
    .eq("job_id", jobId)
    .not("department_code", "is", null);

  const uniqueFundCodes = new Set((fundCodes ?? []).map((r: { fund_code: string }) => r.fund_code));
  const uniqueDeptCodes = new Set((deptCodes ?? []).map((r: { department_code: string }) => r.department_code));

  // Check against lookup tables
  const { data: mappedFunds } = await supabaseAdmin
    .from("funds_dim")
    .select("fund_code")
    .in("fund_code", Array.from(uniqueFundCodes));

  const { data: mappedDepts } = await supabaseAdmin
    .from("departments_dim")
    .select("department_code")
    .in("department_code", Array.from(uniqueDeptCodes));

  const mappedFundCodes = new Set((mappedFunds ?? []).map((r: { fund_code: string }) => r.fund_code));
  const mappedDeptCodes = new Set((mappedDepts ?? []).map((r: { department_code: string }) => r.department_code));

  return {
    fund_codes_total: uniqueFundCodes.size,
    fund_codes_mapped: mappedFundCodes.size,
    fund_label_coverage_pct: uniqueFundCodes.size > 0
      ? Math.round((mappedFundCodes.size / uniqueFundCodes.size) * 100)
      : 100,
    department_codes_total: uniqueDeptCodes.size,
    department_codes_mapped: mappedDeptCodes.size,
    department_label_coverage_pct: uniqueDeptCodes.size > 0
      ? Math.round((mappedDeptCodes.size / uniqueDeptCodes.size) * 100)
      : 100,
  };
}

async function recomputeRollups(job: IngestionJob): Promise<void> {
  // Get affected fiscal years
  const { data: years } = await supabaseAdmin
    .from(job.dataset_type)
    .select("fiscal_year")
    .eq("job_id", job.id);

  const uniqueYears = Array.from(
    new Set((years ?? []).map((r: { fiscal_year: number }) => r.fiscal_year))
  ).filter((y) => typeof y === "number");

  // Recompute based on dataset type
  if (job.dataset_type === "budgets" || job.dataset_type === "actuals") {
    for (const fy of uniqueYears) {
      await supabaseAdmin.rpc("refresh_budget_actuals_rollup_for_year", { _fy: fy });
    }
  }

  if (job.dataset_type === "transactions") {
    for (const fy of uniqueYears) {
      await supabaseAdmin.rpc("refresh_transaction_rollups_for_year", { _fy: fy });
    }
  }
}
