// app/paradise/admin/users/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/Auth/AdminGuard";
import { supabase } from "@/lib/supabase";

type AdminUser = {
  id: string;
  email: string | null;
  role: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
};

type LoadState = "idle" | "loading" | "loaded" | "error";
type RoleFilter = "all" | "super_admin" | "admin" | "viewer" | "none";
type AssignableRole = "super_admin" | "admin" | "viewer";

export default function AdminUsersPage() {
  const [state, setState] = useState<LoadState>("idle");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Invite form state (super_admin only)
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AssignableRole>("admin");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Per-action messages
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Initial load of users + token + current user id
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      setError(null);
      setActionMessage(null);
      setActionError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      const accessToken = session?.access_token ?? null;
      const userId = session?.user?.id ?? null;

      if (!accessToken || !userId) {
        if (!cancelled) {
          setError("No active session");
          setState("error");
        }
        return;
      }

      setAuthToken(accessToken);
      setCurrentUserId(userId);

      try {
        const res = await fetch("/api/paradise/admin/users", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const msg =
            body?.error ||
            `Failed to load users (HTTP ${res.status.toString()})`;
          if (!cancelled) {
            setError(msg);
            setState("error");
          }
          return;
        }

        const body = (await res.json()) as {
          users?: AdminUser[];
          currentRole?: string | null;
        };
        if (cancelled) return;

        setUsers(body.users ?? []);
        setState("loaded");
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Unexpected error loading users");
          setState("error");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentUser = useMemo(
    () =>
      currentUserId
        ? users.find((u) => u.id === currentUserId) ?? null
        : null,
    [users, currentUserId]
  );

  const isSuperAdmin = currentUser?.role === "super_admin";
  const canManageUsers = isSuperAdmin;

  // Derived metrics
  const superAdminCount = users.filter((u) => u.role === "super_admin").length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const viewerCount = users.filter((u) => !u.role || u.role === "viewer").length;
  const totalUsers = users.length;
  const noRoleCount = users.filter((u) => u.role === null).length;

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return users.filter((u) => {
      const role = (u.role ?? "viewer") as AssignableRole | "viewer";

      // role filter
      if (roleFilter === "super_admin" && role !== "super_admin") return false;
      if (roleFilter === "admin" && role !== "admin") return false;
      if (
        roleFilter === "viewer" &&
        !(role === "viewer" || u.role === null)
      )
        return false;
      if (roleFilter === "none" && u.role !== null) return false;

      if (!q) return true;
      const email = (u.email ?? "").toLowerCase();
      return email.includes(q);
    });
  }, [users, search, roleFilter]);

  async function reloadUsers() {
    if (!authToken) return;
    try {
      const res = await fetch("/api/paradise/admin/users", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return;
      const body = (await res.json()) as { users?: AdminUser[] };
      setUsers(body.users ?? []);
    } catch {
      // ignore, page will still show last known data
    }
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authToken) {
      setInviteError("No active session");
      return;
    }

    setInviteLoading(true);
    setInviteError(null);
    setActionMessage(null);
    setActionError(null);

    try {
      const res = await fetch("/api/paradise/admin/users/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole === "super_admin" ? "admin" : inviteRole, // super_admin is not an invite option
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setInviteError(
          body?.error || "Failed to send invite. Check email and try again."
        );
        return;
      }

      setInviteEmail("");
      setInviteRole("admin");
      setActionMessage("Invite sent and role assigned.");
      await reloadUsers();
    } catch (err: any) {
      setInviteError(
        err?.message ?? "Unexpected error while sending invite."
      );
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleChangeRole(userId: string, newRole: AssignableRole) {
    if (!authToken) {
      setActionError("No active session");
      return;
    }

    setUpdatingUserId(userId);
    setActionError(null);
    setActionMessage(null);

    try {
      const res = await fetch("/api/paradise/admin/users/set-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setActionError(
          body?.error || "Failed to update role. Please try again."
        );
        return;
      }

      setActionMessage("Role updated.");
      await reloadUsers();
    } catch (err: any) {
      setActionError(
        err?.message ?? "Unexpected error while updating role."
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleRemoveAdmin(userId: string) {
    if (!authToken) {
      setActionError("No active session");
      return;
    }

    setRemovingUserId(userId);
    setActionError(null);
    setActionMessage(null);

    try {
      const res = await fetch("/api/paradise/admin/users/remove-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userId }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setActionError(
          body?.error ||
            "Failed to remove admin access. Please try again."
        );
        return;
      }

      setActionMessage("Admin access removed.");
      await reloadUsers();
    } catch (err: any) {
      setActionError(
        err?.message ?? "Unexpected error while removing admin."
      );
    } finally {
      setRemovingUserId(null);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!authToken) {
      setActionError("No active session");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this user? This cannot be undone."
    );
    if (!confirmed) return;

    setDeletingUserId(userId);
    setActionError(null);
    setActionMessage(null);

    try {
      const res = await fetch("/api/paradise/admin/users/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userId }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setActionError(
          body?.error || "Failed to delete user. Please try again."
        );
        return;
      }

      setActionMessage("User deleted.");
      await reloadUsers();
    } catch (err: any) {
      setActionError(
        err?.message ?? "Unexpected error while deleting user."
      );
    } finally {
      setDeletingUserId(null);
    }
  }

  return (
    <AdminGuard>
      <div className="px-2 py-4 sm:px-4 sm:py-6">
        <div className="mb-3">
          <Link
            href="/paradise/admin"
            className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <span className="mr-1">←</span>
            Back to admin home
          </Link>
        </div>

        <div className="mb-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Admin
          </p>
          <h1 className="text-lg font-semibold text-slate-900">
            Admin users
          </h1>
          <p className="text-sm text-slate-600">
            Super admins can invite new users and manage roles for this
            deployment. Admins have read-only access to this list.
          </p>
        </div>

        {canManageUsers && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Invite user
              </p>
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-800">
                Super admin only
              </span>
            </div>
            <form
              onSubmit={handleInviteSubmit}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.gov"
                className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <select
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as AssignableRole)
                }
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={inviteLoading}
                className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-3 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
              >
                {inviteLoading ? "Sending…" : "Send invite"}
              </button>
            </form>
            {inviteError && (
              <p className="mt-2 text-xs text-red-600">{inviteError}</p>
            )}
            {!inviteError && actionMessage && (
              <p className="mt-2 text-xs text-emerald-700">
                {actionMessage}
              </p>
            )}
          </div>
        )}

        {actionError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-700 shadow-sm">
            {actionError}
          </div>
        )}

        {/* Summary + filters */}
        {state === "loaded" && (
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-800">
                Total users
                <span className="ml-1 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {totalUsers}
                </span>
              </span>
              <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-1 font-medium text-purple-800">
                Super admins
                <span className="ml-1 rounded-full bg-purple-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {superAdminCount}
                </span>
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800">
                Admins
                <span className="ml-1 rounded-full bg-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {adminCount}
                </span>
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 font-medium text-slate-700">
                Viewers
                <span className="ml-1 rounded-full bg-slate-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {viewerCount}
                </span>
              </span>
              {noRoleCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-800">
                  Missing role
                  <span className="ml-1 rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {noRoleCount}
                  </span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email…"
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value as RoleFilter)
                }
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="all">All roles</option>
                <option value="super_admin">Super admins only</option>
                <option value="admin">Admins only</option>
                <option value="viewer">Viewers only</option>
                <option value="none">Missing role</option>
              </select>
            </div>
          </div>
        )}

        {state === "loading" && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            Loading users…
          </div>
        )}

        {state === "error" && (
          <div className="rounded-lg border border-red-200 bg-white px-4 py-3 text-sm text-red-700 shadow-sm">
            {error ?? "Failed to load users."}
          </div>
        )}

        {state === "loaded" && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                No users match the current filters.
              </div>
            ) : (
              <div className="max-h-[480px] overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Email</th>
                      <th className="px-4 py-2 font-semibold">Role</th>
                      <th className="px-4 py-2 font-semibold">
                        Last sign-in
                      </th>
                      <th className="px-4 py-2 font-semibold">Created</th>
                      {canManageUsers && (
                        <th className="px-4 py-2 font-semibold">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const effectiveRole =
                        (u.role ?? "viewer") as AssignableRole | "viewer";
                      const isSelf = u.id === currentUserId;

                      let pillClasses =
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ";
                      let label = "";

                      if (effectiveRole === "super_admin") {
                        pillClasses +=
                          "border-purple-200 bg-purple-50 text-purple-800";
                        label = "Super admin";
                      } else if (effectiveRole === "admin") {
                        pillClasses +=
                          "border-emerald-200 bg-emerald-50 text-emerald-800";
                        label = "Admin";
                      } else {
                        pillClasses +=
                          "border-slate-200 bg-slate-50 text-slate-700";
                        label = "Viewer";
                      }

                      const isBusyForRow =
                        updatingUserId === u.id ||
                        removingUserId === u.id ||
                        deletingUserId === u.id;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2 text-slate-900">
                            {u.email ?? "—"}
                            {isSelf && (
                              <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                You
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {!canManageUsers ? (
                              <span className={pillClasses}>{label}</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  disabled={isSelf || isBusyForRow}
                                  value={effectiveRole}
                                  onChange={(e) =>
                                    handleChangeRole(
                                      u.id,
                                      e.target.value as AssignableRole
                                    )
                                  }
                                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                >
                                  <option value="super_admin">
                                    Super admin
                                  </option>
                                  <option value="admin">Admin</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500">
                            {u.lastSignInAt
                              ? new Date(u.lastSignInAt).toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500">
                            {u.createdAt
                              ? new Date(u.createdAt).toLocaleDateString()
                              : "—"}
                          </td>
                          {canManageUsers && (
                            <td className="px-4 py-2 text-xs text-slate-500">
                              {!isSelf && (
                                <div className="flex flex-wrap gap-2">
                                  {(effectiveRole === "admin" ||
                                    effectiveRole === "super_admin") && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveAdmin(u.id)
                                      }
                                      disabled={isBusyForRow}
                                      className="inline-flex items-center rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                    >
                                      {removingUserId === u.id
                                        ? "Updating…"
                                        : "Remove admin access"}
                                    </button>
                                  )}
                                  {isSuperAdmin && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteUser(u.id)
                                      }
                                      disabled={isBusyForRow}
                                      className="inline-flex items-center rounded-md border border-red-200 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                                    >
                                      {deletingUserId === u.id
                                        ? "Deleting…"
                                        : "Delete user"}
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
