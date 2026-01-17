// lib/adminProjectQueries.ts
//
// Admin-only queries for capital projects.
// Uses supabaseAdmin (service role) to bypass RLS for admin operations.

import { supabaseAdmin } from "./supabaseService";
import type { 
  CapitalProject, 
  CapitalProjectImage, 
  CapitalProjectWithImages 
} from "./queries";

export type CreateProjectInput = {
  city_slug: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  status: "planned" | "in_progress" | "completed";
  published?: boolean;
  location_text?: string | null;
  map_url?: string | null;
  start_date?: string | null;
  estimated_completion_date?: string | null;
  actual_completion_date?: string | null;
  estimated_cost?: number | null;
  funding_source?: string | null;
};

export type UpdateProjectInput = Partial<Omit<CreateProjectInput, "city_slug">>;

/**
 * Get all projects for admin (includes unpublished)
 */
export async function getAdminProjects(
  citySlug: string
): Promise<CapitalProjectWithImages[]> {
  const { data, error } = await supabaseAdmin
    .from("capital_projects")
    .select(`
      *,
      images:capital_project_images(*)
    `)
    .eq("city_slug", citySlug)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getAdminProjects error:", error);
    throw error;
  }

  return (data ?? []).map((p) => ({
    ...p,
    images: (p.images ?? []).sort(
      (a: CapitalProjectImage, b: CapitalProjectImage) => a.sort_order - b.sort_order
    ),
  })) as CapitalProjectWithImages[];
}

/**
 * Get a single project by ID for admin editing
 */
export async function getAdminProjectById(
  projectId: string,
  citySlug: string
): Promise<CapitalProjectWithImages | null> {
  const { data, error } = await supabaseAdmin
    .from("capital_projects")
    .select(`
      *,
      images:capital_project_images(*)
    `)
    .eq("id", projectId)
    .eq("city_slug", citySlug)
    .maybeSingle();

  if (error) {
    console.error("getAdminProjectById error:", error);
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    images: (data.images ?? []).sort(
      (a: CapitalProjectImage, b: CapitalProjectImage) => a.sort_order - b.sort_order
    ),
  } as CapitalProjectWithImages;
}

/**
 * Check if a slug already exists for this city
 */
export async function slugExists(
  citySlug: string,
  slug: string,
  excludeProjectId?: string
): Promise<boolean> {
  let query = supabaseAdmin
    .from("capital_projects")
    .select("id", { count: "exact", head: true })
    .eq("city_slug", citySlug)
    .eq("slug", slug);

  if (excludeProjectId) {
    query = query.neq("id", excludeProjectId);
  }

  const { count, error } = await query;

  if (error) {
    console.error("slugExists error:", error);
    throw error;
  }

  return (count ?? 0) > 0;
}

/**
 * Create a new project
 */
export async function createProject(
  input: CreateProjectInput
): Promise<CapitalProject> {
  const { data, error } = await supabaseAdmin
    .from("capital_projects")
    .insert({
      city_slug: input.city_slug,
      title: input.title,
      slug: input.slug,
      short_description: input.short_description,
      description: input.description,
      status: input.status,
      published: input.published ?? false,
      location_text: input.location_text ?? null,
      map_url: input.map_url ?? null,
      start_date: input.start_date ?? null,
      estimated_completion_date: input.estimated_completion_date ?? null,
      actual_completion_date: input.actual_completion_date ?? null,
      estimated_cost: input.estimated_cost ?? null,
      funding_source: input.funding_source ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("createProject error:", error);
    throw error;
  }

  return data as CapitalProject;
}

/**
 * Update an existing project
 */
export async function updateProject(
  projectId: string,
  citySlug: string,
  input: UpdateProjectInput
): Promise<CapitalProject> {
  const { data, error } = await supabaseAdmin
    .from("capital_projects")
    .update(input)
    .eq("id", projectId)
    .eq("city_slug", citySlug)
    .select()
    .single();

  if (error) {
    console.error("updateProject error:", error);
    throw error;
  }

  return data as CapitalProject;
}

/**
 * Delete a project (cascades to images)
 */
export async function deleteProject(
  projectId: string,
  citySlug: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("capital_projects")
    .delete()
    .eq("id", projectId)
    .eq("city_slug", citySlug);

  if (error) {
    console.error("deleteProject error:", error);
    throw error;
  }
}

/**
 * Get image count for a project
 */
export async function getProjectImageCount(projectId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("capital_project_images")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (error) {
    console.error("getProjectImageCount error:", error);
    throw error;
  }

  return count ?? 0;
}

/**
 * Add an image to a project
 */
export async function addProjectImage(input: {
  project_id: string;
  city_slug: string;
  image_url: string;
  alt_text: string;
  caption?: string | null;
  sort_order: number;
}): Promise<CapitalProjectImage> {
  const { data, error } = await supabaseAdmin
    .from("capital_project_images")
    .insert({
      project_id: input.project_id,
      city_slug: input.city_slug,
      image_url: input.image_url,
      alt_text: input.alt_text,
      caption: input.caption ?? null,
      sort_order: input.sort_order,
    })
    .select()
    .single();

  if (error) {
    console.error("addProjectImage error:", error);
    throw error;
  }

  return data as CapitalProjectImage;
}

/**
 * Delete an image
 */
export async function deleteProjectImage(
  imageId: string,
  citySlug: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("capital_project_images")
    .delete()
    .eq("id", imageId)
    .eq("city_slug", citySlug);

  if (error) {
    console.error("deleteProjectImage error:", error);
    throw error;
  }
}

/**
 * Get next available sort order for a project's images
 */
export async function getNextImageSortOrder(projectId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("capital_project_images")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) {
    console.error("getNextImageSortOrder error:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    return 0;
  }

  return (data[0].sort_order ?? 0) + 1;
}

/**
 * Generate a URL-safe slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Spaces to hyphens
    .replace(/-+/g, "-") // Multiple hyphens to single
    .replace(/^-|-$/g, ""); // Trim hyphens from ends
}
