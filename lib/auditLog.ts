// lib/auditLog.ts
// Centralized audit logging for admin actions

import { supabaseAdmin } from "@/lib/supabaseService";

export type AuditAction =
  // Data actions
  | "upload.completed"
  | "upload.failed"
  | "import.started"
  | "import.completed"
  | "import.failed"
  | "data.deleted"
  // Mapping profile actions
  | "profile.created"
  | "profile.updated"
  | "profile.deleted"
  // Lookup actions
  | "lookup.added"
  | "lookup.updated"
  | "lookup.deleted"
  // User actions
  | "user.invited"
  | "user.role_changed"
  | "user.removed"
  // Branding actions
  | "branding.updated"
  | "portal.published"
  | "portal.unpublished";

export type AuditLogEntry = {
  city_slug?: string;
  actor_user_id?: string;
  actor_email?: string;
  actor_role?: string;
  action: AuditAction;
  target_table?: string;
  fiscal_year?: number;
  mode?: string;
  filename?: string;
  rows_affected?: number;
  status?: "SUCCESS" | "FAILED";
  error_message?: string;
  meta?: Record<string, unknown>;
};

/**
 * Write an entry to the admin_audit_log table.
 * Non-blocking - errors are logged but don't throw.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("admin_audit_log").insert({
      city_slug: entry.city_slug || null,
      actor_user_id: entry.actor_user_id || null,
      actor_email: entry.actor_email || null,
      actor_role: entry.actor_role || null,
      action: entry.action,
      target_table: entry.target_table || null,
      fiscal_year: entry.fiscal_year || null,
      mode: entry.mode || null,
      filename: entry.filename || null,
      rows_affected: entry.rows_affected || null,
      status: entry.status || "SUCCESS",
      error_message: entry.error_message || null,
      meta: entry.meta || {},
    });

    if (error) {
      console.error("Failed to write audit log:", error);
    }
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

/**
 * Helper to extract actor info from auth context
 */
export function getActorInfo(auth: {
  userId: string;
  role: string;
  email?: string;
  citySlug?: string;
}) {
  return {
    city_slug: auth.citySlug,
    actor_user_id: auth.userId,
    actor_email: auth.email,
    actor_role: auth.role,
  };
}
