"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

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
};

function buildTemplateCsv(table: string): string | null {
  const schema = TABLE_SCHEMAS[table];
  if (!schema) return null;

  const headers = schema.required;

  const exampleRow = headers.map((h) => {
    if (h === "fiscal_year") return "2024";
    if (h === "period") return "2024-01"; // matches your year-period format
    if (h === "date") return "2024-07-01"; // strict YYYY-MM-DD
    if (h === "amount") return "12345.67";
    if (h === "fund_code") return "100";
    if (h === "fund_name") return "General Fund";
    if (h === "department_code") return "PW";
    if (h === "department_name") return "Public Works";
    if (h === "category") return "Supplies & Materials";
    if (h === "account_code") return "5000";
    if (h === "account_name") return "Supplies";
    if (h === "vendor") return "ACME Supply Co.";
    if (h === "description") return "Example description";
    // Fallback: just echo something non-empty so validators pass
    return h.toUpperCase();
  });

  // Header row + one example row
  return [headers.join(","), exampleRow.join(",")].join("\n");
}

type ValidationIssue = {
  row: number | null; // 1-based, incl. header if relevant; null = file-level
  field?: string;
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
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return false;
  const [y, m, day] = trimmed.split("-").map(Number);
  return (
    d.getUTCFullYear() === y &&
    d.getUTCMonth() + 1 === m &&
    d.getUTCDate() === day
  );
}

function isBadDeptName(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const s = String(value).trim().toLowerCase();
  return BAD_DEPT_VALUES.has(s);
}

