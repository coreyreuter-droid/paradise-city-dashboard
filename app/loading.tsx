export default function Loading() {
  return (
    <div 
      className="flex min-h-screen items-center justify-center bg-slate-50"
      role="status"
      aria-label="Loading content"
    >
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        <p className="text-sm text-slate-600">Loading...</p>
      </div>
    </div>
  );
}
