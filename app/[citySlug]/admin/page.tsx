// app/[citySlug]/admin/page.tsx
"use client";

import Link from "next/link";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import { cityHref } from "@/lib/cityRouting";

export default function AdminOverviewPage() {
  return (
    <AdminGuard>
      <AdminShell
        title="Admin overview"
        description="Manage data uploads, branding, users, and publish status for this transparency portal."
      >
        <div className="space-y-6">
          {/* Intro blurb */}
          <section
            aria-label="Admin summary"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 shadow-sm sm:px-5 sm:py-5"
          >
            <p>
              Use the tools below to keep your portal data accurate, your
              branding on point, and control exactly when the site is
              visible to the public.
            </p>
          </section>

          {/* Grouped quick actions */}
          <section aria-label="Admin quick actions" className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Quick actions
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AdminTile
                title="Data & imports"
                description="Load and monitor the core financial datasets that power this portal."
                links={[
                  {
                    label: "Upload data",
                    href: cityHref("/admin/upload"),
                  },
                  {
                    label: "Upload history",
                    href: cityHref("/admin/upload/history"),
                  },
                ]}
              />
              <AdminTile
                title="Branding & visibility"
                description="Control how the portal looks and when it is visible to the public."
                links={[
                  {
                    label: "Branding & settings",
                    href: cityHref("/admin/settings"),
                  },
                  {
                    label: "Publish status",
                    href: cityHref("/admin/publish"),
                  },
                ]}
              />
              <AdminTile
                title="Access & setup"
                description="Manage who can log in and track remaining setup tasks."
                links={[
                  {
                    label: "Users & roles",
                    href: cityHref("/admin/users"),
                  },
                  {
                    label: "Onboarding checklist",
                    href: cityHref("/admin/onboarding"),
                  },
                ]}
              />
            </div>
          </section>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}

type TileLink = {
  label: string;
  href: string;
};

type TileProps = {
  title: string;
  description: string;
  links: TileLink[];
};

function AdminTile({ title, description, links }: TileProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left text-sm text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow-md focus-within:ring-2 focus-within:ring-sky-500 focus-within:ring-offset-2">

      <div className="mt-1 text-sm font-semibold text-slate-900">
        {title}
      </div>
      <p className="mt-1 text-xs text-slate-600 flex-1">
        {description}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-semibold text-sky-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            {link.label} →
          </Link>
        ))}
      </div>
    </div>
  );
}
