// app/api/admin/hero-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseService";
import { requireAdmin } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";

// NOTE: You must have a public Storage bucket called "branding" in Supabase.

// Max file size: 10MB (in bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    // Verify CSRF token
    const csrfError = await requireCsrf(req);
    if (csrfError) return csrfError;

    // Authenticate and verify admin role
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;
    const { user } = auth.data;

    // 2) Parse multipart form
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Missing file in request" },
        { status: 400 }
      );
    }

    // 3) Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // 4) Check file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        {
          error:
            "Uploaded file must be an image (PNG/JPG/WEBP/etc.)",
        },
        { status: 400 }
      );
    }

    const originalName = formData.get("filename") as string | null;
    const kindRaw = (formData.get("kind") as string | null) ?? "hero";

    let kind: "logo" | "hero" | "seal";
    if (kindRaw === "logo") kind = "logo";
    else if (kindRaw === "seal") kind = "seal";
    else kind = "hero";

    const ext =
      (originalName &&
        originalName.includes(".") &&
        originalName.split(".").pop()) ||
      "png";

    const safeExt =
      String(ext).toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${kind}/${user.id}-${Date.now()}.${safeExt}`;

    // 5) Upload to Storage using service role
    const bucket = "branding";

    const { data: uploadData, error: uploadError } =
      await supabaseAdmin.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: true,
      });

    if (uploadError || !uploadData) {
      console.error("Branding upload: storage error", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(uploadData.path);

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error("Branding upload route error", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected server error" },
      { status: 500 }
    );
  }
}