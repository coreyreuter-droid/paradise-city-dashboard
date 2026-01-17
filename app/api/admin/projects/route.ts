// app/api/admin/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { CITY_SLUG } from "@/lib/cityRouting";
import {
  getAdminProjects,
  createProject,
  slugExists,
  generateSlug,
} from "@/lib/adminProjectQueries";

/**
 * GET /api/admin/projects
 * List all projects for admin (includes unpublished)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;

    const projects = await getAdminProjects(CITY_SLUG);

    return NextResponse.json({ projects });
  } catch (err: unknown) {
    console.error("GET /api/admin/projects error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/projects
 * Create a new project
 */
export async function POST(req: NextRequest) {
  try {
    // Verify CSRF
    const csrfError = await requireCsrf(req);
    if (csrfError) return csrfError;

    // Verify admin
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;

    const body = await req.json();

    // Validate required fields
    const { title, short_description, description, status } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!short_description || typeof short_description !== "string" || short_description.trim().length === 0) {
      return NextResponse.json(
        { error: "Short description is required" },
        { status: 400 }
      );
    }

    if (short_description.length > 200) {
      return NextResponse.json(
        { error: "Short description must be 200 characters or less" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    const validStatuses = ["planned", "in_progress", "completed"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Status must be one of: planned, in_progress, completed" },
        { status: 400 }
      );
    }

    // Generate slug from title or use provided slug
    let slug = body.slug?.trim() || generateSlug(title);
    
    if (!slug) {
      return NextResponse.json(
        { error: "Could not generate a valid slug from the title" },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const exists = await slugExists(CITY_SLUG, slug);
    if (exists) {
      return NextResponse.json(
        { error: `A project with the slug "${slug}" already exists. Please change the title or slug.` },
        { status: 400 }
      );
    }

    // Validate optional URL field
    if (body.map_url && typeof body.map_url === "string" && body.map_url.trim()) {
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(body.map_url.trim())) {
        return NextResponse.json(
          { error: "Map URL must be a valid HTTP or HTTPS URL" },
          { status: 400 }
        );
      }
    }

    // Create project
    const project = await createProject({
      city_slug: CITY_SLUG,
      title: title.trim(),
      slug,
      short_description: short_description.trim(),
      description: description.trim(),
      status,
      published: body.published === true,
      location_text: body.location_text?.trim() || null,
      map_url: body.map_url?.trim() || null,
      start_date: body.start_date || null,
      estimated_completion_date: body.estimated_completion_date || null,
      actual_completion_date: body.actual_completion_date || null,
      estimated_cost: body.estimated_cost ? Number(body.estimated_cost) : null,
      funding_source: body.funding_source?.trim() || null,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/admin/projects error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create project" },
      { status: 500 }
    );
  }
}
