// config/cities.ts
// Central registry of all cities we support across deployments.
// ONE deployment = ONE city, selected via NEXT_PUBLIC_CITY_SLUG.
// DB (portal_settings) can override name, tagline, colors, logos, etc.

export type CityDefinition = {
  slug: string;             // URL prefix, e.g. "paradise"
  displayName: string;      // Human display name
  shortName?: string;       // Optional shorter UI name
  initials: string;         // Used for sidebar badge, must be 2–3 chars
  defaultTagline: string;
  defaultTheme: {
    primaryColor: string;
    primaryTextColor: string;
    accentColor: string;
  };
  assets?: {
    defaultHeroMessage?: string;
  };
  homepageCopy?: {
    introTitle?: string;
    introBody?: string;
  };
};

// ---------- CITY REGISTRY ----------
// Add new cities here. Each Vercel deployment selects ONE via env vars.

export const CITY_REGISTRY: CityDefinition[] = [
  {
    slug: "paradise",
    displayName: "Paradise City",
    shortName: "Paradise",
    initials: "PC",
    defaultTagline: "Public-facing financial transparency for your community.",
    defaultTheme: {
      primaryColor: "#0f766e",
      primaryTextColor: "#ffffff",
      accentColor: "#14b8a6",
    },
    assets: {
      defaultHeroMessage:
        "Explore how your community allocates and spends public dollars.",
    },
  },
  // You’ll add entries here for new deployments later.
];

// ---------- ACTIVE CITY SELECTION ----------

export function getActiveCity(): CityDefinition {
  const slug = process.env.NEXT_PUBLIC_CITY_SLUG || "paradise";

  const def =
    CITY_REGISTRY.find((c) => c.slug === slug) ||
    CITY_REGISTRY.find((c) => c.slug === "paradise");

  if (!def) {
    throw new Error(
      `No city definition found for slug "${slug}" and no paradise fallback.`
    );
  }

  return def;
}
