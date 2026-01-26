// app/api/admin/data-management/route.ts
// Comprehensive data management operations
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseService";
import { requireAdmin } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { logAuditEvent } from "@/lib/auditLog";

type ActionType = 
  | "clear_funds_dim"
  | "clear_departments_dim"
  | "clear_job_history"
  | "clear_failed_jobs"
  | "get_stats";

/**
 * GET /api/admin/data-management
 * Returns stats about data in the system
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;

    // Get counts for various tables
    const [
      budgetsResult,
      actualsResult,
      transactionsResult,
      revenuesResult,
      fundsResult,
      departmentsResult,
      jobsResult,
      profilesResult,
      rawFilesResult,
    ] = await Promise.all([
      supabaseAdmin.from("budgets").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("actuals").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("transactions").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("revenues").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("funds_dim").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("departments_dim").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("ingestion_jobs").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("mapping_profiles").select("*", { count: "exact", head: true }).eq("is_system", false),
      supabaseAdmin.from("raw_files").select("*", { count: "exact", head: true }),
    ]);

    // Get failed/pending jobs count
    const { count: failedJobsCount } = await supabaseAdmin
      .from("ingestion_jobs")
      .select("*", { count: "exact", head: true })
      .in("status", ["failed", "pending"]);

    // Get storage bucket size (if possible)
    let storageSizeBytes: number | null = null;
    try {
      const { data: files } = await supabaseAdmin.storage.from("raw-uploads").list();
      if (files) {
        // Note: This doesn't give us actual sizes, just file count
        // Supabase doesn't expose bucket size directly via client
        storageSizeBytes = files.length; // This is actually file count, not bytes
      }
    } catch {
      // Storage might not exist or be accessible
    }

    return NextResponse.json({
      stats: {
        data: {
          budgets: budgetsResult.count ?? 0,
          actuals: actualsResult.count ?? 0,
          transactions: transactionsResult.count ?? 0,
          revenues: revenuesResult.count ?? 0,
        },
        lookups: {
          funds: fundsResult.count ?? 0,
          departments: departmentsResult.count ?? 0,
        },
        system: {
          jobs: jobsResult.count ?? 0,
          failedJobs: failedJobsCount ?? 0,
          userProfiles: profilesResult.count ?? 0,
          rawFiles: rawFilesResult.count ?? 0,
          storageFiles: storageSizeBytes,
        },
      },
    });
  } catch (err) {
    console.error("data-management GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/data-management
 * Perform data management actions
 * 
 * Body: { action: ActionType, confirm?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const csrfError = await requireCsrf(req);
    if (csrfError) return csrfError;

    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;

    const body = await req.json();
    const { action, confirm } = body as { action: ActionType; confirm?: string };

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    const userEmail = auth.data.user.email ?? auth.data.user.id;

    switch (action) {
      case "clear_funds_dim": {
        if (confirm !== "CLEAR FUNDS") {
          return NextResponse.json(
            { error: "Please type 'CLEAR FUNDS' to confirm" },
            { status: 400 }
          );
        }

        const { count, error } = await supabaseAdmin
          .from("funds_dim")
          .delete({ count: "exact" })
          .neq("code", ""); // Delete all (code is never empty)

        if (error) {
          return NextResponse.json(
            { error: `Failed to clear funds lookup: ${error.message}` },
            { status: 500 }
          );
        }

        await logAuditEvent({
          actor_email: userEmail,
          actor_user_id: auth.data.user.id,
          action: "lookup.deleted",
          target_table: "funds_dim",
          rows_affected: count ?? 0,
          meta: { cleared_all: true },
        });

        return NextResponse.json({
          message: `Cleared ${count ?? 0} fund entries`,
          deleted: count ?? 0,
        });
      }

      case "clear_departments_dim": {
        if (confirm !== "CLEAR DEPARTMENTS") {
          return NextResponse.json(
            { error: "Please type 'CLEAR DEPARTMENTS' to confirm" },
            { status: 400 }
          );
        }

        const { count, error } = await supabaseAdmin
          .from("departments_dim")
          .delete({ count: "exact" })
          .neq("code", "");

        if (error) {
          return NextResponse.json(
            { error: `Failed to clear departments lookup: ${error.message}` },
            { status: 500 }
          );
        }

        await logAuditEvent({
          actor_email: userEmail,
          actor_user_id: auth.data.user.id,
          action: "lookup.deleted",
          target_table: "departments_dim",
          rows_affected: count ?? 0,
          meta: { cleared_all: true },
        });

        return NextResponse.json({
          message: `Cleared ${count ?? 0} department entries`,
          deleted: count ?? 0,
        });
      }

      case "clear_failed_jobs": {
        // Clear only failed/pending jobs older than 24 hours
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // First get the raw_file IDs to clean up storage
        const { data: jobsToDelete } = await supabaseAdmin
          .from("ingestion_jobs")
          .select("raw_file_id")
          .in("status", ["failed", "pending"])
          .lt("created_at", cutoff);

        const rawFileIds = (jobsToDelete ?? [])
          .map((j) => j.raw_file_id)
          .filter(Boolean);

        // Delete jobs
        const { count: jobCount, error: jobError } = await supabaseAdmin
          .from("ingestion_jobs")
          .delete({ count: "exact" })
          .in("status", ["failed", "pending"])
          .lt("created_at", cutoff);

        if (jobError) {
          return NextResponse.json(
            { error: `Failed to clear jobs: ${jobError.message}` },
            { status: 500 }
          );
        }

        // Clean up raw_files records
        let rawFilesDeleted = 0;
        if (rawFileIds.length > 0) {
          // Get storage paths before deleting records
          const { data: rawFilesData } = await supabaseAdmin
            .from("raw_files")
            .select("storage_path")
            .in("id", rawFileIds);

          const storagePaths = (rawFilesData ?? [])
            .map((r) => r.storage_path)
            .filter(Boolean);

          // Delete from storage
          if (storagePaths.length > 0) {
            await supabaseAdmin.storage.from("raw-uploads").remove(storagePaths);
          }

          // Delete raw_files records
          const { count } = await supabaseAdmin
            .from("raw_files")
            .delete({ count: "exact" })
            .in("id", rawFileIds);

          rawFilesDeleted = count ?? 0;
        }

        await logAuditEvent({
          actor_email: userEmail,
          actor_user_id: auth.data.user.id,
          action: "data.deleted",
          target_table: "ingestion_jobs",
          rows_affected: (jobCount ?? 0) + rawFilesDeleted,
          meta: { 
            jobs_deleted: jobCount ?? 0, 
            raw_files_deleted: rawFilesDeleted,
            cutoff_hours: 24 
          },
        });

        return NextResponse.json({
          message: `Cleared ${jobCount ?? 0} failed/pending jobs and ${rawFilesDeleted} orphaned files`,
          jobsDeleted: jobCount ?? 0,
          filesDeleted: rawFilesDeleted,
        });
      }

      case "clear_job_history": {
        if (confirm !== "CLEAR ALL JOBS") {
          return NextResponse.json(
            { error: "Please type 'CLEAR ALL JOBS' to confirm" },
            { status: 400 }
          );
        }

        // Get all raw_file IDs first
        const { data: allJobs } = await supabaseAdmin
          .from("ingestion_jobs")
          .select("raw_file_id");

        const rawFileIds = (allJobs ?? [])
          .map((j) => j.raw_file_id)
          .filter(Boolean);

        // Delete all jobs
        const { count: jobCount, error: jobError } = await supabaseAdmin
          .from("ingestion_jobs")
          .delete({ count: "exact" })
          .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

        if (jobError) {
          return NextResponse.json(
            { error: `Failed to clear job history: ${jobError.message}` },
            { status: 500 }
          );
        }

        // Clean up raw_files records
        let rawFilesDeleted = 0;
        if (rawFileIds.length > 0) {
          const { data: rawFilesData } = await supabaseAdmin
            .from("raw_files")
            .select("storage_path")
            .in("id", rawFileIds);

          const storagePaths = (rawFilesData ?? [])
            .map((r) => r.storage_path)
            .filter(Boolean);

          if (storagePaths.length > 0) {
            await supabaseAdmin.storage.from("raw-uploads").remove(storagePaths);
          }

          const { count } = await supabaseAdmin
            .from("raw_files")
            .delete({ count: "exact" })
            .in("id", rawFileIds);

          rawFilesDeleted = count ?? 0;
        }

        await logAuditEvent({
          actor_email: userEmail,
          actor_user_id: auth.data.user.id,
          action: "data.deleted",
          target_table: "ingestion_jobs",
          rows_affected: (jobCount ?? 0) + rawFilesDeleted,
          meta: { 
            jobs_deleted: jobCount ?? 0, 
            raw_files_deleted: rawFilesDeleted,
            cleared_all: true 
          },
        });

        return NextResponse.json({
          message: `Cleared ${jobCount ?? 0} jobs and ${rawFilesDeleted} files`,
          jobsDeleted: jobCount ?? 0,
          filesDeleted: rawFilesDeleted,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("data-management POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
