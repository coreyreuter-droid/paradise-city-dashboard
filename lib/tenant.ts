// lib/tenant.ts
// Single-tenant slug enforcement
//
// We keep [citySlug] in URLs for nice-looking links, but enforce that
// it matches the configured slug for this deployment.

import { NEXT_PUBLIC_CITY_SLUG } from "@/lib/env.public";
import { getActiveCity } from "@/config/cities";

/**
 * Get the valid slug for this deployment.
 * Priority: env var > config file
 */
export function getValidSlug(): string {
  if (NEXT_PUBLIC_CITY_SLUG && NEXT_PUBLIC_CITY_SLUG.trim()) {
    return NEXT_PUBLIC_CITY_SLUG.trim();
  }
  return getActiveCity().slug;
}

/**
 * Check if the given slug matches this deployment's configured slug.
 */
export function isValidSlug(slug: string | undefined | null): boolean {
  if (!slug) return false;
  return slug.toLowerCase() === getValidSlug().toLowerCase();
}

/**
 * Assert that the slug matches. Throws if it doesn't.
 * Use in server components before rendering.
 */
export function assertValidSlug(slug: string | undefined | null): void {
  if (!isValidSlug(slug)) {
    throw new Error(`Invalid tenant slug: ${slug}`);
  }
}
