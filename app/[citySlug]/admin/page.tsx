// app/[citySlug]/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import { cityHref } from "@/lib/cityRouting";
import { supabase } from "@/lib/supabase";

type PortalStatus = "loading" | "published" | "draft" | "unknown";
type UploadInfo = { table: string; lastUploadAt: string | null; rowCount: number | null };

type DashboardState = {
  portalStatus: PortalStatus;
  cityName: string | null;
  uploads: Record<string, UploadInfo>;
  feedbackCount: number;
};

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : Math.floor((Date.now() - d.getTime()) / 86400000);
}

export default function AdminDashboardPage() {
  const [state, setState] = useState<DashboardState>({
    portalStatus: "loading", cityName: null, uploads: {}, feedbackCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, uploadsRes, feedbackRes] = await Promise.all([
          supabase.from("portal_settings").select("city_name, is_published").maybeSingle(),
          supabase.from("data_uploads").select("table_name, created_at, row_count").order("created_at", { ascending: false }).limit(100),
          supabase.from("citizen_feedback").select("id", { count: "exact", head: true }).eq("status", "new"),
        ]);
        const s = settingsRes.data;
        const rows = uploadsRes.data ?? [];
        const uploads: Record<string, UploadInfo> = {};
        for (const t of ["budgets", "actuals", "transactions", "revenues"]) {
          const latest = rows.find((r) => r.table_name === t);
          uploads[t] = { table: t, lastUploadAt: latest?.created_at ?? null, rowCount: latest?.row_count ?? null };
        }
        setState({
          portalStatus: s ? (s.is_published ? "published" : "draft") : "unknown",
          cityName: s?.city_name ?? null,
          uploads,
          feedbackCount: feedbackRes.count ?? 0,
        });
      } catch (err) { console.error("Dashboard:", err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  // Smart next step
  const hasNever = Object.values(state.uploads).some((u) => !u.lastUploadAt);
  const oldestDays = Object.values(state.uploads).reduce<number | null>((max, u) => {
    const d = daysAgo(u.lastUploadAt);
    if (d === null) return max;
    return max === null ? d : Math.max(max, d);
  }, null);

  let nextStep = { text: "Upload your latest financial data", href: cityHref("/admin/upload") };
  if (hasNever) nextStep = { text: "Get started — upload your first financial file", href: cityHref("/admin/upload") };
  else if (state.feedbackCount > 0) nextStep = { text: `Review ${state.feedbackCount} resident message${state.feedbackCount !== 1 ? "s" : ""}`, href: cityHref("/admin/feedback") };
  else if (oldestDays !== null && oldestDays > 30) nextStep = { text: `Data is ${oldestDays} days old — time for a refresh`, href: cityHref("/admin/upload") };
  else if (state.portalStatus === "draft") nextStep = { text: "Portal is in draft — ready to publish?", href: cityHref("/admin/publish") };

  const statusColor = state.portalStatus === "published" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : state.portalStatus === "draft" ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-slate-50 text-slate-600 border-slate-200";
  const statusLabel = state.portalStatus === "published" ? "Live" : state.portalStatus === "draft" ? "Draft" : "...";

  return (
    <AdminGuard>
      <AdminShell title=" ">
        {loading ? <p className="text-sm text-slate-500 py-8 text-center">Loading...</p> : (
          <div className="space-y-6">

            {/* Status + recommended action */}
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
                <span className="text-sm font-medium text-slate-900">{state.cityName || "Your city"}</span>
              </div>
              <p className="mt-3 text-sm text-slate-700">{nextStep.text}</p>
              <Link href={nextStep.href} className="mt-3 inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">
                Continue →
              </Link>
            </div>

            {/* Reassurance */}
            <p className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-2.5 text-xs text-blue-800">
              Nothing public changes until you publish. You can always preview first.
            </p>

            {/* Monthly update steps */}
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Monthly update</h2>
              <ol className="mt-3 space-y-2">
                <Step n={1} title="Upload latest file" href={cityHref("/admin/upload")} />
                <Step n={2} title="Review data and category names" href={cityHref("/admin/data")} />
                <Step n={3} title="Update projects or homepage notes" href={cityHref("/admin/settings")} optional />
                <Step n={4} title="Preview and publish" href={cityHref("/admin/publish")} accent />
              </ol>
            </div>

            {/* Data freshness — compact */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data freshness</h2>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["budgets", "actuals", "transactions", "revenues"] as const).map((t) => {
                  const info = state.uploads[t];
                  const d = daysAgo(info?.lastUploadAt);
                  return (
                    <div key={t} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 capitalize">{t}</p>
                      <p className={`mt-0.5 text-sm font-semibold ${d !== null && d > 30 ? "text-amber-700" : "text-slate-900"}`}>
                        {info?.lastUploadAt ? formatDate(info.lastUploadAt) : "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </AdminShell>
    </AdminGuard>
  );
}

function Step({ n, title, href, optional, accent }: { n: number; title: string; href: string; optional?: boolean; accent?: boolean }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">
        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${accent ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{n}</span>
        <span className="text-sm font-medium text-slate-800">{title}</span>
        {optional && <span className="ml-auto text-[11px] text-slate-400">if needed</span>}
        <svg className="ml-auto h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
      </Link>
    </li>
  );
}
