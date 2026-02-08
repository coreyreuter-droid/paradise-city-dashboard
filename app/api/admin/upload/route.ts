// app/api/admin/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseService";
import { requireAdmin } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";

// Configure for large file uploads
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large uploads
export const fetchCache = "force-no-store";

type Mode = "append" | "replace_year" | "replace_table";

type UploadTable = "budgets" | "actuals" | "transactions" | "revenues";

type UploadPayload = {
  table: UploadTable;
  mode: Mode;
  replaceYear?: number | null;
  records: Record<string, unknown>[];
  filename?: string;
  yearsInData?: number[]; // from client — we'll recompute on server after FY normalization
  totalRowCount?: number; // Total rows across all chunks (for audit log on first chunk)
  skipAuditLog?: boolean; // True for continuation chunks
};

const MAX_RECORDS_PER_UPLOAD = 250_000;
const INSERT_CHUNK_SIZE = 5_000;

type FiscalConfig = {
  startMonth: number; // 1–12
  startDay: number; // 1–31
};

// NOTE: We intentionally do NOT sanitize/encode data at ingestion.
// - React auto-escapes all rendered content, preventing XSS
// - Storing raw data preserves integrity for exports and search
// - HTML encoding at ingestion corrupts data (e.g., "AT&T" becomes "AT&amp;T")

/**
 * Load fiscal-year start config from portal_settings.
 * Fallback is Jan 1 if not configured.
 */
async function getFiscalConfig(): Promise<FiscalConfig> {
  const { data, error } = await supabaseAdmin
    .from("portal_settings")
    .select("fiscal_year_start_month, fiscal_year_start_day")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Admin upload: error loading fiscal config", error);
  }

  const rawMonth = data?.fiscal_year_start_month;
  const rawDay = data?.fiscal_year_start_day;

  const parsedMonth = Number(rawMonth);
  const parsedDay = Number(rawDay);

  const startMonth =
    Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : 1;

  const startDay =
    Number.isFinite(parsedDay) && parsedDay >= 1 && parsedDay <= 31
      ? parsedDay
      : 1;

  return {
    startMonth,
    startDay,
  };
}

/**
 * Auto-populate lookup tables with any new department/fund codes from uploaded data.
 * This ensures the rollup views can resolve names instead of showing "Unknown (code)".
 * 
 * Called automatically during data upload to prevent "Unknown" department/fund names.
 */
