// app/[citySlug]/admin/analytics/page.tsx
"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import { supabase } from "@/lib/supabase";

type SummaryRow = { page_path: string; total_views: number; unique_sessions: number };
type DailyRow = { view_date: string; view_count: number; unique_sessions: number };

export default function AdminAnalyticsPage() {
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [dailyTotals, setDailyTotals] = useState<DailyRow[]>([]);
  const [total30, setTotal30] = useState(0);
  const [total7, setTotal7] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Get auth token for the API route
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) { setError("Not authenticated"); setLoading(false); return; }

        const res = await fetch("/api/admin/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) { setError("Failed to load analytics"); setLoading(false); return; }

        const data = await res.json();
        const rows = (data.summary ?? []) as SummaryRow[];
        const daily = (data.daily ?? []) as DailyRow[];

        setSummary(rows);
        setTotal30(rows.reduce((s, r) => s + r.total_views, 0));
        setDailyTotals(daily);

        // 7-day total from daily aggregates
        const d7 = new Date();
        d7.setDate(d7.getDate() - 7);
        setTotal7(
          daily
            .filter((d) => new Date(d.view_date) >= d7)
            .reduce((s, d) => s + d.view_count, 0)
        );
      } catch (err) {
        console.error("Analytics load error:", err);
        setError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const uniquePages = summary.length;

  return (
    <AdminGuard>
      <AdminShell title="Portal Analytics">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Portal Analytics</h2>
            <p className="mt-1 text-sm text-slate-600">
              Page view data from citizen visits.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading analytics...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Last 30 days</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{total30.toLocaleString()}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">page views</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Last 7 days</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{total7.toLocaleString()}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">page views</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Unique pages</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{uniquePages}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">viewed (30 days)</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Avg / day</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {dailyTotals.length > 0 ? Math.round(total30 / Math.min(dailyTotals.length, 30)).toLocaleString() : "0"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">page views</p>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Most visited pages (30 days)</h3>
                {summary.length === 0 ? (
                  <p className="text-sm text-slate-500">No page views recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Page</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Views</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Sessions</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.map((row) => {
                          const pct = total30 > 0 ? ((row.total_views / total30) * 100).toFixed(1) : "0";
                          const label = row.page_path.replace(/^\/[^/]+/, "").replace(/^\/?$/, "/home").replace(/^\//, "");
                          return (
                            <tr key={row.page_path} className="border-b border-slate-100 last:border-0">
                              <td className="px-3 py-2 font-medium text-slate-800">/{label}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">{row.total_views.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">{row.unique_sessions.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right text-slate-500">{pct}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <p className="text-center text-xs text-slate-500">
                Analytics are collected in aggregate and are not intended to identify individual residents.
              </p>
            </>
          )}
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
