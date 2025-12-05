// components/Admin/AdminShell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { cityHref } from "@/lib/cityRouting";

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

  const isActive = (href: string) => {
    const full = cityHref(href);
    return pathname === full || pathname.startsWith(full + "/");
  };

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

      {/* Main layout */}
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        {/* Sidebar nav */}
        <aside className="hidden w-56 shrink-0 md:block">
          <nav aria-label="Admin navigation" className="space-y-4 text-sm">
            <div>
              <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Admin
              </p>
              <ul className="mt-2 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const href = cityHref(item.href);
                  const active = isActive(item.href);

                  const base =
                    "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50";

                  const activeClasses =
                    "bg-slate-900 text-white shadow-sm";
                  const inactiveClasses =
                    "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

                  return (
                    <li key={item.href}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={`${base} ${
                          active ? activeClasses : inactiveClasses
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {active && (
                          <span className="ml-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="w-full">
          <section
            aria-label={title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
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

            <div>{children}</div>
          </section>
        </main>
      </div>
    </div>
  );
}
