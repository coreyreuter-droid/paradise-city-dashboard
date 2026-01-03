// components/DataFreshness.tsx
"use client";

type Props = {
  lastUploadAt: string | null;
  className?: string;
};

/**
 * Displays a human-readable "last updated" indicator.
 * Returns null if no date provided (graceful fallback).
 */
export default function DataFreshness({ lastUploadAt, className = "" }: Props) {
  if (!lastUploadAt) return null;

  const uploadDate = new Date(lastUploadAt);
  if (isNaN(uploadDate.getTime())) return null;

  const now = new Date();
  const diffMs = now.getTime() - uploadDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let label: string;

  if (diffDays === 0) {
    label = "Updated today";
  } else if (diffDays === 1) {
    label = "Updated yesterday";
  } else if (diffDays < 7) {
    label = `Updated ${diffDays} days ago`;
  } else if (diffDays < 14) {
    label = "Updated 1 week ago";
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    label = `Updated ${weeks} weeks ago`;
  } else {
    // Format as date for older entries
    label = `Updated ${uploadDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  // Full date for screen readers
  const fullDate = uploadDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className={`flex items-center gap-1.5 text-xs text-slate-500 ${className}`}>
      {/* Clock icon */}
      <svg
        className="h-3.5 w-3.5 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
        />
      </svg>
      <time dateTime={uploadDate.toISOString()} aria-label={`Data last updated on ${fullDate}`}>
        {label}
      </time>
    </div>
  );
}
