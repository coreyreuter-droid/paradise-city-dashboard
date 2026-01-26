/**
 * Ingestion Job Status API
 * 
 * GET /api/admin/ingestion/jobs/[id] - Get job status and details
 * PATCH /api/admin/ingestion/jobs/[id] - Cancel or retry a job
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseService";
import { logAuditEvent } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// GET - Get job status
// ============================================================================

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: Context) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  // Next.js 15 requires awaiting params
  const params = await context.params;
  const jobId = params?.id;

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

// ============================================================================
// PATCH - Cancel or retry a job
// ============================================================================

export async function PATCH(req: NextRequest, context: Context) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.error;

  const params = await context.params;
  const jobId = params?.id;

  if (!jobId) {
    return NextResponse.json(
      { error: "Job ID is required" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { action } = body as { action: "cancel" | "retry" };

    if (!action || !["cancel", "retry"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'cancel' or 'retry'" },
        { status: 400 }
      );
    }

    // Fetch the job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("ingestion_jobs")
      .select("*, raw_files(storage_path)")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const userEmail = auth.data.user.email ?? auth.data.user.id;

    if (action === "cancel") {
      // Can only cancel pending or processing jobs
      if (!["pending", "validating", "validated", "importing"].includes(job.status)) {
        return NextResponse.json(
          { error: `Cannot cancel a job with status '${job.status}'` },
          { status: 400 }
        );
      }

      // Update job status to cancelled
      const { error: updateError } = await supabaseAdmin
        .from("ingestion_jobs")
        .update({
          status: "cancelled",
          last_error: "Cancelled by user",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (updateError) {
        return NextResponse.json(
          { error: `Failed to cancel job: ${updateError.message}` },
          { status: 500 }
        );
      }

      // Log the cancellation
      await logAuditEvent({
        actor_email: userEmail,
        actor_user_id: auth.data.user.id,
        action: "import.failed",
        target_table: job.target_table,
        meta: {
          job_id: jobId,
          cancelled_by_user: true,
          previous_status: job.status,
        },
      });

      return NextResponse.json({
        message: "Job cancelled successfully",
        job: { id: jobId, status: "cancelled" },
      });
    }

    if (action === "retry") {
      // Can only retry failed or cancelled jobs
      if (!["failed", "cancelled"].includes(job.status)) {
        return NextResponse.json(
          { error: `Cannot retry a job with status '${job.status}'` },
          { status: 400 }
        );
      }

      // Reset job to pending state
      const { error: updateError } = await supabaseAdmin
        .from("ingestion_jobs")
        .update({
          status: "pending",
          progress: 0,
          rows_validated: 0,
          rows_loaded: 0,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (updateError) {
        return NextResponse.json(
          { error: `Failed to retry job: ${updateError.message}` },
          { status: 500 }
        );
      }

      // Clear any existing row errors
      await supabaseAdmin
        .from("ingestion_row_errors")
        .delete()
        .eq("job_id", jobId);

      // Trigger the worker to process this job
      const appUrl =
        process.env.APP_URL ||
        process.env.VERCEL_URL ||
        process.env.NEXT_PUBLIC_APP_URL;

      if (appUrl && process.env.TRIGGER_WORKER_IMMEDIATELY === "true") {
        const workerUrl = appUrl.startsWith("http")
          ? `${appUrl}/api/worker/process-ingestion`
          : `https://${appUrl}/api/worker/process-ingestion`;

        // Fire and forget - don't wait for worker
        fetch(workerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-worker-secret": process.env.WORKER_SECRET || "",
          },
          body: JSON.stringify({ job_id: jobId }),
        }).catch((err) => {
          console.error("Failed to trigger worker for retry:", err);
        });
      }

      // Log the retry
      await logAuditEvent({
        actor_email: userEmail,
        actor_user_id: auth.data.user.id,
        action: "import.started",
        target_table: job.target_table,
        meta: {
          job_id: jobId,
          retry: true,
          previous_status: job.status,
        },
      });

      return NextResponse.json({
        message: "Job queued for retry",
        job: { id: jobId, status: "pending" },
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Ingestion job PATCH error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}