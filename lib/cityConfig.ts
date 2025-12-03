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
  slug: process.env.NEXT_PUBLIC_CITY_SLUG || "Civil  • Civic • Civilized",
  displayName: process.env.NEXT_PUBLIC_CITY_NAME || "City Name Needs Imported",
  tagline:
    process.env.NEXT_PUBLIC_CITY_TAGLINE ||
    "Public-facing financial transparency for your community.",
  // Theme defaults – override per city via env vars
  primaryColor:
    process.env.NEXT_PUBLIC_CITY_PRIMARY_COLOR || "#0f766e", // teal-700
  primaryTextColor:
    process.env.NEXT_PUBLIC_CITY_PRIMARY_TEXT || "#ffffff",
  accentColor:
    process.env.NEXT_PUBLIC_CITY_ACCENT_COLOR || "#14b8a6", // teal-500
};
