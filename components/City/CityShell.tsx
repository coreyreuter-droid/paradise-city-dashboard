// components/City/CityShell.tsx
"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CITY_CONFIG } from "@/lib/cityConfig";

type Props = {
  accent: string;
  displayName: string;
  tagline: string | null;
  children: ReactNode;
};

export default function CityShell({
  accent,
  displayName,
  tagline,
  children,
}: Props) {
  const pathname = usePathname();
  const basePath = `/${CITY_CONFIG.slug}`;

  const isLanding = pathname === basePath;

  // For the Home landing page: NO shared dashboard header/shell.
  if (isLanding) {
    return <>{children}</>;
  }

  // For all other city routes: keep the existing header + card shell.
  return (
    <>
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
            {displayName} Financial Transparency
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
    </>
  );
}
