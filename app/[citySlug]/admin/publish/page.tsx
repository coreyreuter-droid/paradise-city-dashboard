// app/[citySlug]/admin/publish/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";

type PublishState = "loading" | "published" | "unpublished" | "error";

export default function PublishPage() {
  const [state, setState] = useState<PublishState>("loading");
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const messageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase
          .from("portal_settings")
          .select("id, is_published")
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("PublishPage: load error", error);
          setState("error");
          setIsError(true);
          setMessage("Failed to load publish status.");
          return;
        }

        if (!data) {
          setState("error");
          setIsError(true);
          setMessage("No portal settings row found.");
          return;
        }

        setSettingsId(data.id as number);
        setState(data.is_published ? "published" : "unpublished");
        setIsError(false);
        setMessage(null);
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("PublishPage: unexpected load error", err);
          setState("error");
          setIsError(true);
          setMessage("Unexpected error loading publish status.");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (message && messageRef.current) {
      messageRef.current.focus();
    }
  }, [message]);

  async function handleToggle() {
    if (settingsId == null) {
      setIsError(true);
      setMessage(
        "Cannot update publish status because the portal settings record could not be identified."
      );
      return;
    }

    setSaving(true);
    setMessage(null);
    setIsError(false);

    try {
      const { data, error } = await supabase
        .from("portal_settings")
        .update({
          // Flip based on the current stored value in DB via RETURNING
          is_published: state !== "published",
        })
        .eq("id", settingsId)
        .select("id, is_published")
        .maybeSingle();

      if (error) {
        console.error("PublishPage: update error", error);
        setIsError(true);
        setMessage("Failed to update publish status.");
        setSaving(false);
        return;
      }

      if (!data) {
        setIsError(true);
        setMessage("No portal settings row found to update.");
        setSaving(false);
        return;
      }

      setSettingsId(data.id as number);
      const newState: PublishState = data.is_published
        ? "published"
        : "unpublished";
      setState(newState);

      setIsError(false);
      setMessage(
        data.is_published
          ? "Portal is now marked as published. Residents can see the public site without logging in."
          : "Portal is now marked as unpublished. Only authenticated admins can view the portal."
      );
    } catch (err: unknown) {
      console.error("PublishPage: unexpected error", err);
      setIsError(true);
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

  const isDisabled =
    saving || state === "loading" || state === "error" || settingsId == null;

  const buttonLabel =
    state === "published" ? "Mark as Unpublished" : "Mark as Published";

  return (
    <AdminGuard>
      <AdminShell
        title="Publish status"
        description="Control whether your CiviPortal is visible to the public or kept in admin-only review mode."
      >
        <div className="space-y-4 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Current status
              </p>
              <p className="text-xs text-slate-500">
                When the portal is{" "}
                <span className="font-semibold">unpublished</span>, only
                authenticated admins can view the site. When it&apos;s{" "}
                <span className="font-semibold">published</span>, anyone
                with the link can access it without logging in.
              </p>
            </div>
            {renderStatusBadge()}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
            <p>
              Use this control once your budgets, actuals, and other
              datasets are loaded and branding is configured. You can
              switch between draft and published at any time — it doesn&apos;t
              change the underlying data.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={isDisabled}
              className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              {saving ? "Saving…" : buttonLabel}
            </button>
          </div>

          {message && (
            <div
              ref={messageRef}
              tabIndex={-1}
              className={`mt-2 rounded-md border px-3 py-2 text-xs ${
                isError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
              role={isError ? "alert" : "status"}
              aria-live={isError ? "assertive" : "polite"}
            >
              {message}
            </div>
          )}
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
