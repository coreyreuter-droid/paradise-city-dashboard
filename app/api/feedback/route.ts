// app/api/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseService";
import { rateLimitAsync } from "@/lib/rateLimit";
import { rateLimitKey } from "@/lib/rateLimitKey";

export async function POST(request: NextRequest) {
  // Rate limit: 5 submissions per hour (window: 3600000ms) per client
  const key = rateLimitKey(request, "feedback");
  const rl = await rateLimitAsync(`feedback:${key}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : null;
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : null;
  const pagePath = typeof body.page_path === "string" ? body.page_path.slice(0, 500) : null;

  // Validation
  if (!message || message.length < 3) {
    return NextResponse.json({ error: "Message is required (min 3 characters)." }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: "Message is too long (max 5000 characters)." }, { status: 400 });
  }

  // Basic email format check if provided
  if (email && !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
  }

  // Honeypot: if a hidden field is filled, silently accept but don't store
  const honeypot = typeof body.website === "string" ? body.website.trim() : "";
  if (honeypot) {
    // Bot detected — return success without inserting
    return NextResponse.json({ success: true });
  }

  const { error } = await supabaseAdmin.from("citizen_feedback").insert({
    page_path: pagePath,
    name: name || null,
    email: email || null,
    message,
  });

  if (error) {
    console.error("Feedback insert error:", error);
    return NextResponse.json({ error: "Failed to submit feedback." }, { status: 500 });
  }

  // Attempt to notify staff (non-blocking — feedback is saved regardless)
  try {
    const { data: settings } = await supabaseAdmin
      .from("portal_settings")
      .select("feedback_notification_email, city_name")
      .maybeSingle();

    const notifyEmail = settings?.feedback_notification_email?.trim();
    if (notifyEmail) {
      // TODO: Wire to your email provider (SendGrid, Resend, SES, etc.)
      // For now, log that a notification would be sent
      console.log(
        `[Feedback Notification] Would send to: ${notifyEmail}`,
        `| City: ${settings?.city_name}`,
        `| From: ${name || "Anonymous"}`,
        `| Page: ${pagePath}`,
        `| Message: ${message.slice(0, 100)}...`
      );
    }
  } catch (notifyError) {
    // Never fail the response due to notification issues
    console.error("Feedback notification error (non-blocking):", notifyError);
  }

  return NextResponse.json({ success: true });
}
