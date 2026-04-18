"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Logs page views through a server API route.
 * No direct DB access from the browser.
 * Skips admin and login pages. Debounced at 500ms.
 */
export function usePageView() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId.current) {
      sessionId.current = Math.random().toString(36).slice(2, 10);
    }
  }, []);

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;
    if (pathname.includes("/admin") || pathname.includes("/login")) return;

    const timer = setTimeout(async () => {
      try {
        await fetch("/api/pageview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page_path: pathname,
            page_title: typeof document !== "undefined" ? document.title : null,
            referrer: typeof document !== "undefined" ? document.referrer || null : null,
            session_id: sessionId.current,
          }),
        });
      } catch {
        // Silent fail — analytics should never break the app
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);
}
