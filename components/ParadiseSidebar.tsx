// components/ParadiseSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { supabase } from "@/lib/supabase";

const navItems = [
  { href: "/paradise", label: "Overview" },
  { href: "/paradise/analytics", label: "Analytics" },
  { href: "/paradise/budget", label: "Budget" },
  { href: "/paradise/departments", label: "Departments" },
  { href: "/paradise/transactions", label: "Transactions" },
];

const adminItems = [
  { href: "/paradise/admin", label: "Admin home" },
  { href: "/paradise/admin/upload", label: "Data upload" },
  { href: "/paradise/admin/settings", label: "Branding & settings" },
  { href: "/paradise/admin/onboarding", label: "Onboarding checklist" },
  { href: "/paradise/admin/publish", label: "Publish portal" },
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

  useEffect(() => {
    let cancelled = false;

    async function loadBranding() {
      const { data, error } = await supabase
        .from("portal_settings")
        .select(
          "city_name, tagline, primary_color, accent_color, logo_url"
        )
        .maybeSingle();

      if (cancelled) return;

      if (!error && data) {
        setBranding(data as PortalBranding);
      }
    }

    loadBranding();

    return () => {
      cancelled = true;
    };
  }, []);

  const isActive = (href: string) => {
    // Overview: only active on exact /paradise
    if (href === "/paradise") {
      return pathname === "/paradise";
    }
    // Others: active on exact or nested route
    return pathname === href || pathname.startsWith(href + "/");
  };

  const inAdmin = pathname.startsWith("/paradise/admin");

  // If we're on /paradise/departments/<Department Name>...
  let currentDepartmentLabel: string | null = null;
  if (pathname.startsWith("/paradise/departments/")) {
    const segments = pathname.split("/");
    // ['', 'paradise', 'departments', '<Department Name>', ...]
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
    branding?.tagline || "Public-facing financial transparency portal";

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

  return (
    <aside className="hidden w-64 flex-none border-r border-slate-200 bg-white/95 px-3 py-4 shadow-sm sm:flex sm:flex-col lg:w-72">
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
          <div className="truncate text-[11px] text-slate-500">
            {portalTagline}
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="mt-1 flex-1 space-y-6 overflow-y-auto pb-6">
        <div>
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Dashboard
          </p>
          <ul className="mt-2 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const isDepartmentsItem = item.href === "/paradise/departments";

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                      active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
                      <div className="truncate text-[11px] text-slate-500">
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

        {/* Admin nav */}
        <div>
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Admin
          </p>

          {inAdmin ? (
            // Inside admin: show full admin menu
            <ul className="mt-2 space-y-1">
              {adminItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition ${
                        active
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <span
                        className={`inline-block h-1 w-1 rounded-full transition ${
                          active
                            ? "bg-white"
                            : "bg-slate-300 group-hover:bg-slate-500"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            // Outside admin: single Admin link
            <ul className="mt-2 space-y-1">
              <li>
                <Link
                  href="/paradise/admin"
                  className="group flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <span className="inline-block h-1 w-1 rounded-full bg-slate-300 group-hover:bg-slate-500" />
                  <span className="truncate">Admin</span>
                </Link>
              </li>
            </ul>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <div>
            <p className="text-[11px] text-slate-500">
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
            CP
          </span>
        </div>
      </div>
    </aside>
  );
}
