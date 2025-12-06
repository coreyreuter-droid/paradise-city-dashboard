"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { supabase } from "@/lib/supabase";
import { CITY_SLUG, cityHref } from "@/lib/cityRouting";

const navItems = [
  { path: "/", label: "Home" },
  { path: "/overview", label: "Overview" },
  { path: "/analytics", label: "Analytics" },
  { path: "/budget", label: "Budget" },
  { path: "/departments", label: "Departments" },
  { path: "/revenues", label: "Revenues" },
  { path: "/transactions", label: "Transactions" },
];

type PortalBranding = {
  city_name: string | null;
  tagline: string | null;
  primary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
};

export default function ParadiseSidebar() {
  const pathname = usePathname();

  const [branding, setBranding] = useState<PortalBranding | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // whether dashboard nav should be visible (published OR admin)
  const [showDashboardNav, setShowDashboardNav] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSidebarState() {
      // 1) Load branding
      const { data: brandingData } = await supabase
        .from("portal_settings")
        .select(
          "city_name, tagline, primary_color, accent_color, logo_url, is_published"
        )
        .maybeSingle();

      if (cancelled) return;

      if (brandingData) {
        const { city_name, tagline, primary_color, accent_color, logo_url } =
          brandingData;
        setBranding({
          city_name,
          tagline,
          primary_color,
          accent_color,
          logo_url,
        });
      }

      // 2) Determine if viewer is admin/super_admin
      let isAdmin = false;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (
          profile &&
          (profile.role === "admin" || profile.role === "super_admin")
        ) {
          isAdmin = true;
        }
      }

      // 3) Determine publish state
      const isPublished =
        brandingData && brandingData.is_published === false ? false : true;

      // 4) Public only sees dashboard nav when published; admins always see it
      setShowDashboardNav(isPublished || isAdmin);
    }

    loadSidebarState();

    return () => {
      cancelled = true;
    };
  }, []);

  const isActive = (path: string) => {
    const full = cityHref(path);

    // Overview: only active on exact /<slug>
    if (path === "/") {
      return pathname === full;
    }

    // Others: active on exact or nested route
    return pathname === full || pathname.startsWith(full + "/");
  };

  // If we're on /<citySlug>/departments/<Department Name>...
  let currentDepartmentLabel: string | null = null;
  const deptPrefix = `/${CITY_SLUG}/departments/`;

  if (pathname.startsWith(deptPrefix)) {
    const segments = pathname.split("/");
    // ['', '<citySlug>', 'departments', '<Department Name>', ...]
    if (segments.length >= 4) {
      try {
        currentDepartmentLabel = decodeURIComponent(segments[3]);
      } catch {
        currentDepartmentLabel = segments[3];
      }
    }
  }

  const portalTitle =
    branding?.city_name || CITY_CONFIG.displayName || "Civic Transparency";

  const portalTagline =
    branding?.tagline || "Public-facing Financial Transparency Portal";

  const accent =
    branding?.primary_color ||
    branding?.accent_color ||
    CITY_CONFIG.primaryColor ||
    "#2563eb";

  const initials = portalTitle
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .slice(0, 3)
    .toUpperCase();

  const adminHomeHref = cityHref("/admin");
  const adminActive =
    pathname === adminHomeHref ||
    pathname.startsWith(adminHomeHref + "/");

  const closeMobile = () => setMobileOpen(false);

  const renderNavList = (variant: "desktop" | "mobile") => (
    <>
      {/* Dashboard group – now conditional */}
      {showDashboardNav && (
        <div>
          <p
            className={
              variant === "desktop"
                ? "px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                : "px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
            }
          >
            Dashboard
          </p>
          <ul className="mt-2 space-y-1">
            {navItems.map((item) => {
              const href = cityHref(item.path);
              const active = isActive(item.path);
              const isDepartmentsItem = item.path === "/departments";

              const baseClasses =
                "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition";

              const activeClasses =
                variant === "desktop"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-900 text-white shadow-sm";
              const inactiveClasses =
                variant === "desktop"
                  ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

              return (
                <li key={item.path}>
                  <Link
                    href={href}
                    onClick={variant === "mobile" ? closeMobile : undefined}
                    className={`${baseClasses} ${
                      active ? activeClasses : inactiveClasses
                    }`}
                  >
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full transition ${
                        active
                          ? "bg-white"
                          : "bg-slate-300 group-hover:bg-slate-500"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>

                  {/* Nested department label under Departments when viewing a specific dept */}
                  {isDepartmentsItem && currentDepartmentLabel && (
                    <div className="mt-1 pl-6 pr-3">
                      <div className="truncate text-xs text-slate-500">
                        <span className="mr-1 text-slate-400">›</span>
                        {currentDepartmentLabel}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Admin nav – single entry point to Admin home */}
      <div className="mt-6">
        <p
          className={
            variant === "desktop"
              ? "px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
              : "px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
          }
        >
          Admin
        </p>
        <ul className="mt-2 space-y-1">
          <li>
            <Link
              href={adminHomeHref}
              onClick={variant === "mobile" ? closeMobile : undefined}
              className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition ${
                adminActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span
                className={`inline-block h-1 w-1 rounded-full transition ${
                  adminActive
                    ? "bg-white"
                    : "bg-slate-300 group-hover:bg-slate-500"
                }`}
              />
              <span className="truncate">Admin home</span>
            </Link>
          </li>
        </ul>
      </div>
    </>
  );

  return (
    <header
      role="banner"
      aria-label={`${portalTitle} site navigation`}
      className="flex flex-col sm:flex-none"
    >
      {/* MOBILE HEADER + TOGGLE (sm:hidden) */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm sm:hidden">
        <div className="flex items-center gap-2">
          {branding?.logo_url ? (
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.logo_url}
                alt={portalTitle}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold text-white shadow-sm"
              style={{ background: accent }}
            >
              {initials || "C"}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {portalTitle}
            </div>
            <div className="truncate text-xs text-slate-500">
              {portalTagline}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700 shadow-sm"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
        >
          <span className="sr-only">Toggle navigation</span>
          <div className="space-y-0.5">
            <span className="block h-0.5 w-4 rounded bg-slate-800" />
            <span className="block h-0.5 w-4 rounded bg-slate-800" />
            <span className="block h-0.5 w-4 rounded bg-slate-800" />
          </div>
        </button>
      </div>

      {/* MOBILE SLIDE-OUT NAV */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={closeMobile}
          />
          {/* Drawer */}
          <nav
            className="absolute inset-y-0 right-0 w-64 max-w-[80%] bg-white shadow-xl"
            aria-label="Primary navigation"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
              <div className="flex items-center gap-2">
                {branding?.logo_url ? (
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={branding.logo_url}
                      alt={portalTitle}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold text-white shadow-sm"
                    style={{ background: accent }}
                  >
                    {initials || "C"}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {portalTitle}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {portalTagline}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={closeMobile}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
                aria-label="Close navigation"
              >
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>

            <div className="flex h-[calc(100%-3rem)] flex-col justify-between overflow-y-auto px-3 py-3">
              <div className="space-y-6">
                {renderNavList("mobile")}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-xs text-slate-500">
                      Powered by{" "}
                      <span className="font-semibold text-slate-800">
                        CiviPortal
                      </span>
                    </p>
                  </div>
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {initials || "C"}
                  </span>
                </div>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* DESKTOP SIDEBAR (sm+ only) */}
      <aside
        className="hidden w-64 flex-none border-r border-slate-200 bg-white/95 px-3 py-4 shadow-sm sm:flex sm:flex-col lg:w-72"
        aria-label="Primary sidebar navigation"
      >
        {/* Brand */}
        <div className="mb-5 flex items-center gap-3 px-2">
          <div>
            {branding?.logo_url ? (
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={branding.logo_url}
                  alt={portalTitle}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-sm"
                style={{ background: accent }}
              >
                {initials || "C"}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {portalTitle}
            </div>
            <div className="truncate text-xs text-slate-500">
              {portalTagline}
            </div>
          </div>
        </div>

        {/* Main nav */}
        <nav className="mt-1 flex-1 space-y-6 overflow-y-auto pb-6">
          {renderNavList("desktop")}
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <div>
              <p className="text-xs text-slate-500">
                Powered by{" "}
                <span className="font-semibold text-slate-800">
                  CiviPortal
                </span>
              </p>
            </div>
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              {initials || "C"}
            </span>
          </div>
        </div>
      </aside>
    </header>
  );
}
