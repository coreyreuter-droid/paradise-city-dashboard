/**
 * Departments Lookup API (Versioned)
 * 
 * GET  /api/admin/lookups/departments - List all department mappings
 * POST /api/admin/lookups/departments - Create a single department entry (for quick add)
 * 
 * For bulk uploads, use:
 *   POST /api/admin/lookups/departments/validate
 *   POST /api/admin/lookups/departments/apply
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseService";
import { normalizeCode, normalizeLabel, validateLabel } from "@/lib/normalizeCode";
import { DepartmentDimRow, DepartmentByYearRow, LookupAuditLogRow } from "@/lib/lookups/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// GET - List departments
// ============================================================================

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  const { searchParams } = new URL(req.url);
  const currentOnly = searchParams.get("current_only") === "true";
  const historicalOnly = searchParams.get("historical_only") === "true";
  const fiscalYear = searchParams.get("fiscal_year");
  const search = searchParams.get("search");
  const includeByYear = searchParams.get("include_by_year") === "true";
  const includeAuditLog = searchParams.get("include_audit_log") === "true";

  try {
    // Build main query
    let query = supabaseAdmin
      .from("departments_dim")
      .select("*")
      .order("department_code", { ascending: true })
      .order("effective_start_fy", { ascending: false });

    // Filter by current/historical
    if (currentOnly) {
      query = query.is("effective_end_fy", null);
    } else if (historicalOnly) {
      query = query.not("effective_end_fy", "is", null);
    }

    // Search filter
    if (search) {
      query = query.or(`department_code.ilike.%${search}%,department_name.ilike.%${search}%`);
    }

    const { data: departments, error } = await query;

    if (error) {
      console.error("Error fetching departments:", error);
      return NextResponse.json(
        { error: "Failed to fetch departments" },
        { status: 500 }
      );
    }

    // Optionally fetch by-year data
    let byYear: DepartmentByYearRow[] | undefined;
    if (includeByYear) {
      let byYearQuery = supabaseAdmin
        .from("departments_dim_by_year")
        .select("*")
        .order("fiscal_year", { ascending: true })
        .order("department_code", { ascending: true });

      if (fiscalYear) {
        byYearQuery = byYearQuery.eq("fiscal_year", parseInt(fiscalYear, 10));
      }

      const { data: byYearData, error: byYearError } = await byYearQuery;
      if (!byYearError) {
        byYear = byYearData ?? [];
      }
    }

    // Optionally fetch audit log
    let auditLog: LookupAuditLogRow[] | undefined;
    if (includeAuditLog) {
      const { data: auditData, error: auditError } = await supabaseAdmin
        .from("lookup_audit_log")
        .select("*")
        .eq("lookup_type", "departments")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!auditError) {
        auditLog = auditData ?? [];
      }
    }

    return NextResponse.json({ 
      departments: departments ?? [],
      byYear,
      auditLog,
    });
  } catch (err) {
    console.error("Departments GET error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create a single department entry (quick add)
// ============================================================================

interface CreateDepartmentBody {
  department_code: string;
  department_name: string;
  effective_start_fy: number;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  try {
    const body = (await req.json()) as CreateDepartmentBody;

    // Validate required fields
    if (!body.department_code || !body.department_name || !body.effective_start_fy) {
      return NextResponse.json(
        { error: "department_code, department_name, and effective_start_fy are required" },
        { status: 400 }
      );
    }

    // Normalize code and name
    const normalizedCode = normalizeCode(body.department_code);
    if (!normalizedCode) {
      return NextResponse.json(
        { error: "Invalid department_code" },
        { status: 400 }
      );
    }

    const normalizedName = normalizeLabel(body.department_name);
    const labelValidation = validateLabel(normalizedName);
    if (!labelValidation.isValid) {
      return NextResponse.json(
        { error: labelValidation.error ?? "Invalid department_name" },
        { status: 400 }
      );
    }

    // Check for existing current entry with same code
    const { data: existing } = await supabaseAdmin
      .from("departments_dim")
      .select("id, department_code")
      .eq("department_code", normalizedCode)
      .is("effective_end_fy", null)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Department code "${normalizedCode}" already exists as a current entry. Use the upload wizard to replace it.` },
        { status: 409 }
      );
    }

    // Insert new entry
    const { data, error } = await supabaseAdmin
      .from("departments_dim")
      .insert({
        department_code: normalizedCode,
        department_name: normalizedName,
        effective_start_fy: body.effective_start_fy,
        effective_end_fy: null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating department:", error);
      return NextResponse.json(
        { error: `Failed to create department: ${error.message}` },
        { status: 500 }
      );
    }

    // Log audit event
    await supabaseAdmin.from("lookup_audit_log").insert({
      lookup_type: "departments",
      action: "insert",
      lookup_code: normalizedCode,
      old_values: null,
      new_values: data,
      affected_fy_start: body.effective_start_fy,
      affected_fy_end: null,
      actor_user_id: auth.data.user.id,
      actor_email: auth.data.user.email,
    });

    // Refresh by-year table
    await supabaseAdmin.rpc("refresh_departments_by_year");

    return NextResponse.json({
      ok: true,
      department: data,
    });
  } catch (err) {
    console.error("Departments POST error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update a single department entry
// ============================================================================

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  try {
    const body = await req.json();
    const { id, department_name, effective_start_fy, effective_end_fy } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Get current entry
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("departments_dim")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Build update
    const updates: Partial<DepartmentDimRow> = {
      updated_at: new Date().toISOString(),
    };

    if (department_name !== undefined) {
      const normalizedName = normalizeLabel(department_name);
      const labelValidation = validateLabel(normalizedName);
      if (!labelValidation.isValid) {
        return NextResponse.json(
          { error: labelValidation.error ?? "Invalid department_name" },
          { status: 400 }
        );
      }
      updates.department_name = normalizedName!;
    }

    if (effective_start_fy !== undefined) {
      updates.effective_start_fy = effective_start_fy;
    }

    if (effective_end_fy !== undefined) {
      updates.effective_end_fy = effective_end_fy;
    }

    // Validate range
    const newStart = updates.effective_start_fy ?? existing.effective_start_fy;
    const newEnd = updates.effective_end_fy ?? existing.effective_end_fy;
    if (newEnd !== null && newEnd < newStart) {
      return NextResponse.json(
        { error: "End fiscal year cannot be before start fiscal year" },
        { status: 400 }
      );
    }

    // Update
    const { data, error } = await supabaseAdmin
      .from("departments_dim")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating department:", error);
      return NextResponse.json(
        { error: `Failed to update department: ${error.message}` },
        { status: 500 }
      );
    }

    // Log audit event
    await supabaseAdmin.from("lookup_audit_log").insert({
      lookup_type: "departments",
      action: "update",
      lookup_code: existing.department_code,
      old_values: existing,
      new_values: data,
      affected_fy_start: newStart,
      affected_fy_end: newEnd,
      actor_user_id: auth.data.user.id,
      actor_email: auth.data.user.email,
    });

    // Refresh by-year table
    await supabaseAdmin.rpc("refresh_departments_by_year");

    return NextResponse.json({
      ok: true,
      department: data,
    });
  } catch (err) {
    console.error("Departments PATCH error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
