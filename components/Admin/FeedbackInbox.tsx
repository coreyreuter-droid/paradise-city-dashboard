"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CitizenFeedbackRow } from "@/lib/queries";

type Props = {
  feedback: CitizenFeedbackRow[];
};

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  new: { label: "New", bg: "bg-blue-50", text: "text-blue-700" },
  reviewed: { label: "Reviewed", bg: "bg-amber-50", text: "text-amber-700" },
  responded: { label: "Responded", bg: "bg-emerald-50", text: "text-emerald-700" },
  archived: { label: "Archived", bg: "bg-slate-100", text: "text-slate-500" },
};

export default function FeedbackInbox({ feedback: initialFeedback }: Props) {
  const [items, setItems] = useState(initialFeedback);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? items : items.filter((f) => f.status === filter);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      
      await supabase
        .from("citizen_feedback")
        .update({ status: newStatus })
        .eq("id", id);

      setItems((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
      );
    } catch {
      // Silent fail
    }
  };

  return (
    <section aria-label="Feedback inbox" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Inbox</h2>
        <div className="flex gap-1">
          {["all", "new", "reviewed", "responded", "archived"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                filter === s
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "all" ? "All" : STATUS_LABELS[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          {filter === "all" ? "No feedback submitted yet." : `No ${filter} feedback.`}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const st = STATUS_LABELS[item.status] ?? STATUS_LABELS.new;
            const date = new Date(item.created_at);
            const dateStr = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const timeStr = date.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        {dateStr} at {timeStr}
                      </span>
                      {item.page_path && (
                        <span className="text-xs text-slate-400 truncate max-w-[200px]">
                          on {item.page_path.replace(/^\/[^/]+/, "")}
                        </span>
                      )}
                    </div>
                    {(item.name || item.email) && (
                      <p className="mt-1 text-xs text-slate-600">
                        {item.name && <span className="font-medium">{item.name}</span>}
                        {item.name && item.email && " · "}
                        {item.email && (
                          <a href={`mailto:${item.email}`} className="text-blue-600 hover:underline">
                            {item.email}
                          </a>
                        )}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">
                      {item.message}
                    </p>
                  </div>

                  {/* Status actions */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {item.status === "new" && (
                      <button
                        type="button"
                        onClick={() => updateStatus(item.id, "reviewed")}
                        className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
                      >
                        Mark reviewed
                      </button>
                    )}
                    {(item.status === "new" || item.status === "reviewed") && (
                      <button
                        type="button"
                        onClick={() => updateStatus(item.id, "responded")}
                        className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        Mark responded
                      </button>
                    )}
                    {item.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => updateStatus(item.id, "archived")}
                        className="rounded-md px-2 py-1 text-[11px] text-slate-400 hover:text-slate-600"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
