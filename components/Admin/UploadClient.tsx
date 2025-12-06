// components/Admin/UploadClient.tsx
"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { cityHref } from "@/lib/cityRouting";

const TABLE_SCHEMAS: Record<
  string,
  { required: string[]; numeric: string[] }
> = {
  budgets: {
    required: [
      "fiscal_year",
      "fund_code",
      "fund_name",
      "department_code",
      "department_name",
      "category",
      "account_code",
      "account_name",
      "amount",
    ],
    numeric: ["fiscal_year", "amount"],
  },
  actuals: {
    required: [
      "fiscal_year",
      "period",
      "fund_code",
      "fund_name",
      "department_code",
      "department_name",
      "category",
      "account_code",
      "account_name",
      "amount",
    ],
    numeric: ["fiscal_year", "amount"],
  },
  transactions: {
    required: [
      "date",
      "fiscal_year",
      "fund_code",
      "fund_name",
      "department_code",
      "department_name",
      "account_code",
      "account_name",
      "vendor",
      "description",
      "amount",
    ],
    numeric: ["fiscal_year", "amount"],
  },
  revenues: {
    required: [
      "fiscal_year",
      "period",
      "fund_code",
      "fund_name",
      "department_code",
      "department_name",
      "category",
      "account_code",
      "account_name",
      "amount",
    ],
    numeric: ["fiscal_year", "amount"],
  },
};

type ValidationIssue = {
  row: number | null;
  field: string | null;
  message: string;
};

const BAD_DEPT_VALUES = new Set(["", "na", "n/a", "null", "none"]);

function isReasonableYear(n: unknown): boolean {
  if (typeof n !== "number" || !Number.isInteger(n)) return false;
  return n >= 2000 && n <= 2100;
}

// Strict ISO date: YYYY-MM-DD, no auto-correction
function isValidISODate(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;

  const [yearStr, monthStr, dayStr] = trimmed.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const dt = new Date(trimmed + "T00:00:00Z");
  if (Number.isNaN(dt.getTime())) return false;

  // Ensure it didn't auto-correct (e.g. 2024-02-31 -> 2024-03-02)
  const iso = dt.toISOString().slice(0, 10);
  return iso === trimmed;
}

function getUniqueFiscalYearsFromRows(rows: any[]): number[] {
  const years = new Set<number>();

  for (const row of rows) {
    const raw = row?.fiscal_year;
    if (raw === undefined || raw === null) continue;

    const n = Number(raw);
    if (Number.isFinite(n)) {
      years.add(n);
    }
  }

  return Array.from(years).sort((a, b) => a - b);
}

// period: YYYY-PP where PP is 01–12
function isValidPeriod(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) return false;

  const [yearStr, periodStr] = trimmed.split("-");
  const year = Number(yearStr);
  const period = Number(periodStr);

  if (!Number.isInteger(year) || !Number.isInteger(period)) return false;
  if (!isReasonableYear(year)) return false;
  if (period < 1 || period > 12) return false;

  return true;
}

