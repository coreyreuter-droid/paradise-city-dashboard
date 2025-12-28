// components/Admin/AdminShell.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { cityHref } from "@/lib/cityRouting";
import { supabase } from "@/lib/supabase";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

// Use *relative* admin paths. "" means /admin (overview)
// Split into two rows for cleaner layout
const NAV_ROW_1: { href: string; label: string }[] = [
  { href: "", label: "Overview" },
  { href: "upload", label: "Data upload" },
  { href: "upload/history", label: "Upload history" },
  { href: "data", label: "Data management" },
  { href: "settings", label: "Branding & settings" },
  { href: "users", label: "Users & roles" },
];

const NAV_ROW_2: { href: string; label: string }[] = [
  { href: "onboarding", label: "Onboarding checklist" },
  { href: "publish", label: "Publish status" },
  { href: "help", label: "Help & FAQs" },
];


type PublishState = "unknown" | "published" | "draft";

export default function AdminShell({
  title,
  description,
  children,
  actions,
}: Props) {
  const pathname = usePathname();

  const [publishState, setPublishState] =
    useState<PublishState>("unknown");

  // Normalize full URL for each tab
  const buildFullHref = (slug: string) => {
    if (!slug.trim()) return cityHref("/admin"); // overview
    return cityHref(`/admin/${slug}`);
  };

  const isActive = (slug: string) => {
    const full = buildFullHref(slug);

    // Overview: only exact match
    if (!slug.trim()) {
      return pathname === full;
    }

    // Other tabs: consider exact path only for clarity
    return pathname === full;
  };

  useEffect(() => {
    let cancelled = false;

    async function loadPublishState() {
      const { data, error } = await supabase
        .from("portal_settings")
        .select("is_published")
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setPublishState("unknown");
        return;
      }

      setPublishState(
        data.is_published === false ? "draft" : "published"
      );
    }

    loadPublishState();

    return () => {
      cancelled = true;
    };
  }, []);

  const renderNavItem = (item: { href: string; label: string }) => {
    const hrefFull = buildFullHref(item.href);
    const active = isActive(item.href);

    const base =
      "block text-center whitespace-nowrap px-2 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

    const activeClasses =
      "bg-slate-100 border-b-2 border-slate-900 text-slate-900";
    const inactiveClasses =
      "border-b-2 border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700";

    return (
      <Link
        key={item.href || "overview"}
        href={hrefFull}
        aria-current={active ? "page" : undefined}
        className={`${base} ${active ? activeClasses : inactiveClasses}`}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Global admin banner */}
      <header
        role="banner"
        className="border-b border-slate-200 bg-white"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {CITY_CONFIG.displayName}
            </p>
            <h1 className="truncate text-base font-semibold text-slate-900">
              Admin portal
            </h1>
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
              Manage data, branding, and access for your CiviPortal site.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Link
              href={cityHref("/")}
              aria-label="View public transparency site"
              className="inline-flex items-center rounded-full border border-slate-200 px-3 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              View public site
            </Link>
          </div>
        </div>
      </header>

      {/* Main admin content */}
      <main
        id="main-content"
        role="main"
        aria-labelledby="admin-page-title"
      >
        <div className="mx-auto max-w-6xl px-4 py-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {/* Draft mode banner – always visible in admin when portal is draft */}
            {publishState === "draft" && (
              <div className="mb-3 flex flex-col gap-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  <span className="font-semibold">Draft mode.</span>{" "}
                  This portal is currently hidden from the public.
                </p>
                <p>
                  When you&apos;re ready to launch, go to{" "}
                  <Link
                    href={cityHref("/admin/publish")}
                    className="font-semibold underline underline-offset-2"
                  >
                    Publish status
                  </Link>{" "}
                  to mark the site as published.
                </p>
              </div>
            )}

            {/* Page header + actions */}
            <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Admin
                </p>
                <h2
                  id="admin-page-title"
                  className="mt-1 truncate text-sm font-semibold text-slate-900 sm:text-base"
                >
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-xs text-slate-500">
                    {description}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex flex-wrap items-center gap-2">
                  {actions}
                </div>
              )}
            </header>

            {/* Admin nav tabs - two rows with CSS grid */}
            <nav
              aria-label="Admin navigation"
              className="mb-6"
            >
              {/* Row 1 - 6 tabs */}
              <div className="grid grid-cols-6 border-b border-slate-200">
                {NAV_ROW_1.map(renderNavItem)}
              </div>
              {/* Row 2 - 3 tabs aligned to first 3 columns */}
              <div className="grid grid-cols-6 border-b border-slate-200">
                {NAV_ROW_2.map(renderNavItem)}
                {/* Empty cells for columns 4-6 */}
                <div className="col-span-3" />
              </div>
            </nav>

            {/* Page content region */}
            <section
              aria-label="Admin page content"
              className="text-sm text-slate-700"
            >
              {children}
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}
