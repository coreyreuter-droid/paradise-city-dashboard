// app/api/pageview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseService";
import { rateLimitAsync } from "@/lib/rateLimit";
import { rateLimitKey } from "@/lib/rateLimitKey";

export async function POST(request: NextRequest) {
  // Rate limit: 60 page views per minute per client (generous for normal browsing)
  const key = rateLimitKey(request, "pageview");
  const rl = await rateLimitAsync(`pageview:${key}`, 60, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const pagePath = typeof body.page_path === "string" ? body.page_path.slice(0, 500) : null;
  const pageTitle = typeof body.page_title === "string" ? body.page_title.slice(0, 300) : null;
  const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 1000) : null;
  const sessionId = typeof body.session_id === "string" ? body.session_id.slice(0, 50) : null;

  if (!pagePath) {
    return NextResponse.json({ error: "page_path is required." }, { status: 400 });
  }

  // Skip admin/login paths server-side too
  if (pagePath.includes("/admin") || pagePath.includes("/login")) {
    return NextResponse.json({ success: true });
  }

  const { error } = await supabaseAdmin.from("page_views").insert({
    page_path: pagePath,
    page_title: pageTitle,
    referrer,
    session_id: sessionId,
  });

  if (error) {
    // Silent fail for analytics — don't break the user experience
    console.error("Page view insert error:", error);
  }

  return NextResponse.json({ success: true });
}
