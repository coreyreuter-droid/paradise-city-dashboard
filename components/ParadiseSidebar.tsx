// components/ParadiseSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
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
  { path: "/vendors", label: "Vendors" },
];

type PortalBranding = {
  city_name: string | null;
  tagline: string | null;
  primary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  logo_url: string | null;

  enable_actuals: boolean;
  enable_transactions: boolean;
  enable_revenues: boolean;
  enable_vendors: boolean;
};

type Props = {
  initialBranding?: PortalBranding | null;
  initialIsPublished?: boolean;
};

export default function ParadiseSidebar({
  initialBranding = null,
  initialIsPublished = true,
}: Props) {

  const pathname = usePathname();

  const [branding] = useState<PortalBranding | null>(initialBranding);
  const [mobileOpen, setMobileOpen] = useState(false);

  const mobileNavRef = useRef<HTMLElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  // Focus trap and Escape key for mobile menu
  useEffect(() => {
    if (!mobileOpen) return;

    const navElement = mobileNavRef.current;
    if (!navElement) return;

    // Focus the close button when menu opens
    const closeButton = navElement.querySelector<HTMLButtonElement>(
      'button[aria-label="Close navigation"]'
    );
    closeButton?.focus();

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        mobileToggleRef.current?.focus();
        return;
      }

      // Focus trap: cycle through focusable elements
      if (e.key === "Tab") {
        const focusable = navElement.querySelectorAll<HTMLElement>(
          'a[href], button, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  // whether dashboard nav should be visible (published OR admin)
  const [showDashboardNav, setShowDashboardNav] = useState(initialIsPublished);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminState() {
      // Determine if viewer is admin/super_admin (client-side session)
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

      if (cancelled) return;

      setIsAdminUser(isAdmin);

      // Public sees dashboard nav only when published; admins always see it
      setShowDashboardNav(initialIsPublished || isAdmin);
    }

    loadAdminState();

    return () => {
      cancelled = true;
    };
  }, [initialIsPublished]);


  const isActive = (path: string) => {
    const full = cityHref(path);

    // Home: only active on exact /<slug>
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
    branding?.tagline || "Citizen Transparency";

  const initials = portalTitle
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .slice(0, 3)
    .toUpperCase();

  const adminHomeHref = cityHref("/admin");
  const adminActive =
    pathname === adminHomeHref || pathname.startsWith(adminHomeHref + "/");

  const closeMobile = () => setMobileOpen(false);

  // Desktop nav styling (dark themed sidebar)
  const renderDesktopNavList = () => {
    const enableActuals = branding?.enable_actuals !== false;
    const enableTransactions = branding?.enable_transactions === true;
    const enableRevenues = branding?.enable_revenues === true;
    const enableVendors = enableTransactions && branding?.enable_vendors === true;

    return (
      <>
        {/* Dashboard group – now conditional */}
        {showDashboardNav && (
          <div>
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Dashboard
            </p>
            <ul className="mt-2 space-y-1">
              {navItems.map((item) => {
                // Strict feature gating on nav visibility
                if (
                  (item.path === "/analytics" ||
                    item.path === "/departments") &&
                  !enableActuals
                ) {
                  return null;
                }

                if (item.path === "/transactions" && !enableTransactions) {
                  return null;
                }

                if (item.path === "/vendors" && !enableVendors) {
                  return null;
                }

                if (item.path === "/revenues" && !enableRevenues) {
                  return null;
                }

                const href = cityHref(item.path);
                const active = isActive(item.path);
                const isDepartmentsItem = item.path === "/departments";

                // Desktop dark themed styles
                const baseClasses =
                  "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgb(var(--accent-rgb))] focus-visible:ring-offset-[rgb(var(--surface-rgb))]";

                // Active: accent left border + tinted background + semibold
                const activeClasses =
                  "bg-[rgb(var(--accent-rgb)/0.15)] border-l-[3px] border-[rgb(var(--accent-rgb))] text-white font-semibold";
                const inactiveClasses =
                  "text-white/70 hover:bg-white/10 hover:text-white border-l-[3px] border-transparent";

                return (
                  <li key={item.path}>
                    <Link
                      href={href}
                      className={`${baseClasses} ${
                        active ? activeClasses : inactiveClasses
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full transition ${
                          active
                            ? "bg-[rgb(var(--accent-rgb))]"
                            : "bg-white/30 group-hover:bg-white/60"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>

                    {/* Nested department label under Departments when viewing a specific dept */}
                    {isDepartmentsItem && currentDepartmentLabel && (
                      <div className="mt-1 pl-6 pr-3">
                        <div className="truncate text-xs text-white/50">
                          <span className="mr-1 text-white/30">›</span>
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
        {isAdminUser && (
          <div className="mt-6">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Admin
            </p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link
                  href={adminHomeHref}
                  className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgb(var(--accent-rgb))] focus-visible:ring-offset-[rgb(var(--surface-rgb))] ${
                    adminActive
                      ? "bg-[rgb(var(--accent-rgb)/0.15)] border-l-[3px] border-[rgb(var(--accent-rgb))] text-white font-semibold"
                      : "text-white/70 hover:bg-white/10 hover:text-white border-l-[3px] border-transparent"
                  }`}
                  aria-current={adminActive ? "page" : undefined}
                >
                  <span
                    className={`inline-block h-1 w-1 rounded-full transition ${
                      adminActive
                        ? "bg-[rgb(var(--accent-rgb))]"
                        : "bg-white/30 group-hover:bg-white/60"
                    }`}
                  />
                  <span className="truncate">Admin home</span>
                </Link>
              </li>
            </ul>
          </div>
        )}
      </>
    );
  };

  // Mobile nav styling (keep light for simplicity)
  const renderMobileNavList = () => {
    const enableActuals = branding?.enable_actuals !== false;
    const enableTransactions = branding?.enable_transactions === true;
    const enableRevenues = branding?.enable_revenues === true;
    const enableVendors = enableTransactions && branding?.enable_vendors === true;

    return (
      <>
        {/* Dashboard group – now conditional */}
        {showDashboardNav && (
          <div>
            <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Dashboard
            </p>
            <ul className="mt-2 space-y-1">
              {navItems.map((item) => {
                // Strict feature gating on nav visibility
                if (
                  (item.path === "/analytics" ||
                    item.path === "/departments") &&
                  !enableActuals
                ) {
                  return null;
                }

                if (item.path === "/transactions" && !enableTransactions) {
                  return null;
                }

                if (item.path === "/vendors" && !enableVendors) {
                  return null;
                }

                if (item.path === "/revenues" && !enableRevenues) {
                  return null;
                }

                const href = cityHref(item.path);
                const active = isActive(item.path);
                const isDepartmentsItem = item.path === "/departments";

                const baseClasses =
                  "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900 focus-visible:ring-offset-slate-50";

                const activeClasses = "bg-slate-900 text-white shadow-sm";
                const inactiveClasses =
                  "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

                return (
                  <li key={item.path}>
                    <Link
                      href={href}
                      onClick={closeMobile}
                      className={`${baseClasses} ${
                        active ? activeClasses : inactiveClasses
                      }`}
                      aria-current={active ? "page" : undefined}
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
        {isAdminUser && (
          <div className="mt-6">
            <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Admin
            </p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link
                  href={adminHomeHref}
                  onClick={closeMobile}
                  className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900 focus-visible:ring-offset-slate-50 ${
                    adminActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  aria-current={adminActive ? "page" : undefined}
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
        )}
      </>
    );
  };

  return (
    <header
      role="banner"
      aria-label={`${portalTitle} site navigation`}
      className="flex flex-col sm:flex-none sm:w-56 lg:w-64 xl:w-72"
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--primary-rgb))] text-xs font-semibold text-white shadow-sm">
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
          ref={mobileToggleRef}
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          aria-controls="city-nav-panel"
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
        <div className="fixed inset-0 z-40 sm:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          {/* Backdrop - using button for keyboard accessibility */}
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-black/30 cursor-default"
            onClick={closeMobile}
            aria-label="Close navigation menu"
            tabIndex={-1}
          />
          {/* Drawer */}
          <nav
            ref={mobileNavRef}
            id="city-nav-panel"
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--primary-rgb))] text-xs font-semibold text-white shadow-sm">
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
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                aria-label="Close navigation"
              >
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>

            <div className="flex h-[calc(100%-3rem)] flex-col justify-between overflow-y-auto px-3 py-3">
              <div className="space-y-6">
                {renderMobileNavList()}
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/civiportal-logo.png"
                    alt="CiviPortal"
                    className="h-5 w-5 rounded-full object-contain"
                  />
                </div>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* DESKTOP SIDEBAR (sm+ only) - Dark themed */}
      <aside
        className="hidden sm:flex fixed inset-y-0 left-0 w-56 lg:w-64 xl:w-72 flex-col bg-[rgb(var(--surface-rgb))] px-3 py-4 shadow-lg"
        aria-label="Primary sidebar navigation"
      >
        {/* Brand */}
        <div className="mb-5 flex items-center gap-3 px-2">
          <div>
            {branding?.logo_url ? (
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={branding.logo_url}
                  alt={portalTitle}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--primary-rgb))] text-sm font-semibold text-white shadow-sm">
                {initials || "C"}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">
              {portalTitle}
            </div>
            <div className="truncate text-xs text-white/60">
              {portalTagline}
            </div>
          </div>
        </div>

        {/* Main nav */}
        <nav className="mt-1 flex-1 space-y-6 overflow-y-auto pb-6">
          {renderDesktopNavList()}
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-white/10 pt-3">
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
            <div>
              <p className="text-xs text-white/50">
                Powered by{" "}
                <span className="font-semibold text-white/70">
                  CiviPortal
                </span>
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/civiportal-logo.png"
              alt="CiviPortal"
              className="h-5 w-5 rounded-full object-contain"
            />
          </div>
        </div>
      </aside>
    </header>
  );
}
