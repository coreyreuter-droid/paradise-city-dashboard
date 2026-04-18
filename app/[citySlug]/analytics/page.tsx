// app/[citySlug]/analytics/page.tsx
// Analytics has been merged into the Dashboard (overview) page.
// This page redirects to preserve any existing bookmarks.

import { redirect } from "next/navigation";
import { CITY_SLUG } from "@/lib/cityRouting";

export default function AnalyticsRedirect() {
  redirect(`/${CITY_SLUG}/overview`);
}
