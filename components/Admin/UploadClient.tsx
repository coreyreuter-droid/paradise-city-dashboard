// components/Admin/UploadClient.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { cityHref } from "@/lib/cityRouting";
import { parseCsv } from "@/lib/csvParser";
import { csrfFetch } from "@/components/CsrfProvider";
import { downloadCsv } from "@/lib/downloadFile";
import {
  TABLE_SCHEMAS,
  validateAndBuildRecords,
  buildTemplateCsv,
  isBadDeptName,
  type ValidationIssue,
} from "@/lib/uploadValidation";

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
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [coverageWarnings, setCoverageWarnings] = useState<string[]>([]);
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null);

  const [preflight, setPreflight] = useState<PreflightSummary | null>(null);
  const [pendingRecords, setPendingRecords] = useState<
    Record<string, unknown>[] | null
  >(null);
  const [pendingYearsInData, setPendingYearsInData] = useState<number[]>([]);

  // --- CSV preview state ---
  const [previewHeaders, setPreviewHeaders] = useState<string[] | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][] | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);

  const messageRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (message && messageRef.current) {
      messageRef.current.focus();
    }
  }, [message]);

  function setError(msg: string) {
    setMessage(msg);
    setMessageIsError(true);
  }

  function setInfo(msg: string) {
    setMessage(msg);
    setMessageIsError(false);
  }

    function resetUploadState() {
    setFile(null);

    setPreviewHeaders(null);
    setPreviewRows(null);
    setPreviewMessage(null);

    setPreflight(null);
    setPendingRecords(null);
    setPendingYearsInData([]);

    setMessage(null);
    setMessageIsError(false);
    setUploadProgress(null);
    setFileSizeWarning(null);

    setReplaceTableConfirmed(false);
    setReplaceYear("");
    setReplaceYearConfirm("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleTableChange(nextTable: string) {
    if (nextTable === table) return;

    // Reset everything so we don't accidentally upload the wrong file to the wrong dataset.
    resetUploadState();

    // Default to the safest mode when switching datasets.
    setMode("append");

    setTable(nextTable);
  }

    async function refreshCoverageWarnings() {
    try {
      const { data: psRows, error: psError } = await supabase
        .from("portal_settings")
        .select("enable_actuals, enable_revenues")
        .limit(1);

      if (psError) {
        console.error("UploadClient: error loading portal_settings", psError);
        setCoverageWarnings([]);
        return;
      }

      const ps = psRows && psRows[0];

      const actualsEnabled = ps ? ps.enable_actuals !== false : true;
      const revenuesFeatureEnabled = ps ? ps.enable_revenues === true : false;

      async function maxFiscalYear(tableName: string): Promise<number | null> {
        const { data, error } = await supabase
          .from(tableName)
          .select("fiscal_year")
          .order("fiscal_year", { ascending: false })
          .limit(1);

        if (error) {
          console.error(
            `UploadClient: error reading max fiscal_year from ${tableName}`,
            error
          );
          return null;
        }

        const row = data && data[0];
        const fy = row?.fiscal_year;
        return typeof fy === "number" ? fy : fy != null ? Number(fy) : null;
      }

      const [maxBudgetFY, maxActualsFY, maxRevenuesFY] = await Promise.all([
        maxFiscalYear("budgets"),
        maxFiscalYear("actuals"),
        maxFiscalYear("revenues"),
      ]);

      const warnings: string[] = [];

      if (
        actualsEnabled &&
        maxBudgetFY != null &&
        maxActualsFY != null &&
        maxActualsFY > maxBudgetFY
      ) {
        warnings.push(
          `Actuals include FY${maxActualsFY}, but budgets are only loaded through FY${maxBudgetFY}. Upload the adopted budget for FY${maxActualsFY} (or remove those actuals) to avoid showing $0 budget for that year.`
        );
      }

      if (
        revenuesFeatureEnabled &&
        maxBudgetFY != null &&
        maxRevenuesFY != null &&
        maxRevenuesFY > maxBudgetFY
      ) {
        warnings.push(
          `Revenues include FY${maxRevenuesFY}, but budgets are only loaded through FY${maxBudgetFY}. Upload the adopted budget for FY${maxRevenuesFY} (or remove those revenues) to avoid mismatched year coverage.`
        );
      }

      setCoverageWarnings(warnings);
    } catch (err) {
      console.error("UploadClient: failed to compute coverage warnings", err);
      setCoverageWarnings([]);
    }
  }

  useEffect(() => {
    // Initial coverage check on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCoverageWarnings();
  }, []);

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

    setIsLoading(true);
    setMessage(null);

    try {
      const text = await file.text();

      // Parse CSV properly (handles quoted fields with commas)
      const rows = parseCsv(text);

      if (rows.length < 2) {
        setError("CSV appears to be empty or missing data rows.");
        setIsLoading(false);
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
        setIsLoading(false);
        return;
      }

      // Compute targetYear for replace_year mode; server will enforce
      let targetYear: number | null = null;
      if (mode === "replace_year") {
        targetYear = Number(replaceYear);
        if (!Number.isFinite(targetYear)) {
          setError("Fiscal year must be a valid number.");
          setIsLoading(false);
          return;
        }

        if (yearsInData.length === 0) {
          setError(
            "CSV contains no fiscal_year values; cannot perform year-specific replace."
          );
          setIsLoading(false);
          return;
        }

        const otherYears = yearsInData.filter((y) => y !== targetYear);
        if (otherYears.length > 0) {
          setError(
            `CSV contains multiple fiscal years (${yearsInData.join(
              ", "
            )}). For 'Replace this fiscal year only', upload a file that only contains fiscal_year = ${targetYear}.`
          );
          setIsLoading(false);
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
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to process CSV: " + (err instanceof Error ? err.message : "Unknown error"));
    }

    setIsLoading(false);
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

    setIsLoading(true);
    setMessage(null);
    setUploadProgress(`Uploading ${pendingRecords.length.toLocaleString()} rows...`);

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
        setIsLoading(false);
        setUploadProgress(null);
        return;
      }

      // Update progress for large uploads
      if (pendingRecords.length > 10000) {
        setUploadProgress(
          `Processing ${pendingRecords.length.toLocaleString()} rows... This may take a few minutes for large files.`
        );
      }

      const resp = await csrfFetch("/api/admin/upload", {
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
        setIsLoading(false);
        setUploadProgress(null);
        return;
      }

      setUploadProgress(null);
      setInfo(result?.message || "Upload completed successfully.");
      // Reset confirmation-related state
      setPreflight(null);
      setPendingRecords(null);
      setPendingYearsInData([]);
      setReplaceTableConfirmed(false);
      setReplaceYear("");
      setReplaceYearConfirm("");
      setFile(null);
      setPreviewHeaders(null);
      setPreviewRows(null);
      setPreviewMessage(null);
      setFileSizeWarning(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      await refreshCoverageWarnings();

    } catch (err: unknown) {
      console.error(err);
      setError("Upload failed: " + (err instanceof Error ? err.message : "Unknown error"));
      setUploadProgress(null);
    }

    setIsLoading(false);
  }

  function handleDownloadTemplate() {
    const csv = buildTemplateCsv(table);
    if (!csv) {
      setError(`No template available for table "${table}".`);
      return;
    }

    downloadCsv(csv, `${table}_template.csv`);
  }

  // Compute preview-time missing required columns (based on selected table)
  const previewMissingRequired =
    previewHeaders && TABLE_SCHEMAS[table]
      ? TABLE_SCHEMAS[table].required.filter(
          (col) => !previewHeaders.includes(col)
        )
      : [];

  return (
    <div
      className="max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      aria-label="Data upload"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Upload data
          </h1>
          <p className="mt-1 text-sm text-slate-700">
            Upload CSV files for budgets, actuals, transactions, or
            revenues. Use the template to ensure columns match exactly.
          </p>
          {table === "transactions" && (
            <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              <span className="font-semibold">Important:</span> Transactions use a calendar date (
              <span className="font-mono">MM/DD/YYYY</span> or{" "}
              <span className="font-mono">YYYY-MM-DD</span>) and we derive the fiscal year from the date
              using the city’s fiscal-year start (June 30 vs July 1 flips FY).
            </p>
          )}

          {(table === "actuals" || table === "revenues") && (
            <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              <span className="font-semibold">Important:</span> For {table},{" "}
              <span className="font-mono">period</span> is a <span className="font-semibold">calendar month</span>{" "}
              (<span className="font-mono">YYYY-MM</span>, e.g.{" "}
              <span className="font-mono">2027-08</span>). The portal derives{" "}
              <span className="font-mono">fiscal_year</span> from <span className="font-mono">period</span>{" "}
              using the city’s FY start (FY labeled by ending year). Example (July-start):{" "}
              <span className="font-mono">2027-08</span> belongs to <span className="font-semibold">FY2028</span>.
            </p>
          )}

          {table === "budgets" && (
            <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              <span className="font-semibold">Important:</span> Budgets use{" "}
              <span className="font-semibold">fiscal years labeled by ending year</span>.{" "}
              <span className="font-mono">FY2028</span> = Jul 2027–Jun 2028 (July-start example).{" "}
              Don’t upload calendar-year labeling by mistake.
            </p>
          )}

        </div>
        <a
          href={cityHref("/admin/upload/history")}
          className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          View upload history
        </a>
      </div>

      {coverageWarnings.length > 0 && (
        <div
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-900"
          role="status"
        >
          <p className="font-semibold">Data coverage warning</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
            {coverageWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Table selector */}
      <div className="mb-4">
        <label
          className="mb-1 block text-sm font-medium text-slate-700"
          htmlFor="upload-table-select"
        >
          Target table
        </label>
        <select
          id="upload-table-select"
          value={table}
          onChange={(e) => handleTableChange(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          <option value="budgets">budgets</option>
          <option value="actuals">actuals</option>
          <option value="transactions">transactions</option>
          <option value="revenues">revenues</option>
        </select>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-600">
            Make sure your CSV columns match the template for this table.
          </p>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            Download template
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="mb-4">
        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-slate-700">
            Upload mode
          </legend>
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
                <span className="text-slate-700">
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
                <span className="font-medium">
                  Replace this fiscal year only
                </span>{" "}
                <span className="text-slate-700">
                  – Delete existing rows for a single fiscal year, then
                  insert rows from this file.
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
                <span className="text-slate-700">
                  – Delete ALL existing rows in this table, then insert
                  rows from this file.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        {mode === "replace_year" && (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold">Replace this fiscal year only</p>
            <p className="mt-1">
              All existing rows for a single fiscal year will be deleted before
              inserting rows from this file.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="replaceYear"
                  className="text-xs font-medium"
                >
                  Fiscal year to replace
                </label>
                <input
                  id="replaceYear"
                  type="text"
                  inputMode="numeric"
                  value={replaceYear}
                  onChange={(e) => setReplaceYear(e.target.value)}
                  className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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
                  onChange={(e) =>
                    setReplaceYearConfirm(e.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  placeholder="Type the same fiscal year again to confirm"
                />
              </div>
            </div>
            <p id="replace-year-help" className="mt-1 text-xs">
              Example: if you enter{" "}
              <span className="font-mono">2024</span>, all existing rows with{" "}
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
                onChange={(e) =>
                  setReplaceTableConfirmed(e.target.checked)
                }
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
        <label
          className="mb-1 block text-sm font-medium text-slate-700"
          htmlFor="upload-file-input"
        >
          CSV file
        </label>

        <div className="relative">
          <input
            id="upload-file-input"
            type="file"
            accept=".csv"
            className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
            ref={fileInputRef}
            aria-describedby="upload-file-help"
            onChange={async (e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setPreviewHeaders(null);
              setPreviewRows(null);
              setPreviewMessage(null);
              setPreflight(null);
              setPendingRecords(null);
              setPendingYearsInData([]);
              setFileSizeWarning(null);

              if (!f) return;

              // Check file size and warn for large files
              const fileSizeMB = f.size / (1024 * 1024);
              if (fileSizeMB > 100) {
                setFileSizeWarning(
                  `File is ${fileSizeMB.toFixed(1)}MB which exceeds the 100MB limit. Please split the file into smaller chunks.`
                );
                return;
              } else if (fileSizeMB > 50) {
                setFileSizeWarning(
                  `Large file detected (${fileSizeMB.toFixed(1)}MB). Upload may take several minutes. Please be patient and don't close this page.`
                );
              } else if (fileSizeMB > 10) {
                setFileSizeWarning(
                  `File size: ${fileSizeMB.toFixed(1)}MB. Upload may take a minute or two.`
                );
              }

              try {
              const text = await f.text();
              
              // Parse CSV properly (handles quoted fields with commas)
              const rows = parseCsv(text);

              if (rows.length === 0) {
                setPreviewMessage("File appears to be empty.");
                return;
              }

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
          <div
            className="pointer-events-none flex items-center justify-between gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm peer-hover:border-slate-400 peer-focus:border-slate-500 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-slate-900 peer-focus:ring-offset-2"
          >
            <div className="flex flex-col">
              <span className="font-medium text-slate-800">
                {file ? file.name : "Click to choose a CSV file"}
              </span>
              <span className="text-xs text-slate-600">
                Accepted format: .csv
              </span>
            </div>
            <span className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
              Browse
            </span>
          </div>
        </div>
        <p
          id="upload-file-help"
          className="mt-1 text-xs text-slate-600"
        >
          The uploader will validate column names, years, and formats
          before sending any data to the server. Large files (up to 100MB / 500K rows) are supported.
        </p>

        {/* File size warning */}
        {fileSizeWarning && (
          <div
            className={`mt-2 rounded-md border p-2 text-xs ${
              fileSizeWarning.includes("exceeds")
                ? "border-red-300 bg-red-50 text-red-800"
                : "border-amber-300 bg-amber-50 text-amber-800"
            }`}
            role="alert"
          >
            {fileSizeWarning}
          </div>
        )}
      </div>

      {/* Preview warnings */}
      {previewHeaders && (
        <div className="mb-2 text-xs">
          {previewMissingRequired.length > 0 ? (
            <p className="text-red-700">
              Preview warning: CSV is missing required column(s) for{" "}
              {table}: {previewMissingRequired.join(", ")}.
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
        <div
          className="mb-4 overflow-x-auto rounded-md border border-slate-200 bg-slate-50"
          aria-label="CSV preview"
        >
          <div className="max-h-72 overflow-y-auto">
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
                    className="border-t border-slate-200"
                  >
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
        </div>
      )}

      {previewMessage && (
        <p className="mb-4 text-xs text-slate-600">
          {previewMessage}
        </p>
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
              <dt className="text-xs font-medium text-slate-600">
                Target table
              </dt>
              <dd className="text-sm">{preflight.table}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-600">
                Rows to upload
              </dt>
              <dd className="text-sm">
                {preflight.rowCount.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-600">
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
              <dt className="text-xs font-medium text-slate-600">
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmUpload}
              disabled={isLoading}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              {isLoading ? "Uploading..." : "Confirm upload"}
            </button>

            {/* Upload progress indicator */}
            {isLoading && uploadProgress && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <svg
                  className="h-4 w-4 animate-spin text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>{uploadProgress}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setPreflight(null);
                setPendingRecords(null);
                setPendingYearsInData([]);
              }}
              disabled={isLoading}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Back
            </button>
          </div>
        </section>
      )}

      {!preflight && (
        <button
          type="button"
          onClick={handlePrepareUpload}
          disabled={isLoading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          {isLoading ? "Processing..." : "Review upload"}
        </button>
      )}


      {/* Status message */}
      {message && (
        <div
          ref={messageRef}
          tabIndex={-1}
          className={
            "mt-4 whitespace-pre-wrap text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 " +
            (messageIsError ? "text-red-700" : "text-emerald-700")
          }
          role={messageIsError ? "alert" : "status"}
          aria-live={messageIsError ? "assertive" : "polite"}
        >
          {message}
        </div>
      )}
    </div>
  );
}

