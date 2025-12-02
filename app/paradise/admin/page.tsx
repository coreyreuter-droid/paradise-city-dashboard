// app/paradise/admin/page.tsx
"use client";

import Link from "next/link";
import AdminGuard from "@/components/Auth/AdminGuard";

export default function AdminHomePage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Admin
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              CiviPortal admin tools
            </h1>
            <p className="text-sm text-slate-600">
              Upload budget data, manage branding, and complete onboarding
              tasks for this deployment.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/paradise/admin/upload"
              className="block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Upload data
            </Link>

            <Link
              href="/paradise/admin/settings"
              className="block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Branding settings
            </Link>

            <Link
              href="/paradise/admin/users"
              className="block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Admin users
            </Link>

            <Link
              href="/paradise/admin/onboarding"
              className="block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Onboarding checklist
            </Link>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
