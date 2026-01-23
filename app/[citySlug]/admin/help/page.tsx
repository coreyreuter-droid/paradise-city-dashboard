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
        description="Answers to common questions about data uploads, branding, modules, capital projects, and publishing."
      >
        <div className="space-y-6 text-sm text-slate-700">
          {/* Quick links */}
          <section aria-label="Help overview" className="space-y-2">
            <p className="text-xs text-slate-700">
              This page helps staff manage CiviPortal independently—especially during annual
              budget cycles—without needing vendor support for every question.
            </p>

            <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">Getting started</p>
                <p className="mt-1 text-slate-700">New fiscal year setup and upload order.</p>
                <Link
                  href="#getting-ready"
                  className="mt-1 inline-flex text-[11px] font-semibold text-slate-800 underline-offset-2 hover:underline"
                >
                  Jump to section →
                </Link>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">Fiscal year basics</p>
                <p className="mt-1 text-slate-700">How FY labels and periods work.</p>
                <Link
                  href="#fiscal-year-basics"
                  className="mt-1 inline-flex text-[11px] font-semibold text-slate-800 underline-offset-2 hover:underline"
                >
                  Jump to section →
                </Link>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">Branding & images</p>
                <p className="mt-1 text-slate-700">Logos, hero images, file sizes, and formats.</p>
                <Link
                  href="#branding"
                  className="mt-1 inline-flex text-[11px] font-semibold text-slate-800 underline-offset-2 hover:underline"
                >
                  Jump to section →
                </Link>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">Capital projects</p>
                <p className="mt-1 text-slate-700">Adding projects, images, and statuses.</p>
                <Link
                  href="#capital-projects"
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
            <h2 className="text-sm font-semibold text-slate-900">1. Getting ready for a new fiscal year</h2>
            <p className="text-xs text-slate-700">
              Each fiscal year, you&apos;ll typically upload a new set of budgets, actuals, and (optionally)
              transaction / revenue files. Recommended order:
            </p>

            <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-700">
              <li>
                Upload <span className="font-semibold">budgets</span> (Admin →{" "}
                <Link href={cityHref("/admin/upload?table=budgets")} className="underline-offset-2 hover:underline">
                  Data upload
                </Link>
                ).
              </li>
              <li>
                Upload <span className="font-semibold">actuals</span> when you have spending data available.
              </li>
              <li>
                If you use transactions, upload{" "}
                <span className="font-semibold">transaction-level detail</span> (date, vendor, description, amount).
              </li>
              <li>
                If the Revenues module is enabled, upload <span className="font-semibold">revenues</span>.
              </li>
              <li>
                Update <span className="font-semibold">landing page content</span> (year-in-review, capital projects highlight) if needed.
              </li>
            </ol>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <p className="font-semibold text-slate-900">After an upload, confirm success here:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                <li>
                  <span className="font-semibold">Admin → Overview</span> (high-level status and row counts).
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
                <li className="text-slate-600">
                  Tip: If you uploaded a year and don&apos;t see it on the public site, check the{" "}
                  <span className="font-semibold">Fiscal year basics</span> section below—your month may map to
                  the next fiscal year depending on your FY start date.
                </li>
              </ul>
            </div>
          </section>

          {/* 2. Fiscal year basics */}
          <section
            id="fiscal-year-basics"
            aria-label="Fiscal year basics"
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">2. Fiscal year basics (how years & periods work)</h2>

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="font-semibold">Important (this prevents 90% of confusion):</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>
                  CiviPortal labels fiscal years by the <span className="font-semibold">ending year</span>. Example:
                  <span className="font-semibold"> FY2028</span> is the fiscal year that ends in 2028.
                </li>
                <li>
                  For <span className="font-semibold">Actuals</span> and <span className="font-semibold">Revenues</span>
                  , <span className="font-mono">period</span> is a{" "}
                  <span className="font-semibold">calendar month</span> in{" "}
                  <span className="font-mono">YYYY-MM</span> format (example: <span className="font-mono">2027-08</span>
                  ).
                </li>
                <li>
                  The portal derives <span className="font-mono">fiscal_year</span> from the month using your
                  city&apos;s fiscal year start date.
                </li>
                <li>
                  If your FY starts July 1: <span className="font-mono">2027-08</span> (Aug 2027) belongs to{" "}
                  <span className="font-semibold">FY2028</span> (because FY2028 = Jul 2027–Jun 2028).
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">
                How each dataset works
              </p>
              <ul className="mt-1 list-disc space-y-2 pl-5">
                <li>
                  <span className="font-semibold">Budgets:</span> Uses{" "}
                  <span className="font-mono">fiscal_year</span> directly. No monthly period field.
                </li>
                <li>
                  <span className="font-semibold">Actuals:</span> Uses{" "}
                  <span className="font-mono">period</span> as a calendar month (<span className="font-mono">YYYY-MM</span>).
                  The portal derives fiscal_year from period.
                </li>
                <li>
                  <span className="font-semibold">Revenues:</span> Same as actuals—period is a calendar month.
                </li>
                <li>
                  <span className="font-semibold">Transactions:</span> Uses{" "}
                  <span className="font-mono">date</span> (calendar date). The portal derives fiscal_year from date.
                </li>
              </ul>
            </div>

            <div className="text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Where to configure fiscal year</p>
              <p className="mt-1">
                Go to{" "}
                <Link href={cityHref("/admin/settings")} className="font-semibold underline-offset-2 hover:underline">
                  Admin → Branding & settings
                </Link>{" "}
                and open the <span className="font-semibold">Fiscal Year</span> section. Set your start month (e.g., July) and day (e.g., 1).
              </p>
            </div>
          </section>

          {/* 3. Branding & Images */}
          <section
            id="branding"
            aria-label="Branding and images"
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">3. Branding & images</h2>
            <p className="text-xs text-slate-700">
              Configure your portal&apos;s visual identity in{" "}
              <Link href={cityHref("/admin/settings")} className="font-semibold underline-offset-2 hover:underline">
                Admin → Branding & settings
              </Link>
              . The settings page uses collapsible sections—click a section header to expand it.
            </p>

            <div className="grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">Image requirements</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li><span className="font-semibold">Max file size:</span> 5MB per image</li>
                  <li><span className="font-semibold">Formats:</span> PNG, JPEG, WebP</li>
                  <li><span className="font-semibold">Logo:</span> Square, PNG with transparency recommended</li>
                  <li><span className="font-semibold">Seal:</span> Square, optional</li>
                  <li><span className="font-semibold">Hero:</span> 1920×600 or wider landscape</li>
                  <li><span className="font-semibold">Leader photo:</span> Square, 112×112 display size</li>
                  <li><span className="font-semibold">Featured projects:</span> 800×450 landscape</li>
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">How to upload images</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li>Open the <span className="font-semibold">Branding</span> section in settings</li>
                  <li>Click the dashed drop zone or drag a file onto it</li>
                  <li>Image uploads immediately (no need to click Save first)</li>
                  <li>Hover over an image and click ✕ to delete it</li>
                  <li>Click <span className="font-semibold">Save changes</span> to persist all settings</li>
                </ul>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <p className="font-semibold text-slate-900">Settings page sections</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                <li><span className="font-semibold">Modules Enable/Disable:</span> Toggle which data modules residents can see</li>
                <li><span className="font-semibold">Branding:</span> Gov name, tagline, colors, logo, seal, hero image</li>
                <li><span className="font-semibold">Landing Page Sections:</span> Toggle visibility of landing page sections</li>
                <li><span className="font-semibold">Story Sections:</span> Hero message, gov description, year-in-review</li>
                <li><span className="font-semibold">Leadership:</span> Leader name, title, message, and photo</li>
                <li><span className="font-semibold">Gov Stats:</span> Population, employees, area</li>
                <li><span className="font-semibold">Capital Projects:</span> Highlight text and 3 featured project cards</li>
                <li><span className="font-semibold">Fiscal Year:</span> Start month, day, and public label</li>
              </ul>
            </div>
          </section>

          {/* 4. Capital Projects */}
          <section
            id="capital-projects"
            aria-label="Capital projects"
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">4. Capital projects</h2>
            <p className="text-xs text-slate-700">
              The Capital Projects module lets you showcase infrastructure investments like roads, parks, facilities, and utilities.
            </p>

            <div className="grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">Enabling capital projects</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li>
                    Go to{" "}
                    <Link href={cityHref("/admin/settings")} className="font-semibold underline-offset-2 hover:underline">
                      Admin → Branding & settings
                    </Link>
                  </li>
                  <li>Open the <span className="font-semibold">Modules Enable/Disable</span> section</li>
                  <li>Check <span className="font-semibold">Capital Projects</span></li>
                  <li>Save changes</li>
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">Managing projects</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li>
                    Go to{" "}
                    <Link href={cityHref("/admin/projects")} className="font-semibold underline-offset-2 hover:underline">
                      Admin → Capital Projects
                    </Link>
                  </li>
                  <li>Click <span className="font-semibold">New Project</span> to add one</li>
                  <li>Click a project card to edit details</li>
                  <li>Projects appear on the public Projects page when published</li>
                </ul>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <p className="font-semibold text-slate-900">Project fields</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                <li><span className="font-semibold">Title:</span> Project name (e.g., "Main Street Reconstruction")</li>
                <li><span className="font-semibold">Description:</span> What the project delivers and its impact</li>
                <li><span className="font-semibold">Category:</span> Infrastructure, Parks, Facilities, Utilities, Other</li>
                <li><span className="font-semibold">Status:</span> Planning, In Progress, Completed, On Hold</li>
                <li><span className="font-semibold">Budget:</span> Total project budget</li>
                <li><span className="font-semibold">Spent:</span> Amount spent to date (optional)</li>
                <li><span className="font-semibold">Timeline:</span> Start and end dates</li>
                <li><span className="font-semibold">Department link:</span> Optionally link to a budget department</li>
                <li><span className="font-semibold">Images:</span> Up to 10 photos per project (5MB max each)</li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <p className="font-semibold text-slate-900">Project images</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
                <li>Recommended size: 800×450 or wider (16:9 aspect ratio)</li>
                <li>Formats: PNG, JPEG, WebP</li>
                <li>Max file size: 5MB per image</li>
                <li>The first image becomes the project&apos;s cover photo</li>
                <li>Drag images to reorder them</li>
              </ul>
            </div>
          </section>

          {/* 5. Uploads & CSV formats */}
          <section
            id="uploads"
            aria-label="Uploads and CSV formats"
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">5. Uploads & CSV formats</h2>
            <p className="text-xs text-slate-700">
              CiviPortal uses CSV files with strict column names. Use the built-in templates to avoid format errors.
            </p>

            <div className="grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">Where to get templates</p>
                <p className="mt-1 text-slate-700">
                  Go to{" "}
                  <Link href={cityHref("/admin/upload")} className="font-semibold underline-offset-2 hover:underline">
                    Admin → Data upload
                  </Link>
                  , select a table, and click <span className="font-semibold">Download template</span>.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">Required tables</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li><span className="font-semibold">budgets:</span> Adopted budget by fund/department/category</li>
                  <li><span className="font-semibold">actuals:</span> Spending by fund/department/category</li>
                  <li><span className="font-semibold">transactions:</span> Line items (if module enabled)</li>
                  <li><span className="font-semibold">revenues:</span> Revenue by source/fund (if module enabled)</li>
                </ul>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-semibold text-slate-900">Common validation errors</p>
              <ul className="list-disc space-y-1 pl-5 text-slate-700">
                <li><span className="font-semibold">Missing columns:</span> Ensure all template columns are present and spelled exactly</li>
                <li><span className="font-semibold">Bad fiscal_year:</span> Must be 4-digit year between 2000–2100</li>
                <li><span className="font-semibold">Bad date:</span> Use YYYY-MM-DD or MM/DD/YYYY</li>
                <li><span className="font-semibold">Bad period:</span> Use YYYY-MM (e.g., 2027-08)</li>
                <li><span className="font-semibold">Negative amount:</span> Negative values are not allowed</li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-slate-900">Append vs Replace modes</p>
              <ul className="list-disc space-y-1 pl-5 text-slate-700">
                <li><span className="font-semibold">Append:</span> Add new rows; existing data unchanged</li>
                <li><span className="font-semibold">Replace this fiscal year:</span> Delete one year, then insert new file</li>
                <li><span className="font-semibold">Replace entire table:</span> Delete all rows before inserting (use carefully)</li>
              </ul>
            </div>
          </section>

          {/* 6. Modules & feature flags */}
          <section
            id="modules"
            aria-label="Modules and feature flags"
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">6. Modules & feature flags</h2>
            <p className="text-xs text-slate-700">
              Control which features are visible on the public site.
            </p>

            <div className="grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">Available modules</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li><span className="font-semibold">Budget & Actuals:</span> Overview, Analytics, Departments</li>
                  <li><span className="font-semibold">Transactions:</span> Transaction explorer and cards</li>
                  <li><span className="font-semibold">Vendors:</span> Vendor names and summaries (requires Transactions)</li>
                  <li><span className="font-semibold">Revenues:</span> Revenue dashboards by source</li>
                  <li><span className="font-semibold">Capital Projects:</span> Projects page and cards</li>
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">Where to change modules</p>
                <p className="mt-1 text-slate-700">
                  Go to{" "}
                  <Link href={cityHref("/admin/settings")} className="font-semibold underline-offset-2 hover:underline">
                    Admin → Branding & settings
                  </Link>
                  , open the <span className="font-semibold">Modules Enable/Disable</span> section.
                </p>
                <p className="mt-1 text-slate-700">Turning a module off:</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li>Removes its navigation links</li>
                  <li>Makes direct URLs return 404</li>
                  <li>Hides related cards from Overview/Home</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 7. Publish vs draft */}
          <section
            id="publish"
            aria-label="Publish vs draft"
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">7. Publish vs draft</h2>
            <p className="text-xs text-slate-700">
              Control whether residents can see the public portal.
            </p>

            <div className="grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">Draft mode</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li>Only authenticated admins can view the public portal</li>
                  <li>Safe for staging new data and reviewing content</li>
                  <li>Shows a &ldquo;Draft&rdquo; banner at top of public pages</li>
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">Published</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li>Anyone with the link can see the portal</li>
                  <li>You can still update data and settings</li>
                  <li>You can move back to draft anytime</li>
                </ul>
              </div>
            </div>

            <p className="text-xs text-slate-700">
              Toggle publish status from the <span className="font-semibold">Publish status</span> toggle at the top of{" "}
              <Link href={cityHref("/admin/settings")} className="font-semibold underline-offset-2 hover:underline">
                Admin → Branding & settings
              </Link>.
            </p>
          </section>

          {/* 8. Users & roles */}
          <section
            id="users"
            aria-label="Users and roles"
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">8. Users & roles</h2>
            <p className="text-xs text-slate-700">
              Control who can manage data and who has read-only access.
            </p>

            <div className="grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">Role definitions</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
                  <li><span className="font-semibold">Super admin:</span> Full access, can invite users and change roles</li>
                  <li><span className="font-semibold">Admin:</span> Can upload data, manage settings, view admin tools</li>
                  <li><span className="font-semibold">Viewer:</span> Read-only access (rarely used)</li>
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-900">Managing users</p>
                <p className="mt-1 text-slate-700">
                  Go to{" "}
                  <Link href={cityHref("/admin/users")} className="font-semibold underline-offset-2 hover:underline">
                    Admin → Users & roles
                  </Link>{" "}
                  to invite users, change roles, or remove access.
                </p>
                <p className="mt-1 text-slate-600">
                  The system prevents removing the last super admin.
                </p>
              </div>
            </div>
          </section>

          {/* 9. Troubleshooting */}
          <section
            id="troubleshooting"
            aria-label="Troubleshooting"
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">9. Troubleshooting</h2>

            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <p className="font-semibold text-slate-900">&ldquo;We uploaded data but the public site didn&apos;t change.&rdquo;</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>Confirm you uploaded to the correct table</li>
                  <li>Check Admin → Upload history for errors</li>
                  <li>Ensure the relevant module is enabled in settings</li>
                  <li>Check fiscal year basics if data appears under wrong FY</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-slate-900">&ldquo;My data showed up under the wrong fiscal year.&rdquo;</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>For actuals/revenues, period is a calendar month</li>
                  <li>If FY starts July 1, 2027-08 belongs to FY2028</li>
                  <li>See <Link href="#fiscal-year-basics" className="font-semibold underline-offset-2 hover:underline">Fiscal year basics</Link></li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-slate-900">&ldquo;Image upload failed.&rdquo;</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>Check file size is under 5MB</li>
                  <li>Ensure format is PNG, JPEG, or WebP (not SVG or GIF)</li>
                  <li>Try a different browser or clear cache</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-slate-900">&ldquo;A section or tab disappeared from the public site.&rdquo;</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>Check module flags in settings</li>
                  <li>Check landing page section toggles</li>
                  <li>Vendors only shows when Transactions is on AND Vendor names is enabled</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-slate-900">&ldquo;Residents can&apos;t see the site.&rdquo;</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>Confirm the portal is Published (not Draft) in settings</li>
                  <li>Ensure they&apos;re using the correct URL</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 10. Contact */}
          <section
            id="contact"
            aria-label="Support contact"
            className="space-y-2 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-slate-900">10. Who to contact</h2>
            <p className="text-xs text-slate-700">If you run into issues not covered here:</p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
              <li>Contact your internal portal administrator or IT team first</li>
              <li>If they need vendor support, they can escalate to the CiviPortal team</li>
            </ul>
          </section>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
