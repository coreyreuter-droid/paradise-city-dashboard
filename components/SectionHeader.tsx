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
   * Optional accent color for the eyebrow + underline. This will only be
   * used for text if it meets WCAG 2.1 AA contrast against a light background.
   */
  accentColor?: string;
  /**
   * Heading level (defaults to h2 so page-level h1 can live in layout/hero)
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

/**
 * Compute relative luminance for an sRGB color.
 * Expects r, g, b in 0-255.
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const transform = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const R = transform(r);
  const G = transform(g);
  const B = transform(b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Parse a hex color string (#rgb or #rrggbb) into r/g/b.
 */
function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().toLowerCase();
  if (!normalized.startsWith("#")) return null;

  const raw = normalized.slice(1);
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  }

  if (raw.length === 6) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  }

  return null;
}

/**
 * Given an accent color, only return it if it passes the requested contrast
 * ratio against a white background (used for text). Otherwise return null so
 * that we fall back to the default slate text color.
 */
function getReadableAccentColor(
  accentColor: string | undefined,
  minContrastRatio = 4.5
): string | null {
  if (!accentColor) return null;
  const rgb = parseHexColor(accentColor);
  if (!rgb) return null;

  const accentL = relativeLuminance(rgb.r, rgb.g, rgb.b);
  const whiteL = relativeLuminance(255, 255, 255);

  const lighter = Math.max(accentL, whiteL);
  const darker = Math.min(accentL, whiteL);
  const contrastRatio = (lighter + 0.05) / (darker + 0.05);

  if (contrastRatio < minContrastRatio) {
    return null;
  }

  return accentColor;
}

export default function SectionHeader({
  title,
  description,
  eyebrow,
  rightSlot,
  accentColor,
  as = "h2",
  id,
}: SectionHeaderProps) {
  const HeadingTag = as;
  const generatedId = slugify(title) || "section-heading";
  const headingId = id ?? generatedId;
  const descriptionId = description ? `${headingId}-description` : undefined;

  // Only use the accent color for text/underline if it meets contrast
  const safeAccentColor = getReadableAccentColor(accentColor);
  const accentStyle = safeAccentColor ? { color: safeAccentColor } : undefined;
  const underlineStyle = safeAccentColor
    ? { backgroundColor: safeAccentColor }
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
