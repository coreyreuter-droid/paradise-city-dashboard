/**
 * Departments Lookup API
 * 
 * GET  /api/admin/lookups/departments - List all department mappings
 * POST /api/admin/lookups/departments - Create or update department mappings
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseService";
import { normalizeCode, normalizeLabel, validateLabel } from "@/lib/normalizeCode";
import { logAuditEvent } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// GET - List departments
// ============================================================================

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active_only") === "true";
  const search = searchParams.get("search");

  try {
    let query = supabaseAdmin
      .from("departments_dim")
      .select("*")
      .order("department_code", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    if (search) {
      query = query.or(`department_code.ilike.%${search}%,department_name.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching departments:", error);
      return NextResponse.json(
        { error: "Failed to fetch departments" },
        { status: 500 }
      );
    }

    return NextResponse.json({ departments: data ?? [] });
  } catch (err) {
    console.error("Departments GET error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create or update departments
// ============================================================================

interface DepartmentInput {
  department_code: string;
  department_name: string;
  is_active?: boolean;
}

interface CreateDepartmentsBody {
  departments: DepartmentInput[];
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  try {
    const body = (await req.json()) as CreateDepartmentsBody;

    if (!body.departments || !Array.isArray(body.departments) || body.departments.length === 0) {
      return NextResponse.json(
        { error: "departments array is required" },
        { status: 400 }
      );
    }

    // Validate and normalize all departments
    const validationErrors: { index: number; error: string }[] = [];
    const normalizedDepartments: {
      department_code: string;
      department_name: string;
      is_active: boolean;
    }[] = [];

    for (let i = 0; i < body.departments.length; i++) {
      const dept = body.departments[i];

      // Normalize code
      const normalizedCode = normalizeCode(dept.department_code);
      if (!normalizedCode) {
        validationErrors.push({ index: i, error: "department_code is required" });
        continue;
      }

      // Normalize and validate label
      const normalizedName = normalizeLabel(dept.department_name);
      const labelValidation = validateLabel(normalizedName);
      if (!labelValidation.isValid) {
        validationErrors.push({ index: i, error: labelValidation.error ?? "Invalid department_name" });
        continue;
      }

      normalizedDepartments.push({
        department_code: normalizedCode,
        department_name: normalizedName!,
        is_active: dept.is_active ?? true,
      });
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation errors", details: validationErrors },
        { status: 400 }
      );
    }

    // Upsert all departments (insert or update based on department_code)
    const { data, error } = await supabaseAdmin
      .from("departments_dim")
      .upsert(normalizedDepartments, {
        onConflict: "department_code",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error("Error upserting departments:", error);
      return NextResponse.json(
        { error: "Failed to save departments" },
        { status: 500 }
      );
    }

    // Log the action
    for (const dept of normalizedDepartments) {
      await logAuditEvent({
        actor_email: auth.email,
        actor_user_id: auth.userId,
        action: "lookup.added",
        target_table: "departments_dim",
        meta: {
          lookup_type: "department",
          code: dept.department_code,
          name: dept.department_name,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      saved: data?.length ?? 0,
      departments: data,
    });
  } catch (err) {
    console.error("Departments POST error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
