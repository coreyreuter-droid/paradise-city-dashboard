// components/Admin/MappingUploadClient.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getCsrfHeaders } from "@/components/CsrfProvider";

// Types
type DatasetType = "budgets" | "actuals" | "transactions" | "revenues";
type WizardStep = "upload" | "mapping" | "complete";

interface ColumnMapping {
  csvColumnIndex: number;
  csvColumnName: string;
  targetField: string;
  enabled: boolean;
}

interface PreviewData {
  filename: string;
  headers: string[];
  sample_rows: string[][];
  total_rows: number;
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
    { name: "fiscal_year", label: "Fiscal Year (auto-derived from date)", required: false },
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
};

// Header aliases for auto-detection
const HEADER_ALIASES: Record<string, string[]> = {
  fiscal_year: ["fiscal_year", "fiscal year", "fy", "year", "fiscalyear"],
  period: ["period", "month", "yearmonth", "year_month", "accounting_period"],
  date: ["date", "transaction_date", "txn_date", "trans_date", "posting_date"],
  fund_code: ["fund_code", "fund code", "fundcode", "fund", "fund_id", "fund_number"],
  fund_name: ["fund_name", "fund name", "fundname", "fund_description", "fund_desc"],
  department_code: ["department_code", "department code", "deptcode", "dept_code", "dept", "dept_id", "department", "org_code"],
  department_name: ["department_name", "department name", "deptname", "dept_name", "dept_description", "department_description"],
  category: ["category", "budget_category", "expense_category", "account_category", "type"],
  account_code: ["account_code", "account code", "accountcode", "account", "gl_account", "object_code", "object", "acct"],
  account_name: ["account_name", "account name", "accountname", "account_description", "acct_name", "gl_description"],
  vendor: ["vendor", "vendor_name", "vendorname", "payee", "supplier"],
  description: ["description", "desc", "memo", "narrative", "comments", "transaction_description"],
  amount: ["amount", "amt", "total", "dollars", "value", "sum", "budget_amount", "actual_amount"],
};

// Valid fields per dataset type
const VALID_FIELDS: Record<DatasetType, string[]> = {
  budgets: ["fiscal_year", "fund_code", "fund_name", "department_code", "department_name", "category", "account_code", "account_name", "amount"],
  actuals: ["fiscal_year", "period", "fund_code", "fund_name", "department_code", "department_name", "category", "account_code", "account_name", "amount"],
  transactions: ["fiscal_year", "date", "fund_code", "fund_name", "department_code", "department_name", "account_code", "account_name", "vendor", "description", "amount"],
  revenues: ["fiscal_year", "period", "fund_code", "fund_name", "department_code", "department_name", "category", "account_code", "account_name", "amount"],
};

function autoDetectMappings(headers: string[], datasetType: DatasetType): Record<string, ColumnMapping> {
  const mappings: Record<string, ColumnMapping> = {};
  const validFields = new Set(VALID_FIELDS[datasetType] || []);
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_"));

  for (const [targetField, aliases] of Object.entries(HEADER_ALIASES)) {
    if (!validFields.has(targetField)) continue;

    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i];
      if (aliases.includes(header)) {
        mappings[targetField] = {
          csvColumnIndex: i,
          csvColumnName: headers[i],
          targetField,
          enabled: true,
        };
        break;
      }
    }
  }

  return mappings;
}

