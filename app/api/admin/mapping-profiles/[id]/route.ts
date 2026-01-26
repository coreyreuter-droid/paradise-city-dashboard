// app/api/admin/mapping-profiles/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseService";
import { requireAdmin } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/mapping-profiles/[id]
 * Returns a single mapping profile
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from("mapping_profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("mapping-profiles/[id] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/mapping-profiles/[id]
 * Updates a mapping profile (only non-system profiles)
 * 
 * Body: {
 *   name?: string,
 *   column_mappings?: Record<string, string>
 * }
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
    }

    // Check if profile exists and is not a system profile
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("mapping_profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (existing.is_system) {
      return NextResponse.json(
        { error: "Cannot modify system profiles" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, column_mappings } = body;

    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { error: "Profile name cannot be empty" },
          { status: 400 }
        );
      }

      // Check for duplicate name (if changing)
      if (name.trim() !== existing.name) {
        const { data: duplicate } = await supabaseAdmin
          .from("mapping_profiles")
          .select("id")
          .eq("name", name.trim())
          .eq("dataset_type", existing.dataset_type)
          .neq("id", id)
          .single();

        if (duplicate) {
          return NextResponse.json(
            { error: `A profile named "${name.trim()}" already exists for ${existing.dataset_type}` },
            { status: 409 }
          );
        }
      }

      updates.name = name.trim();
    }

    if (column_mappings !== undefined) {
      if (typeof column_mappings !== "object" || column_mappings === null) {
        return NextResponse.json(
          { error: "column_mappings must be an object" },
          { status: 400 }
        );
      }

      for (const [key, value] of Object.entries(column_mappings)) {
        if (typeof key !== "string" || typeof value !== "string") {
          return NextResponse.json(
            { error: "column_mappings must be a Record<string, string>" },
            { status: 400 }
          );
        }
      }

      updates.column_mappings = column_mappings;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: profile, error: updateError } = await supabaseAdmin
      .from("mapping_profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating mapping profile:", updateError);
      return NextResponse.json(
        { error: "Failed to update mapping profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("mapping-profiles/[id] PUT error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/mapping-profiles/[id]
 * Deletes a mapping profile (only non-system profiles)
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
    }

    // Check if profile exists and is not a system profile
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("mapping_profiles")
      .select("id, is_system, name")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (existing.is_system) {
      return NextResponse.json(
        { error: "Cannot delete system profiles" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("mapping_profiles")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting mapping profile:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete mapping profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: `Profile "${existing.name}" deleted successfully` 
    });
  } catch (err) {
    console.error("mapping-profiles/[id] DELETE error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
