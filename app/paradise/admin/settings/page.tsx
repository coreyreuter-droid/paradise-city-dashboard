// app/paradise/admin/settings/page.tsx

// Disable caching for this admin page
export const revalidate = 0;

import BrandingSettingsClient from "@/components/Admin/BrandingSettingsClient";
import AdminGuard from "@/components/Auth/AdminGuard";

export default function BrandingSettingsPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <BrandingSettingsClient />
        </div>
      </div>
    </AdminGuard>
  );
}
