// app/paradise/admin/settings/page.tsx

import BrandingSettingsClient from "@/components/Admin/BrandingSettingsClient";

export const revalidate = 0;

export default function BrandingSettingsPage() {
  // All fetching is done client-side inside BrandingSettingsClient
  return <BrandingSettingsClient />;
}
