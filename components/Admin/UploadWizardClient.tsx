// components/Admin/UploadWizardClient.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { cityHref } from "@/lib/cityRouting";
import { parseCsv } from "@/lib/csvParser";
import { csrfFetch } from "@/components/CsrfProvider";
import { downloadCsv } from "@/lib/downloadFile";
import {
  TABLE_SCHEMAS,
  validateAndBuildRecords,
  buildTemplateCsv,
} from "@/lib/uploadValidation";

// ============================================================================
// Types
// ============================================================================

type DatasetType = "budgets" | "actuals" | "transactions" | "revenues";
type Mode = "append" | "replace_year" | "replace_table";
type WizardStep = 1 | 2 | 3 | 4;
type MatchStatus = "checking" | "matched" | "matched_extra" | "no_match" | null;

interface MappingProfile {
  id: string;
  name: string;
  dataset_type: string;
  column_mappings: Record<string, string>;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface PreflightSummary {
  table: string;
  rowCount: number;
  yearsInData: number[];
  mode: Mode;
  replaceYear: number | null;
}

interface WizardState {
  step: WizardStep;
  datasetType: DatasetType;
  // File state
  file: File | null;
  previewHeaders: string[] | null;
  previewRows: string[][] | null;
  previewMessage: string | null;
  fileSizeWarning: string | null;
  // Mode state
  mode: Mode;
  replaceYear: string;
  replaceYearConfirm: string;
  replaceTableConfirmed: boolean;
  // Mapping state
  matchStatus: MatchStatus;
  matchedProfileName: string | null;
  matchedProfileId: string | null;
  extraColumns: string[];
  // Validation state
  preflight: PreflightSummary | null;
  pendingRecords: Record<string, unknown>[] | null;
  pendingYearsInData: number[];
  validationError: string | null;
  // Processing state
  isValidating: boolean;
  isUploading: boolean;
  uploadProgress: string | null;
  uploadSuccess: boolean;
  uploadMessage: string | null;
  // General
  error: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const DATASET_INFO: Record<DatasetType, { label: string; description: string; warning?: string }> = {
  budgets: {
    label: "Budgets",
    description: "Adopted budget line items by fiscal year, fund, department, and account.",
    warning: "Budgets use fiscal years labeled by ending year. FY2028 = Jul 2027–Jun 2028 (July-start example). Don't upload calendar-year labeling by mistake.",
  },
  actuals: {
    label: "Actuals",
    description: "Actual expenditures by period (month), fund, department, and account.",
    warning: "For actuals, period is a calendar month (YYYY-MM, e.g., 2027-08). The portal derives fiscal_year from period using the city's FY start (FY labeled by ending year). Example (July-start): 2027-08 belongs to FY2028.",
  },
  transactions: {
    label: "Transactions",
    description: "Individual payment transactions with date, vendor, and amount.",
    warning: "Transactions use a calendar date (MM/DD/YYYY or YYYY-MM-DD) and we derive the fiscal year from the date using the city's fiscal-year start (June 30 vs July 1 flips FY).",
  },
  revenues: {
    label: "Revenues",
    description: "Revenue collections by period (month), fund, and source.",
    warning: "For revenues, period is a calendar month (YYYY-MM, e.g., 2027-08). The portal derives fiscal_year from period using the city's FY start (FY labeled by ending year). Example (July-start): 2027-08 belongs to FY2028.",
  },
};

/**
 * Truly required fields per dataset type.
 * These are the minimum fields needed for a valid import.
 * Other fields are optional and can be left unmapped.
 */
const TRULY_REQUIRED_FIELDS: Record<string, string[]> = {
  budgets: ["fiscal_year", "amount"],
  actuals: ["fiscal_year", "period", "amount"],
  transactions: ["date", "amount"],
  revenues: ["fiscal_year", "period", "amount"],
};

// ============================================================================
// Helper Functions (preserved exactly from UploadClient)
// ============================================================================

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
  for (const [, csvColumn] of Object.entries(columnMappings)) {
    if (csvColumn) {
      const normalizedExpected = csvColumn.toLowerCase().trim();
      if (!normalizedHeaders.has(normalizedExpected)) {
        missingCsvColumns.push(csvColumn);
      }
    }
  }