export default function MappingUploadClient() {
  // Wizard state
  const [step, setStep] = useState<WizardStep>("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  // Upload step state
  const [datasetType, setDatasetType] = useState<DatasetType>("budgets");
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Mapping step state
  const [columnMappings, setColumnMappings] = useState<Record<string, ColumnMapping>>({});
  const [profileName, setProfileName] = useState("");
  const [existingProfileName, setExistingProfileName] = useState<string | null>(null);

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
    setPreviewData(null);
    setColumnMappings({});
    setProfileName("");
    setExistingProfileName(null);
    clearMessage();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function getAuthToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  // ============================================================================
  // STEP 1: UPLOAD SAMPLE FILE
  // ============================================================================

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setPreviewData(null);
    setExistingProfileName(null);
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

      // Preview headers only - don't store file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dataset_type", datasetType);

      const csrfHeaders = getCsrfHeaders();
      const res = await fetch("/api/admin/ingestion/preview-headers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-csrf-token": csrfHeaders.get("x-csrf-token") || "",
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to parse file");
        setIsLoading(false);
        return;
      }

      // Check if this structure already has a mapping
      const matchRes = await fetch("/api/admin/mapping-profiles/check-match", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-csrf-token": csrfHeaders.get("x-csrf-token") || "",
        },
        body: JSON.stringify({
          headers: data.headers,
          dataset_type: datasetType,
        }),
      });

      const matchData = await matchRes.json();

      if (matchRes.ok && matchData.match) {
        setExistingProfileName(matchData.profile.name);
      }

      setPreviewData(data);
      
      // Auto-detect mappings
      const detected = autoDetectMappings(data.headers, datasetType);
      setColumnMappings(detected);
      
      setInfo(`Parsed ${data.total_rows.toLocaleString()} rows, ${data.headers.length} columns.`);
      setStep("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================================================
  // STEP 2: MAPPING
  // ============================================================================

  function handleMappingChange(targetField: string, csvColumnIndex: number) {
    const headers = previewData?.headers ?? [];

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

  async function handleSaveMapping() {
    if (!profileName.trim()) {
      setError("Please enter a name for this mapping.");
      return;
    }

    if (!isMappingComplete()) {
      setError("Please map all required fields before saving.");
      return;
    }

    setIsLoading(true);
    clearMessage();

    try {
      const token = await getAuthToken();
      if (!token) {
        setError("Not authenticated.");
        setIsLoading(false);
        return;
      }

      const csrfHeaders = getCsrfHeaders();

      // Check for duplicate structure one more time
      const matchRes = await fetch("/api/admin/mapping-profiles/check-match", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-csrf-token": csrfHeaders.get("x-csrf-token") || "",
        },
        body: JSON.stringify({
          headers: previewData?.headers || [],
          dataset_type: datasetType,
        }),
      });

      const matchData = await matchRes.json();

      if (matchRes.ok && matchData.match) {
        setError(`This file structure is already saved as "${matchData.profile.name}". Cannot create duplicate mapping.`);
        setIsLoading(false);
        return;
      }

      // Save the mapping profile - convert complex format to simple format
      // Simple format: { targetField: csvColumnName }
      const simpleColumnMappings: Record<string, string> = {};
      for (const [targetField, mapping] of Object.entries(columnMappings)) {
        if (mapping.enabled && mapping.csvColumnIndex >= 0) {
          simpleColumnMappings[targetField] = mapping.csvColumnName;
        }
      }

      // Include original headers for position-based matching
      const originalHeaders = previewData?.headers || [];

      const res = await fetch("/api/admin/mapping-profiles", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-csrf-token": csrfHeaders.get("x-csrf-token") || "",
        },
        body: JSON.stringify({
          name: profileName.trim(),
          dataset_type: datasetType,
          column_mappings: simpleColumnMappings,
          original_headers: originalHeaders,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save mapping");
        setIsLoading(false);
        return;
      }

      setInfo(`Mapping "${profileName}" saved successfully!`);
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save mapping");
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  const headers = previewData?.headers ?? [];
  const sampleRows = previewData?.sample_rows ?? [];

  return (
    <div className="space-y-6">
      {/* Progress steps */}
      <nav aria-label="Mapping wizard progress" className="mb-6">
        <ol className="flex items-center gap-2 text-xs">
          {(["upload", "mapping", "complete"] as WizardStep[]).map((s, i) => {
            const labels = {
              upload: "1. Upload sample",
              mapping: "2. Map columns",
              complete: "3. Done",
            };
            const isCurrent = step === s;
            const isPast = ["upload", "mapping", "complete"].indexOf(step) > i;
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
                {i < 2 && <span className="text-slate-300">-</span>}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              Upload a sample CSV file to create a column mapping. The file will be parsed to detect headers but <strong>no data will be imported</strong>.
            </p>
          </div>

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
                setFile(null);
                setPreviewData(null);
                setExistingProfileName(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <optgroup label="Financial Data">
                <option value="budgets">Budgets</option>
                <option value="actuals">Actuals</option>
                <option value="transactions">Transactions</option>
                <option value="revenues">Revenues</option>
              </optgroup>
            </select>
          </div>

          {/* File input */}
          <div>
            <label htmlFor="csv-file" className="block text-xs font-semibold text-slate-700 mb-1">
              Sample CSV file
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
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {isLoading ? "Parsing..." : "Parse headers"}
          </button>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === "mapping" && previewData && (
        <div className="space-y-4">
          {/* Existing mapping warning */}
          {existingProfileName && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                This file structure is already saved as <strong>&quot;{existingProfileName}&quot;</strong>. You cannot create a duplicate mapping.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              File: {previewData.filename}
            </h3>
            <p className="text-xs text-slate-600">
              {previewData.total_rows.toLocaleString()} rows, {headers.length} columns detected
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
                            disabled={!!existingProfileName}
                            className={`w-full rounded border px-2 py-1 text-sm ${
                              field.required && (!mapping || mapping.csvColumnIndex < 0)
                                ? "border-red-300 bg-red-50"
                                : "border-slate-300"
                            } ${existingProfileName ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <option value={-1}>-- Not mapped --</option>
                            {headers.map((h, i) => {
                              const isUsedElsewhere = usedIndices.has(i);
                              const isCurrentSelection = mapping?.csvColumnIndex === i;

                              if (isUsedElsewhere && !isCurrentSelection) {
                                return null;
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
                          {sampleValue ? sampleValue.slice(0, 30) : "--"}
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

          {/* Profile name input */}
          {!existingProfileName && (
            <div>
              <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Mapping name <span className="text-red-500">*</span>
              </label>
              <input
                id="profile-name"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g., Budget Export FY24"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Give this mapping a descriptive name so you can find it later.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetWizard}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Start over
            </button>
            {!existingProfileName && (
              <button
                type="button"
                onClick={handleSaveMapping}
                disabled={isLoading || !isMappingComplete() || !profileName.trim()}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Save mapping"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Complete */}
      {step === "complete" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
            <div className="flex justify-center mb-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white text-xl">
                ✓
              </span>
            </div>
            <h3 className="text-lg font-semibold text-emerald-900">Mapping saved!</h3>
            <p className="mt-1 text-sm text-emerald-800">
              Your mapping <strong>&quot;{profileName}&quot;</strong> has been saved. You can now use it when uploading data.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetWizard}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Create another mapping
            </button>
            <a
              href="upload"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Go to Data upload
            </a>
          </div>
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
