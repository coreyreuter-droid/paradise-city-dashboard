/**
 * Ingestion Jobs API
 * 
 * GET  /api/admin/ingestion/jobs - List jobs
 * POST /api/admin/ingestion/jobs - Start import job
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// GET - List jobs
// ============================================================================

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  const { searchParams } = new URL(req.url);
  const datasetType = searchParams.get("dataset_type");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  try {
    let query = supabaseAdmin
      .from("ingestion_jobs")
      .select(`
        *,
        raw_files (
          id,
          filename,
          file_size_bytes,
          row_count
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (datasetType) {
      query = query.eq("dataset_type", datasetType);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching jobs:", error);
      return NextResponse.json(
        { error: "Failed to fetch jobs" },
        { status: 500 }
      );
    }

    return NextResponse.json({ jobs: data ?? [] });
  } catch (err) {
    console.error("Ingestion jobs GET error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Start import job
// ============================================================================

interface StartImportBody {
  job_id: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  try {
    const body = (await req.json()) as StartImportBody;

    if (!body.job_id) {
      return NextResponse.json(
        { error: "job_id is required" },
        { status: 400 }
      );
    }

    // Fetch the job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("ingestion_jobs")
      .select("*")
      .eq("id", body.job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Verify job is in validated status
    if (job.status !== "validated") {
      return NextResponse.json(
        { error: `Cannot start import: job is in "${job.status}" status. Must be "validated".` },
        { status: 400 }
      );
    }

    // Check if there are blocking errors
    if (job.rows_rejected > 0) {
      return NextResponse.json(
        {
          error: `Cannot start import: ${job.rows_rejected} rows have validation errors. Fix errors and re-validate.`,
          rows_rejected: job.rows_rejected,
        },
        { status: 400 }
      );
    }

    // Update job to pending (ready for worker to pick up)
    const { error: updateError } = await supabaseAdmin
      .from("ingestion_jobs")
      .update({
        status: "pending",
        attempt_count: 0,
        last_error: null,
        started_at: null,
        finished_at: null,
      })
      .eq("id", body.job_id);

    if (updateError) {
      console.error("Error updating job status:", updateError);
      return NextResponse.json(
        { error: "Failed to start import" },
        { status: 500 }
      );
    }

    // Optionally trigger worker immediately (for dev/testing)
    // In production, the cron job will pick this up
    const triggerWorker = process.env.TRIGGER_WORKER_IMMEDIATELY === "true";
    if (triggerWorker) {
      try {
        const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/worker/process-ingestion`;
        const workerSecret = process.env.WORKER_SECRET;
        
        // Fire and forget - don't wait for response
        fetch(workerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(workerSecret ? { "x-worker-secret": workerSecret } : {}),
          },
          body: JSON.stringify({ job_id: body.job_id }),
        }).catch((e) => console.warn("Non-fatal: worker trigger failed:", e));
      } catch (e) {
        console.warn("Non-fatal: worker trigger failed:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Import job started. Processing will begin shortly.",
      job_id: body.job_id,
    });
  } catch (err) {
    console.error("Ingestion jobs POST error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
