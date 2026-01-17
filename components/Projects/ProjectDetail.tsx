// components/Projects/ProjectDetail.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
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

export default function ProjectDetail({ project }: Props) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const status = STATUS_STYLES[project.status] ?? STATUS_STYLES.planned;
  const selectedImage = project.images[selectedImageIndex];

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href={cityHref("/projects")}
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 rounded"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to all projects
      </Link>

      {/* Hero section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {project.title}
          </h1>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${status.bg} ${status.text}`}
          >
            {status.label}
          </span>
        </div>

        <p className="text-base text-slate-600 sm:text-lg">
          {project.short_description}
        </p>
      </div>

      {/* Image gallery */}
      {project.images.length > 0 && (
        <div className="space-y-3">
          {/* Main image */}
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

          {/* Caption */}
          {selectedImage?.caption && (
            <p className="text-sm text-slate-500 italic">
              {selectedImage.caption}
            </p>
          )}

          {/* Thumbnail navigation */}
          {project.images.length > 1 && (
            <div className="flex gap-3" role="group" aria-label="Image gallery navigation">
              {project.images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight") {
                      e.preventDefault();
                      setSelectedImageIndex((i) => Math.min(i + 1, project.images.length - 1));
                    }
                    if (e.key === "ArrowLeft") {
                      e.preventDefault();
                      setSelectedImageIndex((i) => Math.max(i - 1, 0));
                    }
                  }}
                  className={`relative h-16 w-24 overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
                    index === selectedImageIndex
                      ? "ring-2 ring-slate-900"
                      : "opacity-70 hover:opacity-100"
                  }`}
                  aria-label={`View image ${index + 1} of ${project.images.length}: ${image.alt_text}`}
                  aria-pressed={index === selectedImageIndex}
                >
                  <Image
                    src={image.image_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Description */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">
            About This Project
          </h2>
          <div className="mt-3 prose prose-slate prose-sm max-w-none">
            {project.description.split("\n\n").map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Key facts panel */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Project Details
            </h2>

            <dl className="mt-4 space-y-4">
              {/* Status */}
              <div>
                <dt className="text-xs font-medium text-slate-500">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}
                  >
                    {status.label}
                  </span>
                </dd>
              </div>

              {/* Start date */}
              {project.start_date && (
                <div>
                  <dt className="text-xs font-medium text-slate-500">Start Date</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {formatDate(project.start_date)}
                  </dd>
                </div>
              )}

              {/* Estimated completion */}
              {project.estimated_completion_date && project.status !== "completed" && (
                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Estimated Completion
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {formatDate(project.estimated_completion_date)}
                  </dd>
                </div>
              )}

              {/* Actual completion */}
              {project.actual_completion_date && project.status === "completed" && (
                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Completed
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {formatDate(project.actual_completion_date)}
                  </dd>
                </div>
              )}

              {/* Estimated cost */}
              {project.estimated_cost && (
                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Estimated Cost
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {formatCurrency(project.estimated_cost)}
                  </dd>
                </div>
              )}

              {/* Funding source */}
              {project.funding_source && (
                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Funding Source
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {project.funding_source}
                  </dd>
                </div>
              )}

              {/* Location */}
              {project.location_text && (
                <div>
                  <dt className="text-xs font-medium text-slate-500">Location</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {project.location_text}
                  </dd>
                </div>
              )}

              {/* Map link */}
              {project.map_url && (
                <div>
                  <a
                    href={project.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
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
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    View on map
                    <span className="sr-only">(opens in new tab)</span>
                  </a>
                </div>
              )}
            </dl>

            {/* Disclaimer */}
            <p className="mt-6 text-xs text-slate-500">
              Dates and costs are estimates and may change as the project progresses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
