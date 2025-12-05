// app/[citySlug]/layout.tsx
import type { ReactNode } from "react";
import ParadiseSidebar from "@/components/ParadiseSidebar";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { createClient } from "@supabase/supabase-js";
import CityShell from "@/components/City/CityShell";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type PortalSettingsRow = {
  city_name: string | null;
  tagline: string | null;
  primary_color: string | null;
  accent_color: string | null;
};

async function getPortalSettings(): Promise<PortalSettingsRow | null> {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn(
        "CityLayout: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY missing"
      );
      return null;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
      },
    });

    const { data, error } = await supabase
      .from("portal_settings")
      .select("city_name, tagline, primary_color, accent_color")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error(
        "CityLayout: failed to load portal_settings",
        error
      );
      return null;
    }

    if (!data) return null;

    return data as PortalSettingsRow;
  } catch (err) {
    console.error(
      "CityLayout: unexpected error loading portal_settings",
      err
    );
    return null;
  }
}

export default async function CityLayout({
  children,
}: {
  children: ReactNode;
}) {
  const settings = await getPortalSettings();

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col sm:flex-row overflow-x-hidden">
      {/* Accessible skip link – first focusable element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-4 focus:left-4 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900 focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Shared sidebar navigation */}
      <ParadiseSidebar />

      {/* Single <main> landmark for all city pages */}
      <main
        id="main-content"
        role="main"
        aria-label={`${displayName} financial transparency content`}
        className="flex-1"
      >
        <CityShell
          accent={accent}
          displayName={displayName}
          tagline={tagline}
        >
          {children}
        </CityShell>
      </main>
    </div>
  );
}
