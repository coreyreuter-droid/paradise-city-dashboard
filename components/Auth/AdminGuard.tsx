// components/Auth/AdminGuard.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { cityHref } from "@/lib/cityRouting";

type Props = {
  children: React.ReactNode;
};

type GuardState = "loading" | "authorized" | "forbidden";

export default function AdminGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<GuardState>("loading");

  const loadingRef = useRef<HTMLDivElement | null>(null);
  const forbiddenRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // 1) Check Supabase user (from magic link/session)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        // Not logged in → send to login with redirect back here
        const redirect = pathname || cityHref("/admin");
        const params = new URLSearchParams();
        params.set("redirect", redirect);
        router.replace(
          `${cityHref("/login")}?${params.toString()}`
        );
        return;
      }

      // 2) Check role from profiles table
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        console.error("AdminGuard profiles error:", profileError);
        setState("forbidden");
        return;
      }

      const role = data?.role as string | null;
      const isAdmin =
        role === "admin" || role === "super_admin";

      if (!isAdmin) {
        // Logged in but not admin → kick back to public portal
        router.replace(cityHref("/"));
        return;
      }

      setState("authorized");
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  useEffect(() => {
    if (state === "loading" && loadingRef.current) {
      loadingRef.current.focus();
    }
    if (state === "forbidden" && forbiddenRef.current) {
      forbiddenRef.current.focus();
    }
  }, [state]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div
          ref={loadingRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm"
        >
          Checking admin access…
        </div>
      </div>
    );
  }

  if (state === "forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div
          ref={forbiddenRef}
          tabIndex={-1}
          role="alert"
          aria-live="assertive"
          className="max-w-md rounded-lg border border-red-200 bg-white px-4 py-4 text-sm text-red-700 shadow-sm"
        >
          <h1 className="text-sm font-semibold text-red-800">
            Admin access required
          </h1>
          <p className="mt-1 text-xs text-red-700">
            We were unable to verify that your account has admin
            permissions for this portal. If you believe this is a
            mistake, contact the site administrator.
          </p>
          <div className="mt-3">
            <Link
              href={cityHref("/")}
              className="inline-flex items-center rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              Return to public site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
