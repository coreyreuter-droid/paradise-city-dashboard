// app/[citySlug]/admin/upload/page.tsx
"use client";

import AdminGuard from "@/components/Auth/AdminGuard";
import UploadClient from "@/components/Admin/UploadClient";
import AdminShell from "@/components/Admin/AdminShell";

export default function UploadPage() {
  return (
    <AdminGuard>
      <AdminShell
        title="Data upload"
        description="Upload CSV files for budgets, actuals, and transactions. We’ll validate the structure before importing."
      >
        <UploadClient />
      </AdminShell>
    </AdminGuard>
  );
}
