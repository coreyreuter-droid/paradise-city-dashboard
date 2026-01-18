// components/Projects/ProjectCard.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { formatCurrencyCompact, formatDate } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";
import type { CapitalProjectWithImages } from "@/lib/queries";

type Props = {
  project: CapitalProjectWithImages;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  planned: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    label: "Planned",
  },
  in_progress: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    label: "In Progress",
  },
  completed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    label: "Completed",
  },
};

export default function ProjectCard({ project }: Props) {
  const status = STATUS_STYLES[project.status] ?? STATUS_STYLES.planned;
  const featuredImage = project.images[0];
  
  const completionDate = project.status === "completed" 
    ? project.actual_completion_date 
    : project.estimated_completion_date;

  return (
    <Link
      href={cityHref(`/projects/${project.slug}`)}
      className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        {featuredImage ? (
          <Image
            src={featuredImage.image_url}
            alt={featuredImage.alt_text}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              className="h-12 w-12 text-slate-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </div>
        )}
        
        {/* Status pill overlay */}
        <div className="absolute left-3 top-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-semibold text-slate-900 group-hover:text-slate-700">
          {project.title}
        </h3>
        
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-700">
          {project.short_description}
        </p>

        {/* Meta info */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
          {completionDate && (
            <span>
              {project.status === "completed" ? "Completed" : "Est. completion"}:{" "}
              <span className="font-medium text-slate-700">
                {formatDate(completionDate)}
              </span>
            </span>
          )}
          {!completionDate && project.status !== "completed" && (
            <span>
              Est. completion: <span className="font-medium text-slate-700">TBD</span>
            </span>
          )}
          {project.estimated_cost && (
            <span>
              Est. cost:{" "}
              <span className="font-medium text-slate-700">
                {formatCurrencyCompact(project.estimated_cost)}
              </span>
            </span>
          )}
        </div>

        {/* Updated date */}
        <div className="mt-2 text-xs text-slate-700">
          Updated {formatDate(project.updated_at)}
        </div>
      </div>
    </Link>
  );
}
