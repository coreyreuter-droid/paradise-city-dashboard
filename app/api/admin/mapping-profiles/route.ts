// app/api/admin/mapping-profiles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseService";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/auditLog";

const VALID_DATASET_TYPES = new Set([
  "budgets",
  "actuals",
  "transactions",
  "revenues",
  "funds_lookup",
  "departments_lookup",
]);

/**
 * GET /api/admin/mapping-profiles?dataset_type=transactions
 * Returns all mapping profiles for a specific dataset type
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;

    const { searchParams } = new URL(req.url);
    const datasetType = searchParams.get("dataset_type");

    if (!datasetType || !VALID_DATASET_TYPES.has(datasetType)) {
      return NextResponse.json(
        { error: "Invalid or missing dataset_type parameter" },
        { status: 400 }
      );
    }

    const { data: profiles, error } = await supabaseAdmin
      .from("mapping_profiles")
      .select("*")
      .eq("dataset_type", datasetType)
      .order("is_system", { ascending: false }) // System profiles first
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching mapping profiles:", error);
      return NextResponse.json(
        { error: "Failed to fetch mapping profiles" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profiles: profiles || [] });
  } catch (err) {
    console.error("mapping-profiles GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/mapping-profiles
 * Creates a new mapping profile
 * 
 * Body: {
 *   name: string,
 *   dataset_type: string,
 *   column_mappings: Record<string, string>
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;

    const body = await req.json();
    const { name, dataset_type, column_mappings } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Profile name is required" },
        { status: 400 }
      );
    }

    if (!dataset_type || !VALID_DATASET_TYPES.has(dataset_type)) {
      return NextResponse.json(
        { error: "Invalid dataset_type" },
        { status: 400 }
      );
    }

    if (!column_mappings || typeof column_mappings !== "object") {
      return NextResponse.json(
        { error: "column_mappings must be an object" },
        { status: 400 }
      );
    }

    // Validate column_mappings structure
    for (const [key, value] of Object.entries(column_mappings)) {
      if (typeof key !== "string" || typeof value !== "string") {
        return NextResponse.json(
          { error: "column_mappings must be a Record<string, string>" },
          { status: 400 }
        );
      }
    }

    // Check for duplicate name
    const { data: existing } = await supabaseAdmin
      .from("mapping_profiles")
      .select("id")
      .eq("name", name.trim())
      .eq("dataset_type", dataset_type)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `A profile named "${name.trim()}" already exists for ${dataset_type}` },
        { status: 409 }
      );
    }

    // Insert the new profile
    const { data: profile, error } = await supabaseAdmin
      .from("mapping_profiles")
      .insert({
        name: name.trim(),
        dataset_type,
        column_mappings,
        is_system: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating mapping profile:", error);
      return NextResponse.json(
        { error: "Failed to create mapping profile" },
        { status: 500 }
      );
    }

    // Log the action
    await logAuditEvent({
      actor_email: auth.email,
      actor_user_id: auth.userId,
      action: "profile.created",
      target_table: dataset_type,
      meta: {
        profile_name: name.trim(),
        dataset_type,
        column_count: Object.keys(column_mappings).length,
      },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (err) {
    console.error("mapping-profiles POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
