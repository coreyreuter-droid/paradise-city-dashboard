// app/[citySlug]/page.tsx

import LandingClient from "@/components/City/LandingClient";
import { getPortalSettings } from "@/lib/queries";
import type { PortalSettings } from "@/lib/queries";

export const revalidate = 0;

export default async function CityLandingPage() {
  const settings = (await getPortalSettings()) as PortalSettings | null;

  return <LandingClient portalSettings={settings} />;
}