  return { missingRequired, missingCsvColumns };
}

// ============================================================================
// Initial Wizard State
// ============================================================================

function getInitialWizardState(): WizardState {
  return {
    step: 1,
    datasetType: "budgets",
    file: null,
    previewHeaders: null,
    previewRows: null,
    previewMessage: null,
    fileSizeWarning: null,
    mode: "append",
    replaceYear: "",
    replaceYearConfirm: "",
    replaceTableConfirmed: false,
    matchStatus: null,
    matchedProfileName: null,
    matchedProfileId: null,
    extraColumns: [],
    preflight: null,
    pendingRecords: null,
    pendingYearsInData: [],
    validationError: null,
    isValidating: false,
    isUploading: false,
    uploadProgress: null,
    uploadSuccess: false,
    uploadMessage: null,
    error: null,
  };
}

// ============================================================================
// Component
// ============================================================================

export default function UploadWizardClient() {
  // Wizard visibility
  const [showWizard, setShowWizard] = useState(false);

  // Mapping profiles (loaded per dataset type)
  const [mappingProfiles, setMappingProfiles] = useState<MappingProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);

  // Wizard state
  const [wizard, setWizard] = useState<WizardState>(getInitialWizardState());

  // Coverage warnings (shown on main page)
  const [coverageWarnings, setCoverageWarnings] = useState<string[]>([]);

  // ============================================================================
  // Auth Helper
  // ============================================================================

  async function getAuthToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  // ============================================================================
  // Coverage Warnings (preserved from UploadClient)
  // ============================================================================

