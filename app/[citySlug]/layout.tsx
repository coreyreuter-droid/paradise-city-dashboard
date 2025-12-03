// app/[citySlug]/layout.tsx
import type { ReactNode } from "react";
import ParadiseSidebar from "@/components/ParadiseSidebar";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { createClient } from "@supabase/supabase-js";

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
    <div className="min-h-screen bg-slate-50 flex flex-col sm:flex-row">
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
        {/* Shared top hero/banner for all city dashboard pages */}
        <header
          className="relative w-full border-b border-slate-200 bg-slate-900 text-slate-50"
          aria-label={`${displayName} portal header`}
        >
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 opacity-40" aria-hidden={true}>
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `radial-gradient(circle at 0 0, ${accent} 0, transparent 55%), radial-gradient(circle at 100% 0, ${accent} 0, transparent 55%)`,
              }}
            />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200/80">
              {CITY_CONFIG.slug}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[1.9rem]">
              {displayName} financial transparency
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-200/90">
              {tagline}
            </p>
          </div>
        </header>

        {/* Main content shell – shared card wrapper for all dashboards */}
        <div className="px-3 pb-10 pt-4 sm:px-6 sm:pt-6 lg:px-10">
          <section
            aria-label={`${displayName} financial dashboards`}
            className="mx-auto max-w-6xl"
          >
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm sm:p-6">
              {children}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
