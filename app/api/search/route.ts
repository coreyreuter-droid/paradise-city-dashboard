// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sanitizeSearchInput } from "@/lib/format";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase env vars");
}

type DepartmentResult = {
  department_name: string;
  budget_amount: number;
  actual_amount: number;
};

type VendorResult = {
  vendor: string;
  total_amount: number;
  txn_count: number;
};

type TransactionResult = {
  id: string;
  date: string;
  vendor: string | null;
  description: string | null;
  amount: number;
};

type SearchResponse = {
  departments: DepartmentResult[];
  vendors: VendorResult[];
  transactions: TransactionResult[];
  totalDepartments: number;
  totalVendors: number;
  totalTransactions: number;
};

const LIMIT_PER_CATEGORY = 3;

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const url = new URL(req.url);
    const params = url.searchParams;

    const query = params.get("q") || "";
    const year = params.get("year");

    // Sanitize and validate query
    const sanitized = sanitizeSearchInput(query);
    if (!sanitized || sanitized.length < 2) {
      return NextResponse.json<SearchResponse>({
        departments: [],
        vendors: [],
        transactions: [],
        totalDepartments: 0,
        totalVendors: 0,
        totalTransactions: 0,
      });
    }

    const searchPattern = `%${sanitized}%`;
    const fiscalYear = year ? Number(year) : null;

    // Run queries in parallel for performance
    const [deptResult, vendorResult, txnResult, deptCount, vendorCount, txnCount] = await Promise.all([
      // 1. Search departments from summary table
      (async () => {
        let q = supabase
          .from("budget_actuals_year_department")
          .select("department_name, budget_amount, actual_amount")
          .ilike("department_name", searchPattern)
          .limit(LIMIT_PER_CATEGORY);

        if (fiscalYear && Number.isFinite(fiscalYear)) {
          q = q.eq("fiscal_year", fiscalYear);
        }

        const { data, error } = await q;
        if (error) {
          console.error("Department search error:", error);
          return [];
        }

        // Deduplicate by department name (in case of multiple years)
        const seen = new Set<string>();
        const unique: DepartmentResult[] = [];
        for (const row of data || []) {
          const name = row.department_name?.toLowerCase();
          if (name && !seen.has(name)) {
            seen.add(name);
            unique.push({
              department_name: row.department_name,
              budget_amount: Number(row.budget_amount || 0),
              actual_amount: Number(row.actual_amount || 0),
            });
          }
        }
        return unique.slice(0, LIMIT_PER_CATEGORY);
      })(),

      // 2. Search vendors from summary table
      (async () => {
        let q = supabase
          .from("transaction_year_vendor")
          .select("vendor, total_amount, txn_count")
          .ilike("vendor", searchPattern)
          .order("total_amount", { ascending: false })
          .limit(LIMIT_PER_CATEGORY);

        if (fiscalYear && Number.isFinite(fiscalYear)) {
          q = q.eq("fiscal_year", fiscalYear);
        }

        const { data, error } = await q;
        if (error) {
          console.error("Vendor search error:", error);
          return [];
        }

        // Deduplicate by vendor name
        const seen = new Set<string>();
        const unique: VendorResult[] = [];
        for (const row of data || []) {
          const name = row.vendor?.toLowerCase();
          if (name && !seen.has(name)) {
            seen.add(name);
            unique.push({
              vendor: row.vendor,
              total_amount: Number(row.total_amount || 0),
              txn_count: Number(row.txn_count || 0),
            });
          }
        }
        return unique.slice(0, LIMIT_PER_CATEGORY);
      })(),

      // 3. Search transactions using full-text search (faster than ILIKE)
      (async () => {
        const tsQuery = sanitized.split(/\s+/).join(' & ');

        let q = supabase
          .from("transactions")
          .select("id, date, vendor, description, amount")
          .textSearch("search_fts", tsQuery, { type: "websearch" })
          .order("date", { ascending: false })
          .limit(LIMIT_PER_CATEGORY);

        if (fiscalYear && Number.isFinite(fiscalYear)) {
          q = q.eq("fiscal_year", fiscalYear);
        }

        const { data, error } = await q;
        if (error) {
          console.error("Transaction search error:", error);
          return [];
        }

        return (data || []).map((row) => ({
          id: String(row.id),
          date: row.date || "",
          vendor: row.vendor,
          description: row.description,
          amount: Number(row.amount || 0),
        }));
      })(),

      // 4. Count total UNIQUE departments matching query
      (async () => {
        let q = supabase
          .from("budget_actuals_year_department")
          .select("department_name")
          .ilike("department_name", searchPattern);

        if (fiscalYear && Number.isFinite(fiscalYear)) {
          q = q.eq("fiscal_year", fiscalYear);
        }

        const { data, error } = await q;
        if (error) {
          console.error("Department count error:", error);
          return 0;
        }
        // Count unique department names
        const uniqueNames = new Set((data || []).map(r => r.department_name?.toLowerCase()));
        return uniqueNames.size;
      })(),

      // 5. Count total UNIQUE vendors matching query
      (async () => {
        let q = supabase
          .from("transaction_year_vendor")
          .select("vendor")
          .ilike("vendor", searchPattern);

        if (fiscalYear && Number.isFinite(fiscalYear)) {
          q = q.eq("fiscal_year", fiscalYear);
        }

        const { data, error } = await q;
        if (error) {
          console.error("Vendor count error:", error);
          return 0;
        }
        // Count unique vendor names
        const uniqueNames = new Set((data || []).map(r => r.vendor?.toLowerCase()));
        return uniqueNames.size;
      })(),

      // 6. Count total transactions using full-text search
      (async () => {
        try {
          const tsQuery = sanitized.split(/\s+/).join(' & ');

          let q = supabase
            .from("transactions")
            .select("id", { count: "exact", head: true })
            .textSearch("search_fts", tsQuery, { type: "websearch" });

          if (fiscalYear && Number.isFinite(fiscalYear)) {
            q = q.eq("fiscal_year", fiscalYear);
          }

          const { count, error } = await q;
          if (error) {
            console.error("Transaction count error:", error);
            return 0;
          }
          return count || 0;
        } catch (err) {
          console.error("Transaction count exception:", err);
          return 0;
        }
      })(),
    ]);

    return NextResponse.json<SearchResponse>({
      departments: deptResult,
      vendors: vendorResult,
      transactions: txnResult,
      totalDepartments: deptCount,
      totalVendors: vendorCount,
      totalTransactions: txnCount,
    });
  } catch (err) {
    console.error("Search route error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
