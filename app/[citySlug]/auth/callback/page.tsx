// app/[citySlug]/auth/callback/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cityHref } from "@/lib/cityRouting";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"processing" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        // Supabase client automatically picks up tokens from URL hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Auth callback session error:", sessionError);
          setStatus("error");
          setErrorMessage("Failed to establish session. Please try signing in again.");
          return;
        }

        if (!session?.user) {
          // No session yet - wait a moment and try getUser
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            console.error("Auth callback: no user found", userError);
            setStatus("error");
            setErrorMessage("Could not verify your sign-in. Please try again.");
            return;
          }
        }

        const user = session?.user || (await supabase.auth.getUser()).data.user;

        if (!user) {
          setStatus("error");
          setErrorMessage("Could not verify your sign-in. Please try again.");
          return;
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Auth callback profile error:", profileError);
          // Still redirect to admin - AdminGuard will handle the final check
          router.replace(cityHref("/admin"));
          return;
        }

        const role = profile?.role as string | null;
        const isAdmin = role === "admin" || role === "super_admin";

        if (isAdmin) {
          router.replace(cityHref("/admin"));
        } else {
          // Not an admin - send to public portal
          router.replace(cityHref("/"));
        }
      } catch (err) {
        console.error("Auth callback unexpected error:", err);
        setStatus("error");
        setErrorMessage("An unexpected error occurred. Please try signing in again.");
      }
    }

    handleAuthCallback();
  }, [router]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-lg border border-red-200 bg-white px-5 py-5 text-center shadow-sm">
          <h1 className="text-base font-semibold text-red-800">Sign-in failed</h1>
          <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
          <a
            href={cityHref("/login")}
            className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-center shadow-sm">
        <div className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
        <p className="text-sm text-slate-600">Completing sign-in...</p>
      </div>
    </div>
  );
}
