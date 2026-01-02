// Delayed loading skeleton for Vendors page - prevents flash on fast navigations.
// Mirrors: VendorsDashboardClient (SectionHeader + filters + table)

export default function Loading() {
  return (
    <div
      className="opacity-0"
      role="status"
      aria-label="Loading vendors"
      style={{ animation: "delayedFadeIn 200ms ease-out 200ms forwards" }}
    >
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* SectionHeader skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
        </div>

        {/* Filters row skeleton */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
        </div>

        {/* Vendor table skeleton */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Table header */}
          <div className="flex gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          </div>
          {/* Table rows */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="flex gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
            >
              <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes delayedFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
