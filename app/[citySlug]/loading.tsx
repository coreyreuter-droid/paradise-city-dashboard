export default function Loading() {
  return (
    <div 
      className="min-h-screen bg-slate-50"
      role="status"
      aria-label="Loading dashboard content"
    >
      {/* Sidebar skeleton */}
      <div className="hidden sm:fixed sm:inset-y-0 sm:left-0 sm:flex sm:w-56 sm:flex-col lg:w-64 xl:w-72">
        <div className="flex flex-1 flex-col bg-slate-900 px-3 py-4">
          {/* Logo placeholder */}
          <div className="mb-5 flex items-center gap-3 px-2">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-700" />
              <div className="h-3 w-16 animate-pulse rounded bg-slate-800" />
            </div>
          </div>
          
          {/* Nav items placeholder */}
          <div className="mt-4 space-y-2">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded-lg bg-slate-800"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <main className="flex-1 sm:ml-56 lg:ml-64 xl:ml-72">
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
      </main>
    </div>
  );
}
