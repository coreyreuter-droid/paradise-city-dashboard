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
import { waitUntil } from "@vercel/functions";
import Papa from "papaparse";
import { supabaseAdmin } from "@/lib/supabaseService";
import { normalizeCode, normalizeLabel } from "@/lib/normalizeCode";
import { logAuditEvent } from "@/lib/auditLog";
import {
  DatasetType,
  ColumnMappings,
  COAConfig,
  AllFields,
} from "@/lib/ingestion/types";
import { parseRow, ParseRowOptions } from "@/lib/ingestion/parseRow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for large imports

const BATCH_SIZE = 1000; // Rows to process per batch
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes lock timeout

// ============================================================================
// DATASET TYPE TO TABLE NAME MAPPING
// ============================================================================

/**
 * Maps dataset type to actual database table name
 * Most types map directly, but lookup types map to _dim tables
 */
function getTableName(datasetType: DatasetType): string {
  switch (datasetType) {
    case "funds_lookup":
      return "funds_dim";
    case "departments_lookup":
      return "departments_dim";
    default:
      return datasetType;
  }
}

/**
 * Check if dataset type is a lookup table
 */
function isLookupType(datasetType: DatasetType): boolean {
  return datasetType === "funds_lookup" || datasetType === "departments_lookup";
}

// ============================================================================
// POST - Process pending jobs
// ============================================================================

export async function POST(req: NextRequest) {
  // Verify worker authorization
  const workerSecret = process.env.WORKER_SECRET;
  const providedSecret = req.headers.get("x-worker-secret");
  const cronAuth = req.headers.get("authorization");

  // Allow if: correct worker secret OR correct cron secret (must be defined)
  const isAuthorized =
    (workerSecret && providedSecret === workerSecret) ||
    (process.env.CRON_SECRET && cronAuth === `Bearer ${process.env.CRON_SECRET}`);

  const isLocalDev = process.env.NODE_ENV === "development" && !process.env.VERCEL;
  if (!isAuthorized && !isLocalDev) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Check if specific job requested
    const body = await req.json().catch(() => ({}));
    const specificJobId = body.job_id;

    console.log("[worker] Attempting to claim job:", specificJobId || "any pending");

    // Claim a job (find pending, lock it)
    const job = await claimJob(specificJobId);

    if (!job) {
      console.log("[worker] No pending jobs to process");
      return NextResponse.json({
        ok: true,
        message: "No pending jobs to process",
      });
    }

    console.log(`[worker] Claimed job ${job.id} for ${job.dataset_type}`);

    // Return immediately, process in background
    waitUntil(
      processJobWithErrorHandling(job)
    );

    return NextResponse.json({
      ok: true,
      message: `Job ${job.id} claimed and processing started`,
      job_id: job.id,
    });
  } catch (err) {
    console.error("[worker] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Worker error" },
      { status: 500 }
    );
  }
}