function isBadDeptName(value: unknown): boolean {
  if (typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return BAD_DEPT_VALUES.has(normalized);
}

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeHeader(header: string): string {
  return header.trim();
}

function validateAndBuildRecords(
  table: string,
  schema: { required: string[]; numeric: string[] },
  headers: string[],
  dataRows: string[][]
): {
  records: Record<string, any>[];
  yearsInData: number[];
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];

  // 1) Header checks: duplicates + missing required + unexpected
  const headerCounts = new Map<string, number>();
  headers.forEach((h) => {
    const key = h.trim();
    headerCounts.set(key, (headerCounts.get(key) ?? 0) + 1);
  });

  for (const [h, count] of headerCounts.entries()) {
    if (count > 1) {
      issues.push({
        row: null,
        field: h,
        message: `Duplicate column header "${h}" appears ${count} times. Column names must be unique.`,
      });
    }
  }

  const missingRequired = schema.required.filter(
    (col) => !headers.includes(col)
  );
  if (missingRequired.length > 0) {
    issues.push({
      row: null,
      field: null,
      message: `Missing required column(s): ${missingRequired.join(
        ", "
      )}. Please add these columns to your CSV.`,
    });
  }

  // Validate no unexpected non-empty header names
  headers.forEach((h) => {
    const normalized = h.trim();
    if (!normalized) return; // allow blank trailing columns
    if (
      !schema.required.includes(normalized) &&
      !schema.numeric.includes(normalized)
    ) {
      // We allow extra columns; we just note they will be ignored
      issues.push({
        row: null,
        field: normalized,
        message: `Extra column "${normalized}" will be ignored during upload.`,
      });
    }
  });

  const records: Record<string, any>[] = [];
  const yearSet = new Set<number>();

  dataRows.forEach((row, idx) => {
    const rowNum = idx + 2; // account for header row
    const rec: Record<string, any> = {};

    headers.forEach((rawHeader, colIndex) => {
      const header = normalizeHeader(rawHeader);
      const value = row[colIndex] ?? "";
      rec[header] = value;
    });

    // Numeric conversions
    for (const numericCol of schema.numeric) {
      const raw = rec[numericCol];
      if (raw === undefined || raw === null || raw === "") {
        issues.push({
          row: rowNum,
          field: numericCol,
          message: `Numeric column "${numericCol}" is empty.`,
        });
        continue;
      }
      const parsed = parseNumber(String(raw));
      if (parsed === null) {
        issues.push({
          row: rowNum,
          field: numericCol,
          message: `Value "${raw}" in column "${numericCol}" is not a valid number.`,
        });
      } else {
        rec[numericCol] = parsed;
      }
    }

    // Type-specific validations
    const fy = rec["fiscal_year"];

    if (table === "transactions") {
      // date
      if (!isValidISODate(rec["date"])) {
        issues.push({
          row: rowNum,
          field: "date",
          message:
            'Invalid date format. Expected strict "YYYY-MM-DD" (e.g. "2024-07-01").',
        });
      }

      // description
      if (isBadDeptName(rec["description"])) {
        issues.push({
          row: rowNum,
          field: "description",
          message:
            "description is required and cannot be blank or 'NA'.",
        });
      }

      // fiscal_year sanity
      if (!isReasonableYear(fy)) {
        issues.push({
          row: rowNum,
          field: "fiscal_year",
          message: `Invalid fiscal_year "${fy}". Expected a 4-digit year between 2000 and 2100.`,
        });
      } else {
        yearSet.add(fy as number);
      }
    } else if (
      table === "budgets" ||
      table === "actuals" ||
      table === "revenues"
    ) {
      // department_name
      if (isBadDeptName(rec["department_name"])) {
        issues.push({
          row: rowNum,
          field: "department_name",
          message:
            "department_name is required and cannot be blank or 'NA'.",
        });
      }

      // fiscal_year sanity
      if (!isReasonableYear(fy)) {
        issues.push({
          row: rowNum,
          field: "fiscal_year",
          message: `Invalid fiscal_year "${fy}". Expected a 4-digit year between 2000 and 2100.`,
        });
      } else {
        yearSet.add(fy as number);
      }
    }

    // amount non-negative
    if (rec["amount"] !== undefined) {
      const amt = rec["amount"];
      if (typeof amt !== "number" || !Number.isFinite(amt)) {
        issues.push({
          row: rowNum,
          field: "amount",
          message: `Invalid amount "${amt}".`,
        });
      } else if (amt < 0) {
        issues.push({
          row: rowNum,
          field: "amount",
          message: `Negative amount "${amt}" is not allowed for ${table}.`,
        });
      }
    }

    // period format for actuals and revenues
    if (table === "actuals" || table === "revenues") {
      if (!isValidPeriod(rec["period"])) {
        issues.push({
          row: rowNum,
          field: "period",
          message:
            'Invalid period value. Expected format "YYYY-PP" where PP is 01–12 (e.g. "2024-01").',
        });
      }
    }

    records.push(rec);
  });

  return {
    records,
    yearsInData: Array.from(yearSet).sort((a, b) => a - b),
    issues,
  };
}

