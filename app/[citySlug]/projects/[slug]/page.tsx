// app/[citySlug]/projects/[slug]/page.tsx
import { notFound } from "next/navigation";
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
  if (!portalSettings?.enable_projects) {
    notFound();
  }

  if (!project) {
    notFound();
  }

  return <ProjectDetail project={project} />;
}
