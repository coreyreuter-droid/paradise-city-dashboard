"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <svg
              className="h-7 w-7 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          <h1 className="mb-2 text-xl font-semibold text-slate-900">
            Unable to load dashboard
          </h1>

          <p className="mb-6 text-sm text-slate-600">
            We couldn&apos;t load the dashboard data. This might be a temporary
            issue with our servers or your network connection.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              Retry
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Return to home
            </Link>
          </div>
        </div>

        {/* Helpful suggestions */}
        <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h2 className="mb-2 text-sm font-medium text-slate-900">
            Things to try:
          </h2>
          <ul className="space-y-1 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              Check your internet connection
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              Wait a moment and try again
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              Clear your browser cache
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              Contact support if the problem continues
            </li>
          </ul>
        </div>

        {process.env.NODE_ENV === "development" && error.message && (
          <details className="mt-6">
            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
              Technical details
            </summary>
            <pre className="mt-2 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-300">
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
