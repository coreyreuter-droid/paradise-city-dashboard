// app/[citySlug]/admin/upload/page.tsx
"use client";

import AdminGuard from "@/components/Auth/AdminGuard";
import UploadWizardClient from "@/components/Admin/UploadWizardClient";
import AdminShell from "@/components/Admin/AdminShell";

export default function UploadPage() {
  return (
    <AdminGuard>
      <AdminShell
        title="Upload file"
        description="Upload CSV files for budgets, actuals, transactions, and revenues."
      >
        <UploadWizardClient />
      </AdminShell>
    </AdminGuard>
  );
}
