// app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrViewer } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseService";

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrViewer(req);
  if (!auth.success) return auth.error;

  try {
    const [summaryRes, dailyRes] = await Promise.all([
      supabaseAdmin
        .from("v_page_views_summary")
        .select("page_path, total_views, unique_sessions")
        .limit(25),
      supabaseAdmin
        .from("v_page_views_daily")
        .select("view_date, view_count, unique_sessions")
        .order("view_date", { ascending: false })
        .limit(30),
    ]);

    return NextResponse.json({
      summary: summaryRes.data ?? [],
      daily: dailyRes.data ?? [],
    });
  } catch (err) {
    console.error("Analytics API error:", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
