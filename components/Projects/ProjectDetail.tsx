// components/Projects/ProjectDetail.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";
import CardContainer from "@/components/CardContainer";
import SectionHeader from "@/components/SectionHeader";
import type { CapitalProjectWithImages } from "@/lib/queries";

type Props = {
  project: CapitalProjectWithImages;
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; progress: number }> = {
  planned: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Planned", progress: 10 },
  in_progress: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "In progress", progress: 55 },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Completed", progress: 100 },
};

const PROGRESS_COLORS: Record<string, string> = {
  planned: "bg-blue-400",
  in_progress: "bg-amber-400",
  completed: "bg-emerald-500",
};

export default function ProjectDetail({ project }: Props) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.planned;
  const progressColor = PROGRESS_COLORS[project.status] ?? "bg-slate-400";
  const selectedImage = project.images[selectedImageIndex];

  const completionDate = project.status === "completed"
    ? project.actual_completion_date
    : project.estimated_completion_date;

  // Timeline milestones
  const milestones: Array<{ label: string; date: string | null; done: boolean }> = [];
  if (project.start_date) {
    milestones.push({ label: "Started", date: project.start_date, done: true });
  }
  if (project.status === "in_progress") {
    milestones.push({ label: "In progress", date: null, done: true });
  }
  if (project.status === "completed" && project.actual_completion_date) {
    milestones.push({ label: "Completed", date: project.actual_completion_date, done: true });
  } else if (project.estimated_completion_date) {
    milestones.push({
      label: "Est. completion",
      date: project.estimated_completion_date,
      done: project.status === "completed",
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Capital project"
        title={project.title}
        description={project.short_description}
      />

      <nav aria-label="Breadcrumb" className="px-1 text-xs text-slate-600">
        <Link href={cityHref("/overview")} className="hover:text-slate-800">Home</Link>
        <span className="mx-1 text-slate-400">›</span>
        <Link href={cityHref("/projects")} className="hover:text-slate-800">Projects</Link>
        <span className="mx-1 text-slate-400">›</span>
        <span className="font-medium text-slate-700">{project.title}</span>
      </nav>

      {/* Status + progress strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
        <div className={`rounded-xl border ${status.border} ${status.bg} px-3 py-2.5`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
          <p className={`mt-0.5 text-sm font-semibold ${status.text}`}>{status.label}</p>
        </div>
        {project.estimated_cost && (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Est. cost</p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{formatCurrency(project.estimated_cost)}</p>
          </div>
        )}
        {completionDate && (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {project.status === "completed" ? "Completed" : "Est. completion"}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatDate(completionDate)}</p>
          </div>
        )}
        {project.funding_source && (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Funding</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">{project.funding_source}</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">Project progress</span>
          <span className="font-semibold text-slate-700">{status.progress}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-700 ${progressColor}`}
            style={{ width: `${status.progress}%` }}
          />
        </div>
      </div>

      {/* Timeline milestones */}
      {milestones.length > 1 && (
        <CardContainer>
          <section aria-label="Project timeline" className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Timeline</h2>
            <div className="flex items-center gap-0">
              {milestones.map((ms, i) => (
                <div key={ms.label} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      ms.done
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-300 bg-white"
                    }`}>
                      {ms.done ? (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-600">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-slate-300" />
                      )}
                    </div>
                    <p className="mt-1.5 text-[11px] font-medium text-slate-700">{ms.label}</p>
                    {ms.date && (
                      <p className="text-[11px] text-slate-500">{formatDate(ms.date)}</p>
                    )}
                  </div>
                  {i < milestones.length - 1 && (
                    <div className={`mx-1 h-0.5 flex-1 rounded-full ${
                      ms.done ? "bg-emerald-300" : "bg-slate-200"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </section>
        </CardContainer>
      )}

      {/* Image gallery */}
      {project.images.length > 0 && (
        <CardContainer>
          <section aria-label="Project photos" className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Photos</h2>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-slate-100">
              {selectedImage && (
                <Image
                  src={selectedImage.image_url}
                  alt={selectedImage.alt_text}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 800px"
                  priority
                />
              )}
            </div>

            {selectedImage?.caption && (
              <p className="text-xs text-slate-500 italic">{selectedImage.caption}</p>
            )}

            {project.images.length > 1 && (
              <div className="flex gap-2" role="group" aria-label="Image gallery">
                {project.images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative h-14 w-20 overflow-hidden rounded-md transition-all ${
                      index === selectedImageIndex
                        ? "ring-2 ring-slate-900"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    aria-label={`View image ${index + 1}`}
                  >
                    <Image src={image.image_url} alt="" fill className="object-cover" sizes="80px" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </CardContainer>
      )}

      {/* Description */}
      <CardContainer>
        <section aria-label="About this project" className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">About this project</h2>
          <div className="space-y-3">
            {project.description.split("\n\n").map((paragraph, idx) => (
              <p key={idx} className="text-sm text-slate-700 leading-relaxed">{paragraph}</p>
            ))}
          </div>
        </section>
      </CardContainer>

      {/* Details grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Location */}
        {(project.location_text || project.map_url) && (
          <CardContainer>
            <section aria-label="Location" className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-900">Location</h2>
              {project.location_text && (
                <p className="text-sm text-slate-700">{project.location_text}</p>
              )}
              {project.map_url && (
                <a
                  href={project.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-900"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  View on map
                </a>
              )}
            </section>
          </CardContainer>
        )}

        {/* Key dates */}
        <CardContainer>
          <section aria-label="Key dates" className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">Key dates</h2>
            <dl className="space-y-2 text-sm">
              {project.start_date && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Start date</dt>
                  <dd className="font-medium text-slate-900">{formatDate(project.start_date)}</dd>
                </div>
              )}
              {project.estimated_completion_date && project.status !== "completed" && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Est. completion</dt>
                  <dd className="font-medium text-slate-900">{formatDate(project.estimated_completion_date)}</dd>
                </div>
              )}
              {project.actual_completion_date && project.status === "completed" && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Completed</dt>
                  <dd className="font-medium text-emerald-700">{formatDate(project.actual_completion_date)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">Last updated</dt>
                <dd className="font-medium text-slate-900">{formatDate(project.updated_at)}</dd>
              </div>
            </dl>
          </section>
        </CardContainer>
      </div>

      <p className="text-center text-[11px] text-slate-500">
        Dates and costs are estimates and may change as the project progresses.
      </p>
    </div>
  );
}
