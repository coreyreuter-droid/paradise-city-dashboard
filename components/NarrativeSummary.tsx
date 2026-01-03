// components/NarrativeSummary.tsx
"use client";

type Props = {
  narrative: string;
  className?: string;
};

/**
 * Renders an auto-generated narrative summary with consistent styling.
 * The narrative text should be pre-built using helpers from lib/narrativeHelpers.ts
 */
export default function NarrativeSummary({ narrative, className = "" }: Props) {
  // Don't render if narrative is empty
  if (!narrative || narrative.trim().length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3 ${className}`}
      role="region"
      aria-label="Summary"
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="h-5 w-5 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
            />
          </svg>
        </div>

        {/* Narrative text */}
        <p className="text-sm leading-relaxed text-slate-700">
          {narrative}
        </p>
      </div>
    </div>
  );
}
