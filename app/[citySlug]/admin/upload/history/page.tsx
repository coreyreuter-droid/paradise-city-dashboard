"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import {
  getDataUploadLogs,
  type DataUploadLogRow,
} from "@/lib/queries";

function formatMode(mode: DataUploadLogRow["mode"]): string {
  switch (mode) {
    case "append":
      return "Append";
    case "replace_year":
      return "Replace fiscal year";
    default:
      return mode;
  }
}

type LoadState = "idle" | "loading" | "loaded" | "error";

export default function UploadHistoryPage() {
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<DataUploadLogRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      setError(null);

      try {
        // getDataUploadLogs returns DataUploadLogRow[]
        const rows = await getDataUploadLogs();

        if (cancelled) return;

        setLogs(rows ?? []);
        setState("loaded");
      } catch (err: any) {
        if (!cancelled) {
          console.error("UploadHistoryPage: unexpected error", err);
          setError(
            err?.message ?? "Unexpected error loading upload history."
          );
          setState("error");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = state === "loading";

  return (
    <AdminGuard>
      <AdminShell
        title="Data upload history"
        description="Audit trail of the last 100 uploads, including table, mode, fiscal year, and row counts."
      >
        <div className="space-y-3 text-xs text-slate-700">
          {loading && (
            <p className="text-sm text-slate-600">
              Loading upload history…
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
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
      </AdminShell>
    </AdminGuard>
  );
}
