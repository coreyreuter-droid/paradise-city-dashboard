// Delayed loading skeleton for Landing page - prevents flash on fast navigations.
// Mirrors: LandingClient (Hero + navigation tiles + section cards)

export default function Loading() {
  return (
    <div
      className="opacity-0"
      role="status"
      aria-label="Loading landing page"
      style={{ animation: "delayedFadeIn 200ms ease-out 200ms forwards" }}
    >
      {/* Hero skeleton */}
      <div className="relative h-[340px] animate-pulse bg-slate-800 sm:h-[400px]">
        <div className="mx-auto flex h-full max-w-6xl flex-col items-center justify-center px-4 text-center">
          <div className="mb-4 h-16 w-16 rounded-full bg-slate-700" />
          <div className="mb-2 h-10 w-64 rounded bg-slate-700" />
          <div className="h-5 w-48 rounded bg-slate-700" />
        </div>
      </div>

      {/* Navigation tiles */}
      <div className="mx-auto -mt-12 max-w-5xl px-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-white shadow-lg"
            />
          ))}
        </div>
      </div>

      {/* Content sections */}
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12">
        {/* Section cards grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-slate-100"
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
