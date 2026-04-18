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

// ── Top-level nav (5 items) ──────────────────────────────────────────────────
const ADMIN_NAV: { href: string; label: string; matchSlugs: string[] }[] = [
  { href: "", label: "Dashboard", matchSlugs: [] },
  { href: "upload", label: "Data", matchSlugs: ["upload", "data", "mapping", "lookups"] },
  { href: "settings", label: "Content", matchSlugs: ["settings", "projects", "feedback"] },
  { href: "publish", label: "Publish", matchSlugs: ["publish"] },
  { href: "users", label: "Settings", matchSlugs: ["users", "analytics", "help", "onboarding"] },
];

// ── Sub-navigation within each section ───────────────────────────────────────
const SECTION_SUBNAV: Record<string, { href: string; label: string }[]> = {
  Data: [
    { href: "upload", label: "Upload" },
    { href: "data", label: "Review changes" },
    { href: "lookups", label: "Public labels" },
    { href: "mapping", label: "Column matching" },
    { href: "upload/history", label: "Past uploads" },
  ],
  Content: [
    { href: "settings", label: "Homepage & branding" },
    { href: "projects", label: "Projects" },
    { href: "feedback", label: "Resident messages" },
  ],
  Publish: [],
  Settings: [
    { href: "users", label: "Users & roles" },
    { href: "analytics", label: "Portal analytics" },
    { href: "help", label: "Help" },
    { href: "onboarding", label: "Setup checklist" },
  ],
};

type PublishState = "unknown" | "published" | "draft";
type UserRole = "unknown" | "viewer" | "admin" | "super_admin";

export default function AdminShell({ title, description, children, actions }: Props) {
  const pathname = usePathname();
  const [publishState, setPublishState] = useState<PublishState>("unknown");
  const [userRole, setUserRole] = useState<UserRole>("unknown");

  // ── Helpers ──────────────────────────────────────────────────────────────
  const buildFullHref = (slug: string) => {
    if (!slug.trim()) return cityHref("/admin");
    return cityHref(`/admin/${slug}`);
  };

  const isNavActive = (item: typeof ADMIN_NAV[number]) => {
    const full = buildFullHref(item.href);
    if (!item.href.trim()) return pathname === full;
    if (pathname === full || pathname.startsWith(full + "/")) return true;
    const adminBase = cityHref("/admin/");
    return item.matchSlugs.some((slug) => {
      const slugPath = adminBase + slug;
      return pathname === slugPath || pathname.startsWith(slugPath + "/");
    });
  };

  const isSubnavActive = (slug: string) => {
    const full = buildFullHref(slug);
    return pathname === full || pathname.startsWith(full + "/");
  };

  const activeSection = ADMIN_NAV.find((item) => isNavActive(item))?.label || null;
  const subnavItems = activeSection ? SECTION_SUBNAV[activeSection] ?? null : null;

  // ── Load publish state ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase.from("portal_settings").select("is_published").maybeSingle();
      if (cancelled) return;
      setPublishState(data ? (data.is_published === false ? "draft" : "published") : "unknown");
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (cancelled) return;
      setUserRole(data?.role as UserRole ?? "unknown");
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header role="banner" className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {CITY_CONFIG.displayName}
            </p>
            <h1 className="truncate text-base font-semibold text-[rgb(var(--primary-rgb))]">
              Portal management
            </h1>
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">
              Keep your transparency portal up to date.
            </p>
          </div>
          <Link
            href={cityHref("/")}
            aria-label="View public transparency site"
            className="inline-flex items-center rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-rgb))] focus-visible:ring-offset-2"
          >
            View public site
          </Link>
        </div>
      </header>

      <div aria-labelledby="admin-page-title">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            {/* Draft / viewer banners */}
            {publishState === "draft" && (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                <span className="font-semibold">Draft mode.</span>{" "}
                Changes stay private until you{" "}
                <Link href={cityHref("/admin/publish")} className="font-semibold underline underline-offset-2">
                  publish
                </Link>.
              </div>
            )}
            {userRole === "viewer" && (
              <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
                <span className="font-semibold">View-only mode.</span> You can browse but cannot make changes.
              </div>
            )}

            {/* Page header */}
            {title.trim() && (
              <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2
                    id="admin-page-title"
                    className="truncate text-sm font-semibold text-[rgb(var(--primary-rgb))] sm:text-base"
                  >
                    {title}
                  </h2>
                  {description && <p className="mt-1 text-xs text-slate-600">{description}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
              </header>
            )}

            {/* Primary nav — 5 items */}
            <nav aria-label="Admin navigation" className="mb-4">
              <div className="flex overflow-x-auto border-b border-slate-200 sm:grid sm:grid-cols-5 sm:overflow-visible">
                {ADMIN_NAV.map((item) => {
                  const hrefFull = buildFullHref(item.href);
                  const active = isNavActive(item);
                  return (
                    <Link
                      key={item.href || "dashboard"}
                      href={hrefFull}
                      aria-current={active ? "page" : undefined}
                      className={`block text-center whitespace-nowrap px-3 py-2.5 text-xs font-medium transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-rgb))] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        active
                          ? "bg-[rgb(var(--accent-rgb)/0.08)] border-b-2 border-[rgb(var(--accent-rgb))] text-[rgb(var(--primary-rgb))] font-semibold"
                          : "border-b-2 border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Section sub-nav (pill buttons) */}
            {subnavItems && subnavItems.length > 0 && (
              <nav aria-label={`${activeSection} section navigation`} className="mb-5">
                <div className="flex flex-wrap gap-1.5">
                  {subnavItems.map((sub) => {
                    const active = isSubnavActive(sub.href);
                    return (
                      <Link
                        key={sub.href}
                        href={buildFullHref(sub.href)}
                        aria-current={active ? "page" : undefined}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
                          active
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                        }`}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            )}

            {/* Page content */}
            <section aria-label="Admin page content" className="text-sm text-slate-700">
              {children}
            </section>
          </section>
        </div>
      </div>
    </div>
  );
}
