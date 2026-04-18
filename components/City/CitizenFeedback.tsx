"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type Props = {
  cityName?: string;
};

export default function CitizenFeedback({ cityName = "the city" }: Props) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus("submitting");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("citizen_feedback").insert({
        page_path: pathname,
        name: name.trim() || null,
        email: email.trim() || null,
        message: message.trim(),
      });
      if (error) throw error;
      setStatus("success");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  };

  if (!isOpen) {
    return (
      <div className="flex justify-center py-3">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900 hover:shadow-md"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-400" aria-hidden="true">
            <path fillRule="evenodd" d="M3.43 2.524A41.29 41.29 0 0110 2c2.236 0 4.43.18 6.57.524 1.437.231 2.43 1.49 2.43 2.902v5.148c0 1.413-.993 2.67-2.43 2.902a41.102 41.102 0 01-3.55.414c-.28.02-.521.18-.643.413l-1.712 3.293a.75.75 0 01-1.33 0l-1.713-3.293a.783.783 0 00-.642-.413 41.108 41.108 0 01-3.55-.414C1.993 13.245 1 11.986 1 10.574V5.426c0-1.413.993-2.67 2.43-2.902z" clipRule="evenodd" />
          </svg>
          Have a question about this data?
        </button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center">
        <p className="text-sm font-semibold text-emerald-800">Thank you for your feedback!</p>
        <p className="mt-1 text-xs text-emerald-700">
          Your message has been submitted to {cityName}&apos;s finance department.
        </p>
        <button
          type="button"
          onClick={() => { setStatus("idle"); setIsOpen(false); }}
          className="mt-3 text-xs text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Ask a question or share feedback</h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-slate-600"
          aria-label="Close feedback form"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Your message will be sent to {cityName}&apos;s finance department. A response is not guaranteed.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fb-name" className="text-xs font-medium text-slate-700">Name (optional)</label>
            <input
              id="fb-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label htmlFor="fb-email" className="text-xs font-medium text-slate-700">Email (optional)</label>
            <input
              id="fb-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              placeholder="jane@example.com"
            />
          </div>
        </div>
        <div>
          <label htmlFor="fb-message" className="text-xs font-medium text-slate-700">Your question or comment</label>
          <textarea
            id="fb-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            placeholder="I noticed the parks budget increased — can you explain what the additional funds are for?"
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            We do not share your information with third parties.
          </p>
          <button
            type="submit"
            disabled={status === "submitting" || !message.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50"
          >
            {status === "submitting" ? "Sending..." : "Submit"}
          </button>
        </div>
        {status === "error" && (
          <p className="text-xs text-red-600">Something went wrong. Please try again.</p>
        )}
      </form>
    </div>
  );
}
