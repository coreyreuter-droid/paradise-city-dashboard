// app/[citySlug]/admin/analytics/page.tsx
import { getPageViewSummary, getTotalPageViews } from "@/lib/queries";
import CardContainer from "@/components/CardContainer";
import SectionHeader from "@/components/SectionHeader";

export const revalidate = 0;

export default async function AdminAnalyticsPage() {
  const [summary, total30, total7] = await Promise.all([
    getPageViewSummary(30),
    getTotalPageViews(30),
    getTotalPageViews(7),
  ]);

  // Unique sessions (approximate)
  const uniquePaths = summary.length;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Admin"
        title="Portal Analytics"
        description="Page view data from citizen visits. Updated in real-time."
        showShare={false}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Last 30 days</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{total30.toLocaleString()}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">total page views</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Last 7 days</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{total7.toLocaleString()}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">total page views</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Pages viewed</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{uniquePaths}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">unique pages (30 days)</p>
        </div>
      </div>

      {/* Top pages table */}
      <CardContainer>
        <section aria-label="Top pages" className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Most visited pages (30 days)</h2>

          {summary.length === 0 ? (
            <p className="text-sm text-slate-600">No page views recorded yet. Views will appear here as citizens visit the portal.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Page</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Views</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">% of total</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.slice(0, 20).map((row) => {
                    const pct = total30 > 0 ? ((row.view_count / total30) * 100).toFixed(1) : "0";
                    // Clean up path for display
                    const label = row.page_path
                      .replace(/^\/[^/]+/, "")  // Remove city slug
                      .replace(/^\/?$/, "Home")
                      .replace(/^\//, "");

                    return (
                      <tr key={row.page_path} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 font-medium text-slate-800">
                          /{label}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">
                          {row.view_count.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-500">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </CardContainer>

      <p className="text-center text-xs text-slate-400">
        Analytics data is collected anonymously. No personally identifiable information is stored.
      </p>
    </div>
  );
}
