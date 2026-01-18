// app/[citySlug]/projects/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import SectionHeader from "@/components/SectionHeader";
import CardContainer from "@/components/CardContainer";
import ProjectsGrid from "@/components/Projects/ProjectsGrid";
import {
  getPortalSettings,
  getPublishedProjects,
} from "@/lib/queries";
import type { PortalSettings } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";

export const revalidate = 60;

type SearchParamsShape = {
  status?: string | string[];
};

type PageProps = {
  params: { citySlug: string };
  searchParams: SearchParamsShape | Promise<SearchParamsShape>;
};

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

export default async function ProjectsPage({ params, searchParams }: PageProps) {
  const { citySlug } = await params;
  const sp = await searchParams;
  const statusFilter = pickFirst(sp.status);

  const [settings, projects] = await Promise.all([
    getPortalSettings(),
    getPublishedProjects(citySlug),
  ]);

  const portalSettings = settings as PortalSettings | null;

  // Check if portal is published
  if (portalSettings && portalSettings.is_published === false) {
    return <UnpublishedMessage settings={portalSettings} />;
  }

  // Check if projects feature is enabled
  if (!portalSettings?.enable_projects) {
    notFound();
  }

  // Filter by status if provided
  const filteredProjects = statusFilter
    ? projects.filter((p) => p.status === statusFilter)
    : projects;

  const cityName = portalSettings?.city_name ?? "our community";

  // Get most recent update date from published projects
  const lastUpdatedAt = projects.length > 0
    ? projects.reduce((latest, p) => {
        const pDate = new Date(p.updated_at);
        return pDate > latest ? pDate : latest;
      }, new Date(projects[0].updated_at))
    : null;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Last updated indicator */}
        {lastUpdatedAt && (
          <div className="mb-3 flex items-center justify-end">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Last updated {formatDate(lastUpdatedAt)}</span>
            </div>
          </div>
        )}

        <SectionHeader
          eyebrow="Capital Projects"
          title="Community Improvements"
          description={`Explore major improvement projects across ${cityName}. These investments support safer streets, reliable utilities, and better public services.`}
        />

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-4 px-1 text-sm text-slate-600">
          <ol className="flex items-center gap-1">
            <li>
              <Link href={cityHref("/")} className="hover:text-slate-800">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-500">›</li>
            <li aria-current="page">
              <span className="font-medium text-slate-700">Projects</span>
            </li>
          </ol>
        </nav>

        <div className="space-y-6">
          {/* Filters */}
          <CardContainer>
            <section aria-label="Project filters" className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 id="filter-heading" className="text-sm font-semibold text-slate-900">Filter by status</h2>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby="filter-heading">
                  <StatusFilterButton
                    href="/projects"
                    label="All"
                    active={!statusFilter}
                    count={projects.length}
                  />
                  <StatusFilterButton
                    href="/projects?status=planned"
                    label="Planned"
                    active={statusFilter === "planned"}
                    count={projects.filter((p) => p.status === "planned").length}
                  />
                  <StatusFilterButton
                    href="/projects?status=in_progress"
                    label="In Progress"
                    active={statusFilter === "in_progress"}
                    count={projects.filter((p) => p.status === "in_progress").length}
                  />
                  <StatusFilterButton
                    href="/projects?status=completed"
                    label="Completed"
                    active={statusFilter === "completed"}
                    count={projects.filter((p) => p.status === "completed").length}
                  />
                </div>
              </div>
            </section>
          </CardContainer>

          {/* Projects grid */}
          <CardContainer>
            {filteredProjects.length === 0 ? (
              <div className="px-6 py-12 text-center" role="status">
                <h3 className="sr-only">No projects found</h3>
                <p className="text-sm text-slate-700">
                  {statusFilter
                    ? `No ${statusFilter.replace("_", " ")} projects found.`
                    : "No projects available yet."}
                </p>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                <ProjectsGrid projects={filteredProjects} />
              </div>
            )}
          </CardContainer>
        </div>
      </div>
    </div>
  );
}

function StatusFilterButton({
  href,
  label,
  active,
  count,
}: {
  href: string;
  label: string;
  active: boolean;
  count: number;
}) {
  const baseClasses =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";
  const activeClasses = "bg-slate-900 text-white";
  const inactiveClasses = "bg-slate-100 text-slate-700 hover:bg-slate-200";

  return (
    <Link
      href={cityHref(href)}
      className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
      aria-current={active ? "page" : undefined}
    >
      {label}
      <span className={active ? "text-slate-300" : "text-slate-500"}>({count})</span>
    </Link>
  );
}
