"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";

type PublishState = "loading" | "published" | "unpublished" | "error";

export default function PublishPage() {
  const [state, setState] = useState<PublishState>("loading");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase
          .from("portal_settings")
          .select("is_published")
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("PublishPage: load error", error);
          setState("error");
          setMessage("Failed to load publish status.");
          return;
        }

        if (!data) {
          setState("error");
          setMessage("No portal settings row found.");
          return;
        }

        setState(data.is_published ? "published" : "unpublished");
      } catch (err: any) {
        if (!cancelled) {
          console.error("PublishPage: unexpected load error", err);
          setState("error");
          setMessage("Unexpected error loading publish status.");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggle() {
    setSaving(true);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from("portal_settings")
        .update({
          is_published: state !== "published",
        })
        .eq("id", 1)
        .select("is_published")
        .maybeSingle();

      if (error) {
        console.error("PublishPage: update error", error);
        setMessage("Failed to update publish status.");
        setSaving(false);
        return;
      }

      if (!data) {
        setMessage("No portal settings row found to update.");
        setSaving(false);
        return;
      }

      setState(data.is_published ? "published" : "unpublished");
      setMessage(
        data.is_published
          ? "Portal is now marked as published."
          : "Portal is now marked as unpublished."
      );
    } catch (err: any) {
      console.error("PublishPage: unexpected error", err);
      setMessage("Unexpected error updating publish status.");
    } finally {
      setSaving(false);
    }
  }

  function renderStatusBadge() {
    if (state === "loading") {
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          Loading…
        </span>
      );
    }

    if (state === "error") {
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
          Error
        </span>
      );
    }

    if (state === "published") {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          Published
        </span>
      );
    }

    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
        Unpublished
      </span>
    );
  }

  return (
    <AdminGuard>
      <AdminShell
        title="Publish status"
        description="Control whether your CiviPortal is visible to the public or kept in review-only mode."
      >
        <div className="space-y-4 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Current status
              </p>
              <p className="text-xs text-slate-500">
                Publishing makes your portal visible to the public at its
                configured URL.
              </p>
            </div>
            {renderStatusBadge()}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
            <p>
              When the portal is{" "}
              <span className="font-semibold">unpublished</span>, only
              authenticated admins can view the dashboard. When it&apos;s{" "}
              <span className="font-semibold">published</span>, anyone can
              access it without logging in.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={saving || state === "loading" || state === "error"}
              className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              {saving
                ? "Saving…"
                : state === "published"
                ? "Mark as Unpublished"
                : "Mark as Published"}
            </button>
          </div>

          {message && (
            <p className="mt-2 text-xs text-slate-600">{message}</p>
          )}
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
