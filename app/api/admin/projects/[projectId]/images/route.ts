// app/api/admin/projects/[projectId]/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseService";
import { requireAdmin } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { CITY_SLUG } from "@/lib/cityRouting";
import {
  getAdminProjectById,
  getProjectImageCount,
  getNextImageSortOrder,
  addProjectImage,
  deleteProjectImage,
} from "@/lib/adminProjectQueries";

const MAX_IMAGES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET_NAME = "project-images";

type RouteContext = {
  params: { projectId: string } | Promise<{ projectId: string }>;
};

/**
 * POST /api/admin/projects/[projectId]/images
 * Upload an image to a project
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    // Verify CSRF
    const csrfError = await requireCsrf(req);
    if (csrfError) return csrfError;

    // Verify admin
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;

    const { projectId } = await context.params;

    // Check project exists and belongs to this city
    const project = await getAdminProjectById(projectId, CITY_SLUG);
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check image count limit
    const currentCount = await getProjectImageCount(projectId);
    if (currentCount >= MAX_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMAGES} images allowed per project. Delete an existing image first.` },
        { status: 400 }
      );
    }

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const altText = formData.get("alt_text") as string | null;
    const caption = formData.get("caption") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image (PNG, JPG, WEBP, etc.)" },
        { status: 400 }
      );
    }

    // Validate alt text
    const finalAltText = altText?.trim() || `${project.title} image ${currentCount + 1}`;

    // Generate unique filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const path = `${CITY_SLUG}/${projectId}/${uniqueId}.${safeExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError || !uploadData) {
      console.error("Image upload error:", uploadError);
      
      // Check if bucket doesn't exist
      if (uploadError?.message?.includes("not found") || uploadError?.message?.includes("Bucket")) {
        return NextResponse.json(
          { error: `Storage bucket "${BUCKET_NAME}" not found. Please create it in the Supabase dashboard.` },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to upload image. Please try again." },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path);

    // Get next sort order
    const sortOrder = await getNextImageSortOrder(projectId);

    // Save image record
    const image = await addProjectImage({
      project_id: projectId,
      city_slug: CITY_SLUG,
      image_url: publicUrl,
      alt_text: finalAltText,
      caption: caption?.trim() || null,
      sort_order: sortOrder,
    });

    return NextResponse.json({ image }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/admin/projects/[projectId]/images error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to upload image" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/projects/[projectId]/images
 * Delete an image from a project
 * Expects JSON body: { imageId: string }
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
    const project = await getAdminProjectById(projectId, CITY_SLUG);
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { imageId } = body;

    if (!imageId) {
      return NextResponse.json(
        { error: "Image ID is required" },
        { status: 400 }
      );
    }

    // Find the image to get its URL for storage deletion
    const imageToDelete = project.images.find((img) => img.id === imageId);
    if (!imageToDelete) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    // Delete from database first
    await deleteProjectImage(imageId, CITY_SLUG);

    // Try to delete from storage (best effort - don't fail if storage delete fails)
    try {
      // Extract path from URL
      const url = new URL(imageToDelete.image_url);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/project-images\/(.+)/);
      if (pathMatch) {
        const storagePath = decodeURIComponent(pathMatch[1]);
        await supabaseAdmin.storage.from(BUCKET_NAME).remove([storagePath]);
      }
    } catch (storageErr) {
      // Log but don't fail - orphaned files are not critical
      console.warn("Failed to delete image from storage:", storageErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE /api/admin/projects/[projectId]/images error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete image" },
      { status: 500 }
    );
  }
}
