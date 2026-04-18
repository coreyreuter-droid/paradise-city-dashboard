// app/[citySlug]/admin/analytics/page.tsx
"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import { supabase } from "@/lib/supabase";

type PageViewRow = { page_path: string };
type Summary = { page_path: string; view_count: number };

export default function AdminAnalyticsPage() {
  const [total30, setTotal30] = useState(0);
  const [total7, setTotal7] = useState(0);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const now = new Date();
      const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
      const d7 = new Date(now); d7.setDate(d7.getDate() - 7);

      const [r30, r7] = await Promise.all([
        supabase.from("page_views").select("page_path").gte("created_at", d30.toISOString()),
        supabase.from("page_views").select("page_path").gte("created_at", d7.toISOString()),
      ]);

      const rows30 = (r30.data ?? []) as PageViewRow[];
      const rows7 = (r7.data ?? []) as PageViewRow[];
      setTotal30(rows30.length);
      setTotal7(rows7.length);

      const counts = new Map<string, number>();
      for (const r of rows30) {
        counts.set(r.page_path, (counts.get(r.page_path) ?? 0) + 1);
      }
      setSummary(
        Array.from(counts.entries())
          .map(([page_path, view_count]) => ({ page_path, view_count }))
          .sort((a, b) => b.view_count - a.view_count)
      );
      setLoading(false);
    }
    load();
  }, []);

  return (
    <AdminGuard>
      <AdminShell>
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Portal Analytics</h2>
            <p className="mt-1 text-sm text-slate-600">Page view data from citizen visits.</p>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading analytics...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Last 30 days</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{total30.toLocaleString()}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">page views</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Last 7 days</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{total7.toLocaleString()}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">page views</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Unique pages</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.length}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">viewed (30 days)</p>
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
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.slice(0, 20).map((row) => {
                          const pct = total30 > 0 ? ((row.view_count / total30) * 100).toFixed(1) : "0";
                          const label = row.page_path.replace(/^\/[^/]+/, "").replace(/^\/?$/, "/home").replace(/^\//, "");
                          return (
                            <tr key={row.page_path} className="border-b border-slate-100 last:border-0">
                              <td className="px-3 py-2 font-medium text-slate-800">/{label}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">{row.view_count.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right text-slate-500">{pct}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <p className="text-center text-xs text-slate-400">
                Analytics data is collected anonymously. No personally identifiable information is stored.
              </p>
            </>
          )}
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
