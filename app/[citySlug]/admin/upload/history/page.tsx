"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGuard from "@/components/Auth/AdminGuard";
import {
  getDataUploadLogs,
  type DataUploadLogRow,
} from "@/lib/queries";
import { cityHref } from "@/lib/cityRouting";

function formatMode(mode: DataUploadLogRow["mode"]): string {
  switch (mode) {
    case "append":
      return "Append";
    case "replace_year":
      return "Replace year";
    case "replace_table":
      return "Replace table";
    default:
      // Fallback in case the enum ever expands
      return mode;
  }
}

export default function UploadHistoryPage() {
  const [logs, setLogs] = useState<DataUploadLogRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getDataUploadLogs();
        if (!cancelled) {
          setLogs(data);
        }
      } catch (err: any) {
        console.error("Failed to load data upload logs", err);
        if (!cancelled) {
          setError("Unable to load upload history. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <Link
                href={cityHref("/admin")}
                className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                <span className="mr-1">←</span>
                Back to admin home
              </Link>
              <h1 className="mt-2 text-lg font-semibold text-slate-900">
                Data upload history
              </h1>
              <p className="text-xs text-slate-600">
                Last 100 uploads across budgets, actuals, and transactions.
                This is your audit trail for when data changed in the portal.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {loading && (
              <p className="text-sm text-slate-600">
                Loading upload history&hellip;
              </p>
            )}

            {!loading && error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            {!loading && !error && (!logs || logs.length === 0) && (
              <p className="text-sm text-slate-600">
                No uploads have been recorded yet.
              </p>
            )}

            {!loading && !error && logs && logs.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2">When</th>
                      <th className="px-2 py-2">Table</th>
                      <th className="px-2 py-2">Mode</th>
                      <th className="px-2 py-2">Fiscal year</th>
                      <th className="px-2 py-2 text-right">Row count</th>
                      <th className="px-2 py-2">Filename</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const createdAt = new Date(log.created_at);
                      const when = isNaN(createdAt.getTime())
                        ? log.created_at
                        : createdAt.toLocaleString();

                      return (
                        <tr
                          key={log.id}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                        >
                          <td className="px-2 py-1 align-top text-slate-700">
                            {when}
                          </td>
                          <td className="px-2 py-1 align-top text-slate-700">
                            {log.table_name}
                          </td>
                          <td className="px-2 py-1 align-top text-slate-700">
                            {formatMode(log.mode)}
                          </td>
                          <td className="px-2 py-1 align-top text-slate-700">
                            {log.fiscal_year ?? "—"}
                          </td>
                          <td className="px-2 py-1 align-top text-right text-slate-700">
                            {log.row_count.toLocaleString()}
                          </td>
                          <td className="px-2 py-1 align-top text-slate-700">
                            {log.filename ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