async function autoPopulateLookups(
  records: Record<string, unknown>[],
  affectedYears: number[]
): Promise<void> {
  console.log(`Auto-populate: Starting with ${records.length} records, years: ${affectedYears.join(", ")}`);
  
  // Log sample record to debug field names
  if (records.length > 0) {
    const sample = records[0];
    console.log("Auto-populate: Sample record keys:", Object.keys(sample));
    console.log("Auto-populate: Sample record:", JSON.stringify(sample).slice(0, 500));
  }
  
  if (records.length === 0 || affectedYears.length === 0) {
    console.log("Auto-populate: Skipping - no records or years");
    return;
  }

  const minYear = Math.min(...affectedYears);
  console.log(`Auto-populate: Min year = ${minYear}`);

  // Extract unique department and fund entries from the uploaded records
  const departmentMap = new Map<string, string>();
  const fundMap = new Map<string, string>();

  for (const record of records) {
    const deptCode = record.department_code;
    const deptName = record.department_name;
    const fundCode = record.fund_code;
    const fundName = record.fund_name;

    // Collect departments (code -> name mapping)
    if (deptCode && deptCode !== "" && deptName && deptName !== "") {
      const code = String(deptCode).trim();
      const name = String(deptName).trim();
      if (code && name && !departmentMap.has(code)) {
        departmentMap.set(code, name);
      }
    }

    // Collect funds (code -> name mapping)
    if (fundCode && fundCode !== "" && fundName && fundName !== "") {
      const code = String(fundCode).trim();
      const name = String(fundName).trim();
      if (code && name && !fundMap.has(code)) {
        fundMap.set(code, name);
      }
    }
  }

  console.log(`Auto-populate: Found ${departmentMap.size} unique departments, ${fundMap.size} unique funds`);

  // Insert missing departments (ignore conflicts with existing entries)
  if (departmentMap.size > 0) {
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const [code, name] of departmentMap.entries()) {
      const { error } = await supabaseAdmin
        .from("departments_dim")
        .insert({
          department_code: code,
          department_name: name,
          effective_start_fy: minYear,
          effective_end_fy: null,
        });

      if (error) {
        // Ignore unique constraint violations (entry already exists)
        if (error.message.includes("duplicate") || error.message.includes("unique") || error.code === "23505") {
          skippedCount++;
        } else {
          console.error(`Auto-populate ERROR for department ${code}:`, error.message, error.code);
        }
      } else {
        insertedCount++;
      }
    }
    console.log(`Auto-populate departments: ${insertedCount} inserted, ${skippedCount} skipped (already exist)`);
  }

  // Insert missing funds (ignore conflicts with existing entries)
  if (fundMap.size > 0) {
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const [code, name] of fundMap.entries()) {
      const { error } = await supabaseAdmin
        .from("funds_dim")
        .insert({
          fund_code: code,
          fund_name: name,
          effective_start_fy: minYear,
          effective_end_fy: null,
        });

      if (error) {
        // Ignore unique constraint violations (entry already exists)
        if (error.message.includes("duplicate") || error.message.includes("unique") || error.code === "23505") {
          skippedCount++;
        } else {
          console.error(`Auto-populate ERROR for fund ${code}:`, error.message, error.code);
        }
      } else {
        insertedCount++;
      }
    }
    console.log(`Auto-populate funds: ${insertedCount} inserted, ${skippedCount} skipped (already exist)`);
  }

  // Refresh the by-year lookup tables so views can resolve names
  if (departmentMap.size > 0 || fundMap.size > 0) {
    console.log("Auto-populate: Calling refresh_lookup_by_year_tables()...");
    const { error: refreshError } = await supabaseAdmin.rpc("refresh_lookup_by_year_tables");
    if (refreshError) {
      console.error("Auto-populate ERROR: Failed to refresh by-year lookup tables:", refreshError.message, refreshError.code, refreshError.details);
    } else {
      console.log("Auto-populate: Successfully refreshed by-year lookup tables");
    }
  } else {
    console.log("Auto-populate: No new departments or funds to add");
  }
}

/**
 * Compute fiscal year from a date string and a fiscal-year start (month/day).
 * Uses UTC so we don't get burned by timezones.
 *
 * Example for July 1 start:
 * - 2024-06-30 -> FY 2024
 * - 2024-07-01 -> FY 2025
 */
function computeFiscalYearFromDate(
  dateStr: string | null | undefined,
  config: FiscalConfig
): number | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;

  const month = d.getUTCMonth() + 1; // 1–12
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();

  const { startMonth, startDay } = config;

  // If date >= FY start for that year → next fiscal year; else → same year
  const afterStart =
    month > startMonth || (month === startMonth && day >= startDay);

  return afterStart ? year + 1 : year;
}

function computeFiscalPeriodFromDate(
  dateStr: string | null | undefined,
  config: FiscalConfig
): number | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;

  const month = d.getUTCMonth() + 1; // 1–12
  const day = d.getUTCDate();
  const { startMonth, startDay } = config;

  // If FY month boundaries start on startDay, then dates before startDay belong to the prior fiscal month.
  let effectiveMonth = month;
  if (startDay > 1 && day < startDay) {
    effectiveMonth = month - 1;
    if (effectiveMonth === 0) effectiveMonth = 12;
  }

  const fiscalPeriod = ((effectiveMonth - startMonth + 12) % 12) + 1; // 1–12
  return fiscalPeriod;
}

/**
 * Try to derive a date string from a "period" field like "2024-01" or "2024-1".
 * We assume day 1 of that month.
 */
