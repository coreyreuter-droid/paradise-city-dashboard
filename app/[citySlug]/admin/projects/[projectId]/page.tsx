// app/[citySlug]/admin/projects/[projectId]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { cityHref } from "@/lib/cityRouting";
import { csrfFetch } from "@/components/CsrfProvider";
import type { CapitalProjectWithImages, CapitalProjectImage } from "@/lib/queries";

type LoadState = "idle" | "loading" | "loaded" | "error" | "not-found";

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const MAX_IMAGES = 3;

export default function AdminProjectEditorPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const isNew = projectId === "new";

  const [state, setState] = useState<LoadState>("idle");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("planned");
  const [published, setPublished] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState("");
  const [actualCompletionDate, setActualCompletionDate] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [fundingSource, setFundingSource] = useState("");

  // Images
  const [images, setImages] = useState<CapitalProjectImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Load existing project (if editing)
  useEffect(() => {
    async function load() {
      if (isNew) {
        setState("loaded");
        return;
      }

      setState("loading");
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError("Not authenticated");
          setState("error");
          return;
        }

        setAuthToken(session.access_token);

        const res = await fetch(`/api/admin/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.status === 404) {
          setState("not-found");
          return;
        }

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load project");
        }

        const { project } = await res.json() as { project: CapitalProjectWithImages };

        // Populate form
        setTitle(project.title);
        setSlug(project.slug);
        setShortDescription(project.short_description);
        setDescription(project.description);
        setStatus(project.status);
        setPublished(project.published);
        setLocationText(project.location_text || "");
        setMapUrl(project.map_url || "");
        setStartDate(project.start_date || "");
        setEstimatedCompletionDate(project.estimated_completion_date || "");
        setActualCompletionDate(project.actual_completion_date || "");
        setEstimatedCost(project.estimated_cost ? String(project.estimated_cost) : "");
        setFundingSource(project.funding_source || "");
        setImages(project.images);

        setState("loaded");
      } catch (err) {
        console.error("Load project error:", err);
        setError(err instanceof Error ? err.message : "Failed to load project");
        setState("error");
      }
    }

    load();
  }, [projectId, isNew]);

  // Get auth token for new projects
  useEffect(() => {
    if (!isNew) return;
    async function getToken() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) setAuthToken(session.access_token);
    }
    getToken();
  }, [isNew]);

  // Auto-generate slug from title (only for new projects)
  useEffect(() => {
    if (!isNew) return;
    const generated = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(generated);
  }, [title, isNew]);

  // Save project
  const handleSave = useCallback(async () => {
    if (!authToken) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const body = {
        title,
        slug,
        short_description: shortDescription,
        description,
        status,
        published,
        location_text: locationText || null,
        map_url: mapUrl || null,
        start_date: startDate || null,
        estimated_completion_date: estimatedCompletionDate || null,
        actual_completion_date: actualCompletionDate || null,
        estimated_cost: estimatedCost ? Number(estimatedCost) : null,
        funding_source: fundingSource || null,
      };

      const url = isNew ? "/api/admin/projects" : `/api/admin/projects/${projectId}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await csrfFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save project");
      }

      const data = await res.json();

      if (isNew) {
        // Redirect to edit page for the new project
        router.push(cityHref(`/admin/projects/${data.project.id}`));
      } else {
        setSuccessMessage("Project saved successfully");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error("Save project error:", err);
      setError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setSaving(false);
    }
  }, [
    authToken, isNew, projectId, title, slug, shortDescription, description,
    status, published, locationText, mapUrl, startDate, estimatedCompletionDate,
    actualCompletionDate, estimatedCost, fundingSource, router
  ]);

  // Delete project
  const handleDelete = useCallback(async () => {
    if (!authToken || isNew) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this project? This cannot be undone."
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await csrfFetch(`/api/admin/projects/${projectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete project");
      }

      router.push(cityHref("/admin/projects"));
    } catch (err) {
      console.error("Delete project error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete project");
      setDeleting(false);
    }
  }, [authToken, isNew, projectId, router]);

  // Upload image
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!authToken || isNew) return;

    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = "";

    if (images.length >= MAX_IMAGES) {
      setImageError(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    setUploadingImage(true);
    setImageError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("alt_text", `${title} image`);

      const res = await csrfFetch(`/api/admin/projects/${projectId}/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload image");
      }

      const { image } = await res.json();
      setImages((prev) => [...prev, image]);
    } catch (err) {
      console.error("Upload image error:", err);
      setImageError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  }, [authToken, isNew, projectId, images.length, title]);

  // Delete image
  const handleImageDelete = useCallback(async (imageId: string) => {
    if (!authToken) return;

    try {
      const res = await csrfFetch(`/api/admin/projects/${projectId}/images`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ imageId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete image");
      }

      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      console.error("Delete image error:", err);
      setImageError(err instanceof Error ? err.message : "Failed to delete image");
    }
  }, [authToken, projectId]);

  // Render
  if (state === "loading" || state === "idle") {
    return (
      <AdminGuard>
        <AdminShell title="Loading...">
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading project...</div>
          </div>
        </AdminShell>
      </AdminGuard>
    );
  }

  if (state === "not-found") {
    return (
      <AdminGuard>
        <AdminShell title="Project not found">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <p className="text-sm text-slate-600">This project could not be found.</p>
            <Link
              href={cityHref("/admin/projects")}
              className="mt-4 inline-block text-sm font-medium text-slate-900 hover:underline"
            >
              ← Back to projects
            </Link>
          </div>
        </AdminShell>
      </AdminGuard>
    );
  }

  if (state === "error") {
    return (
      <AdminGuard>
        <AdminShell title="Error">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error || "An error occurred"}
          </div>
        </AdminShell>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminShell
        title={isNew ? "New Project" : "Edit Project"}
        description={isNew ? "Create a new capital project" : "Update project details"}
      >
        <div className="space-y-6">
          {/* Back link */}
          <Link
            href={cityHref("/admin/projects")}
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to projects
          </Link>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-8"
          >
            {/* Basic info */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="title" className="block text-sm font-medium text-slate-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="slug" className="block text-sm font-medium text-slate-700">
                    URL Slug <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
                      /projects/
                    </span>
                    <input
                      id="slug"
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      required
                      className="block w-full rounded-none rounded-r-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="shortDescription" className="block text-sm font-medium text-slate-700">
                    Short Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="shortDescription"
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    required
                    maxLength={200}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {shortDescription.length}/200 characters. Shown on project cards.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                    Full Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={6}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Use blank lines to separate paragraphs.
                  </p>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-slate-700">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    id="published"
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  <label htmlFor="published" className="text-sm font-medium text-slate-700">
                    Published (visible on public portal)
                  </label>
                </div>
              </div>
            </section>

            {/* Dates */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Dates</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-slate-700">
                    Start Date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="estimatedCompletionDate" className="block text-sm font-medium text-slate-700">
                    Estimated Completion
                  </label>
                  <input
                    id="estimatedCompletionDate"
                    type="date"
                    value={estimatedCompletionDate}
                    onChange={(e) => setEstimatedCompletionDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="actualCompletionDate" className="block text-sm font-medium text-slate-700">
                    Actual Completion
                  </label>
                  <input
                    id="actualCompletionDate"
                    type="date"
                    value={actualCompletionDate}
                    onChange={(e) => setActualCompletionDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>
            </section>

            {/* Costs */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Cost Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="estimatedCost" className="block text-sm font-medium text-slate-700">
                    Estimated Cost
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
                      $
                    </span>
                    <input
                      id="estimatedCost"
                      type="number"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(e.target.value)}
                      min="0"
                      step="1"
                      className="block w-full rounded-none rounded-r-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="fundingSource" className="block text-sm font-medium text-slate-700">
                    Funding Source
                  </label>
                  <input
                    id="fundingSource"
                    type="text"
                    value={fundingSource}
                    onChange={(e) => setFundingSource(e.target.value)}
                    placeholder="e.g., General Fund, Federal Grant"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>
            </section>

            {/* Location */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Location</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="locationText" className="block text-sm font-medium text-slate-700">
                    Location Description
                  </label>
                  <input
                    id="locationText"
                    type="text"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    placeholder="e.g., 123 Main Street, Downtown District"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="mapUrl" className="block text-sm font-medium text-slate-700">
                    Map Link URL
                  </label>
                  <input
                    id="mapUrl"
                    type="url"
                    value={mapUrl}
                    onChange={(e) => setMapUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>
            </section>

            {/* Images */}
            {!isNew && (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Images ({images.length}/{MAX_IMAGES})
                </h2>
                <p className="text-sm text-slate-500">
                  The first image will be used as the featured image on project cards.
                  Use a project photo, rendering, or site image (not a chart or screenshot).
                </p>

                {imageError && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{imageError}</div>
                )}

                <div className="flex flex-wrap gap-4">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className="relative group"
                    >
                      <img
                        src={image.image_url}
                        alt={image.alt_text}
                        className="h-32 w-48 rounded-lg object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute left-2 top-2 rounded bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">
                          Featured
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleImageDelete(image.id)}
                        className="absolute right-2 top-2 rounded-full bg-red-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                        aria-label="Delete image"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}

                  {images.length < MAX_IMAGES && (
                    <label className="flex h-32 w-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-slate-400 hover:bg-slate-100">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="sr-only"
                      />
                      {uploadingImage ? (
                        <span className="text-sm text-slate-500">Uploading...</span>
                      ) : (
                        <>
                          <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="mt-1 text-sm text-slate-500">Add image</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </section>
            )}

            {isNew && (
              <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-700">
                Save the project first, then you can add images.
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 border-t border-slate-200 pt-6">
              {/* Inline messages near save button */}
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              {successMessage && (
                <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{successMessage}</div>
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  {!isNew && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting || saving}
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      {deleting ? "Deleting..." : "Delete project"}
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Link
                    href={cityHref("/admin/projects")}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={saving || deleting}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : isNew ? "Create project" : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
