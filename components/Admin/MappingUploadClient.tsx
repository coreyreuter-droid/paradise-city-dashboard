// components/Admin/MappingUploadClient.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Types
type DatasetType = "budgets" | "actuals" | "transactions" | "revenues" | "funds_lookup" | "departments_lookup";
type ImportMode = "append" | "replace_year" | "replace_all";
type WizardStep = "upload" | "mapping" | "validate" | "import" | "complete";

interface ColumnMapping {
  csvColumnIndex: number;
  csvColumnName: string;
  targetField: string;
  enabled: boolean;
}

interface UploadPreview {
  raw_file: {
    id: string;
    filename: string;
    file_size_bytes: number;
  };
  preview: {
    headers: string[];
    sample_rows: string[][];
    total_rows: number;
  };
  detected_mappings: Record<string, ColumnMapping>;
  active_profile: unknown | null;
}

interface ValidationResult {
  job_id: string;
  validation: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    warningRows: number;
    errorCount: number;
    warningCount: number;
    errorsByCode: Record<string, number>;
    sampleErrors: Array<{
      row_number: number;
      error_code: string;
      error_level: string;
      message: string;
      field_name?: string;
      field_value?: string;
    }>;
    detected_years: number[];
  };
  delete_preview: {
    mode: string;
    target_year?: number;
    rows_to_delete: number;
    fiscal_years_affected: number[];
  } | null;
  can_import: boolean;
}

// Field definitions for each dataset type
const DATASET_FIELDS: Record<DatasetType, { name: string; label: string; required: boolean }[]> = {
  budgets: [
    { name: "fiscal_year", label: "Fiscal Year", required: true },
    { name: "fund_code", label: "Fund Code", required: false },
    { name: "fund_name", label: "Fund Name", required: false },
    { name: "department_code", label: "Department Code", required: false },
    { name: "department_name", label: "Department Name", required: false },
    { name: "category", label: "Category", required: false },
    { name: "account_code", label: "Account Code", required: false },
    { name: "account_name", label: "Account Name", required: false },
    { name: "amount", label: "Amount", required: true },
  ],
  actuals: [
    { name: "fiscal_year", label: "Fiscal Year", required: true },
    { name: "period", label: "Period (YYYY-MM)", required: true },
    { name: "fund_code", label: "Fund Code", required: false },
    { name: "fund_name", label: "Fund Name", required: false },
    { name: "department_code", label: "Department Code", required: false },
    { name: "department_name", label: "Department Name", required: false },
    { name: "category", label: "Category", required: false },
    { name: "account_code", label: "Account Code", required: false },
    { name: "account_name", label: "Account Name", required: false },
    { name: "amount", label: "Amount", required: true },
  ],
  transactions: [
    { name: "fiscal_year", label: "Fiscal Year", required: true },
    { name: "date", label: "Date", required: true },
    { name: "fund_code", label: "Fund Code", required: false },
    { name: "fund_name", label: "Fund Name", required: false },
    { name: "department_code", label: "Department Code", required: false },
    { name: "department_name", label: "Department Name", required: false },
    { name: "account_code", label: "Account Code", required: false },
    { name: "account_name", label: "Account Name", required: false },
    { name: "vendor", label: "Vendor", required: false },
    { name: "description", label: "Description", required: false },
    { name: "amount", label: "Amount", required: true },
  ],
  revenues: [
    { name: "fiscal_year", label: "Fiscal Year", required: true },
    { name: "period", label: "Period (YYYY-MM)", required: true },
    { name: "fund_code", label: "Fund Code", required: false },
    { name: "fund_name", label: "Fund Name", required: false },
    { name: "department_code", label: "Department Code", required: false },
    { name: "department_name", label: "Department Name", required: false },
    { name: "category", label: "Category", required: false },
    { name: "account_code", label: "Account Code", required: false },
    { name: "account_name", label: "Account Name", required: false },
    { name: "amount", label: "Amount", required: true },
  ],
  funds_lookup: [
    { name: "fund_code", label: "Fund Code", required: true },
    { name: "fund_name", label: "Fund Name", required: true },
  ],
  departments_lookup: [
    { name: "department_code", label: "Department Code", required: true },
    { name: "department_name", label: "Department Name", required: true },
  ],
};

