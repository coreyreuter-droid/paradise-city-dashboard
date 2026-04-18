// app/[citySlug]/admin/publish/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import { cityHref } from "@/lib/cityRouting";

type PublishState = "loading" | "published" | "unpublished" | "error";
type DatasetInfo = { table: string; date: string | null; rows: number | null; isNew: boolean };

function fmtDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function fmtShort(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PublishPage() {
  const [state, setState] = useState<PublishState>("loading");
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [lastPublished, setLastPublished] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const messageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, uploadsRes] = await Promise.all([
          supabase.from("portal_settings").select("id, is_published, updated_at").maybeSingle(),
          supabase.from("data_uploads").select("table_name, created_at, row_count").order("created_at", { ascending: false }).limit(50),
        ]);

        if (settingsRes.error || !settingsRes.data) {
          setState("error"); setIsError(true); setMessage("Could not load portal settings."); return;
        }

        const s = settingsRes.data;
        setSettingsId(s.id as number);
        setState(s.is_published ? "published" : "unpublished");
        setLastPublished(s.updated_at ?? null);

        const publishedAt = s.updated_at ? new Date(s.updated_at) : null;
        const seen = new Set<string>();
        const items: DatasetInfo[] = [];
        for (const row of uploadsRes.data ?? []) {
          if (!seen.has(row.table_name)) {
            seen.add(row.table_name);
            const uploadDate = row.created_at ? new Date(row.created_at) : null;
            items.push({
              table: row.table_name,
              date: row.created_at,
              rows: row.row_count,
              isNew: !!(uploadDate && publishedAt && uploadDate > publishedAt),
            });
          }
        }
        setDatasets(items);
      } catch {
        setState("error"); setIsError(true); setMessage("Unexpected error.");
      }
    }
    load();
  }, []);

  useEffect(() => { if (message && messageRef.current) messageRef.current.focus(); }, [message]);

  async function handlePublish() {
    if (settingsId == null) return;
    setSaving(true); setMessage(null); setIsError(false); setShowConfirm(false);
    try {
      const { data, error } = await supabase
        .from("portal_settings")
        .update({ is_published: state !== "published" })
        .eq("id", settingsId)
        .select("id, is_published, updated_at")
        .maybeSingle();
      if (error || !data) { setIsError(true); setMessage("Failed to update."); setSaving(false); return; }
      setState(data.is_published ? "published" : "unpublished");
      setLastPublished(data.updated_at ?? null);
      // Clear "new" flags after publish
      if (data.is_published) setDatasets((prev) => prev.map((d) => ({ ...d, isNew: false })));
      setMessage(data.is_published ? "Portal is now live." : "Portal is now unpublished.");
    } catch { setIsError(true); setMessage("Unexpected error."); }
    finally { setSaving(false); }
  }

  const isPublished = state === "published";
  const hasNewData = datasets.some((d) => d.isNew);
  const hasAnyData = datasets.length > 0;

  return (
    <AdminGuard>
      <AdminShell title="Review and publish" description="Check what has changed, preview the site, and publish when ready.">
        <div className="space-y-5 text-sm text-slate-700">

          {/* Current status */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                isPublished ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
              }`}>
                {isPublished ? "Live" : "Draft"}
              </span>
              <span className="text-sm text-slate-700">
                {isPublished ? "The public portal is visible to residents." : "Only admins can see the portal right now."}
              </span>
            </div>
            <div className="flex gap-2">
              <Link
                href={cityHref("/")}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              >
                Preview site ↗
              </Link>
            </div>
          </div>

          {/* What changed since last publish */}
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {isPublished ? "Currently live" : "What will be published"}
            </h3>
            {lastPublished && (
              <p className="mt-1 text-xs text-slate-500">Last published: {fmtDate(lastPublished)}</p>
            )}

            {!hasAnyData ? (
              <p className="mt-3 text-xs text-slate-500">No data uploaded yet. Upload financial data before publishing.</p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {datasets.map((d) => (
                  <div key={d.table} className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    d.isNew ? "border border-emerald-200 bg-emerald-50" : "border border-slate-100 bg-slate-50"
                  }`}>
                    <div className="flex items-center gap-2">
                      {d.isNew && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Updated
                        </span>
                      )}
                      <span className="text-xs font-medium text-slate-700 capitalize">{d.table}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {d.rows?.toLocaleString()} rows · {fmtShort(d.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {hasNewData && !isPublished && (
              <p className="mt-3 text-xs text-emerald-700 font-medium">
                New data has been uploaded since the last publish. Review above and publish when ready.
              </p>
            )}
          </div>

          {/* Reassurance */}
          <p className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-2.5 text-xs text-blue-800">
            {isPublished
              ? "The portal is live. You can unpublish at any time to make changes privately."
              : "Nothing is public yet. Preview the site above to check everything before publishing."}
          </p>

          {/* Status messages */}
          {message && (
            <div ref={messageRef} tabIndex={-1} role="status" className={`rounded-md px-4 py-2.5 text-xs font-medium ${
              isError ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            }`}>
              {message}
            </div>
          )}

          {/* Publish action */}
          {!showConfirm ? (
            <button
              type="button"
              disabled={saving || state === "loading" || state === "error" || (!hasAnyData && !isPublished)}
              onClick={() => setShowConfirm(true)}
              className={`rounded-md px-5 py-2.5 text-sm font-medium shadow-sm transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                isPublished
                  ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-900"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600"
              }`}
            >
              {isPublished ? "Unpublish portal" : "Publish to the public"}
            </button>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 space-y-3">
              <p className="text-sm font-medium text-slate-900">
                {isPublished ? "Unpublish the portal?" : "Publish the portal?"}
              </p>
              <p className="text-xs text-slate-600">
                {isPublished
                  ? "The public portal will be hidden. Only logged-in admins can view it."
                  : "All uploaded data and content will become visible to anyone who visits the portal."}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handlePublish}
                  className={`rounded-md px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isPublished ? "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-900" : "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600"
                  }`}
                >
                  {saving ? "Saving..." : isPublished ? "Yes, unpublish" : "Yes, publish now"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

        </div>
      </AdminShell>
    </AdminGuard>
  );
}
