"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import {
  getUnifiedDataActivity,
  getUserActivityLogs,
  getBrandingActivityLogs,
  getDataUploadLogs,
  type UnifiedActivityLog,
  type DataUploadLogRow,
} from "@/lib/queries";

type TabId = "data" | "users" | "branding";

const TABS: { id: TabId; label: string }[] = [
  { id: "data", label: "Data" },
  { id: "users", label: "Users" },
  { id: "branding", label: "Branding" },
];

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

function ActionBadge({ action, status }: { action: string; status: string | null }) {
  let bgColor = "bg-slate-100 text-slate-700";
  let label = action;

  // Determine color based on action type and status
  if (status === "FAILED") {
    bgColor = "bg-rose-100 text-rose-700";
  } else if (action.includes("upload") || action.includes("import.completed")) {
    bgColor = "bg-emerald-100 text-emerald-700";
  } else if (action.includes("profile")) {
    bgColor = "bg-blue-100 text-blue-700";
  } else if (action.includes("lookup")) {
    bgColor = "bg-amber-100 text-amber-700";
  } else if (action.includes("deleted") || action.includes("removed")) {
    bgColor = "bg-rose-100 text-rose-700";
  } else if (action.includes("branding") || action === "PUBLISH" || action === "UNPUBLISH") {
    bgColor = "bg-purple-100 text-purple-700";
  }

  // Friendly labels
  const labelMap: Record<string, string> = {
    "upload.completed": "Upload",
    "upload.failed": "Upload Failed",
    "import.started": "Import Started",
    "import.completed": "Import Complete",
    "import.failed": "Import Failed",
    "profile.created": "Profile Created",
    "profile.updated": "Profile Updated",
    "profile.deleted": "Profile Deleted",
    "lookup.added": "Lookup Added",
    "lookup.updated": "Lookup Updated",
    "lookup.deleted": "Lookup Deleted",
    "data.deleted": "Data Deleted",
    "user.invited": "User Invited",
    "user.role_changed": "Role Changed",
    "user.removed": "User Removed",
    "branding.updated": "Branding Updated",
    "portal.published": "Published",
    "portal.unpublished": "Unpublished",
    "PUBLISH": "Published",
    "UNPUBLISH": "Unpublished",
  };
  label = labelMap[action] || action;

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${bgColor}`}
    >
      {label}
    </span>
  );
}

type SummaryEntry = {
  tableName: string;
  label: string;
  latest: DataUploadLogRow | null;
};

function DatasetSummaryCards({ logs }: { logs: DataUploadLogRow[] }) {
  const baseTables = ["budgets", "actuals", "transactions", "revenues"];

  const summary: SummaryEntry[] = baseTables.map((tableName) => {
    const latest = logs.find((log) => log.table_name === tableName) || null;
    return {
      tableName,
      label: TABLE_LABELS[tableName] ?? tableName,
      latest,
    };
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {summary.map(({ tableName, label, latest }) => {
        const lastUpload = latest?.created_at ? formatDateShort(latest.created_at) : null;
        const uploader = latest?.admin_identifier || "Unknown";

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
                <p className="mt-1 text-xs text-slate-700">
                  Rows:{" "}
                  <span className="font-semibold">
                    {latest.row_count.toLocaleString("en-US")}
                  </span>
                </p>
                {lastUpload && (
                  <p className="mt-1 text-xs text-slate-700">
                    Last upload: <span className="font-semibold">{lastUpload}</span>
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-700">
                  Uploaded by: <span className="font-semibold">{uploader}</span>
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-slate-700">
                No uploads recorded yet for this table.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActivityTable({ logs, emptyMessage }: { logs: UnifiedActivityLog[]; emptyMessage: string }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse text-xs">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">When</th>
            <th className="px-3 py-2 text-left font-semibold">Action</th>
            <th className="px-3 py-2 text-left font-semibold">Description</th>
            <th className="px-3 py-2 text-left font-semibold">By</th>
          </tr>
        </thead>
        <tbody className="align-top text-[11px] text-slate-700">
          {logs.map((log) => (
            <tr
              key={log.id}
              className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
            >
              <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                {formatWhen(log.created_at)}
              </td>
              <td className="px-3 py-2">
                <ActionBadge action={log.action} status={log.status} />
              </td>
              <td className="px-3 py-2 text-slate-700">{log.description}</td>
              <td className="px-3 py-2 text-slate-600">{log.actor || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UploadHistoryPage() {
  const [activeTab, setActiveTab] = useState<TabId>("data");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data tab state
  const [dataLogs, setDataLogs] = useState<UnifiedActivityLog[]>([]);
  const [uploadSummary, setUploadSummary] = useState<DataUploadLogRow[]>([]);

  // Users tab state
  const [userLogs, setUserLogs] = useState<UnifiedActivityLog[]>([]);

  // Branding tab state
  const [brandingLogs, setBrandingLogs] = useState<UnifiedActivityLog[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        if (activeTab === "data") {
          const [activity, summary] = await Promise.all([
            getUnifiedDataActivity(),
            getDataUploadLogs(),
          ]);
          if (!cancelled) {
            setDataLogs(activity);
            setUploadSummary(summary);
          }
        } else if (activeTab === "users") {
          const activity = await getUserActivityLogs();
          if (!cancelled) {
            setUserLogs(activity);
          }
        } else if (activeTab === "branding") {
          const activity = await getBrandingActivityLogs();
          if (!cancelled) {
            setBrandingLogs(activity);
          }
        }
      } catch (err) {
        console.error("Error loading activity logs:", err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load activity history."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  return (
    <AdminGuard>
      <AdminShell
        title="Upload history"
        description="Review all admin actions including data uploads, user management, and branding changes."
      >
        <div className="space-y-6">
          {/* Tab navigation */}
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Loading activity history…
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Data tab */}
          {!loading && !error && activeTab === "data" && (
            <div className="space-y-6">
              {/* Dataset summary cards */}
              <section aria-label="Current dataset summary" className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Current dataset
                </h2>
                <p className="text-xs text-slate-700">
                  For each table, the most recent upload is shown below.
                </p>
                <DatasetSummaryCards logs={uploadSummary} />
              </section>

              {/* Activity log */}
              <section aria-label="Data activity log" className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Activity log
                </h2>
                <ActivityTable
                  logs={dataLogs}
                  emptyMessage="No data activity has been recorded yet. Once data is uploaded, mapping profiles are created, or lookups are modified, activity will appear here."
                />
              </section>
            </div>
          )}

          {/* Users tab */}
          {!loading && !error && activeTab === "users" && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                User activity
              </h2>
              <p className="text-xs text-slate-700">
                Track user invitations, role changes, and removals.
              </p>
              <ActivityTable
                logs={userLogs}
                emptyMessage="No user activity has been recorded yet. Once users are invited or roles are changed, activity will appear here."
              />
            </div>
          )}

          {/* Branding tab */}
          {!loading && !error && activeTab === "branding" && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Branding activity
              </h2>
              <p className="text-xs text-slate-700">
                Track portal branding updates and publish status changes.
              </p>
              <ActivityTable
                logs={brandingLogs}
                emptyMessage="No branding activity has been recorded yet. Once branding settings are updated or the portal is published/unpublished, activity will appear here."
              />
            </div>
          )}
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
