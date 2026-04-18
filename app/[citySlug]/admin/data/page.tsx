// app/[citySlug]/admin/data/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { cityHref } from "@/lib/cityRouting";
import { csrfFetch } from "@/components/CsrfProvider";

// =============================================================================
// Types
// =============================================================================

type TableKey = "budgets" | "actuals" | "transactions" | "revenues";
type TabKey = "fiscal-years" | "mapping-profiles" | "lookups" | "cleanup";

type YearState = {
  loading: boolean;
  years: number[];
  error: string | null;
};

type MappingProfile = {
  id: string;
  name: string;
  dataset_type: string;
  is_system: boolean;
  created_at: string;
  column_mappings: Record<string, string>;
  original_headers: string[] | null;
};

type Stats = {
  data: { budgets: number; actuals: number; transactions: number; revenues: number };
  lookups: { funds: number; departments: number };
  system: { 
    jobs: number; 
    failedJobs: number; 
    userProfiles: number; 
    rawFiles: number;
    storageFiles: number | null;
  };
};

// =============================================================================
// Constants
// =============================================================================

const TABLES: Array<{ key: TableKey; label: string; description: string }> = [
  {
    key: "budgets",
    label: "Budgets",
    description: "Adopted budget detail. Deleting an FY removes that fiscal year's budget rows.",
  },
  {
    key: "actuals",
    label: "Actuals",
    description: "Actuals by period. Deleting an FY removes that fiscal year's actuals rows.",
  },
  {
    key: "transactions",
    label: "Transactions",
    description: "Line-item payments. Deleting an FY removes that fiscal year's transaction rows.",
  },
  {
    key: "revenues",
    label: "Revenues",
    description: "Revenues by period. Deleting an FY removes that fiscal year's revenue rows.",
  },
];

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "fiscal-years", label: "Fiscal Year Data" },
  { key: "mapping-profiles", label: "Mapping Profiles" },
  { key: "lookups", label: "Lookup Tables" },
  { key: "cleanup", label: "System Cleanup" },
];

const DATASET_TYPE_LABELS: Record<string, string> = {
  budgets: "Budgets",
  actuals: "Actuals",
  transactions: "Transactions",
  revenues: "Revenues",
  funds_lookup: "Funds Lookup",
  departments_lookup: "Departments Lookup",
};

// =============================================================================
// Helper Functions
// =============================================================================

