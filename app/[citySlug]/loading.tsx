export default function Loading() {
  return (
    <div 
      className="w-full"
      role="status"
      aria-label="Loading dashboard content"
    >
      {/* Main content skeleton - sidebar stays in place via layout */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header skeleton */}
        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-8 w-32 animate-pulse rounded-full bg-slate-200" />
        </div>

        {/* Hero skeleton */}
        <div className="mb-6 h-48 animate-pulse rounded-2xl bg-slate-200" />

        {/* KPI strip skeleton */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-slate-200"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
        </div>

        {/* Table skeleton */}
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
