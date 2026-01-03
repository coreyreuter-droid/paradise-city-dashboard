"use client";

import { useEffect, useMemo, useState } from "react";
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
    case "replace_table":
      return "Replace entire table";
    default:
      return mode;
  }
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const TABLE_LABELS: Record<string, string> = {
  budgets: "Budgets",
  actuals: "Actuals",
  transactions: "Transactions",
  revenues: "Revenues",
};

type SummaryEntry = {
  tableName: string;
  label: string;
  latest: DataUploadLogRow | null;
};

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
      } catch (err: unknown) {
        console.error("Error loading upload logs", err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load upload history. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const summary: SummaryEntry[] = useMemo(() => {
    const baseTables = ["budgets", "actuals", "transactions", "revenues"];

    if (!logs || !logs.length) {
      return baseTables.map((tableName) => ({
        tableName,
        label: TABLE_LABELS[tableName] ?? tableName,
        latest: null,
      }));
    }

    const byTable = new Map<string, DataUploadLogRow>();

    for (const log of logs) {
      if (!baseTables.includes(log.table_name)) continue;
      if (!byTable.has(log.table_name)) {
        byTable.set(log.table_name, log); // logs are already newest-first
      }
    }

    return baseTables.map((tableName) => ({
      tableName,
      label: TABLE_LABELS[tableName] ?? tableName,
      latest: byTable.get(tableName) ?? null,
    }));
  }, [logs]);

  return (
    <AdminGuard>
      <AdminShell
        title="Upload history"
        description="Review previous data imports and their status. This log helps you understand which datasets are currently active in the portal."
      >
        <div className="space-y-6">
          {/* Current dataset summary */}
          <section
            aria-label="Current dataset summary"
            className="space-y-3"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              Current dataset
            </h2>
            <p className="text-xs text-slate-600">
              For each table, the most recent upload is shown below with
              fiscal year, row count, when it was imported, and who
              performed the upload.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {summary.map(({ tableName, label, latest }) => {
                const lastUpload = latest?.created_at
                  ? formatDateShort(latest.created_at)
                  : null;

                const uploader =
                  latest?.admin_identifier || "Unknown";

                return (
                  <div
                    key={tableName}
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left text-xs text-slate-700 shadow-sm"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {label}
                    </div>
                    {latest ? (
                      <>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {latest.fiscal_year != null
                            ? `FY ${latest.fiscal_year}`
                            : "Fiscal year not specified"}
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Rows:{" "}
                          <span className="font-semibold">
                            {latest.row_count.toLocaleString("en-US")}
                          </span>
                        </p>
                        {lastUpload && (
                          <p className="mt-1 text-xs text-slate-600">
                            Last upload:{" "}
                            <span className="font-semibold">
                              {lastUpload}
                            </span>
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-600">
                          Uploaded by:{" "}
                          <span className="font-semibold">
                            {uploader}
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-slate-600">
                        No uploads recorded yet for this table.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Full log table */}
          <section aria-label="Upload history log" className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Upload log
            </h2>

            {loading && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Loading upload history…
              </div>
            )}

            {error && !loading && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {!loading && !error && logs && logs.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                No uploads have been recorded yet. Once data is imported
                through the Upload tool, a history of imports will appear
                here.
              </div>
            )}

            {!loading && !error && logs && logs.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full border-collapse text-xs">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold">
                        When
                      </th>
                      <th className="px-2 py-2 text-left font-semibold">
                        Table
                      </th>
                      <th className="px-2 py-2 text-left font-semibold">
                        Mode
                      </th>
                      <th className="px-2 py-2 text-left font-semibold">
                        Fiscal year
                      </th>
                      <th className="px-2 py-2 text-right font-semibold">
                        Row count
                      </th>
                      <th className="px-2 py-2 text-left font-semibold">
                        Uploaded by
                      </th>
                      <th className="px-2 py-2 text-left font-semibold">
                        File name
                      </th>
                    </tr>
                  </thead>
                  <tbody className="align-top text-[11px] text-slate-700">
                    {logs.map((log) => {
                      const when = formatWhen(log.created_at);
                      const uploader =
                        log.admin_identifier || "Unknown";

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
                            {log.row_count.toLocaleString("en-US")}
                          </td>
                          <td className="px-2 py-1 align-top text-slate-700">
                            {uploader}
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
          </section>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
