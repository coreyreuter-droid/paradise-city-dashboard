// app/paradise/admin/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

const ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "paradise-admin";

export default function AdminHomePage() {
  const [authorized, setAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthorized(true);
      setAuthError(null);
    } else {
      setAuthorized(false);
      setAuthError("Incorrect admin password.");
    }
  }

  // Step 1: password gate
  if (!authorized) {
    return (
      <div className="max-w-md mx-auto mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm">
            {/* gear icon */}
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="M8.999 2.25a1 1 0 0 1 2.002 0l.058.58a4.96 4.96 0 0 1 1.42.586l.52-.3a1 1 0 0 1 1.366.366l1 1.732a1 1 0 0 1-.366 1.366l-.5.289c.067.324.101.658.101 1s-.034.676-.1 1l.5.289a1 1 0 0 1 .366 1.366l-1 1.732a1 1 0 0 1-1.366.366l-.52-.3a4.96 4.96 0 0 1-1.42.586l-.058.58a1 1 0 0 1-2.002 0l-.058-.58a4.96 4.96 0 0 1-1.42-.586l-.52.3a1 1 0 0 1-1.366-.366l-1-1.732a1 1 0 0 1 .366-1.366l.5-.289A5.05 5.05 0 0 1 5 10c0-.342.034-.676.1-1l-.5-.289a1 1 0 0 1-.366-1.366l1-1.732a1 1 0 0 1 1.366-.366l.52.3c.43-.26.9-.46 1.42-.586l.058-.58ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Admin Portal
            </h1>
            <p className="text-xs text-slate-500">
              Enter the admin password to manage data uploads and portal
              branding.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Admin password
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Unlock admin tools
          </button>
          {authError && (
            <p className="text-xs text-red-700">{authError}</p>
          )}
        </form>
      </div>
    );
  }

  // Step 2: once authorized, show options (no more password prompts here)
  return (
    <div className="max-w-md mx-auto mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm">
          {/* gear icon again */}
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              d="M8.999 2.25a1 1 0 0 1 2.002 0l.058.58a4.96 4.96 0 0 1 1.42.586l.52-.3a1 1 0 0 1 1.366.366l1 1.732a1 1 0 0 1-.366 1.366l-.5.289c.067.324.101.658.101 1s-.034.676-.1 1l.5.289a1 1 0 0 1 .366 1.366l-1 1.732a1 1 0 0 1-1.366.366l-.52-.3a4.96 4.96 0 0 1-1.42.586l-.058.58a1 1 0 0 1-2.002 0l-.058-.58a4.96 4.96 0 0 1-1.42-.586l-.52.3a1 1 0 0 1-1.366-.366l-1-1.732a1 1 0 0 1 .366-1.366l.5-.289A5.05 5.05 0 0 1 5 10c0-.342.034-.676.1-1l-.5-.289a1 1 0 0 1-.366-1.366l1-1.732a1 1 0 0 1 1.366-.366l.52.3c.43-.26.9-.46 1.42-.586l.058-.58ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Admin Portal
          </h1>
          <p className="text-xs text-slate-500">
            Choose an administrative tool below.
          </p>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <Link
          href="/paradise/admin/upload"
          className="block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Upload data
        </Link>

        <Link
          href="/paradise/admin/settings"
          className="block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Branding settings
        </Link>
      </div>
    </div>
  );
}