  const refreshCoverageWarnings = useCallback(async () => {
    try {
      const { data: psRows, error: psError } = await supabase
        .from("portal_settings")
        .select("enable_actuals, enable_revenues")
        .limit(1);

      if (psError) {
        console.error("UploadWizardClient: error loading portal_settings", psError);
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
          console.error(`UploadWizardClient: error reading max fiscal_year from ${tableName}`, error);
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

      if (actualsEnabled && maxBudgetFY != null && maxActualsFY != null && maxActualsFY > maxBudgetFY) {
        warnings.push(
          `Actuals include FY${maxActualsFY}, but budgets are only loaded through FY${maxBudgetFY}. Upload the adopted budget for FY${maxActualsFY} (or remove those actuals) to avoid showing $0 budget for that year.`
        );
      }

      if (revenuesFeatureEnabled && maxBudgetFY != null && maxRevenuesFY != null && maxRevenuesFY > maxBudgetFY) {
        warnings.push(
          `Revenues include FY${maxRevenuesFY}, but budgets are only loaded through FY${maxBudgetFY}. Upload the adopted budget for FY${maxRevenuesFY} (or remove those revenues) to avoid mismatched year coverage.`
        );
      }

      setCoverageWarnings(warnings);
    } catch (err) {
      console.error("UploadWizardClient: failed to compute coverage warnings", err);
      setCoverageWarnings([]);
    }
  }, []);

  useEffect(() => {
    refreshCoverageWarnings();
  }, [refreshCoverageWarnings]);

  // ============================================================================
  // Load Mapping Profiles
  // ============================================================================

  const loadMappingProfiles = useCallback(async (datasetType: string) => {
    setProfilesLoading(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        setProfilesLoading(false);
        return;
      }

      const res = await fetch(
        `/api/admin/mapping-profiles?dataset_type=${encodeURIComponent(datasetType)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        setMappingProfiles([]);
        setProfilesLoading(false);
        return;
      }

      const data = await res.json();
      setMappingProfiles(data.profiles || []);
    } catch (err) {
      console.error("Error loading mapping profiles:", err);
      setMappingProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  // Load profiles when wizard opens or dataset type changes
  useEffect(() => {
    if (showWizard) {
      loadMappingProfiles(wizard.datasetType);
    }
  }, [showWizard, wizard.datasetType, loadMappingProfiles]);

  // ============================================================================
  // Check File Match
  // ============================================================================

  const checkFileMatch = useCallback(async (headers: string[], datasetType: string) => {
    setWizard((prev: WizardState) => ({
      ...prev,
      matchStatus: "checking",
      matchedProfileName: null,
      matchedProfileId: null,
      extraColumns: [],
    }));

    try {
      const token = await getAuthToken();
      if (!token) {
        setWizard((prev: WizardState) => ({ ...prev, matchStatus: "no_match" }));
        return;
      }

      const res = await fetch("/api/admin/mapping-profiles/check-match", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ headers, dataset_type: datasetType }),
      });

      if (!res.ok) {
        console.error("Check match failed:", await res.text());
        setWizard((prev: WizardState) => ({ ...prev, matchStatus: "no_match" }));
        return;
      }

      const data = await res.json();

      if (data.match) {
        setWizard((prev: WizardState) => ({
          ...prev,
          matchedProfileName: data.profile.name,
          matchedProfileId: data.profile.id,
          extraColumns: data.extra_columns || [],
          matchStatus: data.has_extra_columns ? "matched_extra" : "matched",
        }));
      } else {
        setWizard((prev: WizardState) => ({ ...prev, matchStatus: "no_match" }));
      }
    } catch (err) {
      console.error("Error checking file match:", err);
      setWizard((prev: WizardState) => ({ ...prev, matchStatus: "no_match" }));
    }
  }, []);

  // ============================================================================
  // File Handling
  // ============================================================================

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;

    // Reset file-related state
    setWizard((prev: WizardState) => ({
      ...prev,
      file: f,
      previewHeaders: null,
      previewRows: null,
      previewMessage: null,
      fileSizeWarning: null,
      matchStatus: null,
      matchedProfileName: null,
      matchedProfileId: null,
      extraColumns: [],
      preflight: null,
      pendingRecords: null,
      pendingYearsInData: [],
      validationError: null,
      error: null,
    }));

    if (!f) return;

    // Check file size (same logic as UploadClient)
    const fileSizeMB = f.size / (1024 * 1024);
    let sizeWarning: string | null = null;

    if (fileSizeMB > 100) {
      sizeWarning = `File is ${fileSizeMB.toFixed(1)}MB which exceeds the 100MB limit. Please split the file into smaller chunks.`;
      setWizard((prev: WizardState) => ({ ...prev, fileSizeWarning: sizeWarning, error: sizeWarning }));
      return;
    } else if (fileSizeMB > 50) {
      sizeWarning = `Large file detected (${fileSizeMB.toFixed(1)}MB). Upload may take several minutes. Please be patient and don't close this page.`;
    } else if (fileSizeMB > 10) {
      sizeWarning = `File size: ${fileSizeMB.toFixed(1)}MB. Upload may take a minute or two.`;
    }

    try {
      const text = await f.text();
      const rows = parseCsv(text);

      if (rows.length === 0) {
        setWizard((prev: WizardState) => ({
          ...prev,
          previewMessage: "File appears to be empty.",
          error: "File appears to be empty.",
        }));
        return;
      }

      const headers = rows[0].map((h) => h.trim());
      const dataRows = rows.slice(1, 21); // Preview first 20 rows
      const totalDataRows = rows.length - 1;

      const previewMsg = totalDataRows > dataRows.length
        ? `Showing first ${dataRows.length} of ${totalDataRows.toLocaleString()} row(s).`
        : `${totalDataRows.toLocaleString()} row(s) detected in this file.`;

      setWizard((prev: WizardState) => ({
        ...prev,
        previewHeaders: headers,
        previewRows: dataRows,
        previewMessage: previewMsg,
        fileSizeWarning: sizeWarning,
      }));

      // Check for matching mapping profile
      checkFileMatch(headers, wizard.datasetType);
    } catch (err) {
      console.error("Preview parse error:", err);
      setWizard((prev: WizardState) => ({
        ...prev,
        previewMessage: "Could not read file for preview. You can still attempt upload.",
        error: "Could not read file. Please check the file format.",
      }));
    }
  }

  // ============================================================================
  // Validation (Step 2 → Step 3)
  // ============================================================================

  async function handleValidate() {
    const { file, datasetType, mode, replaceYear, replaceYearConfirm, replaceTableConfirmed, matchedProfileId } = wizard;

    if (!file) {
      setWizard((prev: WizardState) => ({ ...prev, error: "Please select a CSV file." }));
      return;
    }

    const selectedProfile = mappingProfiles.find((p: MappingProfile) => p.id === matchedProfileId);
    if (!selectedProfile) {
      setWizard((prev: WizardState) => ({ ...prev, error: "No matching mapping profile found. Please create a mapping for this file structure in CSV Mapping." }));
      return;
    }

    // Mode-level guards (same as UploadClient)
    if (mode === "replace_year") {
      if (!replaceYear.trim()) {
        setWizard((prev: WizardState) => ({ ...prev, error: "Please enter a fiscal year to replace." }));
        return;
      }
      if (replaceYearConfirm.trim() !== replaceYear.trim()) {
        setWizard((prev: WizardState) => ({ ...prev, error: `To confirm replacing that year, type ${replaceYear.trim()} in the confirmation box.` }));
        return;
      }
    }

    if (mode === "replace_table" && !replaceTableConfirmed) {
      setWizard((prev: WizardState) => ({ ...prev, error: "You must confirm that you understand this will DELETE ALL EXISTING DATA in this table before continuing." }));
      return;
    }

    setWizard((prev: WizardState) => ({ ...prev, isValidating: true, error: null, validationError: null }));

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      if (rows.length < 2) {
        setWizard((prev: WizardState) => ({ ...prev, isValidating: false, error: "CSV appears to be empty or missing data rows." }));
        return;
      }

      const rawHeaders = rows[0].map((h) => h.trim());
      const dataRows = rows.slice(1);

      // Check mapping compatibility (same as UploadClient)
      const { missingRequired, missingCsvColumns } = getMissingMappedColumns(
        rawHeaders,
        selectedProfile.column_mappings,
        datasetType
      );

      if (missingRequired.length > 0) {
        setWizard((prev: WizardState) => ({
          ...prev,
          isValidating: false,
          error: `The mapping profile "${selectedProfile.name}" is missing required field mappings:\n\nMissing: ${missingRequired.join(", ")}\n\nPlease edit the mapping profile to include these required fields.`,
        }));
        return;
      }

      if (missingCsvColumns.length > 0) {
        setWizard((prev: WizardState) => ({
          ...prev,
          isValidating: false,
          error: `CSV is missing columns expected by mapping profile "${selectedProfile.name}":\n\nExpected columns: ${missingCsvColumns.join(", ")}\n\nFound columns: ${rawHeaders.join(", ")}\n\nPlease check that you selected the correct mapping profile for this CSV file.`,
        }));
        return;
      }

      // Transform headers using the mapping profile
      const headers = transformHeadersWithMapping(rawHeaders, selectedProfile.column_mappings);

      // Build filtered schema (same logic as UploadClient)
      const schema = TABLE_SCHEMAS[datasetType];
      if (!schema) {
        setWizard((prev: WizardState) => ({ ...prev, isValidating: false, error: `No schema defined for table "${datasetType}".` }));
        return;
      }

      const mappedFields = Object.keys(selectedProfile.column_mappings).filter(
        (field) => selectedProfile.column_mappings[field]
      );
      const trulyRequired = TRULY_REQUIRED_FIELDS[datasetType] || [];
      const fieldsToValidate = new Set([...mappedFields, ...trulyRequired]);
      const filteredSchema = {
        required: schema.required.filter((field) => fieldsToValidate.has(field)),
        numeric: schema.numeric,
      };

      // Validate and build records
      const { records, yearsInData, issues } = validateAndBuildRecords(
        datasetType,
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
        const extra = issues.length > sample.length
          ? `\n...and ${issues.length - sample.length} more issue(s).`
          : "";

        setWizard((prev: WizardState) => ({
          ...prev,
          isValidating: false,
          validationError: `CSV validation failed. Fix these issues and try again:\n\n${formatted.join("\n")}${extra}`,
        }));
        return;
      }

      // Replace year validation (same as UploadClient)
      let targetYear: number | null = null;
      if (mode === "replace_year") {
        targetYear = Number(replaceYear);
        if (!Number.isFinite(targetYear)) {
          setWizard((prev: WizardState) => ({ ...prev, isValidating: false, error: "Fiscal year must be a valid number." }));
          return;
        }
        if (yearsInData.length === 0) {
          setWizard((prev: WizardState) => ({ ...prev, isValidating: false, error: "CSV contains no fiscal_year values; cannot perform year-specific replace." }));
          return;
        }
        const otherYears = yearsInData.filter((y) => y !== targetYear);
        if (otherYears.length > 0) {
          setWizard((prev: WizardState) => ({
            ...prev,
            isValidating: false,
            error: `CSV contains multiple fiscal years (${yearsInData.join(", ")}). For 'Replace this fiscal year only', upload a file that only contains fiscal_year = ${targetYear}.`,
          }));
          return;
        }
      }

      // Build preflight and move to step 3
      setWizard((prev: WizardState) => ({
        ...prev,
        isValidating: false,
        preflight: {
          table: datasetType,
          rowCount: records.length,
          yearsInData,
          mode,
          replaceYear: targetYear,
        },
        pendingRecords: records,
        pendingYearsInData: yearsInData,
        validationError: null,
        error: null,
        step: 3,
      }));
    } catch (err) {
      console.error("Validation error:", err);
      setWizard((prev: WizardState) => ({
        ...prev,
        isValidating: false,
        error: "Failed to process CSV: " + (err instanceof Error ? err.message : "Unknown error"),
      }));
    }
  }

  // ============================================================================
  // Upload (Step 3 → Step 4) - Chunking logic preserved from UploadClient
  // ============================================================================

  async function handleUpload() {
    const { preflight, pendingRecords, pendingYearsInData, file } = wizard;

    if (!preflight || !pendingRecords || pendingRecords.length === 0 || !file) {
      setWizard((prev: WizardState) => ({ ...prev, error: "No upload is prepared. Choose a file, generate the summary, and try again." }));
      return;
    }

    setWizard((prev: WizardState) => ({
      ...prev,
      isUploading: true,
      error: null,
      uploadProgress: `Uploading ${pendingRecords.length.toLocaleString()} rows...`,
    }));

    try {
      const token = await getAuthToken();
      if (!token) {
        setWizard((prev: WizardState) => ({
          ...prev,
          isUploading: false,
          uploadProgress: null,
          error: "You must be signed in as an admin to upload data. Please log in again.",
        }));
        return;
      }

      console.log("UPLOAD_WIZARD_BUILD", "chunking-bytes-v2", new Date().toISOString());

      // Byte-based chunking to stay under Vercel's 4.5MB request limit
      // Row count varies by table width, so we calculate actual JSON size
      const MAX_BYTES = 3_800_000; // Safe margin under 4.5MB
      const totalRecords = pendingRecords.length;

      let start = 0;
      let chunkIndex = 0;
      let insertedTotal = 0;

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

        const estimatedTotalChunks = Math.ceil(totalRecords / (chunk.length || 1));

        console.log(`[upload] chunk ${chunkIndex + 1}`, { start, end, rows: chunk.length, bytes, mode: chunkMode });

        setWizard((prev: WizardState) => ({
          ...prev,
          uploadProgress: `Uploading chunk ${chunkIndex + 1} of ~${estimatedTotalChunks} (${chunk.length.toLocaleString()} rows, ${(bytes / 1_000_000).toFixed(1)}MB)...`,
        }));

        const resp = await csrfFetch("/api/admin/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
          setWizard((prev: WizardState) => ({
            ...prev,
            isUploading: false,
            uploadProgress: null,
            error: `Upload failed on chunk ${chunkIndex + 1}. ${insertedTotal.toLocaleString()} rows were inserted before the error. Error: ${errorMsg}`,
          }));
          return;
        }

        if (!contentType.includes("application/json")) {
          const text = await resp.text();
          console.error("Non-JSON response:", contentType, text.slice(0, 200));
          setWizard((prev: WizardState) => ({
            ...prev,
            isUploading: false,
            uploadProgress: null,
            error: `Unexpected response format: ${text.slice(0, 200)}`,
          }));
          return;
        }

        await resp.json(); // Consume response
        insertedTotal += chunk.length;
        start = end;
        chunkIndex++;
      }

      // Success!
      const successMessage = `Successfully uploaded ${insertedTotal.toLocaleString()} records to "${preflight.table}" in ${chunkIndex} chunk(s).`;

      setWizard((prev: WizardState) => ({
        ...prev,
        isUploading: false,
        uploadProgress: null,
        uploadSuccess: true,
        uploadMessage: successMessage,
        step: 4,
      }));

      // Refresh coverage warnings after successful upload
      await refreshCoverageWarnings();

    } catch (err) {
      console.error("Upload error:", err);
      setWizard((prev: WizardState) => ({
        ...prev,
        isUploading: false,
        uploadProgress: null,
        error: "Upload failed: " + (err instanceof Error ? err.message : "Unknown error"),
      }));
    }
  }

