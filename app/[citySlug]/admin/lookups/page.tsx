// app/[citySlug]/admin/lookups/page.tsx
"use client";

import AdminGuard from "@/components/Auth/AdminGuard";
import LookupsClient from "@/components/Admin/LookupsClient";
import AdminShell from "@/components/Admin/AdminShell";

export default function LookupsPage() {
  return (
    <AdminGuard>
      <AdminShell
        title="Lookup tables"
        description="Manage fund and department name mappings. These labels appear in the public portal when codes are displayed."
      >
        <LookupsClient />
      </AdminShell>
    </AdminGuard>
  );
}
