"use client";

import { usePageView } from "@/lib/usePageView";

/**
 * Drop this into a server layout to enable page view tracking.
 * Renders nothing visible — just runs the tracking hook.
 */
export default function PageViewTracker() {
  usePageView();
  return null;
}
