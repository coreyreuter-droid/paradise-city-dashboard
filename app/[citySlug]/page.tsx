// app/[citySlug]/page.tsx
import LandingClient from "@/components/City/LandingClient";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import { getPortalSettings } from "@/lib/queries";
import type { PortalSettings } from "@/lib/queries";

export const revalidate = 0;

export default async function CityLandingPage() {
  const settings = (await getPortalSettings()) as PortalSettings | null;

  if (settings && settings.is_published === false) {
    return <UnpublishedMessage settings={settings} />;
  }

  return <LandingClient portalSettings={settings} />;
}
