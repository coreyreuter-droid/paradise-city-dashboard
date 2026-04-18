"use client";

import React, { useState, useRef, useEffect } from "react";

type Props = {
  /** Page title for share text */
  title?: string;
  /** Optional description */
  description?: string;
};

export default function ShareEmbed({ title, description }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const shareText = `${title || "Financial Transparency Portal"}${description ? ` — ${description}` : ""}`;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
        aria-expanded={open}
        aria-label="Share this view"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M6 10L10 6M10 6H6.5M10 6V9.5M13.5 8.5V12.5C13.5 13.05 13.05 13.5 12.5 13.5H3.5C2.95 13.5 2.5 13.05 2.5 12.5V3.5C2.5 2.95 2.95 2.5 3.5 2.5H7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Share
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <p className="text-sm font-semibold text-slate-900">Share this view</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Share a link to this page or post it on social media.
          </p>

          {/* Copy link */}
          <div className="mt-3 space-y-2">
            <label className="text-[11px] font-medium text-slate-600">Page link</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(currentUrl, "link")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
              >
                {copied === "link" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Social share */}
          <div className="mt-3 border-t border-slate-100 pt-3">
            <label className="text-[11px] font-medium text-slate-600">Share on</label>
            <div className="mt-1.5 flex gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
              >
                X / Twitter
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
              >
                Facebook
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`Check out this financial data: ${currentUrl}`)}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
              >
                Email
              </a>
            </div>
          </div>

          {/* Print */}
          <div className="mt-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => { window.print(); setOpen(false); }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M4 6V2h8v4M4 12H2.5A.5.5 0 012 11.5v-4a.5.5 0 01.5-.5h11a.5.5 0 01.5.5v4a.5.5 0 01-.5.5H12M4 9h8v5H4V9z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Print this page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
