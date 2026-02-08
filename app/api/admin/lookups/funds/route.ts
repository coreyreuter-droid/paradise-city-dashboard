/**
 * Funds Lookup API (Versioned)
 * 
 * GET  /api/admin/lookups/funds - List all fund mappings
 * POST /api/admin/lookups/funds - Create a single fund entry (for quick add)
 * 
 * For bulk uploads, use:
 *   POST /api/admin/lookups/funds/validate
 *   POST /api/admin/lookups/funds/apply
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { supabaseAdmin } from "@/lib/supabaseService";
import { normalizeCode, normalizeLabel, validateLabel } from "@/lib/normalizeCode";
import { sanitizePostgrestValue } from "@/lib/format";
import { FundDimRow, FundByYearRow, LookupAuditLogRow } from "@/lib/lookups/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// GET - List funds
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
      .from("funds_dim")
      .select("*")
      .order("fund_code", { ascending: true })
      .order("effective_start_fy", { ascending: false });

    // Filter by current/historical
    if (currentOnly) {
      query = query.is("effective_end_fy", null);
    } else if (historicalOnly) {
      query = query.not("effective_end_fy", "is", null);
    }

    // Search filter
    if (search) {
      const sanitized = sanitizePostgrestValue(search);
      query = query.or(`fund_code.ilike.%${sanitized}%,fund_name.ilike.%${sanitized}%`);
    }

    const { data: funds, error } = await query;

    if (error) {
      console.error("Error fetching funds:", error);
      return NextResponse.json(
        { error: "Failed to fetch funds" },
        { status: 500 }
      );
    }

    // Optionally fetch by-year data
    let byYear: FundByYearRow[] | undefined;
    if (includeByYear) {
      let byYearQuery = supabaseAdmin
        .from("funds_dim_by_year")
        .select("*")
        .order("fiscal_year", { ascending: true })
        .order("fund_code", { ascending: true });

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
        .eq("lookup_type", "funds")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!auditError) {
        auditLog = auditData ?? [];
      }
    }

    return NextResponse.json({ 
      funds: funds ?? [],
      byYear,
      auditLog,
    });
  } catch (err) {
    console.error("Funds GET error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create a single fund entry (quick add)
// ============================================================================

interface CreateFundBody {
  fund_code: string;
  fund_name: string;
  effective_start_fy: number;
}

export async function POST(req: NextRequest) {
  const csrfError = await requireCsrf(req);
  if (csrfError) return csrfError;

  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  try {
    const body = (await req.json()) as CreateFundBody;

    // Validate required fields
    if (!body.fund_code || !body.fund_name || !body.effective_start_fy) {
      return NextResponse.json(
        { error: "fund_code, fund_name, and effective_start_fy are required" },
        { status: 400 }
      );
    }

    // Normalize code and name
    const normalizedCode = normalizeCode(body.fund_code);
    if (!normalizedCode) {
      return NextResponse.json(
        { error: "Invalid fund_code" },
        { status: 400 }
      );
    }

    const normalizedName = normalizeLabel(body.fund_name);
    const labelValidation = validateLabel(normalizedName);
    if (!labelValidation.isValid) {
      return NextResponse.json(
        { error: labelValidation.error ?? "Invalid fund_name" },
        { status: 400 }
      );
    }

    // Check for existing current entry with same code
    const { data: existing } = await supabaseAdmin
      .from("funds_dim")
      .select("id, fund_code")
      .eq("fund_code", normalizedCode)
      .is("effective_end_fy", null)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Fund code "${normalizedCode}" already exists as a current entry. Use the upload wizard to replace it.` },
        { status: 409 }
      );
    }

    // Insert new entry
    const { data, error } = await supabaseAdmin
      .from("funds_dim")
      .insert({
        fund_code: normalizedCode,
        fund_name: normalizedName,
        effective_start_fy: body.effective_start_fy,
        effective_end_fy: null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating fund:", error);
      return NextResponse.json(
        { error: "Failed to create fund" },
        { status: 500 }
      );
    }

    // Log audit event
    await supabaseAdmin.from("lookup_audit_log").insert({
      lookup_type: "funds",
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
    await supabaseAdmin.rpc("refresh_funds_by_year");

    return NextResponse.json({
      ok: true,
      fund: data,
    });
  } catch (err) {
    console.error("Funds POST error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update a single fund entry
// ============================================================================

export async function PATCH(req: NextRequest) {
  const csrfError = await requireCsrf(req);
  if (csrfError) return csrfError;

  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  try {
    const body = await req.json();
    const { id, fund_name, effective_start_fy, effective_end_fy } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Get current entry
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("funds_dim")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Fund not found" }, { status: 404 });
    }

    // Build update
    const updates: Partial<FundDimRow> = {
      updated_at: new Date().toISOString(),
    };

    if (fund_name !== undefined) {
      const normalizedName = normalizeLabel(fund_name);
      const labelValidation = validateLabel(normalizedName);
      if (!labelValidation.isValid) {
        return NextResponse.json(
          { error: labelValidation.error ?? "Invalid fund_name" },
          { status: 400 }
        );
      }
      updates.fund_name = normalizedName!;
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
      .from("funds_dim")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating fund:", error);
      return NextResponse.json(
        { error: "Failed to update fund" },
        { status: 500 }
      );
    }

    // Log audit event
    await supabaseAdmin.from("lookup_audit_log").insert({
      lookup_type: "funds",
      action: "update",
      lookup_code: existing.fund_code,
      old_values: existing,
      new_values: data,
      affected_fy_start: newStart,
      affected_fy_end: newEnd,
      actor_user_id: auth.data.user.id,
      actor_email: auth.data.user.email,
    });

    // Refresh by-year table
    await supabaseAdmin.rpc("refresh_funds_by_year");

    return NextResponse.json({
      ok: true,
      fund: data,
    });
  } catch (err) {
    console.error("Funds PATCH error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
