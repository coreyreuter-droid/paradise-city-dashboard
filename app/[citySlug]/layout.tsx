// app/[citySlug]/layout.tsx
import type { ReactNode } from "react";
import type { Metadata } from "next";
import ParadiseSidebar from "@/components/ParadiseSidebar";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { supabaseAdmin } from "@/lib/supabaseService";
import CityShell from "@/components/City/CityShell";
import { generateThemeVars } from "@/lib/theme";
import LegalFooter from "@/components/LegalFooter";

type PortalSettingsRow = {
  city_name: string | null;
  tagline: string | null;
  primary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  logo_url: string | null;

  is_published: boolean;
  enable_actuals: boolean;
  enable_transactions: boolean;
  enable_vendors: boolean;
  enable_revenues: boolean;
};

async function getPortalSettings(): Promise<PortalSettingsRow | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("portal_settings")
      .select(
        "city_name, tagline, primary_color, accent_color, background_color, logo_url, is_published, enable_actuals, enable_transactions, enable_vendors, enable_revenues"
      )
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("CityLayout: failed to load portal_settings", error);
      return null;
    }

    return (data as PortalSettingsRow) ?? null;
  } catch (err) {
    console.error("CityLayout: unexpected error loading portal_settings", err);
    return null;
  }
}


// Per-city metadata so the browser tab uses the saved city/county name
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPortalSettings();

  const cityName =
    (settings?.city_name && settings.city_name.trim()) ||
    CITY_CONFIG.displayName;

  const tagline =
    (settings?.tagline && settings.tagline.trim()) ||
    CITY_CONFIG.tagline;

  return {
    title: `${cityName} – Financial Transparency`,
    description:
      tagline ||
      "Public-facing financial transparency for your community.",
  };
}

export default async function CityLayout({
  children,
}: {
  children: ReactNode;
}) {
  const settings = await getPortalSettings();

  // Generate CSS custom properties for theme colors
  const themeVars = generateThemeVars(
    settings?.primary_color ?? null,
    settings?.accent_color ?? null,
    settings?.background_color ?? null
  );

  const accent =
    settings?.accent_color ??
    settings?.primary_color ??
    CITY_CONFIG.accentColor ??
    CITY_CONFIG.primaryColor ??
    "#2563eb";

  const displayName =
    (settings?.city_name && settings.city_name.trim()) ||
    CITY_CONFIG.displayName;

  const tagline =
    (settings?.tagline && settings.tagline.trim()) ||
    CITY_CONFIG.tagline;

  const initialBranding = settings
    ? {
        city_name: settings.city_name ?? null,
        tagline: settings.tagline ?? null,
        primary_color: settings.primary_color ?? null,
        accent_color: settings.accent_color ?? null,
        background_color: settings.background_color ?? null,
        logo_url: settings.logo_url ?? null,
        enable_actuals: settings.enable_actuals,
        enable_transactions: settings.enable_transactions,
        enable_revenues: settings.enable_revenues,
        enable_vendors: settings.enable_vendors,
      }
    : null;

  const initialIsPublished = settings ? settings.is_published : true;

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col sm:flex-row overflow-x-hidden"
      style={themeVars as React.CSSProperties}
    >
      {/* Accessible skip link – first focusable element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-4 focus:left-4 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900 focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Shared sidebar navigation */}
      <ParadiseSidebar
        initialBranding={initialBranding}
        initialIsPublished={initialIsPublished}
      />

      {/* Single <main> landmark for all city pages */}
      <main
  id="main-content"
  role="main"
  aria-label={`${displayName} financial transparency content`}
  className="flex-1 pt-12 sm:pt-0"
>
          <CityShell
          accent={accent}
          displayName={displayName}
          tagline={tagline}
        >
          {children}
        </CityShell>
              <LegalFooter />
      </main>


    </div>
  );
}
