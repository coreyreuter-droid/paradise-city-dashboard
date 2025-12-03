// lib/cityRouting.ts
// Turns relative routes into /<citySlug>/x URLs consistently.
// Used by ALL components instead of hardcoded "/paradise".

import { getActiveCity } from "../config/cities";

const ACTIVE_CITY = getActiveCity();

export const CITY_SLUG = ACTIVE_CITY.slug;

// Build a consistent URL: cityHref("/departments") -> "/paradise/departments"
// Handles missing slashes, bare strings, etc.
export function cityHref(path: string = "/"): string {
  const cleaned =
    path === "/"
      ? ""
      : path.startsWith("/")
      ? path
      : `/${path}`;

  return `/${CITY_SLUG}${cleaned}`;
}
