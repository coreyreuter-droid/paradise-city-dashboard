// components/Admin/UploadClient.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { cityHref } from "@/lib/cityRouting";
import { parseCsv } from "@/lib/csvParser";
import { csrfFetch } from "@/components/CsrfProvider";
import { downloadCsv } from "@/lib/downloadFile";
import {
  TABLE_SCHEMAS,
  validateAndBuildRecords,
  buildTemplateCsv,
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

// Mapping profile type
interface MappingProfile {
  id: string;
  name: string;
  dataset_type: string;
  column_mappings: Record<string, string>;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Transform CSV headers using a mapping profile.
 * The mapping is stored as { targetField: csvColumnName }
 * We need to reverse it to { csvColumnName: targetField } for transformation.
 */
function transformHeadersWithMapping(
  rawHeaders: string[],
  columnMappings: Record<string, string>
): string[] {
  // Build reverse mapping: csvColumnName -> targetField
  const reverseMapping: Record<string, string> = {};
  for (const [targetField, csvColumnName] of Object.entries(columnMappings)) {
    if (csvColumnName) {
      reverseMapping[csvColumnName.toLowerCase().trim()] = targetField;
    }
  }

  // Transform each header
  return rawHeaders.map((h) => {
    const normalized = h.toLowerCase().trim();
    return reverseMapping[normalized] || h;
  });
}

/**
 * Truly required fields per dataset type.
 * These are the minimum fields needed for a valid import.
 * Other fields are optional and can be left unmapped.
 */
const TRULY_REQUIRED_FIELDS: Record<string, string[]> = {
  budgets: ["fiscal_year", "amount"],
  actuals: ["fiscal_year", "period", "amount"],
  transactions: ["fiscal_year", "date", "amount"],
  revenues: ["fiscal_year", "period", "amount"],
};

/**
 * Check which expected columns are missing from CSV headers.
 * Only checks:
 * 1. That truly required fields have mappings defined
 * 2. That all MAPPED columns actually exist in the CSV
 */
function getMissingMappedColumns(
  rawHeaders: string[],
  columnMappings: Record<string, string>,
  datasetType: string
): { missingRequired: string[]; missingCsvColumns: string[] } {
  const normalizedHeaders = new Set(rawHeaders.map((h) => h.toLowerCase().trim()));
  
  const missingRequired: string[] = [];
  const missingCsvColumns: string[] = [];

  // Check that truly required fields have mappings
  const requiredFields = TRULY_REQUIRED_FIELDS[datasetType] || [];
  for (const field of requiredFields) {
    const mappedColumn = columnMappings[field];
    if (!mappedColumn) {
      missingRequired.push(field);
    }
  }

  // Check that all mapped columns exist in the CSV
  for (const [field, csvColumn] of Object.entries(columnMappings)) {
    if (csvColumn) {
      const normalizedExpected = csvColumn.toLowerCase().trim();
      if (!normalizedHeaders.has(normalizedExpected)) {
        missingCsvColumns.push(csvColumn);
      }
    }
  }

  return { missingRequired, missingCsvColumns };
}

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

  // --- Mapping profile state ---
  const [mappingProfiles, setMappingProfiles] = useState<MappingProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // --- Auto-match state ---
  const [matchStatus, setMatchStatus] = useState<"checking" | "matched" | "matched_extra" | "no_match" | null>(null);
  const [matchedProfileName, setMatchedProfileName] = useState<string | null>(null);
  const [extraColumns, setExtraColumns] = useState<string[]>([]);

  const messageRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Get the currently selected profile
  const selectedProfile = mappingProfiles.find((p) => p.id === selectedProfileId) || null;

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

    // Reset match state
    setMatchStatus(null);
    setMatchedProfileName(null);
    setExtraColumns([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Load mapping profiles for the current table
  const loadMappingProfiles = useCallback(async (datasetType: string) => {
    setProfilesLoading(true);
    setProfileError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setProfileError("Not authenticated");
        setProfilesLoading(false);
        return;
      }

      const res = await fetch(
        `/api/admin/mapping-profiles?dataset_type=${encodeURIComponent(datasetType)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setProfileError(data.error || "Failed to load mapping profiles");
        setMappingProfiles([]);
        setSelectedProfileId(null);
        setProfilesLoading(false);
        return;
      }

      const data = await res.json();
      const profiles: MappingProfile[] = data.profiles || [];
      setMappingProfiles(profiles);

      // Select the system default profile by default
      const defaultProfile = profiles.find((p) => p.is_system && p.name === "Default Template");
      if (defaultProfile) {
        setSelectedProfileId(defaultProfile.id);
      } else if (profiles.length > 0) {
        setSelectedProfileId(profiles[0].id);
      } else {
        setSelectedProfileId(null);
      }
    } catch (err) {
      console.error("Error loading mapping profiles:", err);
      setProfileError("Failed to load mapping profiles");
      setMappingProfiles([]);
      setSelectedProfileId(null);
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  // Check if file headers match any saved mapping profile
  const checkFileMatch = useCallback(async (headers: string[], datasetType: string) => {
    setMatchStatus("checking");
    setMatchedProfileName(null);
    setExtraColumns([]);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMatchStatus("no_match");
        return;
      }

      const res = await fetch("/api/admin/mapping-profiles/check-match", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          headers,
          dataset_type: datasetType,
        }),
      });

      if (!res.ok) {
        console.error("Check match failed:", await res.text());
        setMatchStatus("no_match");
        return;
      }

      const data = await res.json();

      if (data.match) {
        setMatchedProfileName(data.profile.name);
        setExtraColumns(data.extra_columns || []);
        
        // Auto-select the matched profile
        let matchedProfile = mappingProfiles.find((p) => p.id === data.profile.id);
        
        // If profile not found locally (race condition), reload profiles
        if (!matchedProfile) {
          await loadMappingProfiles(datasetType);
          // Try to find again after reload - this will be picked up on next render
        }
        
        setSelectedProfileId(data.profile.id);

        if (data.has_extra_columns) {
          setMatchStatus("matched_extra");
        } else {
          setMatchStatus("matched");
        }
      } else {
        setMatchStatus("no_match");
      }
    } catch (err) {
      console.error("Error checking file match:", err);
      setMatchStatus("no_match");
    }
  }, [mappingProfiles, loadMappingProfiles]);

  function handleTableChange(nextTable: string) {
    if (nextTable === table) return;

    // Reset everything so we don't accidentally upload the wrong file to the wrong dataset.
    resetUploadState();

    // Default to the safest mode when switching datasets.
    setMode("append");

    setTable(nextTable);
  }

  // Load profiles when table changes
  useEffect(() => {
    loadMappingProfiles(table);
  }, [table, loadMappingProfiles]);

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

    if (!selectedProfile) {
      setError("No matching mapping profile found. Please create a mapping for this file structure in CSV Mapping.");
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

      const rawHeaders = rows[0].map((h) => h.trim());
      const dataRows = rows.slice(1);

      // Check if CSV headers match the selected mapping profile
      const { missingRequired, missingCsvColumns } = getMissingMappedColumns(
        rawHeaders,
        selectedProfile.column_mappings,
        table
      );

      // Check for truly required fields that aren't mapped
      if (missingRequired.length > 0) {
        setError(
          `The mapping profile "${selectedProfile.name}" is missing required field mappings:\n\n` +
            `Missing: ${missingRequired.join(", ")}\n\n` +
            `Please edit the mapping profile to include these required fields.`
        );
        setIsLoading(false);
        return;
      }

      // Check for mapped columns that don't exist in CSV
      if (missingCsvColumns.length > 0) {
        setError(
          `CSV is missing columns expected by mapping profile "${selectedProfile.name}":\n\n` +
            `Expected columns: ${missingCsvColumns.join(", ")}\n\n` +
            `Found columns: ${rawHeaders.join(", ")}\n\n` +
            `Please check that you selected the correct mapping profile for this CSV file.`
        );
        setIsLoading(false);
        return;
      }

      // Transform headers using the mapping profile
      const headers = transformHeadersWithMapping(
        rawHeaders,
        selectedProfile.column_mappings
      );

      // Build a filtered schema that only includes fields that are actually mapped
      // This allows optional fields to be unmapped without causing validation errors
      const mappedFields = Object.keys(selectedProfile.column_mappings).filter(
        (field) => selectedProfile.column_mappings[field]
      );
      
      // Always include truly required fields in validation
      const trulyRequired = TRULY_REQUIRED_FIELDS[table] || [];
      const fieldsToValidate = new Set([...mappedFields, ...trulyRequired]);
      
      const filteredSchema = {
        required: schema.required.filter((field) => fieldsToValidate.has(field)),
        numeric: schema.numeric,
      };

      // Validation + record building (using filtered schema for mapped fields only)
      const { records, yearsInData, issues } = validateAndBuildRecords(
        table,
        filteredSchema,
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

      console.log("UPLOAD_CLIENT_BUILD", "chunking-bytes-v2", new Date().toISOString());

      // Byte-based chunking to stay under Vercel's 4.5MB request limit
      // Row count varies by table width, so we calculate actual JSON size
      const MAX_BYTES = 3_800_000; // Safe margin under 4.5MB
      const totalRecords = pendingRecords.length;
      
      let start = 0;
      let chunkIndex = 0;
      let insertedTotal = 0;
      const chunkSizes: number[] = [];

      while (start < totalRecords) {
        // 12000 rows (conservative guess)
        let end = Math.min(start + 12000, totalRecords);
        let chunk = pendingRecords.slice(start, end);
        const chunkMode = chunkIndex === 0 ? preflight.mode : "append";

        let payload = {
          table: preflight.table,
          mode: chunkMode,
          replaceYear: chunkIndex === 0 ? preflight.replaceYear : null,
          records: chunk,
          filename: file.name,
          yearsInData: pendingYearsInData,
          totalRowCount: chunkIndex === 0 ? totalRecords : undefined,
          skipAuditLog: chunkIndex > 0,
        };
        let bytes = new TextEncoder().encode(JSON.stringify(payload)).length;

        // Shrink chunk until it fits under limit
        while (bytes > MAX_BYTES && end > start + 1) {
          end = start + Math.max(1, Math.floor((end - start) * 0.8));
          chunk = pendingRecords.slice(start, end);
          payload = {
            table: preflight.table,
            mode: chunkMode,
            replaceYear: chunkIndex === 0 ? preflight.replaceYear : null,
            records: chunk,
            filename: file.name,
            yearsInData: pendingYearsInData,
            totalRowCount: chunkIndex === 0 ? totalRecords : undefined,
            skipAuditLog: chunkIndex > 0,
          };
          bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
        }

        chunkSizes.push(chunk.length);
        const estimatedTotalChunks = Math.ceil(totalRecords / (chunk.length || 1));

        console.log(`[upload] chunk ${chunkIndex + 1}`, { start, end, rows: chunk.length, bytes, mode: chunkMode });

        setUploadProgress(
          `Uploading chunk ${chunkIndex + 1} of ~${estimatedTotalChunks} (${chunk.length.toLocaleString()} rows, ${(bytes / 1_000_000).toFixed(1)}MB)...`
        );

        const resp = await csrfFetch("/api/admin/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        });

        // Handle non-JSON error responses (like 413)
        const contentType = resp.headers.get("content-type") || "";
        
        if (!resp.ok) {
          let errorMsg: string;
          if (contentType.includes("application/json")) {
            const result = await resp.json();
            errorMsg = result?.error || "Unknown error";
          } else {
            const text = await resp.text();
            errorMsg = `HTTP ${resp.status}: ${text.slice(0, 200)}`;
          }
          
          console.error("Upload API error:", resp.status, errorMsg);
          setError(
            `Upload failed on chunk ${chunkIndex + 1}. ${insertedTotal.toLocaleString()} rows were inserted before the error. Error: ${errorMsg}`
          );
          setIsLoading(false);
          setUploadProgress(null);
          return;
        }

        if (!contentType.includes("application/json")) {
          const text = await resp.text();
          console.error("Non-JSON response:", contentType, text.slice(0, 200));
          setError(`Unexpected response format: ${text.slice(0, 200)}`);
          setIsLoading(false);
          setUploadProgress(null);
          return;
        }

        await resp.json(); // Consume response
        insertedTotal += chunk.length;
        start = end;
        chunkIndex++;
      }

      // Final result message
      const result = {
        message: `Successfully uploaded ${insertedTotal.toLocaleString()} records to "${preflight.table}" in ${chunkIndex} chunk(s).`,
      };

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
            revenues. Select the appropriate mapping profile for your CSV format.
          </p>
          {table === "transactions" && (
            <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              <span className="font-semibold">Important:</span> Transactions use a calendar date (
              <span className="font-mono">MM/DD/YYYY</span> or{" "}
              <span className="font-mono">YYYY-MM-DD</span>) and we derive the fiscal year from the date
              using the city&apos;s fiscal-year start (June 30 vs July 1 flips FY).
            </p>
          )}

          {(table === "actuals" || table === "revenues") && (
            <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              <span className="font-semibold">Important:</span> For {table},{" "}
              <span className="font-mono">period</span> is a <span className="font-semibold">calendar month</span>{" "}
              (<span className="font-mono">YYYY-MM</span>, e.g.{" "}
              <span className="font-mono">2027-08</span>). The portal derives{" "}
              <span className="font-mono">fiscal_year</span> from <span className="font-mono">period</span>{" "}
              using the city&apos;s FY start (FY labeled by ending year). Example (July-start):{" "}
              <span className="font-mono">2027-08</span> belongs to <span className="font-semibold">FY2028</span>.
            </p>
          )}

          {table === "budgets" && (
            <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              <span className="font-semibold">Important:</span> Budgets use{" "}
              <span className="font-semibold">fiscal years labeled by ending year</span>.{" "}
              <span className="font-mono">FY2028</span> = Jul 2027–Jun 2028 (July-start example).{" "}
              Don&apos;t upload calendar-year labeling by mistake.
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
      </div>

      {/* Mapping profile info */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">
            Mapping profile
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Download template
            </button>
            <a
              href="mapping"
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Create new mapping
            </a>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          {matchedProfileName 
            ? `Using mapping "${matchedProfileName}" (auto-detected from file headers).`
            : file 
            ? "Upload a file to auto-detect the matching profile."
            : "Mapping will be auto-detected when you upload a file."}
        </p>
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
                  className="text-xs font-medium whitespace-nowrap"
                >
                  Fiscal year to replace:
                </label>
                <input
                  id="replaceYear"
                  type="text"
                  value={replaceYear}
                  onChange={(e) => setReplaceYear(e.target.value)}
                  className="w-20 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  placeholder="e.g. 2024"
                />
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="replaceYearConfirm"
                  className="text-xs font-medium whitespace-nowrap"
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
              // Reset match state
              setMatchStatus(null);
              setMatchedProfileName(null);
              setExtraColumns([]);

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

              // Check if this file matches any saved mapping profile
              checkFileMatch(headers, table);

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

      {/* Match status display */}
      {file && matchStatus && (
        <div className="mb-4">
          {matchStatus === "checking" && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Checking file structure...
            </div>
          )}
          {matchStatus === "matched" && matchedProfileName && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              This file matches mapping <strong>&quot;{matchedProfileName}&quot;</strong>. Ready to upload.
            </div>
          )}
          {matchStatus === "matched_extra" && matchedProfileName && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p>
                This file matches mapping <strong>&quot;{matchedProfileName}&quot;</strong> but has unmapped column(s): <strong>{extraColumns.join(", ")}</strong>
              </p>
              <p className="mt-1">
                Please double check the file before proceeding. Unmapped columns will be ignored.
              </p>
            </div>
          )}
          {matchStatus === "no_match" && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p className="font-semibold">No matching mapping found for this file structure.</p>
              <p className="mt-1">
                Go to <a href="mapping" className="underline font-medium">CSV mapping</a> to create a mapping for this file format.
              </p>
            </div>
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
                Mapping profile
              </dt>
              <dd className="text-sm">{selectedProfile?.name || "None"}</dd>
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
            <div className="sm:col-span-2">
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
          disabled={isLoading || !selectedProfile || matchStatus === "no_match" || matchStatus === "checking" || !matchStatus}
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
