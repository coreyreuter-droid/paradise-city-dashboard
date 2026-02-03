/**
 * Check Mapping Match API
 * 
 * POST /api/admin/mapping-profiles/check-match
 * 
 * Given headers and dataset_type, finds a matching mapping profile.
 * Matching rules:
 * - Case insensitive comparison
 * - All mapped columns must exist in the file
 * - Extra columns in the file are OK (returns warning)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MappingProfile {
  id: string;
  name: string;
  dataset_type: string;
  column_mappings: Record<string, string>; // Simple format: { targetField: csvColumnName }
  is_system: boolean;
  created_at: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  try {
    const body = await req.json();
    const { headers, dataset_type } = body;

    if (!headers || !Array.isArray(headers)) {
      return NextResponse.json(
        { error: "headers array is required" },
        { status: 400 }
      );
    }

    if (!dataset_type) {
      return NextResponse.json(
        { error: "dataset_type is required" },
        { status: 400 }
      );
    }

    // Normalize input headers for comparison (lowercase, trimmed)
    const normalizedInputHeaders = headers.map((h: string) => 
      h.toLowerCase().trim()
    );
    const inputHeaderSet = new Set(normalizedInputHeaders);

    // Fetch all mapping profiles for this dataset type
    const { data: profiles, error } = await supabaseAdmin
      .from("mapping_profiles")
      .select("*")
      .eq("dataset_type", dataset_type)
      .order("is_system", { ascending: true }) // User profiles first
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching profiles:", error);
      return NextResponse.json(
        { error: "Failed to fetch mapping profiles" },
        { status: 500 }
      );
    }

    // Check each profile for a match
    for (const profile of profiles || []) {
      const columnMappings = profile.column_mappings as Record<string, string>;
      
      // Get all mapped CSV column names from this profile
      const mappedColumnNames: string[] = [];
      for (const [_targetField, csvColumnName] of Object.entries(columnMappings)) {
        if (csvColumnName && typeof csvColumnName === "string") {
          mappedColumnNames.push(csvColumnName.toLowerCase().trim());
        }
      }

      // Check if ALL mapped columns exist in the input headers
      let isMatch = true;
      for (const colName of mappedColumnNames) {
        if (!inputHeaderSet.has(colName)) {
          isMatch = false;
          break;
        }
      }

      if (isMatch && mappedColumnNames.length > 0) {
        // Find extra columns (in file but not mapped)
        const mappedSet = new Set(mappedColumnNames);
        const extraColumns: string[] = [];
        
        for (let i = 0; i < headers.length; i++) {
          const normalizedHeader = normalizedInputHeaders[i];
          if (!mappedSet.has(normalizedHeader)) {
            extraColumns.push(headers[i]); // Use original case
          }
        }

        return NextResponse.json({
          match: true,
          profile: {
            id: profile.id,
            name: profile.name,
            dataset_type: profile.dataset_type,
            is_system: profile.is_system,
          },
          extra_columns: extraColumns,
          has_extra_columns: extraColumns.length > 0,
        });
      }
    }

    // No match found
    return NextResponse.json({
      match: false,
      profile: null,
      extra_columns: [],
      has_extra_columns: false,
    });
  } catch (err) {
    console.error("Check match error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}
