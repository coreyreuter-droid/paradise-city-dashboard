// Delayed loading skeleton - prevents flash on fast navigations.
// If page loads in <200ms, user never sees the spinner.

export default function Loading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-slate-50 opacity-0"
      role="status"
      aria-label="Loading content"
      style={{
        animation: "delayedFadeIn 200ms ease-out 200ms forwards",
      }}
    >
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        <p className="text-sm text-slate-600">Loading...</p>
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
