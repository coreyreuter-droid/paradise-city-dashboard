"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminGuard from "@/components/Auth/AdminGuard";

type PublishState = "loading" | "published" | "unpublished" | "error";

export default function PublishPage() {
  const [state, setState] = useState<PublishState>("loading");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("portal_settings")
        .select("is_published")
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("PublishPage: load portal_settings error", error);
        setState("error");
        setMessage("Failed to load current publish status.");
        return;
      }

      if (!data) {
        setState("unpublished");
        setMessage(
          "No portal settings row exists yet. Branding & settings should be configured first."
        );
        return;
      }

      setState(data.is_published ? "published" : "unpublished");
      setMessage(null);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function setPublished(next: boolean) {
    setSaving(true);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from("portal_settings")
        .update({ is_published: next })
        .eq("id", 1) // assuming singleton with id=1; adjust if needed
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
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          Loading…
        </span>
      );
    }

    if (state === "published") {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
          Published
        </span>
      );
    }

    if (state === "unpublished") {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
          Not yet published
        </span>
      );
    }

    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
        Error
      </span>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Publish Portal
              </h1>
              <p className="text-sm text-slate-600">
                Control whether this CiviPortal deployment is visible to the public.
              </p>
            </div>
            {renderStatusBadge()}
          </div>

          <div className="space-y-3 text-sm text-slate-700">
            <p>
              When the portal is <span className="font-semibold">unpublished</span>, you
              can still access the admin tools but the public-facing portal should show a
              &quot;coming soon&quot; message (once wired).
            </p>
            <p>
              When the portal is <span className="font-semibold">published</span>, the
              city&apos;s residents will be able to access dashboards and data publicly.
            </p>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={saving || state === "published"}
              onClick={() => setPublished(true)}
              className="inline-flex flex-1 items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && state !== "published"
                ? "Publishing…"
                : "Mark as Published"}
            </button>

            <button
              type="button"
              disabled={saving || state === "unpublished"}
              onClick={() => setPublished(false)}
              className="inline-flex flex-1 items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && state !== "unpublished"
                ? "Unpublishing…"
                : "Mark as Unpublished"}
            </button>
          </div>

          {message && (
            <p className="mt-4 text-xs text-slate-600">
              {message}
            </p>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
