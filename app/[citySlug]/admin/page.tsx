// app/[citySlug]/admin/page.tsx
"use client";

import Link from "next/link";
import AdminGuard from "@/components/Auth/AdminGuard";
import { cityHref } from "@/lib/cityRouting";

export default function AdminHomePage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Admin
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              CiviPortal admin console
            </h1>
            <p className="text-xs text-slate-600">
              Upload data, manage branding, control access, and prepare your
              portal for public launch.
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <Link
              href={cityHref("/admin/onboarding")}
              className="block rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-800 shadow-sm hover:bg-slate-100"
            >
              ✅ Onboarding checklist
            </Link>

            <Link
              href={cityHref("/admin/upload")}
              className="block rounded-md border border-slate-200 bg-white px-3 py-2 font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              📤 Data uploads (budgets, actuals, transactions)
            </Link>

            <Link
              href={cityHref("/admin/upload/history")}
              className="block rounded-md border border-slate-200 bg-white px-3 py-2 font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              📜 Data upload history &amp; audit log
            </Link>

            <Link
              href={cityHref("/admin/settings")}
              className="block rounded-md border border-slate-200 bg-white px-3 py-2 font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              🎨 Branding &amp; portal settings
            </Link>

            <Link
              href={cityHref("/admin/users")}
              className="block rounded-md border border-slate-200 bg-white px-3 py-2 font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              👥 Admin users &amp; roles
            </Link>

            <Link
              href={cityHref("/admin/publish")}
              className="block rounded-md border border-slate-200 bg-white px-3 py-2 font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              🚀 Publish / unpublish portal
            </Link>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
