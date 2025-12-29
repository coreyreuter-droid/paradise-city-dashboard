// app/api/export/[dataType]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { rateLimitAsync } from "@/lib/rateLimit";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase URL or anon key env vars for export route");
}

// Helper to quote CSV values
function csvSafe(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

// Helper to build filename
function buildFilename(dataType: string, filters: Record<string, string[] | string | null>): string {
  const parts = [dataType];
  const timestamp = new Date().toISOString().split("T")[0];
  
  const years = filters.years as string[] | null;
  const departments = filters.departments as string[] | null;
  const sources = filters.sources as string[] | null;
  
  if (years && years.length > 0) {
    if (years.length === 1) {
      parts.push(`FY${years[0]}`);
    } else {
      parts.push(`${years.length}-years`);
    }
  }
  
  if (departments && departments.length > 0) {
    if (departments.length === 1) {
      parts.push(departments[0].replace(/\s+/g, "-").slice(0, 20));
    } else {
      parts.push(`${departments.length}-depts`);
    }
  }
  
  if (sources && sources.length > 0) {
    if (sources.length === 1) {
      parts.push(sources[0].replace(/\s+/g, "-").slice(0, 20));
    } else {
      parts.push(`${sources.length}-sources`);
    }
  }
  
  if (filters.startDate || filters.endDate) {
    parts.push("dated");
  }
  
  parts.push(timestamp);
  
  return `${parts.join("_")}.csv`;
}

// Parse comma-separated string into array
function parseArrayParam(value: string | null): string[] {
  if (!value || !value.trim()) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

type Context = {
  params: Promise<{ dataType: string }>;
};

export async function GET(req: NextRequest, context: Context) {
  // Handle params - Next.js 15 requires awaiting params
  const params = await context.params;
  const dataType = params?.dataType;

  // Debug logging
  console.log("Export route called, dataType:", dataType);

  // Validate data type early
  const validTypes = ["budgets", "actuals", "transactions", "revenues"];
  if (!dataType || !validTypes.includes(dataType)) {
    console.error("Invalid dataType received:", dataType);
    return NextResponse.json({ error: `Invalid data type: ${dataType}` }, { status: 400 });
  }

// Rate limit: 20 requests per hour per IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    req.headers.get("x-real-ip") ??
    "unknown";

  // Hash IP for privacy (GDPR/CCPA compliance)
  const ipHash = createHash("sha256")
    .update(ip + (process.env.RATE_LIMIT_SALT || "civiportal"))
    .digest("hex")
    .slice(0, 16);

  // Hourly limit: 20 per hour
  const { allowed, remaining, resetInSeconds } = await rateLimitAsync(
    `export:${ipHash}`,
    20,
    60 * 60 * 1000
  );

  if (!allowed) {
    return NextResponse.json(
      {
        error: `Too many export requests. Try again in ${Math.ceil(
          resetInSeconds / 60
        )} minutes.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(resetInSeconds),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // Daily limit: 50 per day
  const { allowed: dailyAllowed, resetInSeconds: dailyReset } = await rateLimitAsync(
    `export-daily:${ipHash}`,
    50,
    24 * 60 * 60 * 1000
  );

  if (!dailyAllowed) {
    return NextResponse.json(
      {
        error: `Daily export limit reached. Try again in ${Math.ceil(
          dailyReset / 3600
        )} hours.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(dailyReset),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Read feature flags
    const { data: settingsData, error: settingsError } = await supabase
      .from("portal_settings")
      .select("enable_actuals, enable_transactions, enable_vendors, enable_revenues")
      .eq("id", 1)
      .maybeSingle();

    if (settingsError) {
      console.error("Export: error loading portal_settings", settingsError);
      return NextResponse.json(
        { error: "Failed to load portal settings" },
        { status: 500 }
      );
    }

    const enableActuals = settingsData?.enable_actuals !== false;
    const enableTransactions = settingsData?.enable_transactions === true;
    const enableVendors = enableTransactions && settingsData?.enable_vendors === true;
    const enableRevenues = settingsData?.enable_revenues === true;

    // Check if data type is enabled
    if (dataType === "actuals" && !enableActuals) {
      return new NextResponse("Not found", { status: 404 });
    }
    if (dataType === "transactions" && !enableTransactions) {
      return new NextResponse("Not found", { status: 404 });
    }
    if (dataType === "revenues" && !enableRevenues) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Parse query parameters (now as arrays)
    const url = new URL(req.url);
    const params = url.searchParams;

    const years = parseArrayParam(params.get("years"));
    const departments = parseArrayParam(params.get("departments"));
    const vendors = parseArrayParam(params.get("vendors"));
    const sources = parseArrayParam(params.get("sources"));
    const startDate = params.get("startDate") || null;
    const endDate = params.get("endDate") || null;

    const PAGE_SIZE = 1000; // Supabase default limit per query
    const MAX_ROWS = 50_000; // Reduced from 200k to avoid timeouts - users should filter for large datasets

    // Define table and columns
    let tableName: string;
    let columns: string[];
    let orderColumn: string;
    let orderAscending = false;

    switch (dataType) {
      case "budgets":
        tableName = "budgets";
        columns = [
          "fiscal_year",
          "department_code",
          "department_name",
          "fund_code",
          "fund_name",
          "account_code",
          "account_name",
          "category",
          "amount",
        ];
        orderColumn = "department_name";
        orderAscending = true;
        break;

      case "actuals":
        tableName = "actuals";
        columns = [
          "fiscal_year",
          "department_code",
          "department_name",
          "fund_code",
          "fund_name",
          "account_code",
          "account_name",
          "category",
          "amount",
        ];
        orderColumn = "department_name";
        orderAscending = true;
        break;

      case "transactions":
        tableName = "transactions";
        columns = enableVendors
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
        orderColumn = "date";
        orderAscending = false;
        break;

      case "revenues":
        tableName = "revenues";
        columns = [
          "fiscal_year",
          "date",
          "category",
          "source",
          "description",
          "amount",
        ];
        orderColumn = "fiscal_year";
        orderAscending = false;
        break;

      default:
        return NextResponse.json({ error: "Invalid data type" }, { status: 400 });
    }

    // Helper to build a query with filters
    const buildQuery = (from: number, to: number) => {
      let query = supabase
        .from(tableName)
        .select(columns.join(","), { head: false })
        .range(from, to)
        .order(orderColumn, { ascending: orderAscending });

      // Apply multi-select filters
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

      return query;
    };

    // First, get total count
    let countQuery = supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });

    // Apply same filters to count query
    if (years.length > 0) {
      const yearNumbers = years.map(Number).filter(Number.isFinite);
      if (yearNumbers.length > 0) {
        countQuery = countQuery.in("fiscal_year", yearNumbers);
      }
    }
    if (departments.length > 0 && ["budgets", "actuals", "transactions"].includes(dataType)) {
      countQuery = countQuery.in("department_name", departments);
    }
    if (vendors.length > 0 && dataType === "transactions" && enableVendors) {
      countQuery = countQuery.in("vendor", vendors);
    }
    if (sources.length > 0 && dataType === "revenues") {
      countQuery = countQuery.in("category", sources);
    }
    if (startDate && ["transactions", "revenues"].includes(dataType)) {
      countQuery = countQuery.gte("date", startDate);
    }
    if (endDate && ["transactions", "revenues"].includes(dataType)) {
      countQuery = countQuery.lte("date", endDate);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error(`Export ${dataType} count error:`, countError);
      return NextResponse.json(
        { error: `Failed to count ${dataType} for export` },
        { status: 500 }
      );
    }

    const recordCount = Math.min(totalCount ?? 0, MAX_ROWS);
    console.log(`Export ${dataType}: fetching ${recordCount} of ${totalCount} records`);

    if (recordCount === 0) {
      // Return empty CSV with headers
      const csv = columns.join(",");
      const filename = buildFilename(dataType, { years, departments, sources, startDate, endDate });
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Fetch data sequentially for reliability (parallel was causing timeouts)
    let allRows: any[] = [];
    let from = 0;
    let batchCount = 0;
    
    while (allRows.length < recordCount) {
      batchCount++;
      let batchData: any[] | null = null;
      
      // Try to fetch this batch
      const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
      
      if (error) {
        if (error.code === '57014') {
          console.warn(`Export ${dataType}: timeout at batch ${batchCount}, retrying after delay...`);
          // Wait and retry this batch
          await new Promise(resolve => setTimeout(resolve, 1000));
          const retry = await buildQuery(from, from + PAGE_SIZE - 1);
          if (!retry.error && retry.data) {
            batchData = retry.data;
          } else {
            console.error(`Export ${dataType}: retry also failed at batch ${batchCount}`);
          }
        } else {
          console.error(`Export ${dataType} error at batch ${batchCount}:`, error);
        }
      } else {
        batchData = data;
      }
      
      // Add successful batch data
      if (batchData && batchData.length > 0) {
        allRows = allRows.concat(batchData);
      }
      
      // Exit if we got less than a full page (no more data) or no data at all
      if (!batchData || batchData.length < PAGE_SIZE) {
        break;
      }
      
      from += PAGE_SIZE;
      
      // Small delay between batches to be nice to the database
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`Export ${dataType}: completed with ${allRows.length} rows in ${batchCount} batches`);

    // Build CSV
    const csvLines: string[] = [];
    csvLines.push(columns.join(","));

    for (const row of allRows) {
      const values = columns.map((col) => csvSafe(row[col]));
      csvLines.push(values.join(","));
    }

    const csv = csvLines.join("\n");

    // Build filename
    const filename = buildFilename(dataType, {
      years,
      departments,
      sources,
      startDate,
      endDate,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-RateLimit-Remaining": String(remaining),
      },
    });
  } catch (err: any) {
    console.error(`Export ${dataType} route error:`, err);
    return NextResponse.json(
      { error: "Unexpected server error during export" },
      { status: 500 }
    );
  }
}
