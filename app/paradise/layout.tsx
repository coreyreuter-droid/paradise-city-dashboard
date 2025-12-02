// app/paradise/layout.tsx
import type { ReactNode } from "react";
import ParadiseSidebar from "@/components/ParadiseSidebar";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function ParadiseLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Default accent from static config
  let accentFromSettings: string | null = null;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Read branding colors from portal_settings (singleton row)
    const { data, error } = await supabase
      .from("portal_settings")
      .select("primary_color, accent_color")
      .maybeSingle();

    if (!error && data) {
      // Prefer primary_color, fall back to accent_color
      accentFromSettings =
        (data.primary_color as string | null) ??
        (data.accent_color as string | null) ??
        null;
    }
  } catch (err) {
    console.error("ParadiseLayout: failed to load portal_settings", err);
  }

  const accent =
    accentFromSettings ?? CITY_CONFIG.primaryColor ?? "#2563eb";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col sm:flex-row">
      {/* Sidebar + mobile top bar */}
      <ParadiseSidebar />

      {/* Main content */}
      <main className="flex-1">
        {/* Top accent band */}
        <div
          className="h-24 w-full sm:h-28"
          style={{
            backgroundImage: `linear-gradient(135deg, ${accent}, transparent)`,
          }}
        />

        {/* Floating content card */}
        <div className="-mt-8 px-3 pb-10 sm:-mt-10 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm sm:p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
