// app/[citySlug]/admin/settings/page.tsx
"use client";

import AdminGuard from "@/components/Auth/AdminGuard";
import BrandingSettingsClient from "@/components/Admin/BrandingSettingsClient";
import AdminShell from "@/components/Admin/AdminShell";

export default function BrandingSettingsPage() {
  return (
    <AdminGuard>
      <AdminShell
        title="Branding & settings"
        description="Control how your CiviPortal looks: logo, colors, hero image, and key messaging."
      >
        <BrandingSettingsClient />
      </AdminShell>
    </AdminGuard>
  );
}
