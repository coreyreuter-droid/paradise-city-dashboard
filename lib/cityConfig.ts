// lib/cityConfig.ts

export type CityConfig = {
  slug: string;
  displayName: string;
  tagline: string;
  primaryColor: string;
  primaryTextColor: string;
  accentColor: string;
};

export const CITY_CONFIG: CityConfig = {
  // Default slug only matters for local/dev; real cities should set the env var.
  slug: process.env.NEXT_PUBLIC_CITY_SLUG || "paradise",

  // Never show "City Name Needs Imported" in the UI again.
  displayName: process.env.NEXT_PUBLIC_CITY_NAME || "Your City",

  tagline:
    process.env.NEXT_PUBLIC_CITY_TAGLINE ||
    "Public-facing financial transparency for your community.",

  // Theme defaults – override per city via env vars.
  primaryColor:
    process.env.NEXT_PUBLIC_CITY_PRIMARY_COLOR || "#0f766e", // teal-700
  primaryTextColor:
    process.env.NEXT_PUBLIC_CITY_PRIMARY_TEXT || "#ffffff",
  accentColor:
    process.env.NEXT_PUBLIC_CITY_ACCENT_COLOR || "#14b8a6", // teal-500
};