// Wrapper to handle errors in background processing
async function processJobWithErrorHandling(job: IngestionJob): Promise<void> {
  const startTime = Date.now();
  
  try {
    await processJob(job);
    console.log(`[worker] Job ${job.id} completed successfully`);
    
    // Log successful import
    const duration = Date.now() - startTime;
    
    // Get job info for audit log
    const { data: jobData } = await supabaseAdmin
      .from("ingestion_jobs")
      .select("rows_loaded, rows_rejected")
      .eq("id", job.id)
      .single();
    
    await logAuditEvent({
      action: "import.completed",
      target_table: job.dataset_type,
      rows_affected: jobData?.rows_loaded ?? 0,
      status: "SUCCESS",
      meta: {
        job_id: job.id,
        dataset_type: job.dataset_type,
        import_mode: job.import_mode,
        rows_loaded: jobData?.rows_loaded,
        rows_rejected: jobData?.rows_rejected,
        duration_ms: duration,
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`[worker] Job ${job.id} failed:`, err);
    
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
    
    // Log failed import
    await logAuditEvent({
      action: "import.failed",
      target_table: job.dataset_type,
      status: "FAILED",
      error_message: errorMessage,
      meta: {
        job_id: job.id,
        dataset_type: job.dataset_type,
        import_mode: job.import_mode,
      },
    });
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
  const tableName = getTableName(job.dataset_type);
  const isLookup = isLookupType(job.dataset_type);
  
  console.log(`[worker] Processing job ${job.id} - dataset: ${job.dataset_type}, table: ${tableName}`);

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
  console.log(`[worker] Job ${job.id} - file downloaded, parsing CSV`);

  // 2. Parse CSV
  const { headers, rows } = parseCSV(
    content,
    job.profile_snapshot.header_row_index ?? 1,
    job.profile_snapshot.skip_rows_after_header ?? 0
  );

  console.log(`[worker] Job ${job.id} - parsed ${rows.length} rows`);

  // 3. Handle delete for replace modes (only once per job, not for lookups with upsert)
  if (!job.delete_applied && !isLookup) {
    await handleDelete(job, tableName);
    
    // Mark delete as applied
    await supabaseAdmin
      .from("ingestion_jobs")
      .update({ delete_applied: true })
      .eq("id", job.id);
  }

  // For lookup tables with replace_all, delete all before inserting
  if (!job.delete_applied && isLookup && job.import_mode === "replace_all") {
    await supabaseAdmin
      .from(tableName)
      .delete()
      .not("id", "is", null); // Safe way to delete all rows
    
    await supabaseAdmin
      .from("ingestion_jobs")
      .update({ delete_applied: true })
      .eq("id", job.id);
  }

  // 4. Get fiscal config (only needed for non-lookup types)
  let fyStartMonth = 7;
  if (!isLookup) {
    const { data: settings } = await supabaseAdmin
      .from("portal_settings")
      .select("fiscal_year_start_month")
      .eq("id", 1)
      .maybeSingle();

    fyStartMonth = settings?.fiscal_year_start_month ?? 7;
  }

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

  console.log(`[worker] Job ${job.id} - starting from row ${startRow}`);

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
      .map((r, idx) => buildRecord(r.data, job, batchStartRow + idx));

    // Insert or upsert batch
    if (records.length > 0) {
      if (isLookup) {
        // Use upsert for lookup tables (they have unique constraints on codes)
        await upsertLookupRecords(tableName, job.dataset_type, records);
      } else {
        // Regular insert for financial data
        const { error: insertError } = await supabaseAdmin
          .from(tableName)
          .insert(records);

        if (insertError) {
          throw new Error(`Insert error at row ${i}: ${insertError.message}`);
        }
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

    console.log(`[worker] Job ${job.id} - processed ${i + batch.length}/${rows.length} rows`);
  }

  // 7. Calculate coverage (for financial datasets only)
  let coverageSummary: Record<string, unknown> = {};
  if (!isLookup) {
    coverageSummary = await calculateCoverage(job.dataset_type, job.id, tableName);
  }

  // 8. Recompute rollups (for financial datasets only)
  if (!isLookup) {
    await recomputeRollups(job, tableName);
  }

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

  console.log(`[worker] Job ${job.id} completed: ${rowsLoaded} loaded, ${rowsRejected} rejected`);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseCSV(
  content: string,
  headerRowIndex: number,
  skipRowsAfterHeader: number
): { headers: string[]; rows: string[][] } {
  // Use papaparse for robust CSV parsing that handles:
  // - Quoted fields with commas
  // - Quoted fields with embedded newlines
  // - Escaped quotes ("")
  // - Windows/Mac/Unix line endings
  const result = Papa.parse<string[]>(content, {
    skipEmptyLines: true,
    // Don't use header option - we handle it manually to support headerRowIndex
  });

  if (result.errors.length > 0) {
    console.warn("[worker] CSV parse warnings:", result.errors.slice(0, 5));
  }

  const allRows = result.data;
  const headers: string[] = [];
  const rows: string[][] = [];

  let dataStarted = false;
  let rowsSkipped = 0;

  for (let lineIndex = 0; lineIndex < allRows.length; lineIndex++) {
    const row = allRows[lineIndex];
    const rowNumber = lineIndex + 1; // 1-indexed for user-facing row numbers

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
      // Trim each cell value
      rows.push(row.map(cell => cell?.trim() ?? ""));
    }
  }

  return { headers, rows };
}

function buildRecord(
  data: Record<string, string | number | null>,
  job: IngestionJob,
  sourceRowNumber: number
): Record<string, unknown> {
  const record: Record<string, unknown> = {
    job_id: job.id,
    source_row_number: sourceRowNumber,
  };

  // Get valid fields for this dataset type
  const validFields = new Set(AllFields[job.dataset_type] || []);

  // Copy only data fields that are valid for this dataset type
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined && validFields.has(key)) {
      record[key] = value;
    }
  }

  // Store raw account string if COA parsing was used
  if (job.profile_snapshot.coa_enabled && job.profile_snapshot.coa_source_column) {
    record.account_string_raw = data[job.profile_snapshot.coa_source_column];
  }

  return record;
}

/**
 * Upsert records into lookup tables
 * Uses ON CONFLICT to update existing records based on code
 */
async function upsertLookupRecords(
  tableName: string,
  datasetType: DatasetType,
  records: Record<string, unknown>[]
): Promise<void> {
  // Determine the unique key field based on table
  const conflictColumn = datasetType === "funds_lookup" ? "fund_code" : "department_code";
  
  // Supabase upsert with onConflict
  const { error } = await supabaseAdmin
    .from(tableName)
    .upsert(records, {
      onConflict: conflictColumn,
      ignoreDuplicates: false, // Update on conflict
    });

  if (error) {
    throw new Error(`Upsert error: ${error.message}`);
  }
}

async function handleDelete(job: IngestionJob, tableName: string): Promise<void> {
  if (job.import_mode === "append") {
    return; // No delete needed
  }

  if (job.import_mode === "replace_year" && job.replace_target_year) {
    const { error } = await supabaseAdmin
      .from(tableName)
      .delete()
      .eq("fiscal_year", job.replace_target_year);

    if (error) {
      throw new Error(`Failed to delete existing data: ${error.message}`);
    }
  } else if (job.import_mode === "replace_all") {
    const { error } = await supabaseAdmin
      .from(tableName)
      .delete()
      .not("id", "is", null); // Safe way to delete all rows

    if (error) {
      throw new Error(`Failed to delete existing data: ${error.message}`);
    }
  }
}

async function calculateCoverage(
  datasetType: DatasetType,
  jobId: string,
  tableName: string
): Promise<Record<string, unknown>> {
  // Only calculate for financial datasets
  if (!["budgets", "actuals", "transactions", "revenues"].includes(datasetType)) {
    return {};
  }

  // Count distinct codes
  const { data: fundCodes } = await supabaseAdmin
    .from(tableName)
    .select("fund_code")
    .eq("job_id", jobId)
    .not("fund_code", "is", null);

  const { data: deptCodes } = await supabaseAdmin
    .from(tableName)
    .select("department_code")
    .eq("job_id", jobId)
    .not("department_code", "is", null);

  const uniqueFundCodes = new Set((fundCodes ?? []).map((r: { fund_code: string }) => r.fund_code));
  const uniqueDeptCodes = new Set((deptCodes ?? []).map((r: { department_code: string }) => r.department_code));

  // Check against lookup tables (only current/active lookups)
  const { data: mappedFunds } = await supabaseAdmin
    .from("funds_dim")
    .select("fund_code")
    .is("effective_end_fy", null)
    .in("fund_code", Array.from(uniqueFundCodes));

  const { data: mappedDepts } = await supabaseAdmin
    .from("departments_dim")
    .select("department_code")
    .is("effective_end_fy", null)
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

async function recomputeRollups(job: IngestionJob, tableName: string): Promise<void> {
  // For lookup tables, refresh by-year tables AND recompute all data rollups
  if (isLookupType(job.dataset_type)) {
    // Refresh the by-year lookup tables
    await supabaseAdmin.rpc("refresh_funds_by_year");
    await supabaseAdmin.rpc("refresh_departments_by_year");
    
    // Also refresh all data rollups since lookup names may have changed
    // Get all fiscal years that have budget/actuals data
    const { data: budgetYears } = await supabaseAdmin
      .from("budgets")
      .select("fiscal_year");
    const { data: actualsYears } = await supabaseAdmin
      .from("actuals")
      .select("fiscal_year");
    const budgetActualsYears = Array.from(new Set([
      ...((budgetYears ?? []).map((r: { fiscal_year: number }) => r.fiscal_year)),
      ...((actualsYears ?? []).map((r: { fiscal_year: number }) => r.fiscal_year)),
    ])).filter((y) => typeof y === "number");
    
    for (const fy of budgetActualsYears) {
      await supabaseAdmin.rpc("refresh_budget_actuals_rollup_for_year", { _fy: fy });
    }
    
    // Get all fiscal years that have transaction data
    const { data: txnYears } = await supabaseAdmin
      .from("transactions")
      .select("fiscal_year");
    const transactionYears = Array.from(new Set(
      (txnYears ?? []).map((r: { fiscal_year: number }) => r.fiscal_year)
    )).filter((y) => typeof y === "number");
    
    for (const fy of transactionYears) {
      await supabaseAdmin.rpc("refresh_transaction_rollups_for_year", { _fy: fy });
    }
    
    console.log(`[worker] Lookup upload - refreshed rollups for ${budgetActualsYears.length} budget/actuals years, ${transactionYears.length} transaction years`);
    return;
  }

  // Get affected fiscal years
  const { data: years } = await supabaseAdmin
    .from(tableName)
    .select("fiscal_year")
    .eq("job_id", job.id);

  const uniqueYears = Array.from(
    new Set((years ?? []).map((r: { fiscal_year: number }) => r.fiscal_year))
  ).filter((y) => typeof y === "number");

  // Refresh by-year lookup tables for the affected years
  // This ensures lookups resolve correctly for new fiscal years
  if (uniqueYears.length > 0) {
    const minFy = Math.min(...uniqueYears);
    const maxFy = Math.max(...uniqueYears);
    await supabaseAdmin.rpc("refresh_funds_by_year", { p_start_fy: minFy, p_end_fy: maxFy });
    await supabaseAdmin.rpc("refresh_departments_by_year", { p_start_fy: minFy, p_end_fy: maxFy });
  }

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