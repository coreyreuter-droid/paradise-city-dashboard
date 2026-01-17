// app/[citySlug]/projects/[slug]/page.tsx
import { notFound } from "next/navigation";
import UnpublishedMessage from "@/components/City/UnpublishedMessage";
import ProjectDetail from "@/components/Projects/ProjectDetail";
import {
  getPortalSettings,
  getPublishedProjectBySlug,
} from "@/lib/queries";
import type { PortalSettings } from "@/lib/queries";

export const revalidate = 60;

type ParamsShape = {
  citySlug: string;
  slug: string;
};

type PageProps = {
  params: ParamsShape | Promise<ParamsShape>;
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const { citySlug, slug } = await params;

  const [settings, project] = await Promise.all([
    getPortalSettings(),
    getPublishedProjectBySlug(citySlug, slug),
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

  // Check if project exists
  if (!project) {
    notFound();
  }

  return (
    <div id="main-content" className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <ProjectDetail project={project} />
      </div>
    </div>
  );
}
