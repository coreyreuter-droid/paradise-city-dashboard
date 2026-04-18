"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scrolls the page to the top when the route changes.
 * Drop into a layout to fix the "lands halfway down" issue.
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Scroll both window and main content element
    window.scrollTo({ top: 0, left: 0 });

    // Also try scrolling the main element (for flex layouts where main scrolls)
    const main = document.getElementById("main-content");
    if (main) {
      main.scrollTo({ top: 0, left: 0 });
    }
  }, [pathname]);

  return null;
}