  // ============================================================================
  // Download Template
  // ============================================================================

  function handleDownloadTemplate() {
    const csv = buildTemplateCsv(wizard.datasetType);
    if (!csv) {
      setWizard((prev: WizardState) => ({ ...prev, error: `No template available for table "${wizard.datasetType}".` }));
      return;
    }
    downloadCsv(csv, `${wizard.datasetType}_template.csv`);
  }

  // ============================================================================
  // Wizard Controls
  // ============================================================================

  function openWizard() {
    setWizard(getInitialWizardState());
    setShowWizard(true);
  }

  function closeWizard() {
    setShowWizard(false);
  }

  // Get currently selected profile
  const selectedProfile = mappingProfiles.find((p: MappingProfile) => p.id === wizard.matchedProfileId);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Upload</h1>
          <p className="mt-1 text-sm text-slate-600">
            Upload CSV files for budgets, actuals, transactions, or revenues.
          </p>
        </div>
        <button
          onClick={openWizard}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
          Upload Data
        </button>
      </div>

      {/* Coverage Warnings */}
      {coverageWarnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-900">
          <p className="font-semibold">Data coverage warning</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
            {coverageWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Info Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Getting Started</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="text-slate-400">1.</span>
            <span>
              First, create a mapping profile in{" "}
              <a href={cityHref("/admin/mapping")} className="font-medium underline">
                CSV Mapping
              </a>{" "}
              to match your file structure.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400">2.</span>
            <span>Click &quot;Upload Data&quot; to start the upload wizard.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-400">3.</span>
            <span>Your file will be automatically matched to a saved mapping profile.</span>
          </li>
        </ul>
      </div>

      {/* ======================================================================== */}
      {/* Wizard Modal */}
      {/* ======================================================================== */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            {/* Wizard Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Upload Data</h2>
              <button
                onClick={closeWizard}
                disabled={wizard.isUploading}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Step Indicator */}
            <div className="mb-6 flex items-center justify-center gap-2">
              {[1, 2, 3, 4].map((step) => (
                <React.Fragment key={step}>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                      wizard.step >= step
                        ? "bg-slate-900 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {wizard.step > step ? "✓" : step}
                  </div>
                  {step < 4 && (
                    <div className={`h-0.5 w-8 ${wizard.step > step ? "bg-slate-900" : "bg-slate-200"}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Step Content */}
            <div className="min-h-[400px]">
              {/* ============================================================== */}
              {/* Step 1: Select Data Type */}
              {/* ============================================================== */}
              {wizard.step === 1 && (
                <div className="space-y-4">
                  <p className="text-slate-600">What type of data are you uploading?</p>

                  <div className="space-y-3">
                    {(["budgets", "actuals", "transactions", "revenues"] as DatasetType[]).map((type) => (
                      <label
                        key={type}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
                          wizard.datasetType === type
                            ? "border-slate-900 bg-slate-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="datasetType"
                          checked={wizard.datasetType === type}
                          onChange={() => setWizard((prev: WizardState) => ({ ...prev, datasetType: type }))}
                          className="mt-0.5 h-4 w-4"
                        />
                        <div>
                          <div className="font-medium text-slate-900">{DATASET_INFO[type].label}</div>
                          <div className="text-sm text-slate-500">{DATASET_INFO[type].description}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Warning for selected type */}
                  {DATASET_INFO[wizard.datasetType].warning && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                      <span className="font-semibold">Important:</span> {DATASET_INFO[wizard.datasetType].warning}
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={() => setWizard((prev: WizardState) => ({ ...prev, step: 2 }))}
                      className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* Step 2: Upload & Configure */}
              {/* ============================================================== */}
              {wizard.step === 2 && (
                <div className="space-y-6">
                  {/* File Upload */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">Upload CSV file</label>
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="text-xs text-slate-600 underline hover:text-slate-900"
                      >
                        Download template
                      </button>
                    </div>
                    
                    {/* Styled drop zone */}
                    {!wizard.file ? (
                      <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-blue-400 hover:bg-blue-50">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileSelect}
                          className="sr-only"
                        />
                        <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                        </svg>
                        <span className="mt-2 text-sm font-medium text-slate-600">Click to choose a CSV file</span>
                        <span className="mt-1 text-xs text-slate-500">or drag and drop</span>
                      </label>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-800">{wizard.file.name}</p>
                            <p className="text-xs text-green-600">{wizard.previewMessage}</p>
                          </div>
                        </div>
                        <label className="cursor-pointer text-xs font-medium text-green-700 underline hover:text-green-900">
                          <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="sr-only"
                          />
                          Change file
                        </label>
                      </div>
                    )}
                    
                    <p className="mt-2 text-xs text-slate-500">
                      Accepted format: .csv • Large files up to 100MB supported
                    </p>
                    {wizard.fileSizeWarning && (
                      <p
                        className={`mt-2 text-sm ${
                          wizard.fileSizeWarning.includes("exceeds") ? "text-red-600" : "text-amber-600"
                        }`}
                      >
                        {wizard.fileSizeWarning}
                      </p>
                    )}
                  </div>

                  {/* Match Status */}
                  {wizard.file && wizard.matchStatus && (
                    <div>
                      {wizard.matchStatus === "checking" && (
                        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                          Checking file structure...
                        </div>
                      )}
                      {wizard.matchStatus === "matched" && (
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                          ✓ File matches mapping <strong>&quot;{wizard.matchedProfileName}&quot;</strong>. Ready to upload.
                        </div>
                      )}
                      {wizard.matchStatus === "matched_extra" && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                          <p>
                            ✓ File matches mapping <strong>&quot;{wizard.matchedProfileName}&quot;</strong> but has
                            unmapped column(s): <strong>{wizard.extraColumns.join(", ")}</strong>
                          </p>
                          <p className="mt-1">Please double check the file before proceeding. Unmapped columns will be ignored.</p>
                        </div>
                      )}
                      {wizard.matchStatus === "no_match" && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                          <p className="font-semibold">No matching mapping found for this file structure.</p>
                          <p className="mt-1">
                            Go to{" "}
                            <a href={cityHref("/admin/mapping")} className="underline font-medium">
                              CSV Mapping
                            </a>{" "}
                            to create a mapping for this file format.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CSV Preview */}
                  {wizard.previewHeaders && wizard.previewRows && wizard.previewRows.length > 0 && (
                    <div className="rounded-md border border-slate-200 bg-slate-50 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-100 text-xs font-medium text-slate-600">CSV Preview</div>
                      <div className="max-h-48 overflow-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-100 sticky top-0">
                            <tr>
                              {wizard.previewHeaders.map((h, i) => (
                                <th
                                  key={i}
                                  className="whitespace-nowrap px-2 py-1 text-left font-semibold text-slate-700"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {wizard.previewRows.slice(0, 5).map((row, idx) => (
                              <tr key={idx} className="border-t border-slate-200">
                                {row.map((cell, cellIdx) => (
                                  <td key={cellIdx} className="whitespace-nowrap px-2 py-1 text-slate-800">
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

                  {/* Upload Mode - only show if we have a match */}
                  {(wizard.matchStatus === "matched" || wizard.matchStatus === "matched_extra") && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Upload mode</label>
                      <div className="space-y-2">
                        <label
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                            wizard.mode === "append" ? "border-slate-900 bg-slate-50" : "border-slate-200"
                          }`}
                        >
                          <input
                            type="radio"
                            checked={wizard.mode === "append"}
                            onChange={() => setWizard((prev: WizardState) => ({ ...prev, mode: "append" }))}
                            className="mt-0.5 h-4 w-4"
                          />
                          <div>
                            <div className="font-medium text-slate-900">Append</div>
                            <div className="text-sm text-slate-500">Add new rows. Existing data is not changed.</div>
                          </div>
                        </label>

                        <label
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                            wizard.mode === "replace_year" ? "border-slate-900 bg-slate-50" : "border-slate-200"
                          }`}
                        >
                          <input
                            type="radio"
                            checked={wizard.mode === "replace_year"}
                            onChange={() => setWizard((prev: WizardState) => ({ ...prev, mode: "replace_year" }))}
                            className="mt-0.5 h-4 w-4"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">Replace this fiscal year only</div>
                            <div className="text-sm text-slate-500">
                              Delete existing rows for a single fiscal year, then insert rows from this file.
                            </div>
                          </div>
                        </label>

                        <label
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                            wizard.mode === "replace_table" ? "border-slate-900 bg-slate-50" : "border-slate-200"
                          }`}
                        >
                          <input
                            type="radio"
                            checked={wizard.mode === "replace_table"}
                            onChange={() => setWizard((prev: WizardState) => ({ ...prev, mode: "replace_table" }))}
                            className="mt-0.5 h-4 w-4"
                          />
                          <div>
                            <div className="font-medium text-slate-900">Replace entire table</div>
                            <div className="text-sm text-slate-500">
                              Delete ALL existing rows in this table, then insert rows from this file.
                            </div>
                          </div>
                        </label>
                      </div>

                      {/* Replace Year Config */}
                      {wizard.mode === "replace_year" && (
                        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                          <p className="font-semibold">Replace this fiscal year only</p>
                          <p className="mt-1">
                            All existing rows for a single fiscal year will be deleted before inserting rows from this file.
                          </p>
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-medium whitespace-nowrap">Fiscal year to replace:</label>
                              <input
                                type="text"
                                value={wizard.replaceYear}
                                onChange={(e) => setWizard((prev: WizardState) => ({ ...prev, replaceYear: e.target.value }))}
                                placeholder="e.g. 2024"
                                className="w-20 rounded-md border border-slate-300 px-2 py-1 text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-medium whitespace-nowrap">Confirm fiscal year:</label>
                              <input
                                type="text"
                                value={wizard.replaceYearConfirm}
                                onChange={(e) => setWizard((prev: WizardState) => ({ ...prev, replaceYearConfirm: e.target.value }))}
                                placeholder="Type the same fiscal year again"
                                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Replace Table Config */}
                      {wizard.mode === "replace_table" && (
                        <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-900">
                          <p className="font-semibold">Danger: replace entire table</p>
                          <p className="mt-1">
                            This will permanently delete all existing rows in the{" "}
                            <span className="font-mono">{wizard.datasetType}</span> table before inserting rows from this
                            file.
                          </p>
                          <label className="mt-2 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={wizard.replaceTableConfirmed}
                              onChange={(e) => setWizard((prev: WizardState) => ({ ...prev, replaceTableConfirmed: e.target.checked }))}
                            />
                            <span>
                              I understand this will delete all existing data in the{" "}
                              <span className="font-mono">{wizard.datasetType}</span> table.
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {wizard.error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">{wizard.error}</div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between pt-4">
                    <button
                      onClick={() => setWizard((prev: WizardState) => ({ ...prev, step: 1, error: null }))}
                      className="rounded px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleValidate}
                      disabled={
                        !wizard.file ||
                        wizard.matchStatus === "no_match" ||
                        wizard.matchStatus === "checking" ||
                        !wizard.matchStatus ||
                        wizard.isValidating
                      }
                      className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {wizard.isValidating ? "Validating..." : "Validate →"}
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* Step 3: Review */}
              {/* ============================================================== */}
              {wizard.step === 3 && wizard.preflight && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="rounded-lg bg-slate-50 p-4">
                    <h3 className="mb-3 font-medium text-slate-900">Upload Summary</h3>
                    <dl className="grid gap-2 sm:grid-cols-2 text-sm">
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Target table</dt>
                        <dd className="text-slate-900">{wizard.preflight.table}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Mapping profile</dt>
                        <dd className="text-slate-900">{selectedProfile?.name || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Rows to upload</dt>
                        <dd className="text-slate-900">{wizard.preflight.rowCount.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Fiscal years detected</dt>
                        <dd className="text-slate-900">
                          {wizard.preflight.yearsInData.length === 0
                            ? "None"
                            : wizard.preflight.yearsInData.slice().sort((a, b) => a - b).join(", ")}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-medium text-slate-500">Upload mode</dt>
                        <dd className="text-slate-900">
                          {wizard.preflight.mode === "append" && "Append: add new rows without deleting existing data."}
                          {wizard.preflight.mode === "replace_year" &&
                            `Replace year: delete all rows for fiscal year ${wizard.preflight.replaceYear} and insert these rows.`}
                          {wizard.preflight.mode === "replace_table" &&
                            "Replace table: delete ALL rows in this table and insert these rows."}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Warnings */}
                  {wizard.preflight.mode === "replace_table" && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                      <strong>Warning:</strong> This will permanently delete all existing data in the{" "}
                      {wizard.preflight.table} table.
                    </div>
                  )}
                  {wizard.preflight.mode === "replace_year" && (
                    <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
                      All existing rows for fiscal year {wizard.preflight.replaceYear} will be deleted before inserting
                      the new data.
                    </div>
                  )}

                  {/* Validation Error */}
                  {wizard.validationError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">
                      {wizard.validationError}
                    </div>
                  )}

                  {/* Error */}
                  {wizard.error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">{wizard.error}</div>
                  )}

                  {/* Upload Progress */}
                  {wizard.isUploading && wizard.uploadProgress && (
                    <div className="flex items-center gap-3 p-3 rounded-md bg-slate-100">
                      <svg className="h-5 w-5 animate-spin text-slate-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span className="text-sm text-slate-700">{wizard.uploadProgress}</span>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between pt-4">
                    <button
                      onClick={() => setWizard((prev: WizardState) => ({ ...prev, step: 2, error: null, validationError: null }))}
                      disabled={wizard.isUploading}
                      className="rounded px-4 py-2 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={wizard.isUploading || !!wizard.validationError}
                      className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {wizard.isUploading ? "Uploading..." : "Confirm Upload"}
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* Step 4: Success */}
              {/* ============================================================== */}
              {wizard.step === 4 && wizard.uploadSuccess && (
                <div className="space-y-6 text-center py-8">
                  <div className="text-5xl">✓</div>
                  <h3 className="text-xl font-semibold text-slate-900">Upload Complete</h3>

                  <div className="rounded-lg bg-green-50 p-4 text-left">
                    <p className="text-sm text-green-800">{wizard.uploadMessage}</p>
                  </div>

                  <div className="flex justify-center gap-3 pt-4">
                    <button
                      onClick={closeWizard}
                      className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                    >
                      Done
                    </button>
                    <button
                      onClick={openWizard}
                      className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Upload Another
                    </button>
                    <a
                      href={cityHref("/admin/upload/history")}
                      className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      View History
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
