// components/SectionHeader.tsx
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
  /**
   * Heading level (defaults to h1)
   */
  as?: "h1" | "h2" | "h3";
  /**
   * Optional explicit id for the heading (used by aria-labelledby)
   */
  id?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function SectionHeader({
  title,
  description,
  eyebrow,
  rightSlot,
  accentColor,
  as = "h1",
  id,
}: SectionHeaderProps) {
  const HeadingTag = as;
  const generatedId = slugify(title) || "section-heading";
  const headingId = id ?? generatedId;
  const descriptionId = description ? `${headingId}-description` : undefined;

  const accentStyle = accentColor ? { color: accentColor } : undefined;
  const underlineStyle = accentColor
    ? { backgroundColor: accentColor }
    : undefined;

  return (
    <header
      className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between"
      aria-labelledby={headingId}
      {...(descriptionId ? { "aria-describedby": descriptionId } : {})}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
            style={accentStyle}
          >
            {eyebrow}
          </p>
        )}

        <div className="mt-1 flex flex-col gap-1">
          <HeadingTag
            id={headingId}
            className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
          >
            {title}
          </HeadingTag>
          <span
            className="mt-1 inline-block h-0.5 w-12 rounded-full bg-slate-900"
            style={underlineStyle}
            aria-hidden="true"
          />
        </div>

        {description && (
          <p
            id={descriptionId}
            className="mt-2 max-w-2xl text-xs text-slate-500 sm:text-sm"
          >
            {description}
          </p>
        )}
      </div>

      {rightSlot && (
        <div className="flex items-center gap-2">{rightSlot}</div>
      )}
    </header>
  );
}
