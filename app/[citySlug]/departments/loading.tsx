// Delayed loading skeleton for Departments page - prevents flash on fast navigations.
// Mirrors: DepartmentsDashboardClient (SectionHeader + year selector + card grid)

export default function Loading() {
  return (
    <div
      className="opacity-0"
      role="status"
      aria-label="Loading departments"
      style={{ animation: "delayedFadeIn 200ms ease-out 200ms forwards" }}
    >
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* SectionHeader skeleton */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
          </div>
          {/* Year selector */}
          <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-200" />
        </div>

        {/* Department cards grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl bg-slate-100"
            />
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
