"use client";

import UploadClient from "@/components/Admin/UploadClient";
import AdminGuard from "@/components/Auth/AdminGuard";

export default function UploadPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <UploadClient />
        </div>
      </div>
    </AdminGuard>
  );
}