/**
 * Parse CSV rows into records and run all validation.
 * - headers: array of header names from the first row
 * - dataRows: array of string[] for each data row
 */
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

  // 1) Header checks: duplicates + missing required
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

  const missingRequired = schema.required.filter((col) => !headers.includes(col));
  if (missingRequired.length > 0) {
    issues.push({
      row: null,
      message: `CSV is missing required column(s) for ${table}: ${missingRequired.join(
        ", "
      )}.`,
    });
  }

  // If header-level issues exist, stop early
  if (issues.length > 0) {
    return { records: [], yearsInData: [], issues };
  }

  // 2) Build records and row-level validation
  const records: Record<string, any>[] = [];
  const yearSet = new Set<number>();

  dataRows.forEach((cols, idx) => {
    const rowNum = idx + 2; // 1-based, +1 for header
    const rec: Record<string, any> = {};

    headers.forEach((h, i) => {
      const raw = cols[i] ?? "";
      const trimmed = raw.trim();

      // Treat truly empty as null
      if (trimmed === "") {
        rec[h] = null;
        return;
      }

      if (schema.numeric.includes(h)) {
        // allow "4,500.00"
        const num = Number(trimmed.replace(/,/g, ""));
        if (Number.isNaN(num)) {
          rec[h] = null;
          issues.push({
            row: rowNum,
            field: h,
            message: `Invalid numeric value "${raw}" in column "${h}".`,
          });
        } else {
          rec[h] = num;
        }
      } else {
        rec[h] = trimmed;
      }
    });

    // Required value checks
    const missingValueCols = schema.required.filter(
      (col) =>
        rec[col] === null ||
        rec[col] === undefined ||
        String(rec[col]).trim() === ""
    );
    if (missingValueCols.length > 0) {
      issues.push({
        row: rowNum,
        message: `Missing required value(s) in column(s): ${missingValueCols.join(
          ", "
        )}.`,
      });
    }

    const fy = rec["fiscal_year"];

    if (table === "transactions") {
      // date
      if (!isValidISODate(rec["date"])) {
        issues.push({
          row: rowNum,
          field: "date",
          message: `Invalid date "${rec["date"]}". Expected format YYYY-MM-DD.`,
        });
      }

      // department_name
      if (isBadDeptName(rec["department_name"])) {
        issues.push({
          row: rowNum,
          field: "department_name",
          message:
            "department_name is required and cannot be blank or 'NA'.",
        });
      }

      // vendor
      if (isBadDeptName(rec["vendor"])) {
        issues.push({
          row: rowNum,
          field: "vendor",
          message: "vendor is required and cannot be blank or 'NA'.",
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
    } else if (table === "budgets" || table === "actuals") {
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

      // amount must be non-negative
      const amt = rec["amount"];
      if (typeof amt !== "number" || Number.isNaN(amt)) {
        issues.push({
          row: rowNum,
          field: "amount",
          message: `Invalid amount "${amt}". Expected a numeric value.`,
        });
      } else if (amt < 0) {
        issues.push({
          row: rowNum,
          field: "amount",
          message: `Negative amount "${amt}" is not allowed for ${table}.`,
        });
      }
    }

    records.push(rec);
  });

  return { records, yearsInData: Array.from(yearSet), issues };
}

type Mode = "append" | "replace_year" | "replace_table";

// Simple shared-secret admin password (demo-level)
// Set NEXT_PUBLIC_ADMIN_PASSWORD in .env.local to override.
const ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "paradise-admin";

export default function UploadClient() {
  // --- Admin access gate ---
  const [authorized, setAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // --- Upload state ---
  const [file, setFile] = useState<File | null>(null);
  const [table, setTable] = useState<string>("budgets");
  const [mode, setMode] = useState<Mode>("append");
  const [replaceYear, setReplaceYear] = useState<string>("");
  const [replaceYearConfirm, setReplaceYearConfirm] =
    useState<string>("");
  const [replaceTableConfirmed, setReplaceTableConfirmed] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  // --- CSV preview state ---
  const [previewHeaders, setPreviewHeaders] = useState<string[] | null>(
    null
  );
  const [previewRows, setPreviewRows] = useState<string[][] | null>(null);
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

  function handleAuthSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthorized(true);
      setAuthError(null);
    } else {
      setAuthorized(false);
      setAuthError("Incorrect admin password.");
    }
  }

  async function handleUpload() {
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
        .map((line) => line.split(","));

      if (rows.length < 2) {
        setError("CSV appears to be empty or missing data rows.");
        setLoading(false);
        return;
      }

      const headers = rows[0].map((h) => h.trim());
      const dataRows = rows.slice(1);

      // ✅ CENTRALIZED VALIDATION + RECORD BUILD
      const { records, yearsInData, issues } = validateAndBuildRecords(
        table,
        schema,
        headers,
        dataRows
      );

      if (issues.length > 0) {
        const sample = issues.slice(0, 8);
        const formatted = sample.map((issue) => {
          const rowPart =
            issue.row !== null ? `Row ${issue.row}: ` : "";
          const fieldPart = issue.field
            ? `[${issue.field}] `
            : "";
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

      // 🔥 REPLACE-BY-YEAR MODE: delete only that fiscal year
      if (mode === "replace_year") {
        const targetYear = Number(replaceYear);
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

        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq("fiscal_year", targetYear);

        if (deleteError) {
          console.error("Supabase delete error:", deleteError);
          setError(
            "Failed to clear existing data for that year: " +
              deleteError.message
          );
          setLoading(false);
          return;
        }
      }

      // 🔥 REPLACE ENTIRE TABLE MODE
      if (mode === "replace_table") {
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .gte("fiscal_year", 0);

        if (deleteError) {
          console.error("Supabase delete error:", deleteError);
          setError("Failed to clear existing data: " + deleteError.message);
          setLoading(false);
          return;
        }
      }

      // INSERT validated records
      const { error } = await supabase.from(table).insert(records);

      if (error) {
        console.error("Supabase insert error:", error);
        setError("Error inserting data: " + error.message);
      } else {
        let action: string;
        if (mode === "append") {
          action = "appended to";
        } else if (mode === "replace_year") {
          action = `replaced fiscal year ${replaceYear} in`;
        } else {
          action = "replaced all rows in";
        }

        setInfo(
          `Successfully ${action} "${table}" with ${records.length} records.`
        );

        // 🔎 AUDIT LOG: write to data_uploads (non-blocking for user experience)
        try {
          let logFiscalYear: number | null = null;
          if (mode === "replace_year") {
            logFiscalYear = Number(replaceYear);
          } else if (yearsInData.length === 1) {
            logFiscalYear = yearsInData[0];
          }

          const logPayload = {
            table_name: table,
            mode,
            row_count: records.length,
            fiscal_year: Number.isFinite(logFiscalYear as number)
              ? (logFiscalYear as number)
              : null,
            filename: file?.name ?? null,
          };

          const { error: logError } = await supabase
            .from("data_uploads")
            .insert([logPayload]);

          if (logError) {
            console.error(
              "Failed to log upload to data_uploads:",
              logError
            );
          }
        } catch (logErr) {
          console.error("Unexpected error logging upload:", logErr);
        }
      }
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

  // --- If not authorized, show admin password gate ---
  if (!authorized) {
    return (
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">
          Admin Access
        </h1>
        <p className="mb-4 text-sm text-slate-500">
          This area is restricted. Enter the admin password to manage data
          uploads.
        </p>

        <form onSubmit={handleAuthSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Admin password
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Unlock
          </button>
          {authError && (
            <p className="mt-2 text-xs text-red-700">{authError}</p>
          )}
        </form>
      </div>
    );
  }

  // --- Main upload UI once authorized ---
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-2 text-xl font-semibold text-slate-900">
        Admin CSV Upload
      </h1>
      <p className="mb-1 text-sm text-slate-500">
        Upload new data for <strong>budgets</strong>, <strong>actuals</strong>,
        or <strong>transactions</strong>. CSV column headers must match the
        expected schema, and all required fields must have values.
      </p>
      <p className="mb-4 text-xs text-slate-500">
        You can review recent uploads in the{" "}
        <a
          href="/paradise/admin/uploads"
          className="text-sky-700 hover:underline"
        >
          upload audit log
        </a>
        .
      </p>

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
        </select>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Required columns for <span className="font-mono">{table}</span>:{" "}
            <span className="font-mono">{requiredCols.join(", ")}</span>
          </p>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Download {table} template
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
              onChange={() => {
                setMode("append");
              }}
            />
            <span>
              <span className="font-medium">Append</span>{" "}
              <span className="text-xs text-slate-500">
                Add new rows, keep existing data.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              value="replace_year"
              checked={mode === "replace_year"}
              onChange={() => {
                setMode("replace_year");
              }}
            />
            <span>
              <span className="font-medium text-amber-800">
                Replace this fiscal year only
              </span>{" "}
              <span className="text-xs text-slate-500">
                Delete existing rows for a single fiscal year, then insert CSV.
              </span>
            </span>
          </label>

          {mode === "replace_year" && (
            <>
              <div className="ml-6 mt-1 flex items-center gap-2">
                <span className="text-xs text-slate-600">
                  Fiscal year to replace:
                </span>
                <input
                  type="number"
                  value={replaceYear}
                  onChange={(e) => setReplaceYear(e.target.value)}
                  className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs"
                  placeholder="2024"
                />
              </div>
              <div className="ml-6 mt-2 space-y-1">
                <p className="text-[11px] text-amber-800">
                  This will delete existing rows for that fiscal year in "{table}
                  " and then upload rows from this CSV.
                </p>
                <label className="flex items-center gap-2 text-[11px] text-slate-700">
                  <span>
                    Type{" "}
                    <span className="font-mono font-semibold">
                      {replaceYear || "YEAR"}
                    </span>{" "}
                    to confirm:
                  </span>
                  <input
                    type="text"
                    value={replaceYearConfirm}
                    onChange={(e) =>
                      setReplaceYearConfirm(e.target.value)
                    }
                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-[11px]"
                  />
                </label>
              </div>
            </>
          )}

          <label className="mt-1 flex flex-col gap-1">
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                value="replace_table"
                checked={mode === "replace_table"}
                onChange={() => {
                  setMode("replace_table");
                }}
              />
              <span>
                <span className="font-medium text-red-700">
                  Replace entire table
                </span>{" "}
                <span className="text-xs text-slate-500">
                  <strong>Danger:</strong> Clear all rows in this table before
                  inserting the CSV.
                </span>
              </span>
            </span>

            {mode === "replace_table" && (
              <div className="ml-6 mt-1 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                <p className="text-[11px] font-bold text-red-800">
                  WARNING: THIS WILL DELETE ALL EXISTING ROWS IN THE "
                  {table}" TABLE FOR ALL YEARS. THIS CANNOT BE UNDONE.
                </p>
                <label className="mt-2 flex items-center gap-2 text-[11px] text-red-800">
                  <input
                    type="checkbox"
                    checked={replaceTableConfirmed}
                    onChange={(e) =>
                      setReplaceTableConfirmed(e.target.checked)
                    }
                  />
                  <span className="font-semibold">
                    YES, I UNDERSTAND. REPLACE ALL DATA IN "{table}".
                  </span>
                </label>
              </div>
            )}
          </label>
        </div>
      </div>

      {/* File picker + preview */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          CSV file
        </label>

        <label className="flex cursor-pointer items-center justify-between rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm hover:border-slate-400">
          <div className="flex flex-col">
            <span className="font-medium text-slate-800">
              {file ? file.name : "Click to choose a CSV file"}
            </span>
            <span className="text-xs text-slate-500">
              Accepted format: .csv
            </span>
          </div>
          <span className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
            Browse…
          </span>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setMessage(null);
              setPreviewHeaders(null);
              setPreviewRows(null);
              setPreviewMessage(null);

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
                  setPreviewMessage(`Found ${totalDataRows} row(s).`);
                }
              } catch (err) {
                console.error("Preview read error:", err);
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
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  {previewHeaders.map((h, colIdx) => (
                    <td
                      key={colIdx}
                      className="whitespace-nowrap px-2 py-1 align-top text-slate-800"
                    >
                      {(row[colIdx] ?? "").trim().slice(0, 80)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {previewMessage && (
        <p className="mb-4 text-[11px] text-slate-500">
          {previewMessage}
        </p>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={loading}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload CSV"}
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
