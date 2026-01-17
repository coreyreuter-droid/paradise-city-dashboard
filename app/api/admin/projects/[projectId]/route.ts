// app/api/admin/projects/[projectId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { CITY_SLUG } from "@/lib/cityRouting";
import {
  getAdminProjectById,
  updateProject,
  deleteProject,
  slugExists,
  generateSlug,
} from "@/lib/adminProjectQueries";

type RouteContext = {
  params: { projectId: string } | Promise<{ projectId: string }>;
};

/**
 * GET /api/admin/projects/[projectId]
 * Get a single project for editing
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;

    const { projectId } = await context.params;

    const project = await getAdminProjectById(projectId, CITY_SLUG);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });
  } catch (err: unknown) {
    console.error("GET /api/admin/projects/[projectId] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch project" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/projects/[projectId]
 * Update a project
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    // Verify CSRF
    const csrfError = await requireCsrf(req);
    if (csrfError) return csrfError;

    // Verify admin
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;

    const { projectId } = await context.params;
    const body = await req.json();

    // Check project exists
    const existing = await getAdminProjectById(projectId, CITY_SLUG);
    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Build update object (only include provided fields)
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim().length === 0) {
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 }
        );
      }
      updates.title = body.title.trim();
    }

    if (body.slug !== undefined) {
      const newSlug = body.slug.trim() || generateSlug(body.title || existing.title);
      if (!newSlug) {
        return NextResponse.json(
          { error: "Could not generate a valid slug" },
          { status: 400 }
        );
      }
      // Check uniqueness (excluding current project)
      const exists = await slugExists(CITY_SLUG, newSlug, projectId);
      if (exists) {
        return NextResponse.json(
          { error: `A project with the slug "${newSlug}" already exists. Please choose a different slug.` },
          { status: 400 }
        );
      }
      updates.slug = newSlug;
    }

    if (body.short_description !== undefined) {
      if (typeof body.short_description !== "string" || body.short_description.trim().length === 0) {
        return NextResponse.json(
          { error: "Short description cannot be empty" },
          { status: 400 }
        );
      }
      if (body.short_description.length > 200) {
        return NextResponse.json(
          { error: "Short description must be 200 characters or less" },
          { status: 400 }
        );
      }
      updates.short_description = body.short_description.trim();
    }

    if (body.description !== undefined) {
      if (typeof body.description !== "string" || body.description.trim().length === 0) {
        return NextResponse.json(
          { error: "Description cannot be empty" },
          { status: 400 }
        );
      }
      updates.description = body.description.trim();
    }

    if (body.status !== undefined) {
      const validStatuses = ["planned", "in_progress", "completed"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: "Status must be one of: planned, in_progress, completed" },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }

    if (body.published !== undefined) {
      updates.published = body.published === true;
    }

    if (body.location_text !== undefined) {
      updates.location_text = body.location_text?.trim() || null;
    }

    if (body.map_url !== undefined) {
      if (body.map_url && typeof body.map_url === "string" && body.map_url.trim()) {
        const urlPattern = /^https?:\/\/.+/i;
        if (!urlPattern.test(body.map_url.trim())) {
          return NextResponse.json(
            { error: "Map URL must be a valid HTTP or HTTPS URL" },
            { status: 400 }
          );
        }
        updates.map_url = body.map_url.trim();
      } else {
        updates.map_url = null;
      }
    }

    if (body.start_date !== undefined) {
      updates.start_date = body.start_date || null;
    }

    if (body.estimated_completion_date !== undefined) {
      updates.estimated_completion_date = body.estimated_completion_date || null;
    }

    if (body.actual_completion_date !== undefined) {
      updates.actual_completion_date = body.actual_completion_date || null;
    }

    if (body.estimated_cost !== undefined) {
      updates.estimated_cost = body.estimated_cost ? Number(body.estimated_cost) : null;
    }

    if (body.funding_source !== undefined) {
      updates.funding_source = body.funding_source?.trim() || null;
    }

    // Apply updates
    const project = await updateProject(projectId, CITY_SLUG, updates);

    return NextResponse.json({ project });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/projects/[projectId] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update project" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/projects/[projectId]
 * Delete a project and all its images
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    // Verify CSRF
    const csrfError = await requireCsrf(req);
    if (csrfError) return csrfError;

    // Verify admin
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;

    const { projectId } = await context.params;

    // Check project exists
    const existing = await getAdminProjectById(projectId, CITY_SLUG);
    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Delete project (cascades to images in DB)
    await deleteProject(projectId, CITY_SLUG);

    // Note: Storage files are not automatically deleted
    // We could clean them up here, but orphaned files aren't critical for V1

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE /api/admin/projects/[projectId] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete project" },
      { status: 500 }
    );
  }
}
