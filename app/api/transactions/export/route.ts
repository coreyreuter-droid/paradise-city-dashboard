// app/api/transactions/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rateLimit";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase URL or anon key env vars for export route");
}

// Helper to quote CSV values
function csvSafe(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Escape quotes: " -> ""
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  // Rate limit: 10 requests per hour per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? 
             req.headers.get("x-real-ip") ?? 
             "unknown";
  
  const { allowed, remaining, resetInSeconds } = rateLimit(
    `export:${ip}`,
    10,
    60 * 60 * 1000 // 1 hour
  );
console.log(`Rate limit check: IP=${ip}, allowed=${allowed}, remaining=${remaining}`);
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many export requests. Try again in ${Math.ceil(resetInSeconds / 60)} minutes.` },
      { 
        status: 429,
        headers: {
          "Retry-After": String(resetInSeconds),
          "X-RateLimit-Remaining": "0",
        }
      }
    );
  }
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Read feature flags from portal_settings (single-tenant assumption)
    const { data: settingsData, error: settingsError } = await supabase
      .from("portal_settings")
      .select("enable_transactions, enable_vendors")
      .eq("id", 1)
      .maybeSingle();

    if (settingsError) {
      console.error(
        "Export transactions: error loading portal_settings",
        settingsError
      );
      return NextResponse.json(
        { error: "Failed to load portal settings" },
        { status: 500 }
      );
    }

    const enableTransactions = settingsData?.enable_transactions === true;

    if (!enableTransactions) {
      // Transactions module is not published → export route should not exist.
      return new NextResponse("Not found", { status: 404 });
    }

    const enableVendors = settingsData?.enable_vendors === true;

    const url = new URL(req.url);
    const params = url.searchParams;

    const yearParam = params.get("year");
    const departmentParam = params.get("department");
    const qParam = params.get("q");

    const year = yearParam ? Number(yearParam) : null;
    const hasYearFilter = Number.isFinite(year);
    const departmentFilter =
      departmentParam && departmentParam !== "all"
        ? departmentParam
        : null;
    const searchQuery =
      qParam && qParam.trim().length > 0 ? qParam.trim() : null;

    const PAGE_SIZE = 1000;
    let from = 0;
    let allRows: any[] = [];

    // Defensive max to avoid someone exporting millions of rows by accident.
    const MAX_ROWS = 200_000;

    // Column selection depends on vendor visibility
    const selectColumns = enableVendors
      ? "date, fiscal_year, fund_code, fund_name, department_code, department_name, account_code, account_name, vendor, description, amount"
      : "date, fiscal_year, fund_code, fund_name, department_code, department_name, account_code, account_name, description, amount";

    while (true) {
      let query = supabase
        .from("transactions")
        .select(selectColumns, { head: false })
        .range(from, from + PAGE_SIZE - 1);

      if (hasYearFilter) {
        query = query.eq("fiscal_year", year as number);
      }

      if (departmentFilter) {
        query = query.eq("department_name", departmentFilter);
      }

      if (searchQuery) {
        if (enableVendors) {
          // Vendor + description search
          query = query.or(
            `vendor.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
          );
        } else {
          // Only description search when vendor names are disabled
          query = query.ilike("description", `%${searchQuery}%`);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Export transactions error:", error);
        return NextResponse.json(
          { error: "Failed to fetch transactions for export" },
          { status: 500 }
        );
      }

      if (!data || data.length === 0) {
        break;
      }

      allRows = allRows.concat(data);

      if (allRows.length >= MAX_ROWS) {
        console.warn(
          `Export transactions: reached MAX_ROWS cap of ${MAX_ROWS}, truncating.`
        );
        break;
      }

      if (data.length < PAGE_SIZE) {
        // Last page
        break;
      }

      from += PAGE_SIZE;
    }

    // Build CSV header
    const header = enableVendors
      ? [
          "date",
          "fiscal_year",
          "fund_code",
          "fund_name",
          "department_code",
          "department_name",
          "account_code",
          "account_name",
          "vendor",
          "description",
          "amount",
        ]
      : [
          "date",
          "fiscal_year",
          "fund_code",
          "fund_name",
          "department_code",
          "department_name",
          "account_code",
          "account_name",
          "description",
          "amount",
        ];

    const csvLines: string[] = [];
    csvLines.push(header.join(","));

    for (const row of allRows) {
      if (enableVendors) {
        csvLines.push(
          [
            csvSafe(row.date),
            csvSafe(row.fiscal_year),
            csvSafe(row.fund_code),
            csvSafe(row.fund_name),
            csvSafe(row.department_code),
            csvSafe(row.department_name),
            csvSafe(row.account_code),
            csvSafe(row.account_name),
            csvSafe(row.vendor),
            csvSafe(row.description),
            csvSafe(row.amount),
          ].join(",")
        );
      } else {
        csvLines.push(
          [
            csvSafe(row.date),
            csvSafe(row.fiscal_year),
            csvSafe(row.fund_code),
            csvSafe(row.fund_name),
            csvSafe(row.department_code),
            csvSafe(row.department_name),
            csvSafe(row.account_code),
            csvSafe(row.account_name),
            csvSafe(row.description),
            csvSafe(row.amount),
          ].join(",")
        );
      }
    }

    const hasAny = allRows.length > 0;

    const yearPart = hasYearFilter ? `year-${year}` : "all-years";
    const deptPart = departmentFilter
      ? departmentFilter.replace(/\s+/g, "-")
      : "all-departments";
    const searchPart = searchQuery
      ? `search-${searchQuery.replace(/\s+/g, "-")}`
      : "all-text";

    const filename = `transactions_${yearPart}_${deptPart}_${searchPart}${
      hasAny ? "" : "_empty"
    }.csv`;

    const csv = csvLines.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Export transactions route error:", err);
    return NextResponse.json(
      { error: "Unexpected server error during export" },
      { status: 500 }
    );
  }
}
