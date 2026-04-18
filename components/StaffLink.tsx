"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { cityHref } from "@/lib/cityRouting";

/**
 * Renders a subtle footer link:
 * - Not logged in → "Staff login" (links to /login)
 * - Logged in as admin → "Admin portal" (links to /admin)
 * - Logged in as non-admin → hidden
 */
export default function StaffLink() {
  const [state, setState] = useState<"loading" | "anon" | "admin" | "non-admin">("loading");

  useEffect(() => {
    async function check() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setState("anon"); return; }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = profile?.role;
        setState(role === "admin" || role === "super_admin" ? "admin" : "non-admin");
      } catch {
        setState("anon");
      }
    }
    check();
  }, []);

  if (state === "loading" || state === "non-admin") return null;

  if (state === "admin") {
    return (
      <Link
        href={cityHref("/admin")}
        className="text-sm text-slate-500 hover:text-slate-700 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
      >
        Admin portal
      </Link>
    );
  }

  // anon — show login link
  return (
    <Link
      href={cityHref("/login")}
      className="text-sm text-slate-500 hover:text-slate-700 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
    >
      Staff login
    </Link>
  );
}
