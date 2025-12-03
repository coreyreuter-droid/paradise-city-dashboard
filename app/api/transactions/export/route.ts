// app/api/transactions/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

    // Supabase PostgREST default max is 1000 rows per request.
    // So we page in chunks of 1000 until we get a chunk smaller than PAGE_SIZE.
    const PAGE_SIZE = 1000;
    let from = 0;
    let allRows: any[] = [];

    // Defensive max to avoid someone exporting millions of rows by accident.
    const MAX_ROWS = 200_000;

    while (true) {
      let query = supabase
        .from("transactions")
        .select(
          "date, fiscal_year, fund_code, fund_name, department_code, department_name, account_code, account_name, vendor, description, amount",
          { head: false }
        )
        .range(from, from + PAGE_SIZE - 1);

      if (hasYearFilter) {
        query = query.eq("fiscal_year", year as number);
      }

      if (departmentFilter) {
        query = query.eq("department_name", departmentFilter);
      }

      if (searchQuery) {
        query = query.or(
          `vendor.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        );
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

      // If we got fewer than PAGE_SIZE rows, this was the last page
      if (data.length < PAGE_SIZE) {
        break;
      }

      from += PAGE_SIZE;
    }

    // Build CSV
    const header = [
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
    ];

    const csvLines: string[] = [];
    csvLines.push(header.join(","));

    for (const row of allRows) {
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
