/**
 * Ingestion Job Status API
 * 
 * GET /api/admin/ingestion/jobs/[id] - Get job status and details
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// GET - Get job status
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  const jobId = params.id;

  if (!jobId) {
    return NextResponse.json(
      { error: "Job ID is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch job with raw file info
    const { data: job, error: jobError } = await supabaseAdmin
      .from("ingestion_jobs")
      .select(`
        *,
        raw_files (
          id,
          filename,
          file_size_bytes,
          row_count,
          checksum,
          uploaded_at
        )
      `)
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Fetch errors for this job (limited)
    const { searchParams } = new URL(req.url);
    const includeErrors = searchParams.get("include_errors") !== "false";
    const errorLimit = parseInt(searchParams.get("error_limit") ?? "100", 10);

    let errors: unknown[] = [];
    let errorCount = 0;

    if (includeErrors) {
      // Get total error count
      const { count } = await supabaseAdmin
        .from("ingestion_row_errors")
        .select("*", { count: "exact", head: true })
        .eq("job_id", jobId);

      errorCount = count ?? 0;

      // Fetch sample errors
      const { data: errorData } = await supabaseAdmin
        .from("ingestion_row_errors")
        .select("*")
        .eq("job_id", jobId)
        .order("row_number", { ascending: true })
        .limit(errorLimit);

      errors = errorData ?? [];
    }

    // Calculate progress percentage
    let progress = 0;
    if (job.rows_total > 0) {
      if (job.status === "completed" || job.status === "completed_with_warnings") {
        progress = 100;
      } else if (job.status === "importing") {
        progress = Math.round((job.rows_loaded / job.rows_total) * 100);
      } else if (job.status === "validating" || job.status === "validated") {
        progress = Math.round((job.rows_validated / job.rows_total) * 100);
      }
    }

    // Build response
    return NextResponse.json({
      job: {
        ...job,
        progress,
      },
      errors: includeErrors
        ? {
            total: errorCount,
            items: errors,
            has_more: errorCount > errorLimit,
          }
        : null,
    });
  } catch (err) {
    console.error("Ingestion job GET error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
