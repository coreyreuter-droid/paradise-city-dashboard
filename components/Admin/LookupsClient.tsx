// components/Admin/LookupsClient.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";
import {
  FundDimRow,
  DepartmentDimRow,
  LookupAuditLogRow,
  LookupType,
  UploadMode,
  ValidateLookupResponse,
  LookupInputRow,
} from "@/lib/lookups/types";

// ============================================================================
// Types
// ============================================================================

type ViewMode = "current" | "historical" | "all";

interface WizardState {
  step: 1 | 2 | 3 | 4;
  lookupType: LookupType | null;
  file: File | null;
  parsedRows: LookupInputRow[];
  effectiveStartFy: number;
  mode: UploadMode;
  validationResult: ValidateLookupResponse | null;
  isValidating: boolean;
  isApplying: boolean;
  applySuccess: boolean;
  applyResult: { inserted: number; closedOut: number } | null;
  error: string | null;
}

// ============================================================================
// Component
// ============================================================================

export default function LookupsClient() {
  // Tab state
  const [activeTab, setActiveTab] = useState<LookupType>("funds");
  const [viewMode, setViewMode] = useState<ViewMode>("current");
  const [search, setSearch] = useState("");

  // Data state
  const [funds, setFunds] = useState<FundDimRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentDimRow[]>([]);
  const [auditLog, setAuditLog] = useState<LookupAuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Message state
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  // Quick add state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddCode, setQuickAddCode] = useState("");
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddFy, setQuickAddFy] = useState(new Date().getFullYear());
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<FundDimRow | DepartmentDimRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editStartFy, setEditStartFy] = useState<number>(2020);
  const [editEndFy, setEditEndFy] = useState<number | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editConfirmed, setEditConfirmed] = useState(false);

  // Upload wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizard, setWizard] = useState<WizardState>({
    step: 1,
    lookupType: null,
    file: null,
    parsedRows: [],
    effectiveStartFy: new Date().getFullYear(),
    mode: "replace",
    validationResult: null,
    isValidating: false,
    isApplying: false,
    applySuccess: false,
    applyResult: null,
    error: null,
  });

  // Confirmations for apply
  const [confirmRemovals, setConfirmRemovals] = useState(false);
  const [confirmRenames, setConfirmRenames] = useState(false);

  // Unmapped codes state
  const [unmappedFunds, setUnmappedFunds] = useState<string[]>([]);
  const [unmappedDepartments, setUnmappedDepartments] = useState<string[]>([]);
  const [loadingUnmapped, setLoadingUnmapped] = useState(true);

  // ============================================================================
  // Helpers
  // ============================================================================

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
  }

  async function getAuthToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadFunds = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (viewMode === "current") params.set("current_only", "true");
      if (viewMode === "historical") params.set("historical_only", "true");
      if (search) params.set("search", search);
      params.set("include_audit_log", "true");

      const res = await fetch(`/api/admin/lookups/funds?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setFunds(data.funds || []);
        if (data.auditLog) setAuditLog(data.auditLog);
      } else {
        setError(data.error || "Failed to load funds");
      }
    } catch {
      setError("Failed to load funds");
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, search]);

  const loadDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (viewMode === "current") params.set("current_only", "true");
      if (viewMode === "historical") params.set("historical_only", "true");
      if (search) params.set("search", search);
      params.set("include_audit_log", "true");

      const res = await fetch(`/api/admin/lookups/departments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setDepartments(data.departments || []);
        if (data.auditLog) setAuditLog(data.auditLog);
      } else {
        setError(data.error || "Failed to load departments");
      }
    } catch {
      setError("Failed to load departments");
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, search]);

  useEffect(() => {
    if (activeTab === "funds") {
      loadFunds();
    } else {
      loadDepartments();
    }
  }, [activeTab, loadFunds, loadDepartments]);

  // Load unmapped codes on mount and after any data changes
  useEffect(() => {
    async function loadUnmapped() {
      try {
        const token = await getAuthToken();
        if (!token) return;

        const resp = await fetch("/api/admin/lookups/unmapped", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          setUnmappedFunds(data.unmapped_funds || []);
          setUnmappedDepartments(data.unmapped_departments || []);
        }
      } catch (e) {
        console.error("Failed to load unmapped codes:", e);
      } finally {
        setLoadingUnmapped(false);
      }
    }
    loadUnmapped();
  }, [funds, departments]); // Reload when lookup data changes

  // ============================================================================
  // Quick Add
  // ============================================================================

  async function handleQuickAdd() {
    if (!quickAddCode.trim() || !quickAddName.trim()) {
      setError("Code and name are required");
      return;
    }

    setIsQuickAdding(true);
    clearMessage();

    try {
      const token = await getAuthToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const endpoint = activeTab === "funds" 
        ? "/api/admin/lookups/funds"
        : "/api/admin/lookups/departments";

      const body = activeTab === "funds"
        ? { fund_code: quickAddCode.trim(), fund_name: quickAddName.trim(), effective_start_fy: quickAddFy }
        : { department_code: quickAddCode.trim(), department_name: quickAddName.trim(), effective_start_fy: quickAddFy };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setInfo(`Added ${activeTab === "funds" ? "fund" : "department"} successfully`);
        setQuickAddCode("");
        setQuickAddName("");
        setShowQuickAdd(false);
        if (activeTab === "funds") loadFunds();
        else loadDepartments();
      } else {
        setError(data.error || "Failed to add entry");
      }
    } catch {
      setError("Failed to add entry");
    } finally {
      setIsQuickAdding(false);
    }
  }

  // ============================================================================
  // Edit Entry
  // ============================================================================

  function openEditModal(entry: FundDimRow | DepartmentDimRow) {
    setEditingEntry(entry);
    setEditName("fund_name" in entry ? entry.fund_name : entry.department_name);
    setEditStartFy(entry.effective_start_fy);
    setEditEndFy(entry.effective_end_fy);
    setEditConfirmed(false);
  }

  async function handleSaveEdit() {
    if (!editingEntry) return;

    setIsSavingEdit(true);
    clearMessage();

    try {
      const token = await getAuthToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const isFund = "fund_code" in editingEntry;
      const endpoint = isFund
        ? "/api/admin/lookups/funds"
        : "/api/admin/lookups/departments";

      const body = isFund
        ? { id: editingEntry.id, fund_name: editName, effective_start_fy: editStartFy, effective_end_fy: editEndFy }
        : { id: editingEntry.id, department_name: editName, effective_start_fy: editStartFy, effective_end_fy: editEndFy };

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setInfo("Updated successfully");
        setEditingEntry(null);
        if (isFund) loadFunds();
        else loadDepartments();
      } else {
        setError(data.error || "Failed to update");
      }
    } catch {
      setError("Failed to update");
    } finally {
      setIsSavingEdit(false);
    }
  }

  // ============================================================================
  // Upload Wizard
  // ============================================================================

  function resetWizard() {
    setWizard({
      step: 1,
      lookupType: null,
      file: null,
      parsedRows: [],
      effectiveStartFy: new Date().getFullYear(),
      mode: "replace",
      validationResult: null,
      isValidating: false,
      isApplying: false,
      applySuccess: false,
      applyResult: null,
      error: null,
    });
    setConfirmRemovals(false);
    setConfirmRenames(false);
  }

  function openWizard() {
    resetWizard();
    setShowWizard(true);
  }

  function closeWizard() {
    setShowWizard(false);
    // Reload data if changes were made
    if (wizard.applySuccess) {
      if (activeTab === "funds") loadFunds();
      else loadDepartments();
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Parse CSV
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Try to find code and name columns
        const headers = results.meta.fields ?? [];
        const codeCol = headers.find(h => 
          /code|id|number/i.test(h) && !/name/i.test(h)
        ) ?? headers[0];
        const nameCol = headers.find(h => 
          /name|description|label/i.test(h)
        ) ?? headers[1];

        const rows: LookupInputRow[] = (results.data as Record<string, string>[]).map(row => ({
          code: (row[codeCol] ?? "").toString().trim(),
          name: (row[nameCol] ?? "").toString().trim(),
        })).filter(r => r.code || r.name);

        setWizard(prev => ({
          ...prev,
          file,
          parsedRows: rows,
          error: rows.length === 0 ? "No valid rows found in file" : null,
        }));
      },
      error: (err) => {
        setWizard(prev => ({ ...prev, error: `Failed to parse CSV: ${err.message}` }));
      },
    });
  }

  async function handleValidate() {
    if (!wizard.lookupType || wizard.parsedRows.length === 0) return;

    setWizard(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      const token = await getAuthToken();
      if (!token) {
        setWizard(prev => ({ ...prev, isValidating: false, error: "Not authenticated" }));
        return;
      }

      const res = await fetch(`/api/admin/lookups/${wizard.lookupType}/validate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: wizard.parsedRows,
          effectiveStartFy: wizard.effectiveStartFy,
          mode: wizard.mode,
        }),
      });

      const data = await res.json() as ValidateLookupResponse;
      
      if (!res.ok) {
        setWizard(prev => ({ 
          ...prev, 
          isValidating: false, 
          error: data.errors?.[0]?.message || "Validation failed",
        }));
        return;
      }

      setWizard(prev => ({
        ...prev,
        isValidating: false,
        validationResult: data,
        step: 3,
      }));
    } catch {
      setWizard(prev => ({ ...prev, isValidating: false, error: "Validation request failed" }));
    }
  }

  async function handleApply() {
    if (!wizard.lookupType || !wizard.validationResult?.validationToken) return;

    const { validationResult } = wizard;
    
    // Check confirmations
    if (validationResult.changes.removed.length > 0 && !confirmRemovals) {
      setWizard(prev => ({ ...prev, error: "Please confirm the removed codes" }));
      return;
    }
    if (validationResult.changes.renamed.length > 0 && !confirmRenames) {
      setWizard(prev => ({ ...prev, error: "Please confirm the renamed codes" }));
      return;
    }

    setWizard(prev => ({ ...prev, isApplying: true, error: null }));

    try {
      const token = await getAuthToken();
      if (!token) {
        setWizard(prev => ({ ...prev, isApplying: false, error: "Not authenticated" }));
        return;
      }

      const res = await fetch(`/api/admin/lookups/${wizard.lookupType}/apply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          validationToken: validationResult.validationToken,
          confirmRemovals,
          confirmRenames,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setWizard(prev => ({ ...prev, isApplying: false, error: data.error || "Apply failed" }));
        return;
      }

      setWizard(prev => ({
        ...prev,
        isApplying: false,
        applySuccess: true,
        applyResult: {
          inserted: data.applied?.inserted ?? 0,
          closedOut: data.applied?.closedOut ?? 0,
        },
        step: 4,
      }));
    } catch {
      setWizard(prev => ({ ...prev, isApplying: false, error: "Apply request failed" }));
    }
  }

  // ============================================================================
  // Filtered Data
  // ============================================================================

  const currentData = useMemo(() => {
    if (activeTab === "funds") {
      return funds;
    }
    return departments;
  }, [activeTab, funds, departments]);

  const currentEntries = useMemo(() => 
    currentData.filter(e => e.effective_end_fy === null),
    [currentData]
  );

  const historicalEntries = useMemo(() =>
    currentData.filter(e => e.effective_end_fy !== null),
    [currentData]
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Lookup Tables</h1>
        <button
          onClick={openWizard}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Upload Lookups
        </button>
      </div>

      {/* Unmapped Codes Warning */}
      {!loadingUnmapped && (unmappedFunds.length > 0 || unmappedDepartments.length > 0) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-lg">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-amber-900">Unmapped Codes Detected</p>
              <p className="mt-1 text-sm text-amber-800">
                The following codes appear in your data but don&apos;t have lookup entries.
                They will display as raw codes instead of names.
              </p>
            </div>
          </div>
          
          {unmappedFunds.length > 0 && (
            <div className="ml-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
                Unmapped Fund Codes ({unmappedFunds.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {unmappedFunds.slice(0, 20).map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-mono text-amber-800"
                  >
                    {code}
                  </span>
                ))}
                {unmappedFunds.length > 20 && (
                  <span className="text-xs text-amber-700">
                    +{unmappedFunds.length - 20} more
                  </span>
                )}
              </div>
            </div>
          )}
          
          {unmappedDepartments.length > 0 && (
            <div className="ml-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
                Unmapped Department Codes ({unmappedDepartments.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {unmappedDepartments.slice(0, 20).map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-mono text-amber-800"
                  >
                    {code}
                  </span>
                ))}
                {unmappedDepartments.length > 20 && (
                  <span className="text-xs text-amber-700">
                    +{unmappedDepartments.length - 20} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`rounded-md p-4 ${messageIsError ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>
          {message}
          <button onClick={clearMessage} className="ml-4 underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-4">
          {(["funds", "departments"] as LookupType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 pb-3 text-sm font-medium ${
                activeTab === tab
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "funds" ? "Funds" : "Departments"}
            </button>
          ))}
        </nav>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* View mode */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">View:</span>
          {(["current", "historical", "all"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-full px-3 py-1 text-sm ${
                viewMode === mode
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {mode === "current" ? "Current" : mode === "historical" ? "Historical" : "All"}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />

        {/* Quick add toggle */}
        <button
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          {showQuickAdd ? "Cancel" : "+ Quick Add"}
        </button>
      </div>

      {/* Quick Add Form */}
      {showQuickAdd && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-900">
            Quick Add {activeTab === "funds" ? "Fund" : "Department"}
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-slate-600">Code</label>
              <input
                type="text"
                value={quickAddCode}
                onChange={(e) => setQuickAddCode(e.target.value)}
                className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
                placeholder="e.g., 001"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600">Name</label>
              <input
                type="text"
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
                placeholder="e.g., General Fund"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600">Effective Start FY</label>
              <input
                type="number"
                value={quickAddFy}
                onChange={(e) => setQuickAddFy(parseInt(e.target.value, 10))}
                className="mt-1 w-24 rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
            <button
              onClick={handleQuickAdd}
              disabled={isQuickAdding}
              className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isQuickAdding ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Start FY</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">End FY</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading...</td>
              </tr>
            ) : currentData.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No {activeTab} found. Use the Upload button to add some.
                </td>
              </tr>
            ) : (
              currentData.map((entry) => {
                const code = "fund_code" in entry ? entry.fund_code : entry.department_code;
                const name = "fund_name" in entry ? entry.fund_name : entry.department_name;
                const isCurrent = entry.effective_end_fy === null;

                return (
                  <tr key={entry.id} className={isCurrent ? "" : "bg-slate-50 text-slate-500"}>
                    <td className="px-4 py-3 font-mono text-sm">{code}</td>
                    <td className="px-4 py-3 text-sm">{name}</td>
                    <td className="px-4 py-3 text-sm">{entry.effective_start_fy}</td>
                    <td className="px-4 py-3 text-sm">{entry.effective_end_fy ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditModal(entry)}
                        className="text-sm text-slate-600 hover:text-slate-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="text-sm text-slate-600">
        {currentEntries.length} current, {historicalEntries.length} historical
      </div>

      {/* Audit Log */}
      {auditLog.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent Activity</h2>
          <div className="space-y-2">
            {auditLog.slice(0, 10).map((log) => (
              <div key={log.id} className="text-sm text-slate-600">
                <span className="text-slate-400">{new Date(log.created_at).toLocaleDateString()}</span>
                {" · "}
                <span className="font-medium">{log.action}</span>
                {" · "}
                {log.lookup_code === "*" ? "Bulk upload" : log.lookup_code}
                {log.actor_email && <span className="text-slate-400"> by {log.actor_email}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Edit {"fund_code" in editingEntry ? "Fund" : "Department"}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Code</label>
                <input
                  type="text"
                  value={"fund_code" in editingEntry ? editingEntry.fund_code : editingEntry.department_code}
                  disabled
                  className="mt-1 w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                />
                <p className="mt-1 text-xs text-slate-500">Code cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Start FY</label>
                  <input
                    type="number"
                    value={editStartFy}
                    onChange={(e) => setEditStartFy(parseInt(e.target.value, 10))}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">End FY</label>
                  <input
                    type="number"
                    value={editEndFy ?? ""}
                    onChange={(e) => setEditEndFy(e.target.value ? parseInt(e.target.value, 10) : null)}
                    placeholder="Ongoing"
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="rounded-md bg-amber-50 p-3">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={editConfirmed}
                    onChange={(e) => setEditConfirmed(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-amber-800">
                    I understand this will change how historical data is displayed
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingEntry(null)}
                className="rounded px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit || !editConfirmed}
                className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            {/* Wizard Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Upload Lookup Table
              </h2>
              <button onClick={closeWizard} className="text-slate-400 hover:text-slate-600">
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
                  {step < 4 && <div className={`h-0.5 w-8 ${wizard.step > step ? "bg-slate-900" : "bg-slate-200"}`} />}
                </React.Fragment>
              ))}
            </div>

            {/* Step Content */}
            <div className="min-h-[300px]">
              {/* Step 1: Select Type */}
              {wizard.step === 1 && (
                <div className="space-y-4">
                  <p className="text-slate-600">What type of lookup are you uploading?</p>
                  
                  <div className="space-y-3">
                    {(["funds", "departments"] as LookupType[]).map((type) => (
                      <label
                        key={type}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${
                          wizard.lookupType === type
                            ? "border-slate-900 bg-slate-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="lookupType"
                          checked={wizard.lookupType === type}
                          onChange={() => setWizard(prev => ({ ...prev, lookupType: type }))}
                          className="h-4 w-4"
                        />
                        <div>
                          <div className="font-medium text-slate-900">
                            {type === "funds" ? "Funds" : "Departments"}
                          </div>
                          <div className="text-sm text-slate-500">
                            {type === "funds" ? "Fund codes and names" : "Department codes and names"}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => wizard.lookupType && setWizard(prev => ({ ...prev, step: 2 }))}
                      disabled={!wizard.lookupType}
                      className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Upload & Configure */}
              {wizard.step === 2 && (
                <div className="space-y-6">
                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Upload CSV file</label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:rounded file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                      />
                    </div>
                    {wizard.file && (
                      <p className="mt-2 text-sm text-green-600">
                        ✓ {wizard.file.name} ({wizard.parsedRows.length} rows)
                      </p>
                    )}
                  </div>

                  {/* Effective Start FY */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      These codes are effective starting fiscal year:
                    </label>
                    <input
                      type="number"
                      value={wizard.effectiveStartFy}
                      onChange={(e) => setWizard(prev => ({ 
                        ...prev, 
                        effectiveStartFy: parseInt(e.target.value, 10) 
                      }))}
                      className="mt-2 w-32 rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Mode */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      How should these codes be applied?
                    </label>
                    <div className="space-y-3">
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
                          wizard.mode === "replace"
                            ? "border-slate-900 bg-slate-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="mode"
                          checked={wizard.mode === "replace"}
                          onChange={() => setWizard(prev => ({ ...prev, mode: "replace" }))}
                          className="mt-0.5 h-4 w-4"
                        />
                        <div>
                          <div className="font-medium text-slate-900">These codes REPLACE previous codes</div>
                          <div className="text-sm text-slate-500">
                            Use when switching to a new system. Closes out all current codes.
                          </div>
                        </div>
                      </label>
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
                          wizard.mode === "additional"
                            ? "border-slate-900 bg-slate-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="mode"
                          checked={wizard.mode === "additional"}
                          onChange={() => setWizard(prev => ({ ...prev, mode: "additional" }))}
                          className="mt-0.5 h-4 w-4"
                        />
                        <div>
                          <div className="font-medium text-slate-900">These codes are ADDITIONAL</div>
                          <div className="text-sm text-slate-500">
                            Use when adding new codes. Current codes remain unchanged.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {wizard.error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{wizard.error}</div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => setWizard(prev => ({ ...prev, step: 1 }))}
                      className="rounded px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleValidate}
                      disabled={wizard.isValidating || wizard.parsedRows.length === 0}
                      className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {wizard.isValidating ? "Validating..." : "Validate →"}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {wizard.step === 3 && wizard.validationResult && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="rounded-lg bg-slate-50 p-4">
                    <h3 className="mb-3 font-medium text-slate-900">Summary</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>📥 {wizard.validationResult.summary.willInsert} codes will be added</div>
                      <div>📤 {wizard.validationResult.summary.willCloseOut} codes will be closed</div>
                      <div>✏️ {wizard.validationResult.summary.renamedCodes} codes renamed</div>
                      <div>⚠️ {wizard.validationResult.summary.removedCodes} codes removed</div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {wizard.validationResult.warnings.length > 0 && (
                    <div className="space-y-3">
                      {wizard.validationResult.changes.removed.length > 0 && (
                        <div className="rounded-md bg-amber-50 p-3">
                          <div className="mb-2 text-sm font-medium text-amber-800">
                            {wizard.validationResult.changes.removed.length} codes will no longer be mapped:
                          </div>
                          <div className="max-h-32 overflow-y-auto text-sm text-amber-700">
                            {wizard.validationResult.changes.removed.slice(0, 10).map(r => (
                              <div key={r.code}>{r.code} - {r.name}</div>
                            ))}
                            {wizard.validationResult.changes.removed.length > 10 && (
                              <div>...and {wizard.validationResult.changes.removed.length - 10} more</div>
                            )}
                          </div>
                          <label className="mt-3 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={confirmRemovals}
                              onChange={(e) => setConfirmRemovals(e.target.checked)}
                            />
                            <span className="text-sm text-amber-800">I confirm these removals are expected</span>
                          </label>
                        </div>
                      )}

                      {wizard.validationResult.changes.renamed.length > 0 && (
                        <div className="rounded-md bg-blue-50 p-3">
                          <div className="mb-2 text-sm font-medium text-blue-800">
                            {wizard.validationResult.changes.renamed.length} codes have name changes:
                          </div>
                          <div className="max-h-32 overflow-y-auto text-sm text-blue-700">
                            {wizard.validationResult.changes.renamed.slice(0, 10).map(r => (
                              <div key={r.code}>{r.code}: &quot;{r.oldName}&quot; → &quot;{r.newName}&quot;</div>
                            ))}
                          </div>
                          <label className="mt-3 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={confirmRenames}
                              onChange={(e) => setConfirmRenames(e.target.checked)}
                            />
                            <span className="text-sm text-blue-800">I confirm these name changes are correct</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {wizard.error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{wizard.error}</div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => setWizard(prev => ({ ...prev, step: 2, validationResult: null }))}
                      className="rounded px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleApply}
                      disabled={wizard.isApplying}
                      className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {wizard.isApplying ? "Applying..." : "Apply Changes"}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Success */}
              {wizard.step === 4 && wizard.applyResult && (
                <div className="space-y-6 text-center">
                  <div className="text-5xl">✓</div>
                  <h3 className="text-xl font-semibold text-slate-900">Lookup Update Complete</h3>
                  
                  <div className="rounded-lg bg-green-50 p-4 text-left">
                    <div className="space-y-1 text-sm text-green-800">
                      <div>✓ {wizard.applyResult.inserted} codes added</div>
                      <div>✓ {wizard.applyResult.closedOut} codes closed</div>
                      <div>✓ Lookup mappings refreshed</div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600">
                    Historical data will continue to display with previous names.
                    New data will display with the updated names.
                  </p>

                  <div className="flex justify-center gap-3">
                    <button
                      onClick={closeWizard}
                      className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => {
                        resetWizard();
                        setWizard(prev => ({ ...prev, step: 1 }));
                      }}
                      className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Upload Another
                    </button>
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