type Mode = "append" | "replace_year" | "replace_table";

type PreflightSummary = {
  table: string;
  rowCount: number;
  yearsInData: number[];
  mode: Mode;
  replaceYear: number | null;
};

export default function UploadClient() {
  // --- Upload state ---
  const [file, setFile] = useState<File | null>(null);
  const [table, setTable] = useState<string>("budgets");
  const [mode, setMode] = useState<Mode>("append");
  const [replaceYear, setReplaceYear] = useState<string>("");
  const [replaceYearConfirm, setReplaceYearConfirm] = useState<string>("");
  const [replaceTableConfirmed, setReplaceTableConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  const [preflight, setPreflight] = useState<PreflightSummary | null>(null);
  const [pendingRecords, setPendingRecords] = useState<
    Record<string, any>[] | null
  >(null);
  const [pendingYearsInData, setPendingYearsInData] = useState<number[]>([]);

  // --- CSV preview state ---
  const [previewHeaders, setPreviewHeaders] = useState<string[] | null>(
    null
  );
  const [previewRows, setPreviewRows] = useState<string[][] | null>(
    null
  );
  const [previewMessage, setPreviewMessage] = useState<string | null>(
    null
  );

  function setError(msg: string) {
    setMessage(msg);
    setMessageIsError(true);
  }

  function setInfo(msg: string) {
    setMessage(msg);
    setMessageIsError(false);
  }

  async function handlePrepareUpload() {
    if (!file) {
      setError("Please select a CSV file before uploading.");
      return;
    }

    const schema = TABLE_SCHEMAS[table];
    if (!schema) {
      setError(`No schema defined for table "${table}".`);
      return;
    }

    // Mode-level guards
    if (mode === "replace_year") {
      if (!replaceYear.trim()) {
        setError("Please enter a fiscal year to replace.");
        return;
      }
      if (replaceYearConfirm.trim() !== replaceYear.trim()) {
        setError(
          `To confirm replacing that year, type ${replaceYear.trim()} in the confirmation box.`
        );
        return;
      }
    }

    if (mode === "replace_table" && !replaceTableConfirmed) {
      setError(
        "You must confirm that you understand this will DELETE ALL EXISTING DATA in this table before continuing."
      );
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const text = await file.text();

      // Basic CSV parsing (no quoted commas handling yet)
      const rows = text
        .trim()
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => line.split(","));

      if (rows.length < 2) {
        setError("CSV appears to be empty or missing data rows.");
        setLoading(false);
        return;
      }

      const headers = rows[0].map((h) => h.trim());
      const dataRows = rows.slice(1);

      // Validation + record building
      const { records, yearsInData, issues } = validateAndBuildRecords(
        table,
        schema,
        headers,
        dataRows
      );

      if (issues.length > 0) {
        const sample = issues.slice(0, 8);
        const formatted = sample.map((issue) => {
          const rowPart = issue.row !== null ? `Row ${issue.row}: ` : "";
          const fieldPart = issue.field ? `[${issue.field}] ` : "";
          return `${rowPart}${fieldPart}${issue.message}`;
        });
        const extra =
          issues.length > sample.length
            ? `\n...and ${issues.length - sample.length} more issue(s).`
            : "";

        setError(
          `CSV validation failed. Fix these issues and try again:\n\n${formatted.join(
            "\n"
          )}${extra}`
        );
        setLoading(false);
        return;
      }

      // Compute targetYear for replace_year mode; server will enforce
      let targetYear: number | null = null;
      if (mode === "replace_year") {
        targetYear = Number(replaceYear);
        if (!Number.isFinite(targetYear)) {
          setError("Fiscal year must be a valid number.");
          setLoading(false);
          return;
        }

        if (yearsInData.length === 0) {
          setError(
            "CSV contains no fiscal_year values; cannot perform year-specific replace."
          );
          setLoading(false);
          return;
        }

        const otherYears = yearsInData.filter((y) => y !== targetYear);
        if (otherYears.length > 0) {
          setError(
            `CSV contains multiple fiscal years (${yearsInData.join(
              ", "
            )}). For 'Replace this fiscal year only', upload a file that only contains fiscal_year = ${targetYear}.`
          );
          setLoading(false);
          return;
        }
      }

      // Build preflight summary and wait for user confirmation before uploading
      setPreflight({
        table,
        rowCount: records.length,
        yearsInData,
        mode,
        replaceYear: targetYear,
      });
      setPendingRecords(records);
      setPendingYearsInData(yearsInData);
      setInfo(
        "Review the upload summary below, then confirm to start the upload."
      );
    } catch (err: any) {
      console.error(err);
      setError("Failed to process CSV: " + (err?.message || "Unknown error"));
    }

    setLoading(false);
  }

  async function handleConfirmUpload() {
    if (!preflight || !pendingRecords || pendingRecords.length === 0) {
      setError(
        "No upload is prepared. Choose a file, generate the summary, and try again."
      );
      return;
    }

    if (!file) {
      setError(
        "The selected file is no longer available. Please choose the CSV again."
      );
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Use Supabase session token + server API (service role)
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        console.error("UploadClient: no valid session", sessionError);
        setError(
          "You must be signed in as an admin to upload data. Please log in again."
        );
        setLoading(false);
        return;
      }

      const resp = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          table: preflight.table,
          mode: preflight.mode,
          replaceYear: preflight.replaceYear,
          records: pendingRecords,
          filename: file.name,
          yearsInData: pendingYearsInData,
        }),
      });

      const result = await resp.json();

      if (!resp.ok) {
        console.error("Upload API error:", resp.status, result);
        setError(
          result?.error ||
            "Upload failed on the server. Please try again or contact support."
        );
        setLoading(false);
        return;
      }

      setInfo(result?.message || "Upload completed successfully.");
      // Reset confirmation-related state
      setPreflight(null);
      setPendingRecords(null);
      setPendingYearsInData([]);
      setReplaceTableConfirmed(false);
      setReplaceYear("");
      setReplaceYearConfirm("");
    } catch (err: any) {
      console.error(err);
      setError("Upload failed: " + (err?.message || "Unknown error"));
    }

    setLoading(false);
  }

  function handleDownloadTemplate() {
    const csv = buildTemplateCsv(table);
    if (!csv) {
      setError(`No template available for table "${table}".`);
      return;
    }

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${table}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const requiredCols = TABLE_SCHEMAS[table]?.required ?? [];

  // Compute preview-time missing required columns (based on selected table)
  const previewMissingRequired =
    previewHeaders && TABLE_SCHEMAS[table]
      ? TABLE_SCHEMAS[table].required.filter(
          (col) => !previewHeaders.includes(col)
        )
      : [];

  return (
    <div className="max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Upload data
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Upload CSV files for budgets, actuals, transactions, or
            revenues. Use the template to ensure columns match exactly.
          </p>
        </div>
        <a
          href={cityHref("/admin/upload/history")}
          className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
        >
          View upload history
        </a>
      </div>

      {/* Table selector */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Target table
        </label>
        <select
          value={table}
          onChange={(e) => setTable(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="budgets">budgets</option>
          <option value="actuals">actuals</option>
          <option value="transactions">transactions</option>
          <option value="revenues">revenues</option>
        </select>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Make sure your CSV columns match the template for this table.
          </p>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Download template
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Upload mode
        </label>
        <div className="flex flex-col gap-1 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              value="append"
              checked={mode === "append"}
              onChange={() => setMode("append")}
            />
            <span>
              <span className="font-medium">Append</span>{" "}
              <span className="text-slate-600">
                – Add new rows. Existing data is not changed.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              value="replace_year"
              checked={mode === "replace_year"}
              onChange={() => setMode("replace_year")}
            />
            <span>
              <span className="font-medium">Replace this fiscal year only</span>{" "}
              <span className="text-slate-600">
                – Delete existing rows for a single fiscal year, then insert
                rows from this file.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              value="replace_table"
              checked={mode === "replace_table"}
              onChange={() => setMode("replace_table")}
            />
            <span>
              <span className="font-medium">Replace entire table</span>{" "}
              <span className="text-slate-600">
                – Delete ALL existing rows in this table, then insert rows from
                this file.
              </span>
            </span>
          </label>
        </div>

        {mode === "replace_year" && (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold">Replace this fiscal year only</p>
            <p className="mt-1">
              All existing rows for a single fiscal year will be deleted before
              inserting rows from this file.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <label htmlFor="replaceYear" className="text-xs font-medium">
                  Fiscal year to replace
                </label>
                <input
                  id="replaceYear"
                  type="text"
                  inputMode="numeric"
                  value={replaceYear}
                  onChange={(e) => setReplaceYear(e.target.value)}
                  className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs"
                  aria-describedby="replace-year-help"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label
                  htmlFor="replaceYearConfirm"
                  className="text-xs font-medium"
                >
                  Confirm fiscal year
                </label>
                <input
                  id="replaceYearConfirm"
                  type="text"
                  value={replaceYearConfirm}
                  onChange={(e) => setReplaceYearConfirm(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                  placeholder="Type the same fiscal year again to confirm"
                />
              </div>
            </div>
            <p id="replace-year-help" className="mt-1 text-xs">
              Example: if you enter <span className="font-mono">2024</span>,
              all existing rows with{" "}
              <span className="font-mono">fiscal_year = 2024</span> will be
              deleted first.
            </p>
          </div>
        )}

        {mode === "replace_table" && (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-900">
            <p className="font-semibold">Danger: replace entire table</p>
            <p className="mt-1">
              This will permanently delete all existing rows in the{" "}
              <span className="font-mono">{table}</span> table before inserting
              rows from this file.
            </p>
            <label className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={replaceTableConfirmed}
                onChange={(e) => setReplaceTableConfirmed(e.target.checked)}
              />
              <span>
                I understand this will delete all existing data in the{" "}
                <span className="font-mono">{table}</span> table.
              </span>
            </label>
          </div>
        )}
      </div>

      {/* File picker + preview */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          CSV file
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm hover:border-slate-400">
          <div className="flex flex-col">
            <span className="font-medium text-slate-800">
              {file ? file.name : "Click to choose a CSV file"}
            </span>
            <span className="text-xs text-slate-500">
              Accepted format: .csv
            </span>
          </div>
          <span className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
            Browse
          </span>
          <input
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setPreviewHeaders(null);
              setPreviewRows(null);
              setPreviewMessage(null);
              setPreflight(null);
              setPendingRecords(null);
              setPendingYearsInData([]);

              if (!f) return;

              try {
                const text = await f.text();
                const lines = text
                  .trim()
                  .split("\n")
                  .filter((line) => line.length > 0);

                if (lines.length === 0) {
                  setPreviewMessage("File appears to be empty.");
                  return;
                }

                const rows = lines.map((line) => line.split(","));
                const headers = rows[0].map((h) => h.trim());
                const dataRows = rows.slice(1, 21); // preview first 20 rows

                setPreviewHeaders(headers);
                setPreviewRows(dataRows);

                const totalDataRows = rows.length - 1;
                if (totalDataRows > dataRows.length) {
                  setPreviewMessage(
                    `Showing first ${dataRows.length} of ${totalDataRows} row(s).`
                  );
                } else {
                  setPreviewMessage(
                    `${totalDataRows} row(s) detected in this file.`
                  );
                }
              } catch (err) {
                console.error("Preview parse error:", err);
                setPreviewMessage(
                  "Could not read file for preview. You can still attempt upload."
                );
              }
            }}
          />
        </label>
      </div>

      {/* Preview warnings */}
      {previewHeaders && (
        <div className="mb-2 text-xs">
          {previewMissingRequired.length > 0 ? (
            <p className="text-red-700">
              Preview warning: CSV is missing required column(s) for {table}:{" "}
              {previewMissingRequired.join(", ")}.
            </p>
          ) : (
            <p className="text-emerald-700">
              Preview: All required columns for {table} are present.
            </p>
          )}
        </div>
      )}

      {/* CSV preview table */}
      {previewHeaders && previewRows && previewRows.length > 0 && (
        <div className="mb-4 max-h-72 overflow-auto rounded-md border border-slate-200 bg-slate-50">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-100">
              <tr>
                {previewHeaders.map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-2 py-1 text-left font-semibold text-slate-700"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, idx) => (
                <tr key={idx} className="border-t border-slate-200">
                  {row.map((cell, cellIdx) => (
                    <td
                      key={cellIdx}
                      className="whitespace-nowrap px-2 py-1 text-slate-800"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {previewMessage && (
        <p className="mb-4 text-xs text-slate-500">{previewMessage}</p>
      )}

      {preflight && (
        <section
          aria-label="Upload summary"
          className="mb-4 mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"
        >
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            Upload summary
          </h2>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Target table
              </dt>
              <dd className="text-sm">{preflight.table}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Rows to upload
              </dt>
              <dd className="text-sm">
                {preflight.rowCount.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Fiscal years detected
              </dt>
              <dd className="text-sm">
                {preflight.yearsInData.length === 0
                  ? "None"
                  : preflight.yearsInData
                      .slice()
                      .sort((a, b) => a - b)
                      .join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Upload mode
              </dt>
              <dd className="text-sm">
                {preflight.mode === "append" &&
                  "Append: add new rows without deleting existing data."}
                {preflight.mode === "replace_year" &&
                  `Replace year: delete all rows for fiscal year ${preflight.replaceYear} and insert these rows.`}
                {preflight.mode === "replace_table" &&
                  "Replace table: delete ALL rows in this table and insert these rows."}
              </dd>
            </div>
          </dl>
          {preflight.mode === "replace_table" && (
            <p className="mt-2 text-xs font-semibold text-red-700">
              Warning: This will permanently delete all existing data in the{" "}
              {preflight.table} table.
            </p>
          )}
          {preflight.mode === "replace_year" && (
            <p className="mt-2 text-xs text-amber-700">
              All existing rows for fiscal year {preflight.replaceYear} will be
              deleted before inserting the new data.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleConfirmUpload}
              disabled={loading}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Uploading..." : "Confirm upload"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPreflight(null);
                setPendingRecords(null);
                setPendingYearsInData([]);
              }}
              disabled={loading}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </section>
      )}

      {/* Upload button */}
      <button
        onClick={handlePrepareUpload}
        disabled={loading}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {loading
          ? "Processing..."
          : preflight
          ? "Recalculate summary"
          : "Review & confirm upload"}
      </button>

      {/* Status message */}
      {message && (
        <div
          className={
            "mt-4 text-sm " +
            (messageIsError ? "text-red-700" : "text-emerald-700")
          }
        >
          {message}
        </div>
      )}
    </div>
  );
}

function buildTemplateCsv(table: string): string | null {
  const schema = TABLE_SCHEMAS[table];
  if (!schema) return null;

  const headers = schema.required;

  const exampleRow = headers.map((h) => {
    if (h === "fiscal_year") return "2024";
    if (h === "period") return "2024-01"; // year-period format
    if (h === "date") return "2024-07-01"; // strict YYYY-MM-DD
    if (h === "amount") return "12345.67";
    if (h === "fund_code") return "100";
    if (h === "fund_name") return "General Fund";
    if (h === "department_code") return "PW";
    if (h === "department_name") return "Public Works";
    if (h === "category") return "Salaries";
    if (h === "account_code") return "5000";
    if (h === "account_name") return "Wages";
    if (h === "vendor") return "Example Vendor Inc.";
    if (h === "description") return "Example description of transaction";
    return h;
  });

  return [headers.join(","), exampleRow.join(",")].join("\n");
}