const DATASET_LABELS: Record<DatasetType, string> = {
  budgets: "Budgets",
  actuals: "Actuals",
  transactions: "Transactions",
  revenues: "Revenues",
  funds_lookup: "Fund Names (Lookup)",
  departments_lookup: "Department Names (Lookup)",
};

export default function MappingUploadClient() {
  // Wizard state
  const [step, setStep] = useState<WizardStep>("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  // Upload step state
  const [datasetType, setDatasetType] = useState<DatasetType>("budgets");
  const [file, setFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<UploadPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Mapping step state
  const [columnMappings, setColumnMappings] = useState<Record<string, ColumnMapping>>({});

  // Validate step state
  const [importMode, setImportMode] = useState<ImportMode>("append");
  const [replaceYear, setReplaceYear] = useState<string>("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Import step state
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [pollCount, setPollCount] = useState<number>(0);

  // Save profile state
  const [showSaveProfileModal, setShowSaveProfileModal] = useState(false);
  const [saveProfileName, setSaveProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveProfileError, setSaveProfileError] = useState<string | null>(null);
  const [saveProfileSuccess, setSaveProfileSuccess] = useState(false);

  const messageRef = useRef<HTMLDivElement | null>(null);

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

  function clearMessage() {
    setMessage(null);
    setMessageIsError(false);
  }

  function resetWizard() {
    setStep("upload");
    setFile(null);
    setUploadPreview(null);
    setColumnMappings({});
    setValidationResult(null);
    setJobId(null);
    setJobStatus(null);
    setJobProgress(0);
    setPollCount(0);
    setImportMode("append");
    setReplaceYear("");
    clearMessage();
    // Reset save profile state
    setShowSaveProfileModal(false);
    setSaveProfileName("");
    setSaveProfileError(null);
    setSaveProfileSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Get auth token
  async function getAuthToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  // ============================================================================
  // STEP 1: UPLOAD
  // ============================================================================

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setUploadPreview(null);
    clearMessage();
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select a CSV file.");
      return;
    }

    setIsLoading(true);
    clearMessage();

    try {
      const token = await getAuthToken();
      if (!token) {
        setError("Not authenticated. Please log in again.");
        setIsLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("dataset_type", datasetType);

      const res = await fetch("/api/admin/ingestion/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        setIsLoading(false);
        return;
      }

      setUploadPreview(data);
      setColumnMappings(data.detected_mappings || {});
      setInfo(`File uploaded. ${data.preview.total_rows.toLocaleString()} rows detected.`);
      setStep("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================================================
  // STEP 2: MAPPING
  // ============================================================================

  function handleMappingChange(targetField: string, csvColumnIndex: number) {
    const headers = uploadPreview?.preview.headers ?? [];
    
    setColumnMappings(prev => ({
      ...prev,
      [targetField]: {
        csvColumnIndex,
        csvColumnName: headers[csvColumnIndex] || "",
        targetField,
        enabled: csvColumnIndex >= 0,
      },
    }));
  }

  function isMappingComplete(): boolean {
    const requiredFields = DATASET_FIELDS[datasetType].filter(f => f.required);
    
    for (const field of requiredFields) {
      const mapping = columnMappings[field.name];
      if (!mapping || !mapping.enabled || mapping.csvColumnIndex < 0) {
        return false;
      }
    }
    
    return true;
  }

  // ============================================================================
  // SAVE MAPPING PROFILE
  // ============================================================================

  async function handleSaveProfile() {
    if (!saveProfileName.trim()) {
      setSaveProfileError("Please enter a profile name");
      return;
    }

    setSavingProfile(true);
    setSaveProfileError(null);
    setSaveProfileSuccess(false);

    try {
      const token = await getAuthToken();
      if (!token) {
        setSaveProfileError("Not authenticated");
        setSavingProfile(false);
        return;
      }

      // Build the column_mappings object for the profile
      // Format: { targetField: csvColumnName }
      const profileMappings: Record<string, string> = {};
      for (const [targetField, mapping] of Object.entries(columnMappings)) {
        if (mapping.enabled && mapping.csvColumnIndex >= 0) {
          profileMappings[targetField] = mapping.csvColumnName;
        }
      }

      const res = await fetch("/api/admin/mapping-profiles", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: saveProfileName.trim(),
          dataset_type: datasetType,
          column_mappings: profileMappings,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveProfileError(data.error || "Failed to save profile");
        setSavingProfile(false);
        return;
      }

      setSaveProfileSuccess(true);
      setInfo(`Mapping profile "${saveProfileName.trim()}" saved successfully! You can now use it from the Upload page.`);
      
      // Close modal after short delay
      setTimeout(() => {
        setShowSaveProfileModal(false);
        setSaveProfileName("");
        setSaveProfileSuccess(false);
      }, 2000);

    } catch (err) {
      setSaveProfileError("Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  // ============================================================================
  // STEP 3: VALIDATE
  // ============================================================================

  async function handleValidate() {
    if (!uploadPreview) return;

    setIsLoading(true);
    clearMessage();

    try {
      const token = await getAuthToken();
      if (!token) {
        setError("Not authenticated.");
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/admin/ingestion/validate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw_file_id: uploadPreview.raw_file.id,
          column_mappings: columnMappings,
          import_mode: importMode,
          replace_target_year: importMode === "replace_year" ? parseInt(replaceYear, 10) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Validation failed");
        setIsLoading(false);
        return;
      }

      setValidationResult(data);
      setJobId(data.job_id);
      
      if (data.can_import) {
        setInfo(`Validation passed. ${data.validation.validRows.toLocaleString()} rows ready to import.`);
      } else {
        setError(`Validation found ${data.validation.invalidRows.toLocaleString()} rows with errors.`);
      }
      
      setStep("validate");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================================================
  // STEP 4: IMPORT
  // ============================================================================

  async function handleStartImport() {
    if (!jobId) return;

    setIsLoading(true);
    clearMessage();

    try {
      const token = await getAuthToken();
      if (!token) {
        setError("Not authenticated.");
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/admin/ingestion/jobs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job_id: jobId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start import");
        setIsLoading(false);
        return;
      }

      setInfo("Import started. Processing...");
      setStep("import");
      
      // Start polling for job status
      pollJobStatus(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start import");
    } finally {
      setIsLoading(false);
    }
  }

  async function pollJobStatus(id: string) {
    const token = await getAuthToken();
    if (!token) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/ingestion/jobs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          setError("Failed to fetch job status. Please refresh the page and check the Data Management page for job status.");
          return;
        }

        const job = data.job;
        setJobStatus(job.status);
        setJobProgress(job.progress || 0);
        setPollCount(prev => prev + 1);

        if (job.status === "completed" || job.status === "completed_with_warnings") {
          setStep("complete");
          setInfo(`Import complete! ${job.rows_loaded.toLocaleString()} rows imported.`);
        } else if (job.status === "failed") {
          setError(`Import failed: ${job.last_error || "Unknown error"}`);
          setStep("validate"); // Go back to validate step so they can retry
        } else if (job.status === "pending" && pollCount > 30) {
          // Job stuck at pending for over 60 seconds (30 polls * 2 seconds)
          setError("Import appears to be stuck in the queue. If this problem persists, contact your CiviPortal admin or reach out to us at hello@civiportal.com");
          return; // Stop polling
        } else {
          // Continue polling
          setTimeout(poll, 2000);
        }
      } catch (err) {
        console.error("Poll error:", err);
        // Network error - retry with backoff
        setTimeout(poll, 5000);
      }
    };

    poll();
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  const headers = uploadPreview?.preview.headers ?? [];
  const sampleRows = uploadPreview?.preview.sample_rows ?? [];

  return (
    <div className="space-y-6">
      {/* Progress steps */}
      <nav aria-label="Upload wizard progress" className="mb-6">
        <ol className="flex items-center gap-2 text-xs">
          {(["upload", "mapping", "validate", "import", "complete"] as WizardStep[]).map((s, i) => {
            const labels = {
              upload: "1. Upload",
              mapping: "2. Map columns",
              validate: "3. Validate",
              import: "4. Import",
              complete: "5. Complete",
            };
            const isCurrent = step === s;
            const isPast = ["upload", "mapping", "validate", "import", "complete"].indexOf(step) > i;

            // Complete step should be green when current
            const isCompleteStep = s === "complete";
            const showGreen = isPast || (isCurrent && isCompleteStep);

            return (
              <li key={s} className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    showGreen
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {showGreen ? "✓" : i + 1}
                </span>
                <span className={isCurrent ? "font-semibold text-slate-900" : "text-slate-500"}>
                  {labels[s]}
                </span>
                {i < 4 && <span className="text-slate-300">→</span>}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          {/* Dataset type selector */}
          <div>
            <label htmlFor="dataset-type" className="block text-xs font-semibold text-slate-700 mb-1">
              Dataset type
            </label>
            <select
              id="dataset-type"
              value={datasetType}
              onChange={(e) => {
                setDatasetType(e.target.value as DatasetType);
                resetWizard();
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <optgroup label="Financial Data">
                <option value="budgets">Budgets</option>
                <option value="actuals">Actuals</option>
                <option value="transactions">Transactions</option>
                <option value="revenues">Revenues</option>
              </optgroup>
              <optgroup label="Lookup Tables">
                <option value="funds_lookup">Fund Names (Lookup)</option>
                <option value="departments_lookup">Department Names (Lookup)</option>
              </optgroup>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Select the type of data you&apos;re uploading. Lookup tables help label codes with human-readable names.
            </p>
          </div>

          {/* File input */}
          <div>
            <label htmlFor="csv-file" className="block text-xs font-semibold text-slate-700 mb-1">
              CSV file
            </label>
            <div className="flex items-center gap-3">
              <label
                htmlFor="csv-file"
                className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 px-4 py-3 hover:border-slate-400 hover:bg-slate-50"
              >
                <input
                  ref={fileInputRef}
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-700">
                    {file ? file.name : "Choose a CSV file"}
                  </span>
                  {file && (
                    <span className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
                <span className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                  Browse
                </span>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || isLoading}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            {isLoading ? "Uploading..." : "Upload & detect columns"}
          </button>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === "mapping" && uploadPreview && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              File: {uploadPreview.raw_file.filename}
            </h3>
            <p className="text-xs text-slate-600">
              {uploadPreview.preview.total_rows.toLocaleString()} rows • {headers.length} columns detected
            </p>
          </div>

          {/* Column mapping table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Map CSV columns to fields</h3>
            <p className="text-xs text-slate-500 mb-3">
              Match each required field to a column in your CSV. Fields marked with * are required.
            </p>
            
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Target Field</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">CSV Column</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Sample Value</th>
                  </tr>
                </thead>
                <tbody>
                  {DATASET_FIELDS[datasetType].map((field) => {
                    const mapping = columnMappings[field.name];
                    const sampleValue = mapping?.csvColumnIndex >= 0 && sampleRows[0]
                      ? sampleRows[0][mapping.csvColumnIndex] || ""
                      : "";

                    // Get indices that are already used by OTHER fields
                    const usedIndices = new Set(
                      Object.entries(columnMappings)
                        .filter(([key, m]) => key !== field.name && m.csvColumnIndex >= 0)
                        .map(([, m]) => m.csvColumnIndex)
                    );

                    return (
                      <tr key={field.name} className="border-t border-slate-200">
                        <td className="px-3 py-2">
                          <span className={field.required ? "font-medium" : ""}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={mapping?.csvColumnIndex ?? -1}
                            onChange={(e) => handleMappingChange(field.name, parseInt(e.target.value, 10))}
                            className={`w-full rounded border px-2 py-1 text-sm ${
                              field.required && (!mapping || mapping.csvColumnIndex < 0)
                                ? "border-red-300 bg-red-50"
                                : "border-slate-300"
                            }`}
                          >
                            <option value={-1}>— Not mapped —</option>
                            {headers.map((h, i) => {
                              // Show this option if it's not used by another field
                              // OR if it's the currently selected value for this field
                              const isUsedElsewhere = usedIndices.has(i);
                              const isCurrentSelection = mapping?.csvColumnIndex === i;
                              
                              if (isUsedElsewhere && !isCurrentSelection) {
                                return null; // Hide options already used by other fields
                              }
                              
                              return (
                                <option key={i} value={i}>
                                  {h}
                                </option>
                              );
                            })}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-slate-500 text-xs font-mono">
                          {sampleValue ? sampleValue.slice(0, 30) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview table */}
          {sampleRows.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Data preview</h3>
              <div className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50">
                <div className="max-h-48 overflow-y-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        {headers.map((h, i) => (
                          <th key={i} className="whitespace-nowrap px-2 py-1 text-left font-semibold text-slate-700">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sampleRows.slice(0, 5).map((row, idx) => (
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
            </div>
          )}

          {/* Import mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Import mode</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="import-mode"
                  value="append"
                  checked={importMode === "append"}
                  onChange={() => setImportMode("append")}
                  className="text-slate-900"
                />
                <span className="text-sm">Append: Add rows without deleting existing data</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="import-mode"
                  value="replace_year"
                  checked={importMode === "replace_year"}
                  onChange={() => setImportMode("replace_year")}
                  className="text-slate-900"
                />
                <span className="text-sm">Replace year: Delete all rows for a fiscal year, then insert</span>
              </label>
              {importMode === "replace_year" && (
                <input
                  type="number"
                  placeholder="Fiscal year to replace (e.g., 2024)"
                  value={replaceYear}
                  onChange={(e) => setReplaceYear(e.target.value)}
                  className="ml-6 w-48 rounded border border-slate-300 px-2 py-1 text-sm"
                />
              )}
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="import-mode"
                  value="replace_all"
                  checked={importMode === "replace_all"}
                  onChange={() => setImportMode("replace_all")}
                  className="text-slate-900"
                />
                <span className="text-sm text-red-700 font-medium">
                  Replace all: Delete ALL existing rows, then insert (use with caution!)
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                setSaveProfileError(null);
                setSaveProfileSuccess(false);
                setSaveProfileName("");
                setShowSaveProfileModal(true);
              }}
              disabled={!isMappingComplete()}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              Save as Profile
            </button>
            <button
              type="button"
              onClick={handleValidate}
              disabled={!isMappingComplete() || isLoading}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              {isLoading ? "Validating..." : "Validate data"}
            </button>
          </div>

          {/* Save Profile Modal */}
          {showSaveProfileModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-slate-900">Save Mapping Profile</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Save this column mapping for reuse on the Upload page. This lets you quickly upload files with the same format in the future.
                </p>
                
                <div className="mt-4">
                  <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700">
                    Profile name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={saveProfileName}
                    onChange={(e) => setSaveProfileName(e.target.value)}
                    placeholder="e.g., Tyler Tech Export, Munis Format"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                {saveProfileError && (
                  <p className="mt-2 text-sm text-red-600">{saveProfileError}</p>
                )}

                {saveProfileSuccess && (
                  <p className="mt-2 text-sm text-emerald-600">✓ Profile saved successfully!</p>
                )}

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveProfileModal(false);
                      setSaveProfileName("");
                      setSaveProfileError(null);
                    }}
                    disabled={savingProfile}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={savingProfile || !saveProfileName.trim() || saveProfileSuccess}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {savingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Validation results */}
      {step === "validate" && validationResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className={`rounded-lg border p-4 ${
            validationResult.can_import
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}>
            <h3 className={`text-sm font-semibold ${
              validationResult.can_import ? "text-emerald-900" : "text-red-900"
            }`}>
              {validationResult.can_import ? "✓ Validation passed" : "✗ Validation failed"}
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                <span className="text-slate-600">Total rows:</span>{" "}
                <span className="font-medium">{validationResult.validation.totalRows.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-600">Valid:</span>{" "}
                <span className="font-medium text-emerald-700">{validationResult.validation.validRows.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-600">Errors:</span>{" "}
                <span className="font-medium text-red-700">{validationResult.validation.invalidRows.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-600">Warnings:</span>{" "}
                <span className="font-medium text-amber-700">{validationResult.validation.warningRows.toLocaleString()}</span>
              </div>
            </div>
            {validationResult.validation.detected_years.length > 0 && (
              <p className="mt-2 text-xs text-slate-600">
                Fiscal years detected: {validationResult.validation.detected_years.join(", ")}
              </p>
            )}
          </div>

          {/* Delete preview */}
          {validationResult.delete_preview && validationResult.delete_preview.rows_to_delete > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-900">⚠ Data will be deleted</h3>
              <p className="mt-1 text-xs text-amber-800">
                {validationResult.delete_preview.rows_to_delete.toLocaleString()} existing rows will be deleted
                {validationResult.delete_preview.target_year && ` for fiscal year ${validationResult.delete_preview.target_year}`}.
              </p>
            </div>
          )}

          {/* Error details */}
          {validationResult.validation.sampleErrors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Sample errors ({Math.min(validationResult.validation.sampleErrors.length, 10)} of {validationResult.validation.errorCount})
              </h3>
              <div className="rounded-md border border-slate-200 overflow-hidden">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-2 py-1 text-left font-semibold">Row</th>
                      <th className="px-2 py-1 text-left font-semibold">Field</th>
                      <th className="px-2 py-1 text-left font-semibold">Error</th>
                      <th className="px-2 py-1 text-left font-semibold">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResult.validation.sampleErrors.slice(0, 10).map((err, i) => (
                      <tr key={i} className="border-t border-slate-200">
                        <td className="px-2 py-1 font-mono">{err.row_number}</td>
                        <td className="px-2 py-1">{err.field_name || "—"}</td>
                        <td className="px-2 py-1 text-red-700">{err.message}</td>
                        <td className="px-2 py-1 font-mono text-slate-500">{err.field_value || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("mapping")}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to mapping
            </button>
            {validationResult.can_import && (
              <button
                type="button"
                onClick={handleStartImport}
                disabled={isLoading}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isLoading ? "Starting..." : "Start import"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Import in progress */}
      {step === "import" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
            <div className="flex justify-center mb-4">
              <svg className="h-8 w-8 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Working on it...</h3>
            <p className="mt-1 text-xs text-slate-600">
              Please wait while your data is being imported. This may take a moment.
            </p>
            {pollCount > 15 && (
              <p className="mt-3 text-xs text-amber-600">
                Taking longer than expected. The import is still running — please don&apos;t close this page.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 5: Complete */}
      {step === "complete" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
            <div className="flex justify-center mb-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white text-xl">
                ✓
              </span>
            </div>
            <h3 className="text-lg font-semibold text-emerald-900">Import complete!</h3>
            <p className="mt-1 text-sm text-emerald-800">
              Your data has been successfully imported.
            </p>
          </div>

          <button
            type="button"
            onClick={resetWizard}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Upload another file
          </button>
        </div>
      )}

      {/* Status message */}
      {message && (
        <div
          ref={messageRef}
          tabIndex={-1}
          className={`mt-4 rounded-md p-3 text-sm ${
            messageIsError
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-emerald-50 border border-emerald-200 text-emerald-700"
          }`}
          role={messageIsError ? "alert" : "status"}
        >
          {message}
        </div>
      )}
    </div>
  );
}
