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

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/upload", label: "Data upload" },
  { href: "/admin/upload/history", label: "Upload history" },
  { href: "/admin/settings", label: "Branding & settings" },
  { href: "/admin/users", label: "Users & roles" },
  { href: "/admin/onboarding", label: "Onboarding checklist" },
  { href: "/admin/publish", label: "Publish status" },
];

export default function AdminShell({
  title,
  description,
  children,
  actions,
}: Props) {
  const pathname = usePathname();
  const [publishState, setPublishState] = useState<
    "unknown" | "published" | "draft"
  >("unknown");

  const isActive = (href: string) => {
    const full = cityHref(href);
    return pathname === full || pathname.startsWith(full + "/");
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
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
              className="inline-flex items-center rounded-full border border-slate-200 px-3 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              View public site
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <section
          aria-label={title}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          {/* Draft mode banner */}
          {publishState === "draft" && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              <span className="font-semibold">Draft mode.</span>{" "}
              This portal is currently hidden from the public. Switch it to{" "}
              <span className="font-semibold">Published</span> from{" "}
              <span className="font-semibold">Branding &amp; settings</span>{" "}
              when you&apos;re ready to launch.
            </div>
          )}

          {/* Header + actions */}
          <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Admin
              </p>
              <h2 className="mt-1 truncate text-sm font-semibold text-slate-900 sm:text-base">
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

          {/* Admin section navigation – tabs, no scroll arrows */}
          <nav
            aria-label="Admin navigation"
            className="mb-4 border-b border-slate-200"
          >
            <ul className="-mb-px flex flex-wrap gap-1 text-xs">
              {NAV_ITEMS.map((item) => {
                const href = cityHref(item.href);
                const active = isActive(item.href);

                const base =
                  "whitespace-nowrap rounded-t-lg px-3 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

                const activeClasses =
                  "border-b-2 border-slate-900 bg-slate-50 text-slate-900";
                const inactiveClasses =
                  "border-b-2 border-transparent text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900";

                return (
                  <li key={item.href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`${base} ${
                        active ? activeClasses : inactiveClasses
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Page content */}
          <div>{children}</div>
        </section>
      </div>
    </div>
  );
}