async function fetchDistinctFiscalYears(table: TableKey): Promise<number[]> {
  const { data, error } = await supabase.rpc("get_fiscal_years_for_table", {
    _table: table,
  });

  if (error) {
    throw new Error(error.message);
  }

  const years: number[] = (data ?? [])
    .map((r: { fiscal_year: number }) => Number(r.fiscal_year))
    .filter((n: number) => Number.isFinite(n));

  years.sort((a: number, b: number) => b - a);
  return years;
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("No admin session found. Please log in again.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

// =============================================================================
// Components
// =============================================================================

function DeleteFYButton({
  table,
  year,
  onDeleted,
}: {
  table: TableKey;
  year: number;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [countErr, setCountErr] = useState<string | null>(null);

  const required = String(year);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      setCountLoading(true);
      setCountErr(null);
      setRowCount(null);

      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("fiscal_year", year);

      if (cancelled) return;

      if (error) {
        setCountErr(error.message);
        setCountLoading(false);
        return;
      }

      setRowCount(typeof count === "number" ? count : 0);
      setCountLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, table, year]);

  async function runDelete() {
    setErr(null);

    if (confirmText.trim() !== required) {
      setErr(`Type ${required} to confirm.`);
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();

      const resp = await csrfFetch("/api/admin/delete-fiscal-year", {
        method: "POST",
        headers,
        body: JSON.stringify({ table, fiscalYear: year }),
      });

      const json = await resp.json();

      if (!resp.ok) {
        setErr(json?.error || "Delete failed.");
        setLoading(false);
        return;
      }

      setOpen(false);
      setConfirmText("");
      onDeleted();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-right">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setConfirmText("");
            setErr(null);
            setCountErr(null);
            setRowCount(null);
          }}
          className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          Delete FY{year}
        </button>
      ) : (
        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-left">
          <p className="text-xs font-semibold text-red-900">
            Delete FY{year} from <span className="font-mono">{table}</span>
          </p>
          <p className="mt-1 text-xs text-red-800">
            This deletes rows where <span className="font-mono">fiscal_year = {year}</span>.
          </p>

          <p className="mt-1 text-xs text-red-800">
            {countLoading
              ? "Counting rows to delete…"
              : countErr
              ? `Could not estimate rows: ${countErr}`
              : rowCount != null
              ? `Estimated rows to delete: ${rowCount.toLocaleString()}`
              : null}
          </p>
          <p className="mt-1 text-xs text-red-800">
            This also clears portal summary tables so the citizen site updates immediately.
          </p>

          <div className="mt-2 flex flex-col gap-2">
            <label className="text-xs font-medium text-red-900">
              Confirm fiscal year
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mt-1 w-full rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                placeholder={`Type ${required} to confirm`}
              />
            </label>

            {err && <p className="text-xs text-red-800">{err}</p>}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={runDelete}
                disabled={loading}
                className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              >
                {loading ? "Deleting…" : "Confirm delete"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setConfirmText("");
                  setErr(null);
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmActionButton({
  label,
  confirmText,
  confirmPlaceholder,
  description,
  warningText,
  onConfirm,
  variant = "danger",
}: {
  label: string;
  confirmText: string;
  confirmPlaceholder: string;
  description: string;
  warningText?: string;
  onConfirm: () => Promise<void>;
  variant?: "danger" | "warning";
}) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const colors = variant === "danger" 
    ? { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", button: "bg-red-700 hover:bg-red-800" }
    : { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", button: "bg-amber-600 hover:bg-amber-700" };

  async function handleConfirm() {
    if (inputText.trim() !== confirmText) {
      setErr(`Type "${confirmText}" to confirm.`);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      await onConfirm();
      setSuccess("Operation completed successfully.");
      setOpen(false);
      setInputText("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800">
        {success}
        <button
          type="button"
          onClick={() => setSuccess(null)}
          className="ml-2 underline hover:no-underline"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`rounded-md border ${colors.border} ${colors.bg} px-3 py-1.5 text-xs font-semibold ${colors.text} hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2`}
        >
          {label}
        </button>
      ) : (
        <div className={`rounded-xl border ${colors.border} ${colors.bg} p-3`}>
          <p className={`text-xs font-semibold ${colors.text}`}>{description}</p>
          {warningText && (
            <p className={`mt-1 text-xs ${colors.text}`}>{warningText}</p>
          )}

          <div className="mt-2 flex flex-col gap-2">
            <label className={`text-xs font-medium ${colors.text}`}>
              Type &quot;{confirmText}&quot; to confirm
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                placeholder={confirmPlaceholder}
              />
            </label>

            {err && <p className={`text-xs ${colors.text}`}>{err}</p>}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className={`rounded-md ${colors.button} px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2`}
              >
                {loading ? "Processing…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setInputText("");
                  setErr(null);
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Tab: Fiscal Years
// =============================================================================

function FiscalYearsTab() {
  const [states, setStates] = useState<Record<TableKey, YearState>>({
    budgets: { loading: true, years: [], error: null },
    actuals: { loading: true, years: [], error: null },
    transactions: { loading: true, years: [], error: null },
    revenues: { loading: true, years: [], error: null },
  });

  const refreshOne = useCallback(async (table: TableKey) => {
    setStates((prev) => ({
      ...prev,
      [table]: { ...prev[table], loading: true, error: null },
    }));

    try {
      const years = await fetchDistinctFiscalYears(table);
      setStates((prev) => ({
        ...prev,
        [table]: { loading: false, years, error: null },
      }));
    } catch (e: unknown) {
      setStates((prev) => ({
        ...prev,
        [table]: { loading: false, years: [], error: e instanceof Error ? e.message : "Failed to load years." },
      }));
    }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all(TABLES.map((t) => refreshOne(t.key)));
    })();
  }, [refreshOne]);

  const allYears = useMemo(() => {
    const set = new Set<number>();
    for (const t of TABLES) {
      states[t.key].years.forEach((y) => set.add(y));
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [states]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">About Fiscal Year Deletion</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>
            Deletes are based on <span className="font-mono">fiscal_year</span> (FY ending year),
            not calendar year.
          </li>
          <li>
            If you want to keep only the last 5 fiscal years, delete older FYs from each dataset.
          </li>
          <li>
            Summary tables are automatically refreshed after deletion.
          </li>
        </ul>
      </div>

      {allYears.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          No fiscal years detected yet. Upload data first.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {TABLES.map((t) => {
          const st = states[t.key];

          return (
            <div key={t.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.label}</p>
                  <p className="mt-1 text-xs text-slate-700">{t.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => refreshOne(t.key)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                >
                  Refresh
                </button>
              </div>

              {st.loading ? (
                <p className="mt-3 text-xs text-slate-600">Loading fiscal years…</p>
              ) : st.error ? (
                <p className="mt-3 text-xs text-red-700">{st.error}</p>
              ) : st.years.length === 0 ? (
                <p className="mt-3 text-xs text-slate-600">No years found.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {st.years.map((y) => (
                    <div
                      key={y}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">FY{y}</p>
                        <p className="text-[11px] text-slate-600">
                          Deletes rows where fiscal_year = {y}
                        </p>
                      </div>

                      <DeleteFYButton
                        table={t.key}
                        year={y}
                        onDeleted={() => refreshOne(t.key)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Tab: Mapping Profiles
// =============================================================================

function MappingProfilesTab() {
  const [profiles, setProfiles] = useState<MappingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();

      // Fetch profiles for all dataset types
      const types = ["budgets", "actuals", "transactions", "revenues"];
      const allProfiles: MappingProfile[] = [];

      for (const type of types) {
        const resp = await fetch(`/api/admin/mapping-profiles?dataset_type=${type}`, {
          headers,
        });
        if (resp.ok) {
          const data = await resp.json();
          allProfiles.push(...(data.profiles || []));
        }
      }

      // Sort by dataset_type, then by is_system (user profiles first), then by name
      allProfiles.sort((a, b) => {
        if (a.dataset_type !== b.dataset_type) {
          return a.dataset_type.localeCompare(b.dataset_type);
        }
        if (a.is_system !== b.is_system) {
          return a.is_system ? 1 : -1; // User profiles first
        }
        return a.name.localeCompare(b.name);
      });

      setProfiles(allProfiles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  async function deleteProfile(profile: MappingProfile) {
    if (profile.is_system) return;

    setDeleting(profile.id);

    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/mapping-profiles/${profile.id}`, {
        method: "DELETE",
        headers,
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to delete profile");
      }

      await loadProfiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete profile");
    } finally {
      setDeleting(null);
    }
  }

  const userProfiles = profiles.filter((p) => !p.is_system);
  const systemProfiles = profiles.filter((p) => p.is_system);

  const groupedUserProfiles = useMemo(() => {
    const grouped: Record<string, MappingProfile[]> = {};
    for (const p of userProfiles) {
      if (!grouped[p.dataset_type]) {
        grouped[p.dataset_type] = [];
      }
      grouped[p.dataset_type].push(p);
    }
    return grouped;
  }, [userProfiles]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">About Mapping Profiles</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>
            <strong>System profiles</strong> are defaults and cannot be deleted.
          </li>
          <li>
            <strong>User profiles</strong> are custom mappings you&apos;ve saved and can be deleted.
          </li>
          <li>
            Deleting a profile does not affect previously imported data.
          </li>
        </ul>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          Loading mapping profiles…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <>
          {/* User Profiles */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Your Saved Profiles</p>
                <p className="mt-1 text-xs text-slate-700">
                  {userProfiles.length === 0
                    ? "No custom profiles saved yet."
                    : `${userProfiles.length} custom profile${userProfiles.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <button
                type="button"
                onClick={loadProfiles}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            {userProfiles.length > 0 && (
              <div className="mt-4 space-y-4">
                {Object.entries(groupedUserProfiles).map(([datasetType, typeProfiles]) => (
                  <div key={datasetType}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                      {DATASET_TYPE_LABELS[datasetType] || datasetType}
                    </p>
                    <div className="space-y-3">
                      {typeProfiles.map((profile) => (
                        <div
                          key={profile.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900">{profile.name}</p>
                              <p className="text-[11px] text-slate-500">
                                Created {new Date(profile.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteProfile(profile)}
                              disabled={deleting === profile.id}
                              className="shrink-0 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
                            >
                              {deleting === profile.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                          
                          {/* Show mapping structure */}
                          <div className="mt-3 rounded-lg bg-white border border-slate-200 p-2.5">
                            {profile.original_headers && profile.original_headers.length > 0 ? (
                              <>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                                  Expected CSV Headers (in order)
                                </p>
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {profile.original_headers.map((header, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-700"
                                    >
                                      {header}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                                  Column Mappings
                                </p>
                                <div className="space-y-0.5">
                                  {Object.entries(profile.column_mappings || {}).map(([targetField, csvColumn]) => (
                                    <div key={targetField} className="flex items-center gap-1.5 text-[11px]">
                                      <span className="font-mono text-slate-600">{csvColumn}</span>
                                      <span className="text-slate-400">→</span>
                                      <span className="font-medium text-slate-800">{targetField}</span>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                                  Column Mappings (legacy - no position matching)
                                </p>
                                <div className="space-y-0.5">
                                  {Object.entries(profile.column_mappings || {}).map(([targetField, csvColumn]) => (
                                    <div key={targetField} className="flex items-center gap-1.5 text-[11px]">
                                      <span className="font-mono text-slate-600">{csvColumn}</span>
                                      <span className="text-slate-400">→</span>
                                      <span className="font-medium text-slate-800">{targetField}</span>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Profiles (read-only) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">System Profiles</p>
            <p className="mt-1 text-xs text-slate-700">
              {systemProfiles.length} default profile{systemProfiles.length === 1 ? "" : "s"} (cannot be deleted)
            </p>

            <div className="mt-4 space-y-3">
              {systemProfiles.map((profile) => (
                <details
                  key={profile.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden group"
                >
                  <summary className="px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-900">{profile.name}</span>
                      <span className="text-[10px] text-slate-500">
                        ({DATASET_TYPE_LABELS[profile.dataset_type] || profile.dataset_type})
                      </span>
                    </div>
                  </summary>
                  <div className="px-3 pb-3 pt-1 bg-white border-t border-slate-200">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                      Column Mappings
                    </p>
                    <div className="space-y-0.5">
                      {Object.entries(profile.column_mappings || {}).map(([targetField, csvColumn]) => (
                        <div key={targetField} className="flex items-center gap-1.5 text-[11px]">
                          <span className="font-mono text-slate-600">{csvColumn}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-medium text-slate-800">{targetField}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// Tab: Lookup Tables
// =============================================================================

function LookupsTab({ stats, onStatsRefresh }: { stats: Stats | null; onStatsRefresh: () => void }) {
  const [unmappedFunds, setUnmappedFunds] = useState<string[]>([]);
  const [unmappedDepartments, setUnmappedDepartments] = useState<string[]>([]);
  const [loadingUnmapped, setLoadingUnmapped] = useState(true);

  useEffect(() => {
    async function loadUnmapped() {
      try {
        const headers = await getAuthHeaders();
        const resp = await fetch("/api/admin/lookups/unmapped", { headers });
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
  }, []);

  const hasUnmapped = unmappedFunds.length > 0 || unmappedDepartments.length > 0;

  return (
    <div className="space-y-4">
      {/* Unmapped codes warning */}
      {!loadingUnmapped && hasUnmapped && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-lg">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-amber-900">Unmapped Codes Detected</p>
              <p className="mt-1 text-sm text-amber-800">
                Some fund or department codes in your data don&apos;t have lookup entries. 
                These will display as raw codes instead of names.
              </p>
              <a
                href={cityHref("/admin/lookups")}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-900 underline hover:no-underline"
              >
                Go to Lookup Tables to add them →
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">About Lookup Tables</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>
            <strong>Funds lookup</strong> maps fund codes to human-readable names.
          </li>
          <li>
            <strong>Departments lookup</strong> maps department codes to names.
          </li>
          <li>
            Clearing a lookup table removes all entries. You can re-upload or add entries manually.
          </li>
          <li>
            To manage individual entries, go to{" "}
            <a href={cityHref("/admin/lookups")} className="text-slate-900 underline hover:no-underline">
              Lookup Tables
            </a>.
          </li>
        </ul>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Funds Lookup */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Funds Lookup</p>
              <p className="mt-1 text-xs text-slate-700">
                {stats ? `${stats.lookups.funds.toLocaleString()} entries` : "Loading…"}
              </p>
            </div>
            <a
              href={cityHref("/admin/lookups")}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Manage
            </a>
          </div>

          <div className="mt-4">
            <ConfirmActionButton
              label="Clear All Funds"
              confirmText="CLEAR FUNDS"
              confirmPlaceholder="Type CLEAR FUNDS"
              description="Clear all entries from the funds lookup table"
              warningText="This will remove all fund name mappings. Existing data will show raw codes until you re-add them."
              variant="danger"
              onConfirm={async () => {
                const headers = await getAuthHeaders();
                const resp = await csrfFetch("/api/admin/data-management", {
                  method: "POST",
                  headers,
                  body: JSON.stringify({ action: "clear_funds_dim", confirm: "CLEAR FUNDS" }),
                });
                if (!resp.ok) {
                  const data = await resp.json();
                  throw new Error(data.error || "Failed to clear funds");
                }
                onStatsRefresh();
              }}
            />
          </div>
        </div>

        {/* Departments Lookup */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Departments Lookup</p>
              <p className="mt-1 text-xs text-slate-700">
                {stats ? `${stats.lookups.departments.toLocaleString()} entries` : "Loading…"}
              </p>
            </div>
            <a
              href={cityHref("/admin/lookups")}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Manage
            </a>
          </div>

          <div className="mt-4">
            <ConfirmActionButton
              label="Clear All Departments"
              confirmText="CLEAR DEPARTMENTS"
              confirmPlaceholder="Type CLEAR DEPARTMENTS"
              description="Clear all entries from the departments lookup table"
              warningText="This will remove all department name mappings. Existing data will show raw codes until you re-add them."
              variant="danger"
              onConfirm={async () => {
                const headers = await getAuthHeaders();
                const resp = await csrfFetch("/api/admin/data-management", {
                  method: "POST",
                  headers,
                  body: JSON.stringify({ action: "clear_departments_dim", confirm: "CLEAR DEPARTMENTS" }),
                });
                if (!resp.ok) {
                  const data = await resp.json();
                  throw new Error(data.error || "Failed to clear departments");
                }
                onStatsRefresh();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Tab: System Cleanup
// =============================================================================

function CleanupTab({ stats, onStatsRefresh }: { stats: Stats | null; onStatsRefresh: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">About System Cleanup</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>
            <strong>Import jobs</strong> track CSV mapping uploads. Old jobs can be cleared to save space.
          </li>
          <li>
            <strong>Raw files</strong> are the uploaded CSVs stored temporarily during import.
          </li>
          <li>
            Clearing failed jobs only removes jobs older than 24 hours that are stuck in pending/failed state.
          </li>
        </ul>
      </div>

      {/* Stats Overview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">System Stats</p>
          <button
            type="button"
            onClick={onStatsRefresh}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {stats ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total Jobs</p>
              <p className="text-lg font-semibold text-slate-900">{stats.system.jobs.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Failed/Pending</p>
              <p className="text-lg font-semibold text-amber-900">{stats.system.failedJobs.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Raw Files</p>
              <p className="text-lg font-semibold text-slate-900">{stats.system.rawFiles.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">User Profiles</p>
              <p className="text-lg font-semibold text-slate-900">{stats.system.userProfiles.toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-600">Loading stats…</p>
        )}
      </div>

      {/* Cleanup Actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Clear Failed Jobs */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Clear Failed Jobs</p>
          <p className="mt-1 text-xs text-slate-700">
            Remove failed/pending import jobs older than 24 hours and their associated files.
          </p>

          <div className="mt-4">
            <button
              type="button"
              onClick={async () => {
                try {
                  const headers = await getAuthHeaders();
                  const resp = await csrfFetch("/api/admin/data-management", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ action: "clear_failed_jobs" }),
                  });
                  if (!resp.ok) {
                    const data = await resp.json();
                    alert(data.error || "Failed to clear jobs");
                    return;
                  }
                  const data = await resp.json();
                  alert(data.message);
                  onStatsRefresh();
                } catch (e) {
                  alert(e instanceof Error ? e.message : "Failed to clear jobs");
                }
              }}
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              Clear Failed Jobs (&gt;24h)
            </button>
          </div>
        </div>

        {/* Clear All Job History */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Clear All Job History</p>
          <p className="mt-1 text-xs text-slate-700">
            Remove all import job records and uploaded raw files. Use with caution.
          </p>

          <div className="mt-4">
            <ConfirmActionButton
              label="Clear All Jobs"
              confirmText="CLEAR ALL JOBS"
              confirmPlaceholder="Type CLEAR ALL JOBS"
              description="Clear all import job history"
              warningText="This will remove all job records and associated raw files from storage."
              variant="danger"
              onConfirm={async () => {
                const headers = await getAuthHeaders();
                const resp = await csrfFetch("/api/admin/data-management", {
                  method: "POST",
                  headers,
                  body: JSON.stringify({ action: "clear_job_history", confirm: "CLEAR ALL JOBS" }),
                });
                if (!resp.ok) {
                  const data = await resp.json();
                  throw new Error(data.error || "Failed to clear job history");
                }
                onStatsRefresh();
              }}
            />
          </div>
        </div>
      </div>

      {/* Data Totals */}
      {stats && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Data Row Counts</p>
          <p className="mt-1 text-xs text-slate-700">
            Total rows in each data table (across all fiscal years).
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Budgets</p>
              <p className="text-lg font-semibold text-slate-900">{stats.data.budgets.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Actuals</p>
              <p className="text-lg font-semibold text-slate-900">{stats.data.actuals.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Transactions</p>
              <p className="text-lg font-semibold text-slate-900">{stats.data.transactions.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Revenues</p>
              <p className="text-lg font-semibold text-slate-900">{stats.data.revenues.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function AdminDataManagementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("fiscal-years");
  const [stats, setStats] = useState<Stats | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch("/api/admin/data-management", { headers });
      if (resp.ok) {
        const data = await resp.json();
        setStats(data.stats);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate data fetch on mount
    loadStats();
  }, [loadStats]);

  return (
    <AdminGuard>
      <AdminShell
        title="Review data"
        description="Delete fiscal-year data, manage lookup tables, clear mapping profiles, and clean up system files."
        actions={
          <a
            href={cityHref("/admin/upload")}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            Go to uploads
          </a>
        }
      >
        <div className="space-y-6">
          {/* Tabs */}
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex gap-4" aria-label="Tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "border-slate-900 text-slate-900"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "fiscal-years" && <FiscalYearsTab />}
          {activeTab === "mapping-profiles" && <MappingProfilesTab />}
          {activeTab === "lookups" && <LookupsTab stats={stats} onStatsRefresh={loadStats} />}
          {activeTab === "cleanup" && <CleanupTab stats={stats} onStatsRefresh={loadStats} />}
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
