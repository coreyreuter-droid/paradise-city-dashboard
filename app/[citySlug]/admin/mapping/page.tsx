// app/[citySlug]/admin/mapping/page.tsx
"use client";

import AdminGuard from "@/components/Auth/AdminGuard";
import MappingUploadClient from "@/components/Admin/MappingUploadClient";
import AdminShell from "@/components/Admin/AdminShell";

export default function MappingPage() {
  return (
    <AdminGuard>
      <AdminShell
        title="Review matches"
        description="Upload CSV files with flexible column mapping. Map your columns to the correct fields, validate, and import."
      >
        <MappingUploadClient />
      </AdminShell>
    </AdminGuard>
  );
}
