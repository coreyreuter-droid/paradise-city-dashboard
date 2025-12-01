import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  description?: string;
  /**
   * Small label above the title, e.g. "Citywide overview" or "Department detail"
   */
  eyebrow?: string;
  /**
   * Optional right-side content (filters, buttons, etc.)
   */
  rightSlot?: ReactNode;
  /**
   * Optional accent color for the eyebrow + underline
   */
  accentColor?: string;
};

export default function SectionHeader({
  title,
  description,
  eyebrow,
  rightSlot,
  accentColor,
}: SectionHeaderProps) {
  const accent = accentColor ?? "#2563eb";

  return (
    <header className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        {eyebrow && (
          <span
            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600"
            style={{
              borderColor: `${accent}33`,
              backgroundColor: `${accent}0D`,
            }}
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

      {rightSlot && (
        <div className="flex items-center gap-2">
          {rightSlot}
        </div>
      )}
    </header>
  );
}
