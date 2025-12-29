// app/api/export/count/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase env vars");
}

// Parse comma-separated string into array
function parseArrayParam(value: string | null): string[] {
  if (!value || !value.trim()) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const url = new URL(req.url);
    const params = url.searchParams;

    const dataType = params.get("dataType");
    const years = parseArrayParam(params.get("years"));
    const departments = parseArrayParam(params.get("departments"));
    const vendors = parseArrayParam(params.get("vendors"));
    const sources = parseArrayParam(params.get("sources"));
    const startDate = params.get("startDate") || null;
    const endDate = params.get("endDate") || null;

    // Validate data type
    const validTypes = ["budgets", "actuals", "transactions", "revenues"];
    if (!dataType || !validTypes.includes(dataType)) {
      return NextResponse.json({ error: "Invalid data type" }, { status: 400 });
    }

    // Get feature flags
    const { data: settings } = await supabase
      .from("portal_settings")
      .select("enable_vendors")
      .eq("id", 1)
      .maybeSingle();

    const enableVendors = settings?.enable_vendors === true;

    // Build count query
    let query = supabase
      .from(dataType)
      .select("*", { count: "exact", head: true });

    // Apply filters
    if (years.length > 0) {
      const yearNumbers = years.map(Number).filter(Number.isFinite);
      if (yearNumbers.length > 0) {
        query = query.in("fiscal_year", yearNumbers);
      }
    }

    if (departments.length > 0 && ["budgets", "actuals", "transactions"].includes(dataType)) {
      query = query.in("department_name", departments);
    }

    if (vendors.length > 0 && dataType === "transactions" && enableVendors) {
      query = query.in("vendor", vendors);
    }

    if (sources.length > 0 && dataType === "revenues") {
      query = query.in("category", sources);
    }

    if (startDate && ["transactions", "revenues"].includes(dataType)) {
      query = query.gte("date", startDate);
    }

    if (endDate && ["transactions", "revenues"].includes(dataType)) {
      query = query.lte("date", endDate);
    }

    const { count, error } = await query;

    if (error) {
      console.error(`Count ${dataType} error:`, error);
      return NextResponse.json({ error: "Failed to count records" }, { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (err) {
    console.error("Count route error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
