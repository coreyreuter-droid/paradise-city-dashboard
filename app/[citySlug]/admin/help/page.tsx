// app/[citySlug]/admin/help/page.tsx
"use client";

import Link from "next/link";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import { cityHref } from "@/lib/cityRouting";

export default function AdminHelpPage() {
  return (
    <AdminGuard>
      <AdminShell
        title="Help & FAQs"
        description="Answers to common questions about data uploads, modules, publishing, and admin access."
      >
        <div className="space-y-6 text-sm text-slate-700">
          {/* Intro */}
          <section
            aria-label="Help overview"
            className="space-y-2"
          >
            <p className="text-xs text-slate-600">
              This page is designed to help city staff manage CiviPortal
              on their own—especially during annual budget cycles—without
              needing to contact the vendor for every question.
            </p>
            <div className="grid gap-3 text-xs sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">
                  Getting ready for a new fiscal year
                </p>
                <p className="mt-1 text-slate-600">
                  Steps to refresh your budgets, actuals, transactions,
                  and revenues.
                </p>
                <Link
                  href="#getting-ready"
                  className="mt-1 inline-flex text-[11px] font-semibold text-slate-800 underline-offset-2 hover:underline"
                >
                  Jump to section →
                </Link>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">
                  Upload formats & errors
                </p>
                <p className="mt-1 text-slate-600">
                  How to use templates and fix common validation issues.
                </p>
                <Link
                  href="#uploads"
                  className="mt-1 inline-flex text-[11px] font-semibold text-slate-800 underline-offset-2 hover:underline"
                >
                  Jump to section →
                </Link>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">
                  Modules, publish, & access
                </p>
                <p className="mt-1 text-slate-600">
                  How modules, publish status, and roles affect what
                  residents see.
                </p>
                <Link
                  href="#modules"
                  className="mt-1 inline-flex text-[11px] font-semibold text-slate-800 underline-offset-2 hover:underline"
                >
                  Jump to section →
                </Link>
              </div>
            </div>
          </section>

          {/* 1. Getting ready for a new fiscal year */}
          <section
            id="getting-ready"
            aria-label="Getting ready for a new fiscal year"
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              1. Getting ready for a new fiscal year
            </h2>
            <p className="text-xs text-slate-600">
              Each fiscal year, you&apos;ll typically upload a new set of
              budget, actual, and (optionally) transaction / revenue
              files. The recommended order is:
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-700">
              <li>
                Upload <span className="font-semibold">budgets</span>{" "}
                (Admin →{" "}
                <Link
                  href={cityHref("/admin/upload?table=budgets")}
                  className="underline-offset-2 hover:underline"
                >
                  Data upload
                </Link>
                ).
              </li>
              <li>
                Upload <span className="font-semibold">actuals</span>{" "}
                when you have spending data available.
              </li>
              <li>
                If you use transactions, upload{" "}
                <span className="font-semibold">
                  transaction-level detail
                </span>{" "}
                (date, vendor, description, amount).
              </li>
              <li>
                If the Revenues module is enabled, upload{" "}
                <span className="font-semibold">revenues</span>{" "}
                (by source, fund, and period).
              </li>
            </ol>
            <p className="text-xs text-slate-600">
              You can confirm that uploads succeeded from:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
              <li>
                <span className="font-semibold">
                  Admin → Overview
                </span>{" "}
                (high-level status and row counts).
              </li>
              <li>
                <Link
                  href={cityHref("/admin/upload/history")}
                  className="font-semibold underline-offset-2 hover:underline"
                >
                  Admin → Upload history
                </Link>{" "}
                (detailed logs of imports and row counts per table).
              </li>
            </ul>
          </section>

          {/* 2. Uploads & CSV formats */}
          <section
            id="uploads"
            aria-label="Uploads and CSV formats"
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              2. Uploads & CSV formats
            </h2>
            <p className="text-xs text-slate-600">
              CiviPortal uses CSV files with strict column names for
              each table. Use the built-in templates to avoid format
              errors.
            </p>

            <div className="grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">
                  Where to get templates
                </p>
                <p className="mt-1 text-slate-600">
                  Go to{" "}
                  <Link
                    href={cityHref("/admin/upload")}
                    className="font-semibold underline-offset-2 hover:underline"
                  >
                    Admin → Data upload
                  </Link>{" "}
                  and use the{" "}
                  <span className="font-semibold">
                    Download template
                  </span>{" "}
                  button after selecting a table.
                </p>
                <p className="mt-1 text-slate-600">
                  The template includes the required column headers and
                  example values.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">
                  Required tables
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-600">
                  <li>
                    <span className="font-semibold">budgets</span>: adopted
                    budget by fund/department/category.
                  </li>
                  <li>
                    <span className="font-semibold">actuals</span>: spending
                    by fund/department/category/fiscal period.
                  </li>
                  <li>
                    <span className="font-semibold">
                      transactions
                    </span>: line items (if Transactions module on).
                  </li>
                  <li>
                    <span className="font-semibold">revenues</span>: revenue
                    by source/fund/period (if Revenues module on).
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-semibold text-slate-900">
                Common validation errors and how to fix them
              </p>
              <ul className="list-disc space-y-1 pl-5 text-slate-700">
                <li>
                  <span className="font-semibold">
                    Missing required columns
                  </span>
                  : ensure all columns in the template are present and
                  spelled exactly the same.
                </li>
                <li>
                  <span className="font-semibold">Bad fiscal_year</span>
                  : must be a 4-digit year between 2000 and 2100 (e.g.,
                  2024).
                </li>
                <li>
                  <span className="font-semibold">Bad date</span>:
                  transactions require strict{" "}
                  <span className="font-mono text-xs">
                    YYYY-MM-DD
                  </span>{" "}
                  with valid calendar dates.
                </li>
                <li>
                  <span className="font-semibold">Bad period</span>:
                  actuals and revenues require{" "}
                  <span className="font-mono text-xs">
                    YYYY-PP
                  </span>{" "}
                  where PP is 01–12.
                </li>
                <li>
                  <span className="font-semibold">
                    Negative amount
                  </span>
                  : negative amounts are not allowed in these tables.
                </li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-slate-900">
                Append vs Replace modes
              </p>
              <ul className="list-disc space-y-1 pl-5 text-slate-700">
                <li>
                  <span className="font-semibold">Append</span>: add new
                  rows; existing data is not changed.
                </li>
                <li>
                  <span className="font-semibold">
                    Replace this fiscal year only
                  </span>
                  : deletes rows for one year, then inserts the new
                  file. Use this when correcting a single year.
                </li>
                <li>
                  <span className="font-semibold">
                    Replace entire table
                  </span>
                  : deletes all rows in a table before inserting. Only
                  use this if you intentionally want to reload the
                  whole dataset from scratch.
                </li>
              </ul>
            </div>
          </section>

          {/* 3. Modules & feature flags */}
          <section
            id="modules"
            aria-label="Modules and feature flags"
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              3. Modules & feature flags
            </h2>
            <p className="text-xs text-slate-600">
              CiviPortal supports multiple modules. You can choose which
              modules are visible on the public site.
            </p>

            <div className="grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">
                  What each module controls
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li>
                    <span className="font-semibold">
                      Budget &amp; actuals
                    </span>
                    : Overview, Analytics, Departments.
                  </li>
                  <li>
                    <span className="font-semibold">
                      Transactions
                    </span>
                    : Public Transactions page and related cards.
                  </li>
                  <li>
                    <span className="font-semibold">Vendors</span>:
                    vendor names and vendor summaries (requires
                    Transactions).
                  </li>
                  <li>
                    <span className="font-semibold">Revenues</span>:
                    Revenues page and Home revenue summary.
                  </li>
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">
                  Where to change module visibility
                </p>
                <p className="mt-1 text-slate-700">
                  Go to{" "}
                  <Link
                    href={cityHref("/admin/settings")}
                    className="font-semibold underline-offset-2 hover:underline"
                  >
                    Admin → Branding &amp; settings
                  </Link>{" "}
                  and scroll to the{" "}
                  <span className="font-semibold">
                    Modules &amp; visibility
                  </span>{" "}
                  section.
                </p>
                <p className="mt-1 text-slate-700">
                  Turning a module off:
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li>Removes its navigation links.</li>
                  <li>Makes direct URLs return a 404.</li>
                  <li>
                    Hides related cards from Overview / Analytics /
                    Home.
                  </li>
                  <li>
                    For Vendors, hides all vendor names and removes
                    vendor columns from exports.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 4. Publish vs draft */}
          <section
            id="publish"
            aria-label="Publish vs draft"
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              4. Publish vs draft
            </h2>
            <p className="text-xs text-slate-600">
              Publish status controls whether residents can see the
              public portal.
            </p>
            <div className="grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">
                  Draft mode
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li>
                    Only authenticated admins can view the public
                    portal.
                  </li>
                  <li>
                    Safe for staging new data, checking charts, and
                    reviewing content.
                  </li>
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">
                  Published
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li>
                    Anyone with the link can see the portal without
                    logging in.
                  </li>
                  <li>
                    You can still update data and settings; publish is
                    not permanent.
                  </li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-slate-700">
              You can change publish status from{" "}
              <Link
                href={cityHref("/admin/publish")}
                className="font-semibold underline-offset-2 hover:underline"
              >
                Admin → Publish status
              </Link>
              . It&apos;s safe to move back to draft if you discover
              problems.
            </p>
          </section>

          {/* 5. Users & roles */}
          <section
            id="users"
            aria-label="Users and roles"
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              5. Users & roles
            </h2>
            <p className="text-xs text-slate-600">
              Use roles to control who can manage data and who has
              read-only access.
            </p>
            <div className="grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">
                  Role definitions
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li>
                    <span className="font-semibold">
                      Super admin
                    </span>
                    : full access, including inviting users and changing
                    roles.
                  </li>
                  <li>
                    <span className="font-semibold">Admin</span>: can
                    upload data, manage settings, and view admin tools.
                  </li>
                  <li>
                    <span className="font-semibold">
                      Viewer / no role
                    </span>
                    : read-only access to admin dashboards (if you give
                    them access via auth), but not recommended for most
                    cities.
                  </li>
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">
                  Where to manage users
                </p>
                <p className="mt-1 text-slate-700">
                  Go to{" "}
                  <Link
                    href={cityHref("/admin/users")}
                    className="font-semibold underline-offset-2 hover:underline"
                  >
                    Admin → Users &amp; roles
                  </Link>{" "}
                  to:
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li>Invite new users by email.</li>
                  <li>Set or change roles (admin, super admin, viewer).</li>
                  <li>Remove admin access when staff leave.</li>
                  <li>Delete accounts that should no longer exist.</li>
                </ul>
                <p className="mt-1 text-slate-600">
                  For safety, the system prevents you from removing the
                  last remaining super admin.
                </p>
              </div>
            </div>
          </section>

          {/* 6. Troubleshooting */}
          <section
            id="troubleshooting"
            aria-label="Troubleshooting"
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              6. Troubleshooting common issues
            </h2>
            <div className="space-y-2 text-xs text-slate-700">
              <div>
                <p className="font-semibold text-slate-900">
                  “We uploaded data but the public site didn&apos;t
                  change.”
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>
                    Confirm you uploaded to the correct{" "}
                    <span className="font-semibold">table</span> and{" "}
                    <span className="font-semibold">fiscal year</span>.
                  </li>
                  <li>
                    Check <span className="font-semibold">Admin → Upload history</span>{" "}
                    to confirm row counts.
                  </li>
                  <li>
                    Ensure the relevant module (Actuals/Transactions/Revenues)
                    is turned on in{" "}
                    <span className="font-semibold">
                      Branding &amp; settings
                    </span>
                    .
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-slate-900">
                  “A tab or card disappeared from the public site.”
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>
                    Check module flags in{" "}
                    <span className="font-semibold">
                      Admin → Branding &amp; settings
                    </span>
                    .
                  </li>
                  <li>
                    If a module is off, its nav links and pages are
                    intentionally hidden.
                  </li>
                  <li>
                    Vendors will only show when{" "}
                    <span className="font-semibold">
                      Transactions
                    </span>{" "}
                    is on and{" "}
                    <span className="font-semibold">Vendor names</span>{" "}
                    is enabled.
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-slate-900">
                  “Residents can&apos;t see the site.”
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>
                    Confirm the portal is marked as{" "}
                    <span className="font-semibold">Published</span> in{" "}
                    <Link
                      href={cityHref("/admin/publish")}
                      className="font-semibold underline-offset-2 hover:underline"
                    >
                      Admin → Publish status
                    </Link>
                    .
                  </li>
                  <li>
                    Ensure they&apos;re using the correct public URL
                    shared by your team.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 7. Who to contact */}
          <section
            id="contact"
            aria-label="Support contact"
            className="space-y-2 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              7. Who to contact if you still need help
            </h2>
            <p className="text-xs text-slate-700">
              If you run into issues that aren&apos;t covered here:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
              <li>
                Start by contacting your internal portal administrator
                or IT team.
              </li>
              <li>
                If they need vendor support, they&apos;ll know how to
                escalate with the CiviPortal team.
              </li>
            </ul>
          </section>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
