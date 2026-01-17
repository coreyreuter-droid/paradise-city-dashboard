// app/api/export/counts/route.ts
// Returns all record counts at once for the download page
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase env vars");
}

export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Run all count queries in parallel
    const [budgets, actuals, transactions, revenues] = await Promise.all([
      supabase.from("budgets").select("*", { count: "exact", head: true }),
      supabase.from("actuals").select("*", { count: "exact", head: true }),
      supabase.from("transactions").select("*", { count: "exact", head: true }),
      supabase.from("revenues").select("*", { count: "exact", head: true }),
    ]);

    // Check for errors
    if (budgets.error || actuals.error || transactions.error || revenues.error) {
      console.error("Counts error:", {
        budgets: budgets.error,
        actuals: actuals.error,
        transactions: transactions.error,
        revenues: revenues.error,
      });
      return NextResponse.json({ error: "Failed to fetch counts" }, { status: 500 });
    }

    return NextResponse.json({
      budgets: budgets.count ?? 0,
      actuals: actuals.count ?? 0,
      transactions: transactions.count ?? 0,
      revenues: revenues.count ?? 0,
    });
  } catch (err) {
    console.error("Counts route error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
