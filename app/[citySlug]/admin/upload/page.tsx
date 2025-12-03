"use client";

import Link from "next/link";
import UploadClient from "@/components/Admin/UploadClient";
import AdminGuard from "@/components/Auth/AdminGuard";
import { cityHref } from "@/lib/cityRouting";

export default function UploadPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="mb-4">
            <Link
              href={cityHref("/admin")}
              className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              <span className="mr-1">←</span>
              Back to admin home
            </Link>
          </div>
          <UploadClient />
        </div>
      </div>
    </AdminGuard>
  );
}
