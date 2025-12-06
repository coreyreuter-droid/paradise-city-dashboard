// components/City/UnpublishedMessage.tsx
"use client";

import type { PortalSettings } from "@/lib/queries";

type Props = {
  settings: PortalSettings | null;
};

export default function UnpublishedMessage({ settings }: Props) {
  const entityName =
    settings?.city_name?.trim() || "This organization";
  const sealUrl = settings?.seal_url || null;

  return (
    <main
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

      <p className="mt-3 text-sm text-slate-600">
        {entityName} is currently reviewing and validating its financial
        data before publishing this transparency portal.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Please check back soon for access to budgets, spending, and
        revenue information.
      </p>
    </main>
  );
}
