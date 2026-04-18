// components/City/UnpublishedMessage.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PortalSettings } from "@/lib/queries";

type Props = {
  settings: PortalSettings | null;
  children?: React.ReactNode;
};

export default function UnpublishedMessage({ settings, children }: Props) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const entityName = settings?.city_name?.trim() || "This organization";
  const sealUrl = settings?.seal_url || null;

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIsAdmin(false); return; }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = profile?.role;
        setIsAdmin(role === "admin" || role === "super_admin");
      } catch {
        setIsAdmin(false);
      }
    }
    checkAdmin();
  }, []);

  // Still loading auth check
  if (isAdmin === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  // Admin preview mode — show content with banner
  if (isAdmin && children) {
    return (
      <div>
        <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-2 text-center">
          <p className="text-sm font-medium text-amber-800">
            Preview mode — This portal is not yet published. Only administrators can see this view.
          </p>
        </div>
        {children}
      </div>
    );
  }

  // Not admin — show unpublished message
  return (
    <div
      className="mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center sm:py-24"
      aria-labelledby="unpublished-title"
    >
      {sealUrl && (
        <div className="mb-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sealUrl}
            alt={`${entityName} seal`}
            className="h-16 w-16 rounded-full border border-slate-200 bg-white object-contain shadow-sm"
          />
        </div>
      )}

      <h1
        id="unpublished-title"
        className="text-xl font-semibold text-slate-900 sm:text-2xl"
      >
        Transparency portal not yet publicly released
      </h1>

      <p className="mt-3 text-sm text-slate-700">
        {entityName} is currently reviewing and validating its financial
        data before publishing this transparency portal.
      </p>
      <p className="mt-2 text-sm text-slate-700">
        Please check back soon for access to budgets, spending, and
        revenue information.
      </p>
    </div>
  );
}
