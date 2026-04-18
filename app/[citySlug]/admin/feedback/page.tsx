// app/[citySlug]/admin/feedback/page.tsx
"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/Auth/AdminGuard";
import AdminShell from "@/components/Admin/AdminShell";
import FeedbackInbox from "@/components/Admin/FeedbackInbox";
import { supabase } from "@/lib/supabase";
import type { CitizenFeedbackRow } from "@/lib/queries";

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<CitizenFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("citizen_feedback")
        .select("*")
        .order("created_at", { ascending: false });
      setFeedback((data ?? []) as CitizenFeedbackRow[]);
      setLoading(false);
    }
    load();
  }, []);

  const newCount = feedback.filter((f) => f.status === "new").length;

  return (
    <AdminGuard>
      <AdminShell>
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Citizen Feedback</h2>
            <p className="mt-1 text-sm text-slate-600">
              Questions and comments submitted by citizens through the portal.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading feedback...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">New</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{newCount}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">awaiting review</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{feedback.length}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">all time</p>
                </div>
              </div>

              <FeedbackInbox feedback={feedback} />
            </>
          )}
        </div>
      </AdminShell>
    </AdminGuard>
  );
}
