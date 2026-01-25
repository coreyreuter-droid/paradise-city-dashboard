/**
 * Ingestion Profiles API
 * 
 * GET  /api/admin/ingestion/profiles - List profiles (optionally filter by dataset_type)
 * POST /api/admin/ingestion/profiles - Create or update a profile
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseService";
import { DatasetType, IngestionProfile } from "@/lib/ingestion/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// GET - List profiles
// ============================================================================

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  const { searchParams } = new URL(req.url);
  const datasetType = searchParams.get("dataset_type") as DatasetType | null;
  const activeOnly = searchParams.get("active_only") === "true";

  try {
    let query = supabaseAdmin
      .from("ingestion_profiles")
      .select("*")
      .order("updated_at", { ascending: false });

    if (datasetType) {
      query = query.eq("dataset_type", datasetType);
    }

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching ingestion profiles:", error);
      return NextResponse.json(
        { error: "Failed to fetch profiles" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profiles: data ?? [] });
  } catch (err) {
    console.error("Ingestion profiles GET error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create or update a profile
// ============================================================================

interface CreateProfileBody {
  id?: string; // If provided, updates existing profile
  dataset_type: DatasetType;
  name?: string;
  column_mappings: Record<string, unknown>;
  header_row_index?: number;
  skip_rows_after_header?: number;
  coa_enabled?: boolean;
  coa_source_column?: string;
  coa_delimiter?: string;
  coa_segment_order?: string[];
  coa_expected_segments?: number;
  is_active?: boolean;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  try {
    const body = (await req.json()) as CreateProfileBody;

    // Validate required fields
    if (!body.dataset_type) {
      return NextResponse.json(
        { error: "dataset_type is required" },
        { status: 400 }
      );
    }

    const validDatasetTypes = [
      "budgets",
      "actuals",
      "transactions",
      "revenues",
      "funds_lookup",
      "departments_lookup",
    ];

    if (!validDatasetTypes.includes(body.dataset_type)) {
      return NextResponse.json(
        { error: `Invalid dataset_type: ${body.dataset_type}` },
        { status: 400 }
      );
    }

    // Build the record to insert/update
    const record: Record<string, unknown> = {
      dataset_type: body.dataset_type,
      name: body.name || "Default",
      column_mappings: body.column_mappings || {},
      header_row_index: body.header_row_index ?? 1,
      skip_rows_after_header: body.skip_rows_after_header ?? 0,
      coa_enabled: body.coa_enabled ?? false,
      coa_source_column: body.coa_source_column || null,
      coa_delimiter: body.coa_delimiter || "-",
      coa_segment_order: body.coa_segment_order || null,
      coa_expected_segments: body.coa_expected_segments || null,
      is_active: body.is_active ?? true,
    };

    // If setting this profile as active, deactivate others of same type
    if (record.is_active) {
      // First, deactivate any existing active profile for this dataset type
      // (except the one we're updating, if it's an update)
      let deactivateQuery = supabaseAdmin
        .from("ingestion_profiles")
        .update({ is_active: false })
        .eq("dataset_type", body.dataset_type)
        .eq("is_active", true);

      if (body.id) {
        deactivateQuery = deactivateQuery.neq("id", body.id);
      }

      const { error: deactivateError } = await deactivateQuery;
      if (deactivateError) {
        console.warn("Non-fatal: error deactivating other profiles:", deactivateError);
      }
    }

    let result;

    if (body.id) {
      // Update existing profile
      const { data, error } = await supabaseAdmin
        .from("ingestion_profiles")
        .update({
          ...record,
          version: supabaseAdmin.rpc("increment_version"), // Increment version
        })
        .eq("id", body.id)
        .select()
        .single();

      if (error) {
        // Version increment via RPC might not work, try without
        const { data: data2, error: error2 } = await supabaseAdmin
          .from("ingestion_profiles")
          .update(record)
          .eq("id", body.id)
          .select()
          .single();

        if (error2) {
          console.error("Error updating ingestion profile:", error2);
          return NextResponse.json(
            { error: "Failed to update profile" },
            { status: 500 }
          );
        }

        result = data2;
      } else {
        result = data;
      }
    } else {
      // Create new profile
      const { data, error } = await supabaseAdmin
        .from("ingestion_profiles")
        .insert({
          ...record,
          created_by: auth.data.user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating ingestion profile:", error);
        return NextResponse.json(
          { error: "Failed to create profile" },
          { status: 500 }
        );
      }

      result = data;
    }

    return NextResponse.json({
      ok: true,
      profile: result,
    });
  } catch (err) {
    console.error("Ingestion profiles POST error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
