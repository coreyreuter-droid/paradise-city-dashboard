// components/Auth/AdminGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
        .single();

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

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Checking admin access…
        </div>
      </div>
    );
  }

  if (state === "forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="max-w-md rounded-lg border border-red-200 bg-white px-4 py-3 text-sm text-red-700 shadow-sm">
            Unable to verify your admin permissions. Please contact the site
            administrator.
          </div>
      </div>
    );
  }

  return <>{children}</>;
}
