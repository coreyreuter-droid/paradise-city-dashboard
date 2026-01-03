// app/[citySlug]/admin/users/page.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { csrfFetch } from "@/components/CsrfProvider";

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
type CurrentRole = "super_admin" | "admin" | "viewer" | null;

type UsersResponse = {
  users: AdminUser[];
  currentRole: CurrentRole;
};

type ErrorResponse = { error?: string };

export default function AdminUsersPage() {
  const [state, setState] = useState<LoadState>("idle");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<CurrentRole>(null);

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

  const isLoading = state === "loading";

  const messageRef = useRef<HTMLDivElement | null>(null);

  // Helper: reload users from API using token
  async function reloadUsers(tokenOverride?: string) {
    const token = tokenOverride ?? authToken;
    if (!token) {
      setError("No active session");
      setState("error");
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const body = (await res.json().catch(() => null)) as
        | UsersResponse
        | { error?: string }
        | null;

      if (!res.ok) {
        const msg =
          (body as ErrorResponse)?.error ||
          `Failed to load users (HTTP ${res.status.toString()})`;
        setError(msg);
        setState("error");
        return;
      }

      const data = body as UsersResponse;
      setUsers(data.users ?? []);
      setCurrentRole(data.currentRole ?? null);
      setState("loaded");
    } catch (err: unknown) {
      console.error("AdminUsersPage: reloadUsers error", err);
      setError(err instanceof Error ? err.message : "Unexpected error loading users.");
      setState("error");
    }
  }

  // Initial load: get session → token → current user → load users
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      setError(null);
      setActionMessage(null);
      setActionError(null);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("AdminUsersPage: getSession error", sessionError);
          if (!cancelled) {
            setError("Failed to load session.");
            setState("error");
          }
          return;
        }

        if (!session) {
          if (!cancelled) {
            setError("No active session");
            setState("error");
          }
          return;
        }

        const accessToken = session.access_token;
        const userId = session.user?.id ?? null;

        if (!accessToken || !userId) {
          if (!cancelled) {
            setError("No active session");
            setState("error");
          }
          return;
        }

        if (cancelled) return;

        setAuthToken(accessToken);
        setCurrentUserId(userId);

        await reloadUsers(accessToken);
      } catch (err: unknown) {
        console.error("AdminUsersPage: initial load error", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unexpected error loading users.");
          setState("error");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if ((actionMessage || actionError) && messageRef.current) {
      messageRef.current.focus();
    }
  }, [actionMessage, actionError]);

  // Derived metrics
  const superAdminCount = users.filter((u) => u.role === "super_admin").length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const viewerCount = users.filter(
    (u) => !u.role || u.role === "viewer"
  ).length;
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
      ) {
        return false;
      }
      if (roleFilter === "none" && u.role !== null) return false;

      if (!q) return true;
      const email = (u.email ?? "").toLowerCase();
      return email.includes(q);
    });
  }, [users, search, roleFilter]);

  const canInvite = currentRole === "super_admin";
  const isSuperAdmin = currentRole === "super_admin";

  function formatDate(value: string | null): string {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  }

  function roleLabel(role: string | null): string {
    if (!role || role === "viewer") return "Viewer";
    if (role === "admin") return "Admin";
    if (role === "super_admin") return "Super admin";
    return role;
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!authToken) {
      setInviteError("No active session");
      return;
    }
    if (!inviteEmail.trim()) {
      setInviteError("Enter an email address.");
      return;
    }

    setInviteLoading(true);
    setInviteError(null);
    setActionMessage(null);
    setActionError(null);

    try {
      const res = await csrfFetch("/api/admin/users/invite", {
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
          (body as ErrorResponse)?.error ||
            "Failed to send invite. Check email and try again."
        );
        return;
      }

      setInviteEmail("");
      setInviteRole("admin");
      setActionMessage("Invite sent and role assigned.");
      await reloadUsers();
    } catch (err: unknown) {
      console.error("AdminUsersPage: invite error", err);
      setInviteError(err instanceof Error ? err.message : "Unexpected error while sending invite.");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleSetRole(userId: string, newRole: AssignableRole | null) {
    if (!authToken) {
      setActionError("No active session");
      return;
    }

    setUpdatingUserId(userId);
    setActionError(null);
    setActionMessage(null);

    try {
      const res = await csrfFetch("/api/admin/users/set-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setActionError((body as ErrorResponse)?.error || "Failed to update role.");
        return;
      }

      setActionMessage("Role updated.");
      await reloadUsers();
    } catch (err: unknown) {
      console.error("AdminUsersPage: set-role error", err);
      setActionError(
        err instanceof Error ? err.message : "Unexpected error while updating role."
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
      const res = await csrfFetch("/api/admin/users/remove-admin", {
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
          (body as ErrorResponse)?.error || "Failed to remove admin access."
        );
        return;
      }

      setActionMessage("Admin access removed.");
      await reloadUsers();
    } catch (err: unknown) {
      console.error("AdminUsersPage: remove-admin error", err);
      setActionError(
        err instanceof Error ? err.message : "Unexpected error while removing admin."
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
      const res = await csrfFetch("/api/admin/users/delete", {
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
          (body as ErrorResponse)?.error || "Failed to delete user account."
        );
        return;
      }

      setActionMessage("User deleted.");
      await reloadUsers();
    } catch (err: unknown) {
      console.error("AdminUsersPage: delete error", err);
      setActionError(
        err instanceof Error ? err.message : "Unexpected error while deleting user."
      );
    } finally {
      setDeletingUserId(null);
    }
  }

  return (
    <AdminGuard>
      <AdminShell
        title="Users & roles"
        description="Invite staff, assign roles, and remove access when people leave."
      >
        <div className="space-y-4 text-sm text-slate-700">
          {/* Top summary */}
          <section
            aria-label="User roles summary"
            className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs sm:grid-cols-4"
          >
            <div>
              <p className="text-[0.75rem] font-medium uppercase tracking-[0.18em] text-slate-500">
                Total users
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {totalUsers}
              </p>
            </div>
            <div>
              <p className="text-[0.75rem] font-medium uppercase tracking-[0.18em] text-slate-500">
                Super admins
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {superAdminCount}
              </p>
            </div>
            <div>
              <p className="text-[0.75rem] font-medium uppercase tracking-[0.18em] text-slate-500">
                Admins
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {adminCount}
              </p>
            </div>
            <div>
              <p className="text-[0.75rem] font-medium uppercase tracking-[0.18em] text-slate-500">
                Viewers / no role
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {viewerCount}{" "}
                <span className="text-xs font-normal text-slate-500">
                  ({noRoleCount} without explicit role)
                </span>
              </p>
            </div>
          </section>

          {/* Search + filter */}
          <section
            aria-label="User filters"
            className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          >
            <div className="flex flex-1 flex-col gap-2">
              <label className="text-xs font-medium text-slate-700">
                Search by email
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. finance director"
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              />
            </div>
            <div className="flex flex-col gap-2 sm:w-56">
              <label className="text-xs font-medium text-slate-700">
                Filter by role
              </label>
              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value as RoleFilter)
                }
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <option value="all">All roles</option>
                <option value="super_admin">Super admins</option>
                <option value="admin">Admins</option>
                <option value="viewer">Viewers / no role</option>
                <option value="none">No role assigned</option>
              </select>
            </div>
          </section>

          {/* Invite form */}
          <section
            aria-label="Invite new user"
            className="rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Invite a new user
                </p>
                <p className="text-xs text-slate-500">
                  They&apos;ll receive an email with a link to sign in. You can
                  change their role later.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[0.75rem] font-medium uppercase tracking-[0.16em] text-slate-600">
                {isSuperAdmin ? "Super admin" : "Read-only"}
              </span>
            </div>

            {canInvite ? (
              <form
                onSubmit={handleInvite}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Work email
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) =>
                      setInviteEmail(e.target.value)
                    }
                    placeholder="name@city.gov"
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  />
                </div>
                <div className="sm:w-40">
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Initial role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(
                        e.target.value as AssignableRole
                      )
                    }
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  >
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="pt-1 sm:pt-0">
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  >
                    {inviteLoading ? "Sending…" : "Send invite"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-slate-500">
                Only super admins can invite new users. Contact a super admin if
                you need someone added.
              </p>
            )}

            {inviteError && (
              <p className="mt-2 text-xs text-red-600">
                {inviteError}
              </p>
            )}
          </section>

          {/* Global action feedback */}
          {(actionMessage || actionError) && (
            <div
              ref={messageRef}
              tabIndex={-1}
              aria-live="assertive"
              role="alert"
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              {actionMessage && (
                <p className="font-medium text-emerald-700">
                  {actionMessage}
                </p>
              )}
              {actionError && (
                <p className="text-red-600">{actionError}</p>
              )}
            </div>
          )}

          {/* Users table */}
          <section
            aria-label="User list"
            className="rounded-xl border border-slate-200 bg-white text-xs shadow-sm"
          >
            {isLoading && (
              <div className="px-4 py-6 text-sm text-slate-600">
                Loading users…
              </div>
            )}

            {!isLoading && error && (
              <div
                role="alert"
                className="px-4 py-6 text-sm text-red-600"
              >
                {error}
              </div>
            )}

            {!isLoading && !error && filteredUsers.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-500">
                No users match the current filters.
              </div>
            )}

            {!isLoading && !error && filteredUsers.length > 0 && (
              <div className="max-h-[480px] overflow-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-[0.75rem] uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-semibold">
                        Email
                      </th>
                      <th className="px-4 py-2 font-semibold">
                        Role
                      </th>
                      <th className="px-4 py-2 font-semibold">
                        Last sign-in
                      </th>
                      <th className="px-4 py-2 font-semibold">
                        Created
                      </th>
                      <th className="px-4 py-2 font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isSelf = u.id === currentUserId;
                      const role = (u.role ?? "viewer") as
                        | AssignableRole
                        | "viewer";
                      const isSuper = role === "super_admin";
                      const isOnlySuper =
                        isSuper && superAdminCount === 1;

                      const canChangeRole =
                        !isOnlySuper && !isSelf && isSuperAdmin;
                      const canRemoveAdmin =
                        !isOnlySuper && !isSelf && isSuperAdmin;
                      const canDelete =
                        !isOnlySuper && !isSelf && isSuperAdmin;

                      return (
                        <tr
                          key={u.id}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-4 py-2 align-top text-slate-900">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs">
                                {u.email ?? "—"}
                              </span>
                              <span className="text-[0.75rem] text-slate-500">
                                {isSelf ? "This is you" : u.id}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2 align-top text-slate-900">
                            {canChangeRole ? (
                              <label className="inline-flex flex-col gap-1">
                                <span className="sr-only">
                                  Role for {u.email ?? u.id}
                                </span>
                                <select
                                  value={u.role ?? "viewer"}
                                  onChange={(e) =>
                                    handleSetRole(
                                      u.id,
                                      e.target
                                        .value as AssignableRole
                                    )
                                  }
                                  disabled={updatingUserId === u.id}
                                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                                >
                                  <option value="super_admin">
                                    Super admin
                                  </option>
                                  <option value="admin">Admin</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                              </label>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[0.75rem] font-medium text-slate-700">
                                {roleLabel(u.role)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 align-top text-slate-700">
                            {formatDate(u.lastSignInAt)}
                          </td>
                          <td className="px-4 py-2 align-top text-slate-700">
                            {formatDate(u.createdAt)}
                          </td>
                          <td className="px-4 py-2 align-top">
                            <div className="flex flex-wrap gap-2 text-[0.75rem]">
                              {isSelf && (
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                                  You
                                </span>
                              )}

                              {canRemoveAdmin && role !== "viewer" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveAdmin(u.id)
                                  }
                                  disabled={
                                    removingUserId === u.id
                                  }
                                  className="rounded-full border border-slate-300 px-2 py-1 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                                >
                                  {removingUserId === u.id
                                    ? "Removing…"
                                    : "Remove admin"}
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteUser(u.id)
                                  }
                                  disabled={
                                    deletingUserId === u.id
                                  }
                                  className="rounded-full border border-red-200 px-2 py-1 text-[0.75rem] font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                >
                                  {deletingUserId === u.id
                                    ? "Deleting…"
                                    : "Delete"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
