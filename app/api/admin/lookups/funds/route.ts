/**
 * Funds Lookup API
 * 
 * GET  /api/admin/lookups/funds - List all fund mappings
 * POST /api/admin/lookups/funds - Create or update fund mappings
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseService";
import { normalizeCode, normalizeLabel, validateLabel } from "@/lib/normalizeCode";
import { logAuditEvent } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// GET - List funds
// ============================================================================

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active_only") === "true";
  const search = searchParams.get("search");

  try {
    let query = supabaseAdmin
      .from("funds_dim")
      .select("*")
      .order("fund_code", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    if (search) {
      query = query.or(`fund_code.ilike.%${search}%,fund_name.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching funds:", error);
      return NextResponse.json(
        { error: "Failed to fetch funds" },
        { status: 500 }
      );
    }

    return NextResponse.json({ funds: data ?? [] });
  } catch (err) {
    console.error("Funds GET error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create or update funds
// ============================================================================

interface FundInput {
  fund_code: string;
  fund_name: string;
  is_active?: boolean;
}

interface CreateFundsBody {
  funds: FundInput[];
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  try {
    const body = (await req.json()) as CreateFundsBody;

    if (!body.funds || !Array.isArray(body.funds) || body.funds.length === 0) {
      return NextResponse.json(
        { error: "funds array is required" },
        { status: 400 }
      );
    }

    // Validate and normalize all funds
    const validationErrors: { index: number; error: string }[] = [];
    const normalizedFunds: {
      fund_code: string;
      fund_name: string;
      is_active: boolean;
    }[] = [];

    for (let i = 0; i < body.funds.length; i++) {
      const fund = body.funds[i];

      // Normalize code
      const normalizedCode = normalizeCode(fund.fund_code);
      if (!normalizedCode) {
        validationErrors.push({ index: i, error: "fund_code is required" });
        continue;
      }

      // Normalize and validate label
      const normalizedName = normalizeLabel(fund.fund_name);
      const labelValidation = validateLabel(normalizedName);
      if (!labelValidation.isValid) {
        validationErrors.push({ index: i, error: labelValidation.error ?? "Invalid fund_name" });
        continue;
      }

      normalizedFunds.push({
        fund_code: normalizedCode,
        fund_name: normalizedName!,
        is_active: fund.is_active ?? true,
      });
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation errors", details: validationErrors },
        { status: 400 }
      );
    }

    // Upsert all funds (insert or update based on fund_code)
    const { data, error } = await supabaseAdmin
      .from("funds_dim")
      .upsert(normalizedFunds, {
        onConflict: "fund_code",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error("Error upserting funds:", error);
      return NextResponse.json(
        { error: "Failed to save funds" },
        { status: 500 }
      );
    }

    // Log the action
    for (const fund of normalizedFunds) {
      await logAuditEvent({
        actor_email: auth.data.user.email,
        actor_user_id: auth.data.user.id,
        action: "lookup.added",
        target_table: "funds_dim",
        meta: {
          lookup_type: "fund",
          code: fund.fund_code,
          name: fund.fund_name,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      saved: data?.length ?? 0,
      funds: data,
    });
  } catch (err) {
    console.error("Funds POST error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