function deriveDateFromPeriod(period: unknown, startDay: number): string | null {
  if (!period || typeof period !== "string") return null;

  const trimmed = period.trim();
  const match = /^(\d{4})[-/](\d{1,2})$/.exec(trimmed);
  if (!match) return null;

  const yearNum = Number(match[1]);
  const monthNum = Number(match[2]);

  if (!Number.isFinite(yearNum) || !Number.isFinite(monthNum)) return null;
  if (monthNum < 1 || monthNum > 12) return null;

  // Clamp startDay to the last day of that month
  const lastDay = new Date(Date.UTC(yearNum, monthNum, 0)).getUTCDate(); // monthNum is 1-based; day=0 => last day prev month
  const day = Math.min(Math.max(1, Number(startDay) || 1), lastDay);

  const mm = String(monthNum).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yearNum}-${mm}-${dd}`;
}

/**
 * Normalize fiscal_year on a single record based on table and fiscal config.
 *
 * Rules:
 * - budgets: trust incoming fiscal_year (budgets are already keyed by FY)
 * - transactions: derive FY from date field using fiscal-year start
 * - actuals/revenues:
 *    - if fiscal_year is numeric, keep as number
 *    - else, if "date" exists, derive from date
 *    - else, if "period" exists, derive from period string
 */
function normalizeFiscalYearForRecord(
  record: Record<string, unknown>,
  table: UploadTable,
  config: FiscalConfig
): Record<string, unknown> {
  const cloned = { ...record };

  // Force numeric fiscal_year if present and numeric
  const rawFy = cloned.fiscal_year;
  if (rawFy != null && rawFy !== "") {
    const n = Number(rawFy);
    if (Number.isFinite(n)) {
      cloned.fiscal_year = n;
    }
  }

  if (table === "budgets") {
    // Budgets are uploaded per fiscal year; we assume the CSV has correct FY.
    return cloned;
  }

  if (table === "transactions") {
    const dateValue = typeof cloned.date === "string" ? cloned.date : null;
    const fyFromDate = computeFiscalYearFromDate(dateValue, config);
    const fpFromDate = computeFiscalPeriodFromDate(dateValue, config);

    if (fyFromDate != null) cloned.fiscal_year = fyFromDate;
    if (fpFromDate != null) cloned.fiscal_period = fpFromDate;

    return cloned;
  }


  if (table === "actuals" || table === "revenues") {
        // Normalize period to YYYY-MM (accept YYYY-M too)
    if (typeof cloned.period === "string") {
      const m = /^(\d{4})[-/](\d{1,2})$/.exec(cloned.period.trim());
      if (m) {
        const yyyy = m[1];
        const mm = String(Number(m[2])).padStart(2, "0");
        cloned.period = `${yyyy}-${mm}`;
      }
    }

    // Prefer deriving from an actual date if present; otherwise derive from period (month) using startDay.
    const candidateDate =
      typeof cloned.date === "string" && cloned.date.trim().length > 0
        ? cloned.date
        : deriveDateFromPeriod(cloned.period, config.startDay);

    if (candidateDate) {
      const fy = computeFiscalYearFromDate(candidateDate, config);
      const fp = computeFiscalPeriodFromDate(candidateDate, config);

      if (fy != null) cloned.fiscal_year = fy;
      if (fp != null) cloned.fiscal_period = fp;

      return cloned;
    }

    // If we cannot derive, fall back to whatever is provided (but coerce to numbers if possible).
    if (cloned.fiscal_year != null && cloned.fiscal_year !== "") {
      const n = Number(cloned.fiscal_year);
      if (Number.isFinite(n)) cloned.fiscal_year = n;
    }

    if (cloned.fiscal_period != null && cloned.fiscal_period !== "") {
      const p = Number(cloned.fiscal_period);
      if (Number.isFinite(p)) cloned.fiscal_period = p;
    }

    return cloned;
  }


  return cloned;
}

/**
 * Recompute transaction summaries for all fiscal years touched by an upload.
 * This keeps transaction_year_vendor and transaction_year_fund_department accurate.
 *
 * This is intentionally strict: if recompute fails, we return 500 because the
 * UI would otherwise show stale/incorrect data.
 */
async function recomputeTransactionSummaries(years: number[]) {
  const uniqueYears = Array.from(new Set(years))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a);

  for (const year of uniqueYears) {
    const { error } = await supabaseAdmin.rpc(
      "recompute_transaction_summaries_for_year",
      { p_year: year }
    );

    if (error) {
      console.error("Failed recomputing transaction summaries", {
        year,
        error,
      });
      throw new Error(
        `Uploaded transactions successfully, but failed to recompute summaries for fiscal year ${year}.`
      );
    }
  }
}

/**
 * Recompute budget/actuals summaries for all fiscal years touched by an upload.
 * Keeps budget_actuals_year_fund_department accurate.
 */
async function recomputeBudgetActualsSummaries(years: number[]) {
  const uniqueYears = Array.from(new Set(years))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a);

  for (const year of uniqueYears) {
    const { error } = await supabaseAdmin.rpc(
      "recompute_budget_actuals_summaries_for_year",
      { p_year: year }
    );

    if (error) {
      console.error("Failed recomputing budget/actuals summaries", {
        year,
        error,
      });
      throw new Error(
        `Uploaded data successfully, but failed to recompute budget/actuals summaries for fiscal year ${year}.`
      );
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // 0) Verify CSRF token
    const csrfError = await requireCsrf(req);
    if (csrfError) return csrfError;

    // 1) Authenticate and verify admin role
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;
    const { user } = auth.data;

    // 2) Validate payload

    const body = (await req.json()) as UploadPayload;

    const allowedTables: UploadTable[] = [
      "budgets",
      "actuals",
      "transactions",
      "revenues",
    ];

    if (!body.table || !allowedTables.includes(body.table)) {
      return NextResponse.json(
        { error: "Invalid or missing table name" },
        { status: 400 }
      );
    }

    if (
      !body.mode ||
      !["append", "replace_year", "replace_table"].includes(body.mode)
    ) {
      return NextResponse.json(
        { error: "Invalid upload mode" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.records) || body.records.length === 0) {
      return NextResponse.json(
        { error: "No records provided for upload" },
        { status: 400 }
      );
    }

    if (body.records.length > MAX_RECORDS_PER_UPLOAD) {
      return NextResponse.json(
        {
          error: `Upload too large. This tool currently supports up to ${MAX_RECORDS_PER_UPLOAD.toLocaleString()} rows per upload. Please split your file and try again.`,
        },
        { status: 400 }
      );
    }

    const table: UploadTable = body.table;
    const mode: Mode = body.mode;
    const replaceYear =
      typeof body.replaceYear === "number" ? body.replaceYear : null;

    // 4) Load fiscal-year config and normalize fiscal_year on records
    const fiscalConfig = await getFiscalConfig();

    // Normalize fiscal year on records (no sanitization - React handles XSS on render)
    const normalizedRecords = body.records.map((rec) => {
      return normalizeFiscalYearForRecord(rec, table, fiscalConfig);
    });

    // Compute years present in data *after* FY normalization
    const yearsInData = Array.from(
      new Set(
        normalizedRecords
          .map((r) => Number(r.fiscal_year))
          .filter((y) => Number.isFinite(y))
      )
    );

    // Extra safety: enforce single-year behavior for replace_year
    if (mode === "replace_year") {
      if (!replaceYear) {
        return NextResponse.json(
          { error: "replaceYear is required for replace_year mode" },
          { status: 400 }
        );
      }

      if (yearsInData.length === 0) {
        return NextResponse.json(
          {
            error:
              "No fiscal years were detected in the uploaded data after normalization. For replace_year mode, rows must resolve to a single fiscal_year.",
          },
          { status: 400 }
        );
      }

      if (yearsInData.length > 1) {
        return NextResponse.json(
          {
            error: `Multiple fiscal years detected in uploaded data after normalization (${yearsInData.join(
              ", "
            )}). For replace_year mode, the file must resolve to a single fiscal year.`,
          },
          { status: 400 }
        );
      }

      const fileYear = yearsInData[0];

      if (fileYear !== replaceYear) {
        return NextResponse.json(
          {
            error: `Fiscal year mismatch. You requested replace_year for FY ${replaceYear}, but the uploaded data resolves to FY ${fileYear}.`,
          },
          { status: 400 }
        );
      }
    }

    // 5) Perform delete (if needed) using service-role client (bypasses RLS)
    if (mode === "replace_year") {
      const { error: deleteError } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("fiscal_year", replaceYear);

      if (deleteError) {
        console.error("Admin upload delete (year) error:", deleteError);
        return NextResponse.json(
          { error: "Failed to clear existing data for that fiscal year" },
          { status: 500 }
        );
      }
    } else if (mode === "replace_table") {
      const { error: deleteError } = await supabaseAdmin
        .from(table)
        .delete()
        .gte("fiscal_year", 0);

      if (deleteError) {
        console.error("Admin upload delete (table) error:", deleteError);
        return NextResponse.json(
          { error: "Failed to clear existing data for this table" },
          { status: 500 }
        );
      }
    }

// 5b) IMPORTANT: keep derived summary tables consistent.
// If you "replace_table" (wipe and re-upload), years that are no longer present MUST be removed
// from summary tables too — otherwise you get "ghost years" in dropdowns and charts.
// We treat summary deletes as non-fatal if the target is a VIEW, since views update automatically.
const safeDeleteSummary = async (
  summaryTable: string,
  applyFilter: (q: ReturnType<ReturnType<typeof supabaseAdmin.from>["delete"]>) => ReturnType<ReturnType<typeof supabaseAdmin.from>["delete"]>
) => {
  const { error } = await applyFilter(
    supabaseAdmin.from(summaryTable).delete()
  );
  if (error) {
    console.warn(
      `Non-fatal: could not delete summary rows from ${summaryTable}: ${error.message}`
    );
  }
};

// Transactions summaries
if (table === "transactions") {
  if (mode === "replace_table") {
    await safeDeleteSummary("transaction_year_fund_department", (q) =>
      q.gte("fiscal_year", 0)
    );
    await safeDeleteSummary("transaction_year_vendor", (q) =>
      q.gte("fiscal_year", 0)
    );
  } else if (mode === "replace_year" && replaceYear) {
    await safeDeleteSummary("transaction_year_fund_department", (q) =>
      q.eq("fiscal_year", replaceYear)
    );
    await safeDeleteSummary("transaction_year_vendor", (q) =>
      q.eq("fiscal_year", replaceYear)
    );
  }
}

// Budget/Actuals combined summaries
if (table === "budgets" || table === "actuals") {
  if (mode === "replace_table") {
    await safeDeleteSummary("budget_actuals_year_totals", (q) =>
      q.gte("fiscal_year", 0)
    );
    await safeDeleteSummary("budget_actuals_year_fund_department", (q) =>
      q.gte("fiscal_year", 0)
    );
  } else if (mode === "replace_year" && replaceYear) {
    await safeDeleteSummary("budget_actuals_year_totals", (q) =>
      q.eq("fiscal_year", replaceYear)
    );
    await safeDeleteSummary("budget_actuals_year_fund_department", (q) =>
      q.eq("fiscal_year", replaceYear)
    );
  }
}

// Revenue summaries (if materialized as a table; if it's a view, delete is ignored)
if (table === "revenues") {
  if (mode === "replace_table") {
    await safeDeleteSummary("revenue_year_totals", (q) => q.gte("fiscal_year", 0));
  } else if (mode === "replace_year" && replaceYear) {
    await safeDeleteSummary("revenue_year_totals", (q) => q.eq("fiscal_year", replaceYear));
  }
}

    // 6) Insert new records in chunks using service role
    const totalRecords = normalizedRecords.length;
    let insertedCount = 0;

    for (let i = 0; i < totalRecords; i += INSERT_CHUNK_SIZE) {
      const chunk = normalizedRecords.slice(i, i + INSERT_CHUNK_SIZE);

      const { error: chunkError } = await supabaseAdmin.from(table).insert(chunk);

      if (chunkError) {
        console.error(
          `Admin upload insert error on chunk starting at index ${i}:`,
          chunkError
        );

        return NextResponse.json(
          {
            error:
              "Failed to insert uploaded data. Some rows may have been written before this error.",
            details: {
              attemptedRows: totalRecords,
              successfullyInsertedRows: insertedCount,
              failedAtIndex: i,
            },
          },
          { status: 500 }
        );
      }

      insertedCount += chunk.length;
    }

    // 7) Audit log (only on first chunk, use totalRowCount if provided)
    if (body.skipAuditLog !== true) {
      const fiscalYearForAudit =
        mode === "replace_year"
          ? replaceYear
          : yearsInData.length === 1
          ? yearsInData[0]
          : null;

      const adminIdentifier = user.email ?? user.id;

      const { error: auditError } = await supabaseAdmin.from("data_uploads").insert({
        table_name: table,
        mode,
        row_count: body.totalRowCount ?? insertedCount,
        fiscal_year: fiscalYearForAudit,
        filename: body.filename ?? null,
        admin_identifier: adminIdentifier,
      });

      if (auditError) {
        console.error("Admin upload audit log error:", auditError);
        // non-fatal
      }
    }

    // 8) Recompute summaries if transactions were uploaded
    if (table === "transactions") {
      if (yearsInData.length === 0) {
        // If we inserted transactions but couldn't derive FYs, that's a data integrity problem.
        return NextResponse.json(
          {
            error:
              "Transactions upload succeeded, but no fiscal years were detected after normalization. Cannot recompute summaries.",
          },
          { status: 500 }
        );
      }

      await recomputeTransactionSummaries(yearsInData);
    }

    
    // 9) Recompute budget/actual summaries if budgets or actuals were uploaded
    if (table === "budgets" || table === "actuals") {
      if (yearsInData.length === 0) {
        return NextResponse.json(
          {
            error:
              "Upload succeeded, but no fiscal years were detected after normalization. Cannot recompute budget/actuals summaries.",
          },
          { status: 500 }
        );
      }

            // For replace_table, budgets/actuals rollups must be recomputed for ALL years present in either table.
      let yearsToRecompute = yearsInData;
      if (mode === "replace_table") {
        const otherTable = table === "budgets" ? "actuals" : "budgets";
        const { data: otherData, error: otherErr } = await supabaseAdmin
          .from(otherTable)
          .select("fiscal_year");
        if (otherErr) {
          console.warn(
            `Non-fatal: could not fetch fiscal years from ${otherTable} while recomputing budget/actuals summaries: ${otherErr.message}`
          );
        } else {
          const otherYears = (otherData ?? [])
            .map((r: { fiscal_year?: unknown }) => Number(r?.fiscal_year))
            .filter((y: number) => Number.isFinite(y));
          yearsToRecompute = Array.from(
            new Set([...(yearsInData ?? []), ...otherYears])
          );
        }
      }

      await recomputeBudgetActualsSummaries(yearsToRecompute);

    }


    let action: string;
    if (mode === "append") {
      action = "appended";
    } else if (mode === "replace_year") {
      action = `replaced fiscal year ${replaceYear}`;
    } else {
      action = "replaced all rows in";
    }

    const summaryMsg =
      table === "transactions"
        ? ` Summaries recomputed for FY ${yearsInData
            .slice()
            .sort((a, b) => b - a)
            .join(", ")}.`
        : "";

    // Refresh rollups for affected fiscal years so citizen portal updates immediately.
    // This MUST be non-fatal. Recompute RPCs already guarantee correctness.
    const affectedYears = (yearsInData ?? []).filter((y) => Number.isFinite(y));

    // Auto-populate lookup tables with any new department/fund codes from uploaded data.
    // This must happen BEFORE rollup refresh so views can resolve names correctly.
    if (affectedYears.length > 0) {
      await autoPopulateLookups(normalizedRecords, affectedYears);
    }

    if ((table === "budgets" || table === "actuals") && affectedYears.length > 0) {
      for (const fy of affectedYears) {
        const { error: e } = await supabaseAdmin.rpc(
          "refresh_budget_actuals_rollup_for_year",
          { _fy: fy }
        );
        if (e) {
          console.warn(
            `Non-fatal: Failed to refresh budget/actual rollups for FY${fy}: ${e.message}`
          );
        }
      }
    }

    if (table === "transactions" && affectedYears.length > 0) {
      for (const fy of affectedYears) {
        const { error: e } = await supabaseAdmin.rpc(
          "refresh_transaction_rollups_for_year",
          { _fy: fy }
        );
        if (e) {
          console.warn(
            `Non-fatal: Failed to refresh transaction rollups for FY${fy}: ${e.message}`
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Successfully ${action} "${table}" with ${insertedCount} record(s).${summaryMsg}`,
    });
  } catch (err: unknown) {
    console.error("Admin upload route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}