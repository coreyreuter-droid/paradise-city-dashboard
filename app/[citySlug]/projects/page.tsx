// app/[citySlug]/admin/projects/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { cityHref } from "@/lib/cityRouting";
import { formatDate, formatCurrencyCompact } from "@/lib/format";
import type { CapitalProjectWithImages } from "@/lib/queries";

type LoadState = "idle" | "loading" | "loaded" | "error" | "disabled";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  planned: { bg: "bg-blue-100", text: "text-blue-800", label: "Planned" },
  in_progress: { bg: "bg-amber-100", text: "text-amber-800", label: "In Progress" },
  completed: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Completed" },
};

export default function AdminProjectsPage() {
  const [state, setState] = useState<LoadState>("idle");
  const [projects, setProjects] = useState<CapitalProjectWithImages[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Check if feature is enabled, then load projects
  useEffect(() => {
    async function load() {
      setState("loading");
      setError(null);

      try {
        // First check if feature is enabled
        const { data: settings } = await supabase
          .from("portal_settings")
          .select("enable_projects")
          .maybeSingle();

        if (!settings?.enable_projects) {
          setState("disabled");
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError("Not authenticated");
          setState("error");
          return;
        }

        setAuthToken(session.access_token);

        const res = await fetch("/api/admin/projects", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load projects");
        }

        const data = await res.json();
        setProjects(data.projects ?? []);
        setState("loaded");
      } catch (err) {
        console.error("Load projects error:", err);
        setError(err instanceof Error ? err.message : "Failed to load projects");
        setState("error");
      }
    }

    load();
  }, []);

  const isLoading = state === "loading";

  // Feature not enabled - show upsell
  if (state === "disabled") {
    return (
      <AdminGuard>
        <AdminShell
          title="Capital Projects"
          description="Showcase major community improvements and infrastructure investments"
        >
          <div className="mx-auto max-w-xl py-12">
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <svg
                  className="h-6 w-6 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                Capital Projects Add-On
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Highlight capital improvement projects with photos, timelines, costs, and map links. 
                Give residents a visual way to track community investments.
              </p>
              <div className="mt-6 rounded-md bg-slate-50 p-4">
                <p className="text-sm text-slate-700">
                  To enable this feature for your portal, please contact us:
                </p>
                <a
                  href="mailto:support@civiportal.io?subject=Enable%20Capital%20Projects"
                  className="mt-3 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Contact Us to Enable
                </a>
              </div>
            </div>
          </div>
        </AdminShell>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminShell
        title="Capital Projects"
        description="Manage capital improvement projects for your portal"
        actions={
          <Link
            href={cityHref("/admin/projects/new")}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add project
          </Link>
        }
      >
        <div className="space-y-4">
          {/* Error state */}
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
              <div className="text-sm text-slate-500">Loading projects...</div>
            </div>
          )}

          {/* Empty state */}
          {state === "loaded" && projects.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">No projects yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Get started by creating your first capital project.
              </p>
              <div className="mt-4">
                <Link
                  href={cityHref("/admin/projects/new")}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add project
                </Link>
              </div>
            </div>
          )}

          {/* Projects table */}
          {state === "loaded" && projects.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Title
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Est. Completion
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Est. Cost
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Published
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Last Updated
                    </th>
                    <th scope="col" className="relative px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {projects.map((project) => {
                    const status = STATUS_STYLES[project.status] ?? STATUS_STYLES.planned;
                    return (
                      <tr key={project.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {project.images[0] ? (
                              <img
                                src={project.images[0].image_url}
                                alt=""
                                className="h-10 w-14 rounded object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-14 items-center justify-center rounded bg-slate-100">
                                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-900">
                                {project.title}
                              </div>
                              <div className="truncate text-xs text-slate-500">
                                /{project.slug}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {project.estimated_completion_date
                            ? formatDate(project.estimated_completion_date)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {project.estimated_cost
                            ? formatCurrencyCompact(project.estimated_cost)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {project.published ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                              </svg>
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Draft</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(project.updated_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={cityHref(`/admin/projects/${project.id}`)}
                            className="text-sm font-medium text-slate-700 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 rounded"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
