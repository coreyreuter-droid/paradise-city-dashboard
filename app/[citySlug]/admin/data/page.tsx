// app/[citySlug]/admin/data/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { cityHref } from "@/lib/cityRouting";

type TableKey = "budgets" | "actuals" | "transactions" | "revenues";

type YearState = {
  loading: boolean;
  years: number[];
  error: string | null;
};

const TABLES: Array<{ key: TableKey; label: string; description: string }> = [
  {
    key: "budgets",
    label: "Budgets",
    description: "Adopted budget detail. Deleting an FY removes that fiscal year’s budget rows.",
  },
  {
    key: "actuals",
    label: "Actuals",
    description: "Actuals by period. Deleting an FY removes that fiscal year’s actuals rows.",
  },
  {
    key: "transactions",
    label: "Transactions",
    description: "Line-item payments. Deleting an FY removes that fiscal year’s transaction rows.",
  },
  {
    key: "revenues",
    label: "Revenues",
    description: "Revenues by period. Deleting an FY removes that fiscal year’s revenue rows.",
  },
];

async function fetchDistinctFiscalYears(table: TableKey): Promise<number[]> {
  const { data, error } = await supabase.rpc("get_fiscal_years_for_table", {
    _table: table,
  });

  if (error) {
    throw new Error(error.message);
  }

  const years: number[] = (data ?? [])
    .map((r: any) => Number(r.fiscal_year))
    .filter((n: number) => Number.isFinite(n));

  years.sort((a: number, b: number) => b - a);
  return years;
}



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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setErr("No admin session found. Please log in again.");
        setLoading(false);
        return;
      }

      const resp = await fetch("/api/admin/delete-fiscal-year", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
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
    } catch (e: any) {
      setErr(e?.message || "Delete failed.");
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

export default function AdminDataManagementPage() {
  const [states, setStates] = useState<Record<TableKey, YearState>>({
    budgets: { loading: true, years: [], error: null },
    actuals: { loading: true, years: [], error: null },
    transactions: { loading: true, years: [], error: null },
    revenues: { loading: true, years: [], error: null },
  });

  async function refreshOne(table: TableKey) {
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
    } catch (e: any) {
      setStates((prev) => ({
        ...prev,
        [table]: { loading: false, years: [], error: e?.message || "Failed to load years." },
      }));
    }
  }

  useEffect(() => {
    (async () => {
      await Promise.all(TABLES.map((t) => refreshOne(t.key)));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allYears = useMemo(() => {
    const set = new Set<number>();
    for (const t of TABLES) {
      states[t.key].years.forEach((y) => set.add(y));
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [states]);

  return (
    <AdminGuard>
      <AdminShell
        title="Data management"
        description="Delete fiscal-year datasets (FY), so you can retain only the years you want (e.g., last 5 FYs)."
        actions={
          <a
            href={cityHref("/admin/upload")}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            Go to uploads
          </a>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Important</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>
                Deletes are based on <span className="font-mono">fiscal_year</span> (FY ending year),
                not calendar year.
              </li>
              <li>
                If you want to keep only the last 5 fiscal years, delete older FYs from each dataset.
              </li>
            </ul>
          </div>

          {allYears.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
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
                      <p className="mt-1 text-xs text-slate-600">{t.description}</p>
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
                    <p className="mt-3 text-xs text-slate-500">Loading fiscal years…</p>
                  ) : st.error ? (
                    <p className="mt-3 text-xs text-red-700">{st.error}</p>
                  ) : st.years.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-500">No years found.</p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {st.years.map((y) => (
                        <div
                          key={y}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">FY{y}</p>
                            <p className="text-[11px] text-slate-500">
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
      </AdminShell>
    </AdminGuard>
  );
}
