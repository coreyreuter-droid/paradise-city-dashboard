"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Props = {
  isPublished: boolean;
  cityName: string;
  sealUrl: string | null;
  children: React.ReactNode;
};

/**
 * Layout-level publish gate.
 * When portal is unpublished:
 *   - Admins see a preview banner + the full portal
 *   - Non-admins see a "coming soon" message
 * When published: renders children directly (zero overhead).
 */
export default function PublishGate({ isPublished, cityName, sealUrl, children }: Props) {
  const pathname = usePathname();

  // Skip the gate entirely for admin, login, and auth routes
  const segments = pathname.split("/").filter(Boolean);
  const routeSegment = segments[1] || "";
  const isAdminRoute = routeSegment === "admin" || routeSegment === "login" || routeSegment === "auth";

  const [authState, setAuthState] = useState<"loading" | "admin" | "public">(
    isPublished || isAdminRoute ? "public" : "loading"
  );

  useEffect(() => {
    if (isPublished || isAdminRoute) return;

    async function checkAdmin() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setAuthState("public"); return; }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = profile?.role;
        setAuthState(role === "admin" || role === "super_admin" ? "admin" : "public");
      } catch {
        setAuthState("public");
      }
    }
    checkAdmin();
  }, [isPublished, isAdminRoute]);

  // Published or admin route — render normally
  if (isPublished || isAdminRoute) {
    return <>{children}</>;
  }

  // Unpublished, checking auth
  if (authState === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  // Unpublished, admin — show preview banner + content
  if (authState === "admin") {
    return (
      <>
        <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-2 text-center">
          <p className="text-sm font-medium text-amber-800">
            Preview mode — This portal is not yet published. Only administrators can see this view.
          </p>
        </div>
        {children}
      </>
    );
  }

  // Unpublished, not admin — block access
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24" aria-labelledby="unpublished-title">
        {sealUrl && (
          <div className="mb-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sealUrl}
              alt={`${cityName} seal`}
              className="h-16 w-16 rounded-full border border-slate-200 bg-white object-contain shadow-sm"
            />
          </div>
        )}
        <h1 id="unpublished-title" className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Transparency portal not yet publicly released
        </h1>
        <p className="mt-3 text-sm text-slate-700">
          {cityName} is currently reviewing and validating its financial data before publishing this transparency portal.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Please check back soon for access to budgets, spending, and revenue information.
        </p>
      </div>
    </div>
  );
}
