// lib/cityRouting.ts
// Turns relative routes into /<citySlug>/x URLs consistently.

import { getActiveCity } from "../config/cities";

const ACTIVE_CITY = getActiveCity();

// Allow Vercel/env to override the slug (client-safe because it's NEXT_PUBLIC_)
export const CITY_SLUG =
  (process.env.NEXT_PUBLIC_CITY_SLUG || "").trim() ||
  ACTIVE_CITY.slug;

// Build a consistent URL: cityHref("/departments") -> "/portal/departments"
export function cityHref(path: string = "/"): string {
  const cleaned =
    path === "/"
      ? ""
      : path.startsWith("/")
      ? path
      : `/${path}`;

  return `/${CITY_SLUG}${cleaned}`;
}
