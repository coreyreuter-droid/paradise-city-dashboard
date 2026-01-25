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
  { href: "mapping", label: "CSV mapping" },
  { href: "upload/history", label: "Upload history" },
  { href: "data", label: "Data management" },
  { href: "projects", label: "Projects" },
];

const NAV_ROW_2: { href: string; label: string }[] = [
  { href: "settings", label: "Branding & settings" },
  { href: "lookups", label: "Lookup tables" },
  { href: "users", label: "Users & roles" },
  { href: "publish", label: "Publish status" },
  { href: "onboarding", label: "Onboarding checklist" },
  { href: "help", label: "Help & FAQs" },
];


type PublishState = "unknown" | "published" | "draft";
type UserRole = "unknown" | "viewer" | "admin" | "super_admin";

export default function AdminShell({
  title,
  description,
  children,
  actions,
}: Props) {
  const pathname = usePathname();

  const [publishState, setPublishState] =
    useState<PublishState>("unknown");
  const [userRole, setUserRole] = useState<UserRole>("unknown");

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

  // Load current user's role
  useEffect(() => {
    let cancelled = false;

    async function loadUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setUserRole("unknown");
        return;
      }

      setUserRole(data.role as UserRole);
    }

    loadUserRole();

    return () => {
      cancelled = true;
    };
  }, []);

  const renderNavItem = (item: { href: string; label: string }) => {
    const hrefFull = buildFullHref(item.href);
    const active = isActive(item.href);

    const base =
      "block text-center whitespace-nowrap px-2 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-rgb))] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

    // Active: accent underline + subtle accent tint + primary text
    const activeClasses =
      "bg-[rgb(var(--accent-rgb)/0.08)] border-b-2 border-[rgb(var(--accent-rgb))] text-[rgb(var(--primary-rgb))] font-semibold";
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
            <h1 className="truncate text-base font-semibold text-[rgb(var(--primary-rgb))]">
              Admin portal
            </h1>
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">
              Manage data, branding, and access for your CiviPortal site.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Link
              href={cityHref("/")}
              aria-label="View public transparency site"
              className="inline-flex items-center rounded-full border border-slate-200 px-3 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-rgb))] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              View public site
            </Link>
          </div>
        </div>
      </header>

      {/* Main admin content */}
      <div
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

            {/* View-only mode banner for viewers */}
            {userRole === "viewer" && (
              <div className="mb-3 flex flex-col gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-800 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  <span className="font-semibold">View-only mode.</span>{" "}
                  You can browse the admin panel but cannot make changes.
                </p>
                <p>
                  Contact your administrator if you need edit access.
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
                  className="mt-1 truncate text-sm font-semibold text-[rgb(var(--primary-rgb))] sm:text-base"
                >
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-xs text-slate-600">
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
              {/* Row 2 - 6 tabs */}
              <div className="grid grid-cols-6 border-b border-slate-200">
                {NAV_ROW_2.map(renderNavItem)}
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
      </div>
    </div>
  );
}
