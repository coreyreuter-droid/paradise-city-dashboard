// app/api/paradise/admin/hero-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseService";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase URL or anon key env vars");
}

// NOTE: You must have a public Storage bucket called "branding" in Supabase.

export async function POST(req: NextRequest) {
  try {
    // 1) Authenticate caller
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization bearer token" },
        { status: 401 }
      );
    }

    const supabaseAuthed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuthed.auth.getUser();

    if (userError || !user) {
      console.error("Hero upload: getUser error", userError);
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabaseAuthed
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Hero upload: profile error", profileError);
    }

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      );
    }

    // 2) Parse multipart form
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Missing file in request" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Hero image must be an image file (PNG/JPG/WEBP/etc.)" },
        { status: 400 }
      );
    }

    const originalName = formData.get("filename") as string | null;
    const kindRaw = (formData.get("kind") as string | null) ?? "hero";
    const kind = kindRaw === "logo" ? "logo" : "hero";

    const ext =
      (originalName &&
        originalName.includes(".") &&
        originalName.split(".").pop()) ||
      "png";

    const safeExt = String(ext).toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${kind}/${user.id}-${Date.now()}.${safeExt}`;

    // 3) Upload to Storage using service role
    const bucket = "branding";

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: true,
      });

    if (uploadError || !uploadData) {
      console.error("Hero upload: storage error", uploadError);
      return NextResponse.json(
        { error: "Failed to upload hero image" },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(uploadData.path);

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error("Hero upload route error", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected server error" },
      { status: 500 }
    );
  }
}
