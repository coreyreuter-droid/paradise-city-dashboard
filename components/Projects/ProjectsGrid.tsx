// components/Projects/ProjectsGrid.tsx
"use client";

import ProjectCard from "./ProjectCard";
import type { CapitalProjectWithImages } from "@/lib/queries";

type Props = {
  projects: CapitalProjectWithImages[];
};

export default function ProjectsGrid({ projects }: Props) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
