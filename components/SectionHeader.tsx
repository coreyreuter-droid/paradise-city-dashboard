// components/SectionHeader.tsx
"use client";

import { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  rightSlot?: ReactNode;
  accentColor?: string;
};

export default function SectionHeader({
  title,
  description,
  eyebrow,
  rightSlot,
  accentColor,
}: SectionHeaderProps) {
  const accent = accentColor || "#2563eb";

  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        {eyebrow && (
          <span
            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.15em] text-slate-600"
            style={{ borderColor: `${accent}40`, backgroundColor: `${accent}0D` }}
          >
            {eyebrow}
          </span>
        )}
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-xs text-slate-500 sm:text-sm">
            {description}
          </p>
        )}
      </div>

      {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
    </div>
  );
}
