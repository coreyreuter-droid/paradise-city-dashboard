// app/[citySlug]/page.tsx
import LandingClient from "@/components/City/LandingClient";
import { getPortalSettings } from "@/lib/queries";
import type { PortalSettings } from "@/lib/queries";

export const revalidate = 0;

export default async function CityLandingPage() {
  const settings = (await getPortalSettings()) as PortalSettings | null;

  // If not published, show a simple "Coming soon" message.
  if (settings && settings.is_published === false) {
    const cityName = settings.city_name || "Your City";

    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {cityName} transparency portal is not yet published
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          City staff are actively preparing budget and spending data.
          Once everything has been reviewed, this portal will be
          published for residents to explore.
        </p>
      </div>
    );
  }

  return <LandingClient portalSettings={settings} />;
}
