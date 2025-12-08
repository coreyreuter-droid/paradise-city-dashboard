// app/[citySlug]/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import { cityHref } from "@/lib/cityRouting";
import { supabase } from "@/lib/supabase";

type PublishStatusState =
  | "loading"
  | "published"
  | "draft"
  | "unknown";

type PublishSummary = {
  state: PublishStatusState;
  cityName: string | null;
  lastUpdatedAt: string | null;
};

type UploadFreshness = {
  table: string;
  fiscalYear: number | null;
  rowCount: number | null;
  lastUploadAt: string | null;
};

type UploadSummary = {
  budgets: UploadFreshness | null;
  actuals: UploadFreshness | null;
  transactions: UploadFreshness | null;
  revenues: UploadFreshness | null;
};

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminOverviewPage() {
  const [publishSummary, setPublishSummary] = useState<PublishSummary>({
    state: "loading",
    cityName: null,
    lastUpdatedAt: null,
  });

  const [uploadSummary, setUploadSummary] = useState<UploadSummary>({
    budgets: null,
    actuals: null,
    transactions: null,
    revenues: null,
  });

  const [loadingUploads, setLoadingUploads] =
    useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPublish() {
      try {
        const { data, error } = await supabase
          .from("portal_settings")
          .select("city_name, is_published, updated_at")
          .maybeSingle();

        if (cancelled) return;

        if (error || !data) {
          setPublishSummary({
            state: "unknown",
            cityName: null,
            lastUpdatedAt: null,
          });
          return;
        }

        setPublishSummary({
          state: data.is_published ? "published" : "draft",
          cityName: data.city_name ?? null,
          lastUpdatedAt: data.updated_at ?? null,
        });
      } catch {
        if (!cancelled) {
          setPublishSummary({
            state: "unknown",
            cityName: null,
            lastUpdatedAt: null,
          });
        }
      }
    }

    async function loadUploads() {
      setLoadingUploads(true);
      try {
        const { data, error } = await supabase
          .from("data_uploads")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (cancelled) return;

        if (error || !data) {
          setUploadSummary({
            budgets: null,
            actuals: null,
            transactions: null,
            revenues: null,
          });
          setLoadingUploads(false);
          return;
        }

        const tables: Array<
          keyof UploadSummary
        > = ["budgets", "actuals", "transactions", "revenues"];

        const next: UploadSummary = {
          budgets: null,
          actuals: null,
          transactions: null,
          revenues: null,
        };

        tables.forEach((tableName) => {
          const tableLogs = data.filter(
            (log) => log?.table_name === tableName
          );
          if (!tableLogs.length) {
            (next as any)[tableName] = null;
            return;
          }

          const latest = tableLogs[0];

          (next as any)[tableName] = {
            table: tableName,
            fiscalYear:
              typeof latest?.fiscal_year === "number"
                ? latest.fiscal_year
                : latest?.fiscal_year
                ? Number(latest.fiscal_year)
                : null,
            rowCount:
              typeof latest?.row_count === "number"
                ? latest.row_count
                : latest?.row_count
                ? Number(latest.row_count)
                : null,
            lastUploadAt: latest?.created_at ?? null,
          } as UploadFreshness;
        });

        setUploadSummary(next);
        setLoadingUploads(false);
      } catch {
        if (!cancelled) {
          setUploadSummary({
            budgets: null,
            actuals: null,
            transactions: null,
            revenues: null,
          });
          setLoadingUploads(false);
        }
      }
    }

    loadPublish();
    loadUploads();

    return () => {
      cancelled = true;
    };
  }, []);

  const publishLabel = (() => {
    switch (publishSummary.state) {
      case "loading":
        return "Checking publish status…";
      case "published":
        return "Published";
      case "draft":
        return "Draft (not yet public)";
      default:
        return "Status unknown";
    }
  })();

  const publishBadgeClasses = (() => {
    switch (publishSummary.state) {
      case "published":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "draft":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "loading":
        return "bg-slate-50 text-slate-600 border-slate-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  })();

  const renderUploadRow = (
    label: string,
    entry: UploadFreshness | null
  ) => {
    const date = entry ? formatDate(entry.lastUploadAt) : null;
    const fy = entry?.fiscalYear ?? null;
    const count = entry?.rowCount ?? null;

    return (
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex flex-col">
          <span className="font-medium text-slate-800">
            {label}
          </span>
          {entry ? (
            <span className="text-slate-500">
              {fy
                ? `FY ${fy}`
                : "Fiscal year not recorded"}
              {" · "}
              {count != null ? `${count} rows` : "Row count N/A"}
            </span>
          ) : (
            <span className="text-slate-500">
              No uploads recorded yet.
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-500">
          {date ? `Last upload ${date}` : "—"}
        </div>
      </div>
    );
  };

  return (
    <AdminGuard>
      <AdminShell
        title=" "

      >
        <div className="space-y-6">
          {/* Status cards */}
          <section
            aria-label="Portal status"
            className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)]"
          >
            {/* Publish status */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Public site
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {publishSummary.cityName || "Your city"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium ${publishBadgeClasses}`}
                >
                  {publishLabel}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                {publishSummary.state === "published"
                  ? "Residents and stakeholders can access the public portal."
                  : publishSummary.state === "draft"
                  ? "Only admins can access the site until it is published."
                  : "Once portal settings are completed, you can choose when to publish the site."}
              </p>

            </div>

            {/* Data health */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Data health
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Core financial datasets
                  </p>
                </div>
                <Link
                  href={cityHref("/admin/upload/history")}
                  className="mt-1 text-xs font-semibold text-sky-700 underline-offset-2 hover:underline"
                >
                  View history
                </Link>
              </div>

              {loadingUploads ? (
                <p className="text-xs text-slate-500">
                  Checking recent uploads…
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {renderUploadRow("Budgets", uploadSummary.budgets)}
                  {renderUploadRow("Actuals", uploadSummary.actuals)}
                  {renderUploadRow(
                    "Transactions",
                    uploadSummary.transactions
                  )}
                  {renderUploadRow(
                    "Revenues",
                    uploadSummary.revenues
                  )}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Link
                  href={cityHref("/admin/upload")}
                  className="font-semibold text-sky-700 underline-offset-2 hover:underline"
                >
                  Upload data →
                </Link>
              </div>
            </div>
          </section>

          {/* Quick actions */}
          <section
            aria-label="Admin quick actions"
            className="space-y-3"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              Quick actions
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AdminTile
                title="Data & imports"
                description="Load and monitor the core financial datasets that power this portal."
                links={[
                  {
                    label: "Upload data",
                    href: cityHref("/admin/upload"),
                  },
                  {
                    label: "Upload history",
                    href: cityHref("/admin/upload/history"),
                  },
                ]}
              />
              <AdminTile
                title="Branding & visibility"
                description="Control how the portal looks and when it is visible to the public."
                links={[
                  {
                    label: "Branding & settings",
                    href: cityHref("/admin/settings"),
                  },
                  {
                    label: "Publish status",
                    href: cityHref("/admin/publish"),
                  },
                ]}
              />
              <AdminTile
                title="Access & setup"
                description="Manage who can log in and track remaining setup tasks."
                links={[
                  {
                    label: "Users & roles",
                    href: cityHref("/admin/users"),
                  },
                  {
                    label: "Onboarding checklist",
                    href: cityHref("/admin/onboarding"),
                  },
                ]}
              />
            </div>
          </section>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}

type TileLink = {
  label: string;
  href: string;
};

type TileProps = {
  title: string;
  description: string;
  links: TileLink[];
};

function AdminTile({ title, description, links }: TileProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left text-sm text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow-md focus-within:ring-2 focus-within:ring-sky-500 focus-within:ring-offset-2">
      <div className="mt-1 text-sm font-semibold text-slate-900">
        {title}
      </div>
      <p className="mt-1 flex-1 text-xs text-slate-600">
        {description}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-semibold text-sky-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            {link.label} →
          </Link>
        ))}
      </div>
    </div>
  );
}
