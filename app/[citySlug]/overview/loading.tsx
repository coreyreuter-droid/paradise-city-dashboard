// Delayed loading skeleton for Overview page - prevents flash on fast navigations.
// Mirrors: HomeClient (KPI strip + charts + department grid + transactions)

export default function Loading() {
  return (
    <div
      className="opacity-0"
      role="status"
      aria-label="Loading overview"
      style={{ animation: "delayedFadeIn 200ms ease-out 200ms forwards" }}
    >
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* SectionHeader skeleton */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          </div>
          {/* Year selector */}
          <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-200" />
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>

        {/* Multi-year chart */}
        <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />

        {/* Two-column layout: departments + transactions */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Departments grid */}
          <div className="space-y-4">
            <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
            <div className="grid gap-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="space-y-4">
            <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          </div>
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
